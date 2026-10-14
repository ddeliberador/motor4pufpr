// Camada temporal compartilhada: séries (observacoes), fotos versionadas
// (entidade_versoes via registrar_foto) e coletas (ingest_runs).
// Sempre com a service role: as tabelas não aceitam escrita de anon.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type Granularidade = "dia" | "mes" | "trimestre" | "semestre" | "ano" | "foto";
export type OrigemTemporal = "serie_da_fonte" | "foto_coletada" | "reconstruida";
export type Natureza = "estoque" | "fluxo" | "proporcao" | "indice" | "preco";

export interface LinhaObservacao {
  indicador_id: string;
  entidade_tipo: string;
  entidade_chave: string;
  segmento?: string;
  periodo_referencia: string; // YYYY-MM-DD
  granularidade: Granularidade;
  valor?: number | null;
  valor_texto?: string | null;
  origem_temporal: OrigemTemporal;
  capturado_em?: string;
  versao_metodo?: string | null;
  metadados?: Record<string, unknown> | null;
}

export interface DefIndicador {
  id: string;
  nome: string;
  natureza: Natureza;
  unidade?: string | null;
  periodicidade?: string | null;
  descricao?: string | null;
  fonte_chave?: string | null;
  moeda?: string | null;
  base_preco?: string | null;
  camada_mapa?: string | null;
  cnae?: string | null;
  metodologia?: string | null;
}

export function clienteServico(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Abre uma coleta em ingest_runs e devolve o id (coleta_id). */
export async function iniciarColeta(
  supabase: SupabaseClient,
  c: { jobId: string; fonte: string; versaoConector: string; escopo?: Record<string, unknown>; respostaHash?: string },
): Promise<string> {
  const { data, error } = await supabase.from("ingest_runs").insert({
    job_id: c.jobId, fonte: c.fonte, ok: false, found: 0, inserted: 0,
    escopo: c.escopo ?? null, versao_conector: c.versaoConector, resposta_hash: c.respostaHash ?? null,
  }).select("id").single();
  if (error) throw new Error(`ingest_runs: ${error.message}`);
  return data.id as string;
}

export async function finalizarColeta(
  supabase: SupabaseClient, coletaId: string,
  r: { ok: boolean; found?: number; inserted?: number; error?: string | null; inicioMs?: number },
) {
  await supabase.from("ingest_runs").update({
    ok: r.ok, found: r.found ?? 0, inserted: r.inserted ?? 0, error: r.error ?? null,
    duration_ms: r.inicioMs ? Date.now() - r.inicioMs : null,
  }).eq("id", coletaId);
}

const cache = new Set<string>();
/** Cria o indicador no catálogo se ainda não existir (não sobrescreve). */
export async function garantirIndicador(supabase: SupabaseClient, def: DefIndicador) {
  if (cache.has(def.id)) return;
  const { error } = await supabase.from("indicadores").upsert(def, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(`indicadores(${def.id}): ${error.message}`);
  cache.add(def.id);
}

const chave = (l: { indicador_id: string; entidade_tipo: string; entidade_chave: string; segmento?: string | null; periodo_referencia: string }) =>
  [l.indicador_id, l.entidade_tipo, l.entidade_chave, l.segmento ?? "", l.periodo_referencia].join("|");

/**
 * Grava observações (append-only). O índice de idempotência é parcial
 * (coleta_id não nulo), o que impede ON CONFLICT pelo PostgREST; por isso
 * as chaves já gravadas nesta coleta são lidas antes e puladas.
 */
export async function registrarObservacoes(
  supabase: SupabaseClient, p: { coletaId: string; linhas: LinhaObservacao[] },
): Promise<{ inseridas: number; ignoradas: number }> {
  const unicas = new Map<string, LinhaObservacao>();
  for (const l of p.linhas) {
    if (l.valor != null && !Number.isFinite(Number(l.valor))) continue;
    if (l.valor == null && (l.valor_texto == null || l.valor_texto === "")) continue;
    unicas.set(chave(l), l);
  }
  const existentes = new Set<string>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from("observacoes")
      .select("indicador_id,entidade_tipo,entidade_chave,segmento,periodo_referencia")
      .eq("coleta_id", p.coletaId).order("id").range(de, de + 999);
    if (error) throw new Error(`observacoes (leitura): ${error.message}`);
    for (const r of data ?? []) existentes.add(chave(r as LinhaObservacao));
    if (!data || data.length < 1000) break;
  }
  const novas = [...unicas.entries()].filter(([k]) => !existentes.has(k)).map(([, l]) => ({
    ...l, segmento: l.segmento ?? "", coleta_id: p.coletaId,
  }));
  for (let i = 0; i < novas.length; i += 500) {
    const { error } = await supabase.from("observacoes").insert(novas.slice(i, i + 500));
    if (error) throw new Error(`observacoes (gravação): ${error.message}`);
  }
  return { inseridas: novas.length, ignoradas: unicas.size - novas.length };
}

/** Foto versionada de uma tabela/fonte. completo=true só com a lista inteira da fonte. */
export async function registrarFoto(
  supabase: SupabaseClient,
  p: { tabela: string; campoChave: string; registros: Record<string, unknown>[]; completo: boolean; coletaId: string; capturadoEm?: string },
): Promise<{ novos: number; alterados: number; removidos: number; inalterados: number }> {
  const { data, error } = await supabase.rpc("registrar_foto", {
    p_tabela: p.tabela, p_chave_campo: p.campoChave, p_registros: p.registros,
    p_completo: p.completo, p_coleta: p.coletaId, p_capturado_em: p.capturadoEm ?? new Date().toISOString(),
  });
  if (error) throw new Error(`registrar_foto(${p.tabela}): ${error.message}`);
  const r = (Array.isArray(data) ? data[0] : data) ?? {};
  return { novos: r.novos ?? 0, alterados: r.alterados ?? 0, removidos: r.removidos ?? 0, inalterados: r.inalterados ?? 0 };
}

/** Última coleta bem-sucedida de um job (para não repetir fotos sem mudança). */
export async function ultimaColetaOk(supabase: SupabaseClient, jobId: string) {
  const { data } = await supabase.from("ingest_runs").select("id,created_at,resposta_hash")
    .eq("job_id", jobId).eq("ok", true).order("created_at", { ascending: false }).limit(1);
  return data?.[0] as { id: string; created_at: string; resposta_hash: string | null } | undefined;
}

/** Executa em segundo plano quando o runtime permite, sem atrasar a resposta. */
export function emSegundoPlano(p: Promise<unknown>) {
  const tarefa = p.catch((e) => console.error("temporal:", e instanceof Error ? e.message : e));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(tarefa);
}

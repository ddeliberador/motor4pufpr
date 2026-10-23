// Porta de entrada das séries municipais (ADR-0003). O backend do Railway
// baixa e agrega as bases pesadas e entrega aqui os resultados em lotes; a
// gravação passa pela camada temporal compartilhada (_shared/temporal.ts),
// como toda série do Motor. Autenticação pela MCTI_API_KEY (cabeçalho
// x-api-key), a mesma chave institucional que o railway-proxy usa no sentido
// inverso; assim o Railway não precisa da service role do banco.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  clienteServico, finalizarColeta, garantirIndicador, iniciarColeta, registrarObservacoes, ultimaColetaOk,
  type DefIndicador, type LinhaObservacao,
} from "../_shared/temporal.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const MAX_LINHAS = 2000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const esperada = Deno.env.get("MCTI_API_KEY") ?? "";
  const chave = req.headers.get("x-api-key") ?? "";
  if (!esperada || !chave || chave !== esperada) return json({ error: "não autorizado" }, 401);
  const sb = clienteServico();
  if (!sb) return json({ error: "configuração ausente" }, 500);

  let p: Record<string, unknown> = {};
  try { p = await req.json(); } catch { return json({ error: "corpo inválido" }, 400); }
  const acao = String(p.acao ?? "");
  try {
    switch (acao) {
      case "municipios": {
        // Tabela IBGE ↔ nome/UF para o backend casar fontes que só trazem o nome.
        const { data, error } = await sb.from("infra_backhaul_municipio").select("codigo_ibge,municipio,uf").order("codigo_ibge").range(Number(p.de ?? 0), Number(p.de ?? 0) + 999);
        if (error) throw new Error(error.message);
        return json({ linhas: data ?? [] });
      }
      case "ultima_coleta_ok":
        return json({ coleta: await ultimaColetaOk(sb, String(p.job_id ?? "")) });
      case "indicador":
        await garantirIndicador(sb, p.indicador as DefIndicador);
        return json({ ok: true });
      case "iniciar": {
        const id = await iniciarColeta(sb, {
          jobId: String(p.job_id), fonte: String(p.fonte), versaoConector: String(p.versao),
          escopo: (p.escopo as Record<string, unknown>) ?? undefined, respostaHash: p.hash ? String(p.hash) : undefined,
        });
        return json({ coleta_id: id });
      }
      case "observacoes": {
        const linhas = Array.isArray(p.linhas) ? (p.linhas as LinhaObservacao[]) : [];
        if (linhas.length > MAX_LINHAS) return json({ error: `no máximo ${MAX_LINHAS} linhas por lote` }, 413);
        // Municípios (IBGE 7 dígitos) e, para as séries de transporte, UFs (sigla).
        for (const l of linhas) {
          const ok = (l.entidade_tipo === "municipio" && /^\d{7}$/.test(l.entidade_chave)) || (l.entidade_tipo === "uf" && /^[A-Z]{2}$/.test(l.entidade_chave));
          if (!ok) return json({ error: "só entidade_tipo=municipio (IBGE de 7 dígitos) ou uf (sigla)" }, 400);
        }
        const coletaId = String(p.coleta_id);
        // Caminho rápido: inserção direta (o backend já deduplica no lote). Se um
        // reenvio esbarrar no índice de idempotência (23505), cai no caminho que
        // lê as chaves já gravadas e pula as repetidas (temporal.ts).
        const validas = linhas.filter((l) => l.valor != null && Number.isFinite(Number(l.valor)));
        const { error } = await sb.from("observacoes").insert(validas.map((l) => ({ ...l, segmento: l.segmento ?? "", coleta_id: coletaId })));
        if (!error) return json({ inseridas: validas.length, ignoradas: linhas.length - validas.length });
        if (error.code !== "23505") throw new Error(`observacoes: ${error.message}`);
        return json(await registrarObservacoes(sb, { coletaId, linhas }));
      }
      case "interacoes": {
        // Interações entre atores (tabela interacoes) agregadas no Railway, como a
        // coautoria OpenAlex. A função interacoes_upsert valida UF e faz o upsert por id.
        const linhas = Array.isArray(p.linhas) ? (p.linhas as Record<string, unknown>[]) : [];
        if (linhas.length > MAX_LINHAS) return json({ error: `no máximo ${MAX_LINHAS} linhas por lote` }, 413);
        for (const l of linhas) {
          if (typeof l.id !== "string" || !l.id || typeof l.fonte !== "string" || typeof l.tipo !== "string") return json({ error: "cada linha precisa de id, fonte e tipo" }, 400);
          if (!["acao", "recurso", "resultado"].includes(String(l.dimensao))) return json({ error: `dimensao inválida em ${l.id}` }, 400);
          for (const h of [l.origem_helice, l.destino_helice]) if (!["ict", "empresa", "governo"].includes(String(h))) return json({ error: `hélice inválida em ${l.id}` }, 400);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(l.data_evento))) return json({ error: `data_evento inválida em ${l.id}` }, 400);
        }
        const { data, error } = await sb.rpc("interacoes_upsert", { p_linhas: linhas });
        if (error) throw new Error(`interacoes_upsert: ${error.message}`);
        return json({ gravadas: Number(data ?? 0) });
      }
      case "finalizar":
        await finalizarColeta(sb, String(p.coleta_id), { ok: !!p.ok, found: Number(p.found ?? 0), inserted: Number(p.inserted ?? 0), error: p.error ? String(p.error) : null });
        return json({ ok: true });
      case "agenda": {
        const { error } = await sb.from("agenda_coletas").update({
          ultima_execucao: new Date().toISOString(), ultimo_status: String(p.status ?? ""), ultima_mensagem: String(p.mensagem ?? "").slice(0, 500),
        }).eq("job", String(p.job));
        if (error) throw new Error(error.message);
        return json({ ok: true });
      }
      default:
        return json({ error: `ação desconhecida: ${acao}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

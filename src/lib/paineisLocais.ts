// Leituras dos painéis de estado e de município do Mapa (abertos ao clicar na
// malha). Tudo vem de views/séries já existentes: perfil estadual e atores
// (sistemas estaduais), interações por UF (vw_interacao_fluxo_uf_tipos), séries
// por UF e por município (v_series_validas). Nada é estimado: sem linha, sem dado.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import { INDICADORES_REGIONAIS } from "@/lib/seriesRegionais";
import { INDICADOR_POPULACAO, INDICADORES_MUNICIPAIS, anoDoPeriodo } from "@/lib/seriesMunicipais";

const DEZ_MIN = 10 * 60_000;

export const normalizarNome = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ---------- Estado ----------

export interface PerfilUf {
  uf: string; perfil: string | null; unidades_ativas: number | null;
  lacos_empresas_locais: number | null; lacos_unidades_locais: number | null;
  pct_empresas_buscam_fora: number | null; uf_principal_origem_externa: string | null;
  unidade_principal: string | null; pct_unidade_principal: number | null;
}
export interface ResumoAtoresUf { uf: string; categoria: string; atores: number | null }
export interface LinhaInteracaoUf { fonte: string; tipo: string; ano: number | null; origem_uf: string | null; destino_uf: string | null; lacos: number | string | null }
export interface PontoSerie { ano: number; valor: number }

export async function carregarPerfilUf(uf: string): Promise<PerfilUf | null> {
  const { data, error } = await supabase.from("vw_uf_relacoes_perfil").select("*").eq("uf", uf).maybeSingle();
  if (error) throw error;
  return (data as unknown as PerfilUf | null) ?? null;
}
export async function carregarAtoresUf(uf: string): Promise<ResumoAtoresUf[]> {
  return fetchAll<ResumoAtoresUf>(supabase.from("vw_uf_atores_resumo").select("uf,categoria,atores").eq("uf", uf).order("categoria"));
}
export async function carregarInteracoesUf(uf: string): Promise<LinhaInteracaoUf[]> {
  return fetchAll<LinhaInteracaoUf>(
    supabase.from("vw_interacao_fluxo_uf_tipos").select("fonte,tipo,ano,origem_uf,destino_uf,lacos")
      .or(`origem_uf.eq.${uf},destino_uf.eq.${uf}`).order("ano").order("fonte").order("tipo"),
  );
}
/** Séries por UF dos indicadores regionais (um ponto por ano, segmento total). */
export async function carregarSeriesUf(uf: string): Promise<Record<string, PontoSerie[]>> {
  const linhas = await fetchAll<{ indicador_id: string; periodo_referencia: string; valor: number | string | null }>(
    supabase.from("v_series_validas").select("indicador_id,periodo_referencia,valor")
      .eq("entidade_tipo", "uf").eq("entidade_chave", uf).eq("segmento", "")
      .in("indicador_id", INDICADORES_REGIONAIS.map((i) => i.id)).order("periodo_referencia"),
  );
  const out: Record<string, PontoSerie[]> = {};
  for (const l of linhas) {
    if (l.valor == null) continue;
    (out[l.indicador_id] ??= []).push({ ano: anoDoPeriodo(l.periodo_referencia), valor: Number(l.valor) });
  }
  return out;
}

export function usePainelEstado(uf: string | null) {
  const ativo = !!uf;
  const perfil = useQuery({ queryKey: ["painel-uf-perfil", uf], queryFn: () => carregarPerfilUf(uf!), enabled: ativo, staleTime: DEZ_MIN });
  const atores = useQuery({ queryKey: ["painel-uf-atores", uf], queryFn: () => carregarAtoresUf(uf!), enabled: ativo, staleTime: DEZ_MIN });
  const interacoes = useQuery({ queryKey: ["painel-uf-interacoes", uf], queryFn: () => carregarInteracoesUf(uf!), enabled: ativo, staleTime: DEZ_MIN });
  const series = useQuery({ queryKey: ["painel-uf-series", uf], queryFn: () => carregarSeriesUf(uf!), enabled: ativo, staleTime: DEZ_MIN });
  return { perfil, atores, interacoes, series };
}

/** Laços por tipo ligados à UF, separando o que entra, o que sai e o que fica dentro. */
export function resumirInteracoesUf(linhas: LinhaInteracoesUfEntrada, uf: string, ateAno: number | null) {
  const porTipo = new Map<string, { entra: number; sai: number; dentro: number }>();
  for (const l of linhas) {
    if (ateAno != null && l.ano != null && l.ano > ateAno) continue;
    const k = `${l.fonte}:${l.tipo}`;
    const acc = porTipo.get(k) ?? { entra: 0, sai: 0, dentro: 0 };
    const n = Number(l.lacos ?? 0);
    if (l.origem_uf === uf && l.destino_uf === uf) acc.dentro += n;
    else if (l.destino_uf === uf) acc.entra += n;
    else if (l.origem_uf === uf) acc.sai += n;
    porTipo.set(k, acc);
  }
  return porTipo;
}
type LinhaInteracoesUfEntrada = Pick<LinhaInteracaoUf, "fonte" | "tipo" | "ano" | "origem_uf" | "destino_uf" | "lacos">[];

/** Último ponto da série até o ano em foco (ou o último disponível). */
export function pontoAteAno(serie: PontoSerie[] | undefined, ano: number | null): PontoSerie | null {
  if (!serie?.length) return null;
  const ate = ano == null ? serie : serie.filter((p) => p.ano <= ano);
  return ate.length ? ate[ate.length - 1] : null;
}

// ---------- Município ----------

export interface LinhaSerieMunicipio { indicador_id: string; segmento: string; periodo_referencia: string; granularidade: string; valor: number | string | null }

/** Todas as séries municipais de um município (indicadores das camadas + população). */
export async function carregarSeriesMunicipio(ibge: string): Promise<LinhaSerieMunicipio[]> {
  const ids = [...INDICADORES_MUNICIPAIS.filter((i) => !i.indisponivel).map((i) => i.id), INDICADOR_POPULACAO];
  return fetchAll<LinhaSerieMunicipio>(
    supabase.from("v_series_validas").select("indicador_id,segmento,periodo_referencia,granularidade,valor")
      .eq("entidade_tipo", "municipio").eq("entidade_chave", ibge).in("indicador_id", ids)
      .order("indicador_id").order("segmento").order("periodo_referencia"),
  );
}

export function usePainelMunicipio(ibge: string | null) {
  return useQuery({ queryKey: ["painel-mun-series", ibge], queryFn: () => carregarSeriesMunicipio(ibge!), enabled: !!ibge, staleTime: DEZ_MIN });
}

export interface SerieMunicipioAgrupada { indicador: string; segmento: string; granularidade: string; pontos: { periodo: string; valor: number }[] }
export function agruparSeriesMunicipio(linhas: LinhaSerieMunicipio[]): SerieMunicipioAgrupada[] {
  const m = new Map<string, SerieMunicipioAgrupada>();
  for (const l of linhas) {
    if (l.valor == null) continue;
    const k = `${l.indicador_id}|${l.segmento ?? ""}`;
    const g = m.get(k) ?? { indicador: l.indicador_id, segmento: l.segmento ?? "", granularidade: l.granularidade, pontos: [] };
    g.pontos.push({ periodo: l.periodo_referencia, valor: Number(l.valor) });
    m.set(k, g);
  }
  return [...m.values()];
}
/** Último período da série até o ano em foco. */
export function periodoAteAnoSerie(pontos: { periodo: string; valor: number }[], ano: number | null) {
  const ate = ano == null ? pontos : pontos.filter((p) => anoDoPeriodo(p.periodo) <= ano);
  return ate.length ? ate[ate.length - 1] : null;
}

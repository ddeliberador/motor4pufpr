// Séries municipais das Camadas de IA (ADR-0003): catálogo dos indicadores
// que o Mapa pinta por município e leitura de v_series_validas
// (entidade_tipo = 'municipio', chave = código IBGE de 7 dígitos).
// Os coletores rodam no Railway (backend/app/services/series_municipais).

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";

export type CamadaIa = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export interface SegmentoMunicipal { id: string; rotulo: string }

export interface IndicadorMunicipal {
  id: string;
  rotulo: string;
  unidade: string;
  camada: CamadaIa;
  fonte: string;
  segmentos: SegmentoMunicipal[];
  /** Pode ser dividido pela população (por 10 mil habitantes). */
  normalizavel: boolean;
  origem: "serie_da_fonte" | "foto_coletada" | "reconstruida";
  limitacao?: string;
  /** Sem base pública municipal: aparece desligado, com o motivo. */
  indisponivel?: string;
}

export const ROTULO_CAMADA: Record<CamadaIa, string> = {
  L1: "L1 · Energia", L2: "L2 · Infraestrutura física", L3: "L3 · Infraestrutura lógica", L4: "L4 · Modelos",
  L5: "L5 · Aplicações", L6: "L6 · Pesquisa", L7: "L7 · Governança",
};

export const INDICADORES_MUNICIPAIS: IndicadorMunicipal[] = [
  {
    id: "mun.gd_potencia_kw", rotulo: "Geração distribuída: potência acumulada", unidade: "kW", camada: "L1", fonte: "ANEEL",
    segmentos: [{ id: "", rotulo: "Todas as fontes" }, { id: "UFV", rotulo: "Solar (UFV)" }], normalizavel: true, origem: "reconstruida",
    limitacao: "Série reconstruída pela data de cadastro dos empreendimentos vigentes: unidades já desativadas não entram.",
  },
  {
    id: "mun.gd_unidades", rotulo: "Geração distribuída: unidades acumuladas", unidade: "unidades", camada: "L1", fonte: "ANEEL",
    segmentos: [{ id: "", rotulo: "Todas as fontes" }, { id: "UFV", rotulo: "Solar (UFV)" }], normalizavel: true, origem: "reconstruida",
  },
  {
    id: "mun.bl_acessos", rotulo: "Acessos de banda larga fixa", unidade: "acessos", camada: "L2", fonte: "ANATEL",
    segmentos: [{ id: "", rotulo: "Todas as tecnologias" }, { id: "fibra", rotulo: "Fibra óptica" }], normalizavel: true, origem: "serie_da_fonte",
  },
  {
    id: "mun.estab_dados", rotulo: "Estabelecimentos de hospedagem e dados (CNAE 631)", unidade: "estabelecimentos", camada: "L3", fonte: "Receita Federal",
    segmentos: [{ id: "", rotulo: "Ativos" }], normalizavel: true, origem: "foto_coletada",
  },
  {
    id: "mun.modelos", rotulo: "Modelos de IA", unidade: "", camada: "L4", fonte: "", segmentos: [], normalizavel: false, origem: "foto_coletada",
    indisponivel: "Não há base pública com recorte municipal para modelos de IA. O que existe (Hugging Face, Lattes) só se liga a um município pelo ator, e é assim que a Layer 4 aparece no mapa.",
  },
  {
    id: "mun.estab_ti", rotulo: "Estabelecimentos de serviços de TI (CNAE 62)", unidade: "estabelecimentos", camada: "L5", fonte: "Receita Federal",
    segmentos: [{ id: "", rotulo: "Ativos (inclui MEI)" }], normalizavel: true, origem: "foto_coletada",
  },
  {
    id: "mun.ppg", rotulo: "Programas de pós-graduação", unidade: "programas", camada: "L6", fonte: "CAPES",
    segmentos: [{ id: "", rotulo: "Todas as áreas" }, { id: "computacao", rotulo: "Ciência da Computação" }], normalizavel: false, origem: "serie_da_fonte",
  },
  {
    id: "mun.governanca", rotulo: "Governança municipal de CT&I", unidade: "", camada: "L7", fonte: "", segmentos: [], normalizavel: false, origem: "foto_coletada",
    indisponivel: "Ainda sem base municipal confiável: a MUNIC (IBGE) traz governo digital e legislação, mas o bloco de CT&I varia por edição e precisa ser validado antes de entrar.",
  },
];

export const INDICADOR_POPULACAO = "mun.populacao";

export interface PeriodoMunicipal { periodo: string; granularidade: string; municipios: number }

export async function carregarPeriodos(indicador: string, segmento: string): Promise<PeriodoMunicipal[]> {
  const { data, error } = await supabase.rpc("mun_serie_periodos", { p_indicador: indicador, p_segmento: segmento });
  if (error) throw error;
  return ((data ?? []) as { periodo_referencia: string; granularidade: string; municipios: number }[])
    .map((r) => ({ periodo: r.periodo_referencia, granularidade: r.granularidade, municipios: Number(r.municipios) }));
}

/** Valores de um indicador num período: código IBGE → valor. */
export async function carregarValores(indicador: string, segmento: string, periodo: string): Promise<Record<string, number>> {
  const linhas = await fetchAll<{ entidade_chave: string; valor: number | null }>(
    supabase.from("v_series_validas").select("entidade_chave,valor")
      .eq("indicador_id", indicador).eq("entidade_tipo", "municipio").eq("segmento", segmento).eq("periodo_referencia", periodo)
      .order("entidade_chave", { ascending: true }),
  );
  const out: Record<string, number> = {};
  for (const l of linhas) if (l.valor != null && l.entidade_chave) out[l.entidade_chave] = Number(l.valor);
  return out;
}

/** População mais recente por município (para normalizar por 10 mil habitantes). */
export async function carregarPopulacao(): Promise<{ periodo: string; valores: Record<string, number> } | null> {
  const periodos = await carregarPeriodos(INDICADOR_POPULACAO, "");
  if (!periodos.length) return null;
  const periodo = periodos[periodos.length - 1].periodo;
  return { periodo, valores: await carregarValores(INDICADOR_POPULACAO, "", periodo) };
}

export function usePeriodosMunicipais(indicador: string | null, segmento: string) {
  return useQuery({
    queryKey: ["mun-periodos", indicador, segmento],
    queryFn: () => carregarPeriodos(indicador as string, segmento),
    enabled: !!indicador,
    staleTime: 10 * 60_000,
  });
}

export function useValoresMunicipais(indicador: string | null, segmento: string, periodo: string | null) {
  return useQuery({
    queryKey: ["mun-valores", indicador, segmento, periodo],
    queryFn: () => carregarValores(indicador as string, segmento, periodo as string),
    enabled: !!indicador && !!periodo,
    staleTime: 10 * 60_000,
  });
}

export function usePopulacaoMunicipal(ativo: boolean) {
  return useQuery({ queryKey: ["mun-populacao"], queryFn: carregarPopulacao, enabled: ativo, staleTime: 60 * 60_000 });
}

/** Divide por população e devolve por 10 mil habitantes; municípios sem população ficam fora. */
export function porDezMilHabitantes(valores: Record<string, number>, populacao: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [ibge, v] of Object.entries(valores)) {
    const pop = populacao[ibge];
    if (pop && pop > 0) out[ibge] = (v / pop) * 10_000;
  }
  return out;
}

/** Cortes por quantis (5 classes) sobre os valores positivos; zero fica na primeira classe. */
export function cortesQuantis(valores: Record<string, number>, classes = 5): number[] {
  const v = Object.values(valores).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (v.length === 0) return [];
  const cortes: number[] = [];
  for (let k = 1; k < classes; k++) {
    const c = v[Math.min(v.length - 1, Math.floor((k / classes) * v.length))];
    if (cortes.length === 0 || c > cortes[cortes.length - 1]) cortes.push(c);
  }
  return cortes;
}

export function formatarValor(v: number, unidade: string, normalizado: boolean): string {
  const n = normalizado ? (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) : v.toLocaleString("pt-BR", { maximumFractionDigits: v >= 100 ? 0 : 1 });
  return normalizado ? `${n} ${unidade} / 10 mil hab.` : `${n} ${unidade}`;
}

export function rotuloPeriodo(periodo: string, granularidade: string): string {
  const [a, m] = periodo.split("-");
  return granularidade === "mes" ? `${m}/${a}` : a;
}

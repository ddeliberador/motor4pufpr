// Séries municipais das Camadas de IA (ADR-0003): catálogo dos indicadores
// que o Mapa pinta por município e leitura de v_series_validas
// (entidade_tipo = 'municipio', chave = código IBGE de 7 dígitos).
// Os coletores rodam no Railway (backend/app/services/series_municipais).

import { useQueries, useQuery } from "@tanstack/react-query";
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

/** Indicador municipal padrão de cada camada (o que entra na síntese). */
export const INDICADOR_PADRAO_POR_CAMADA: Partial<Record<CamadaIa, string>> = {
  L1: "mun.gd_potencia_kw", L2: "mun.bl_acessos", L3: "mun.estab_dados", L5: "mun.estab_ti", L6: "mun.ppg",
};
export const CAMADAS_COM_MUNICIPIO = Object.keys(INDICADOR_PADRAO_POR_CAMADA) as CamadaIa[];

export function indicadoresDaCamada(camada: CamadaIa): IndicadorMunicipal[] {
  return INDICADORES_MUNICIPAIS.filter((i) => i.camada === camada);
}

export const anoDoPeriodo = (p: string) => Number(p.slice(0, 4));

/** Último período cujo ano é ≤ ano (null quando não há nenhum até esse ano). */
export function periodoAteAno(periodos: PeriodoMunicipal[], ano: number | null): PeriodoMunicipal | null {
  if (!periodos.length) return null;
  if (ano == null) return periodos[periodos.length - 1];
  let escolhido: PeriodoMunicipal | null = null;
  for (const p of periodos) if (anoDoPeriodo(p.periodo) <= ano) escolhido = p;
  return escolhido;
}

/** Posição percentual (0–100) de cada município entre os que têm valor. */
export function postoPercentual(valores: Record<string, number>): Record<string, number> {
  const pares = Object.entries(valores).filter(([, v]) => Number.isFinite(v)).sort((a, b) => a[1] - b[1]);
  const n = pares.length;
  const out: Record<string, number> = {};
  if (n === 0) return out;
  // Empates recebem o mesmo posto (média das posições).
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && pares[j + 1][1] === pares[i][1]) j++;
    const posto = n === 1 ? 100 : ((i + j) / 2 / (n - 1)) * 100;
    for (let k = i; k <= j; k++) out[pares[k][0]] = posto;
    i = j + 1;
  }
  return out;
}

export interface SinteseMunicipal {
  /** 0–100: média dos postos percentuais nas camadas com dado. */
  valores: Record<string, number>;
  /** Camadas que entraram, com o período usado em cada uma. */
  camadas: { camada: CamadaIa; indicador: string; periodo: string; granularidade: string }[];
  /** Anos em que alguma camada tem dado (eixo da barra de tempo). */
  anos: number[];
  carregando: boolean;
  erro: string | null;
}

/**
 * Síntese municipal das camadas: para o ano em foco, cada camada usa o último
 * período até aquele ano, vira posto percentual (0–100) e a síntese é a média
 * das camadas com dado. Município sem dado em nenhuma camada fica fora.
 */
export function useSinteseMunicipal(ano: number | null, normalizar: boolean, ativo: boolean): SinteseMunicipal {
  const ids = CAMADAS_COM_MUNICIPIO.map((c) => INDICADOR_PADRAO_POR_CAMADA[c] as string);
  const periodosQs = useQueries({
    queries: ids.map((id) => ({ queryKey: ["mun-periodos", id, ""], queryFn: () => carregarPeriodos(id, ""), enabled: ativo, staleTime: 10 * 60_000 })),
  });
  const escolhidos = periodosQs.map((q) => periodoAteAno(q.data ?? [], ano));
  const valoresQs = useQueries({
    queries: ids.map((id, k) => ({
      queryKey: ["mun-valores", id, "", escolhidos[k]?.periodo ?? null],
      queryFn: () => carregarValores(id, "", escolhidos[k]!.periodo),
      enabled: ativo && !!escolhidos[k], staleTime: 10 * 60_000,
    })),
  });
  const popQ = usePopulacaoMunicipal(ativo && normalizar);
  const carregando = periodosQs.some((q) => q.isLoading) || valoresQs.some((q) => q.isLoading) || (normalizar && popQ.isLoading);
  const erro = [...periodosQs, ...valoresQs].find((q) => q.error)?.error as Error | undefined;
  const anos = [...new Set(periodosQs.flatMap((q) => (q.data ?? []).map((p) => anoDoPeriodo(p.periodo))))].sort((a, b) => a - b);
  const soma: Record<string, { s: number; n: number }> = {};
  const camadas: SinteseMunicipal["camadas"] = [];
  ids.forEach((id, k) => {
    const dados = valoresQs[k].data;
    const per = escolhidos[k];
    if (!dados || !per) return;
    const def = INDICADORES_MUNICIPAIS.find((i) => i.id === id);
    const base = normalizar && popQ.data && def?.normalizavel ? porDezMilHabitantes(dados, popQ.data.valores) : dados;
    const postos = postoPercentual(base);
    for (const [ibge, p] of Object.entries(postos)) {
      const acc = soma[ibge] ?? (soma[ibge] = { s: 0, n: 0 });
      acc.s += p; acc.n += 1;
    }
    camadas.push({ camada: CAMADAS_COM_MUNICIPIO[k], indicador: id, periodo: per.periodo, granularidade: per.granularidade });
  });
  const valores: Record<string, number> = {};
  for (const [ibge, { s, n }] of Object.entries(soma)) valores[ibge] = s / n;
  return { valores, camadas, anos, carregando, erro: erro?.message ?? null };
}

/** Cortes fixos para a síntese 0–100 (cinco faixas iguais). */
export const CORTES_SINTESE = [20, 40, 60, 80];

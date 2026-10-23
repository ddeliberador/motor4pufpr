// Séries históricas por estado agregadas nas cinco macrorregiões.
// Lê só de `v_series_validas` (regra do projeto para séries temporais) e soma
// as UFs no cliente. Participação é sempre razão de somas; estado sem linha no
// ano fica fora da soma e é contado como "sem dado", nunca como zero.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import { REGIOES, REGIAO_POR_UF, UFS_POR_REGIAO, type Regiao } from "@/lib/regioes";

export interface IndicadorRegional {
  id: string;
  rotulo: string;
  unidade: string;
  /** Camada de IA do Mapa a que o indicador se refere. */
  camada: string;
  /** Como a série nasceu: reconstruída a partir do estoque atual ou publicada pela fonte. */
  origem: "reconstruida" | "serie_da_fonte";
  /** Limitação que precisa aparecer junto do dado. */
  limitacao?: string;
}

export const INDICADORES_REGIONAIS: IndicadorRegional[] = [
  {
    id: "energia.capacidade_acumulada_mw",
    rotulo: "Capacidade elétrica instalada",
    unidade: "MW",
    camada: "L1 Energia",
    origem: "reconstruida",
    limitacao:
      "Série reconstruída pela data de entrada em operação das usinas ativas hoje (ANEEL). Usinas já desativadas não entram, então os anos antigos tendem a ficar subestimados.",
  },
  {
    id: "uf.doutores_titulados",
    rotulo: "Doutores titulados",
    unidade: "titulados no ano",
    camada: "L6 Pesquisa",
    origem: "serie_da_fonte",
  },
  {
    id: "uf.mestres_titulados",
    rotulo: "Mestres titulados",
    unidade: "titulados no ano",
    camada: "L6 Pesquisa",
    origem: "serie_da_fonte",
  },
  {
    id: "uf.patentes_residentes",
    rotulo: "Pedidos de patente de residentes",
    unidade: "pedidos no ano",
    camada: "L6 Pesquisa",
    origem: "serie_da_fonte",
  },
  // Transporte (camada da visão regional, fora das 7 camadas de IA): séries por UF
  // coletadas no Railway (series-uf:antaq_portos, series-uf:anac_aero).
  {
    id: "uf.porto_toneladas",
    rotulo: "Movimentação portuária",
    unidade: "toneladas no ano",
    camada: "Transporte",
    origem: "serie_da_fonte",
    limitacao: "Carga bruta das atracações por UF (ANTAQ, portos organizados e terminais privados). Sem dado até a coleta antaq_portos rodar em Gestão da Pesquisa → Coletas.",
  },
  {
    id: "uf.aero_passageiros",
    rotulo: "Passageiros embarcados",
    unidade: "passageiros no ano",
    camada: "Transporte",
    origem: "serie_da_fonte",
    limitacao: "Embarques nos aeroportos da UF (microdados ANAC, voos regulares e não regulares). Sem dado até a coleta anac_aero rodar em Gestão da Pesquisa → Coletas.",
  },
];

export interface LinhaSerieUf {
  entidade_chave: string;
  periodo_referencia: string;
  valor: number | string | null;
}

export interface CelulaRegional {
  /** Soma das UFs com dado no ano; null quando nenhuma UF da região tem dado. */
  valor: number | null;
  ufsComDado: number;
  ufsTotal: number;
  porUf: Record<string, number>;
}

export interface SerieRegional {
  anos: number[];
  celulas: Record<number, Record<Regiao, CelulaRegional>>;
  /** Maior valor regional em toda a série: escala fixa para a animação mostrar crescimento. */
  maximo: number;
}

export interface FonteSerie {
  fonte?: string;
  fonte_url?: string;
  metodo?: string;
  limitacao?: string;
}

/** Soma as linhas por UF em regiões, ano a ano. Função pura (testada). */
export function agregarPorRegiao(linhas: LinhaSerieUf[]): SerieRegional {
  const porAnoUf = new Map<number, Map<string, number>>();
  for (const l of linhas) {
    const uf = String(l.entidade_chave || "").toUpperCase();
    if (!REGIAO_POR_UF[uf]) continue;
    const ano = Number(String(l.periodo_referencia).slice(0, 4));
    const v = l.valor == null ? NaN : Number(l.valor);
    if (!Number.isFinite(ano) || !Number.isFinite(v)) continue;
    if (!porAnoUf.has(ano)) porAnoUf.set(ano, new Map());
    porAnoUf.get(ano)!.set(uf, v);
  }

  const anos = [...porAnoUf.keys()].sort((a, b) => a - b);
  const celulas: SerieRegional["celulas"] = {};
  let maximo = 0;
  for (const ano of anos) {
    const ufs = porAnoUf.get(ano)!;
    const linha = {} as Record<Regiao, CelulaRegional>;
    for (const r of REGIOES) {
      const porUf: Record<string, number> = {};
      let soma = 0;
      for (const uf of UFS_POR_REGIAO[r]) {
        const v = ufs.get(uf);
        if (v === undefined) continue;
        porUf[uf] = v;
        soma += v;
      }
      const ufsComDado = Object.keys(porUf).length;
      const valor = ufsComDado ? soma : null;
      if (valor !== null) maximo = Math.max(maximo, valor);
      linha[r] = { valor, ufsComDado, ufsTotal: UFS_POR_REGIAO[r].length, porUf };
    }
    celulas[ano] = linha;
  }
  return { anos, celulas, maximo };
}

/** Participação da região no total do país no ano (razão de somas). */
export function participacao(serie: SerieRegional, ano: number, regiao: Regiao): number | null {
  const linha = serie.celulas[ano];
  if (!linha || linha[regiao].valor == null) return null;
  const total = REGIOES.reduce((s, r) => s + (linha[r].valor ?? 0), 0);
  return total > 0 ? (linha[regiao].valor as number) / total : null;
}

/**
 * Índice base 100. A base é o primeiro ano com valor positivo dentro da janela
 * (padrão: 10 anos antes do ano exibido), para séries longas não compararem
 * com um ponto de partida quase nulo de décadas atrás.
 */
export function base100(
  serie: SerieRegional,
  ano: number,
  regiao: Regiao,
  janela = 10,
): { indice: number; anoBase: number } | null {
  const atual = serie.celulas[ano]?.[regiao]?.valor;
  if (atual == null) return null;
  for (const a of serie.anos) {
    if (a >= ano) break;
    if (a < ano - janela) continue;
    const v = serie.celulas[a][regiao].valor;
    if (v != null && v > 0) return { indice: (atual / v) * 100, anoBase: a };
  }
  return null;
}

export interface DadosSerieRegional {
  serie: SerieRegional;
  fonte: FonteSerie;
}

export async function carregarSerieRegional(indicadorId: string): Promise<DadosSerieRegional> {
  const linhas = await fetchAll<LinhaSerieUf>(
    supabase
      .from("v_series_validas")
      .select("entidade_chave,periodo_referencia,valor")
      .eq("indicador_id", indicadorId)
      .eq("entidade_tipo", "uf")
      .eq("segmento", "")
      .order("periodo_referencia", { ascending: true })
      .order("entidade_chave", { ascending: true }),
  );
  const { data: meta } = await supabase
    .from("v_series_validas")
    .select("metadados")
    .eq("indicador_id", indicadorId)
    .eq("entidade_tipo", "uf")
    .limit(1)
    .maybeSingle();
  return {
    serie: agregarPorRegiao(linhas),
    fonte: ((meta?.metadados ?? {}) as FonteSerie) || {},
  };
}

export function useSerieRegional(indicadorId: string, ativo: boolean) {
  return useQuery({
    queryKey: ["serie-regional", indicadorId],
    queryFn: () => carregarSerieRegional(indicadorId),
    enabled: ativo,
    staleTime: 10 * 60 * 1000,
  });
}

/** Preenchimento da região no mapa: escala única de intensidade, fixa na série inteira. */
export function corRegiao(valor: number | null, maximo: number): string {
  if (valor == null || maximo <= 0) return "hsl(var(--muted) / 0.35)";
  const t = Math.max(0, Math.min(1, valor / maximo));
  return `hsl(var(--primary) / ${(0.08 + 0.62 * t).toFixed(3)})`;
}

const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export const formatarValorRegional = (valor: number | null) => (valor == null ? "sem dado" : fmt(valor));

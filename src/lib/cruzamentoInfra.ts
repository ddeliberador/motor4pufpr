import { SITUACOES_ENERGIA } from "./infraEstados";

export interface BalancoCruzamento { uf: string; situacao: string; razao_geracao_consumo: number | null; razao_brasil: number | null;
  ano?: number; geracao_gwh?: number; consumo_gwh?: number; consumo_per_capita_kwh?: number; mmgd_mw?: number | null; crescimento_consumo_5a_pct?: number | null;
}
export type CargaBalanco = { status: "carregando" } | { status: "erro" } | { status: "ok"; dados: BalancoCruzamento[] };
export interface EstadoCruzamento {
  uf: string; situacao: string | null; razao: number | null; brasil: number | null;
  dc: number | null; cabo: number | null; fibra: number | null;
  tarifa: number | null; rankTarifa: number | null;
}

// Ranking de custo da tarifa residencial (R$/MWh): 1º é a mais barata. Tarifas iguais dividem a posição.
export function rankingTarifa(tarifas: Record<string, number | null | undefined> | null): Record<string, number> {
  if (!tarifas) return {};
  const validas = Object.entries(tarifas).filter(([, t]) => t != null && Number.isFinite(t as number)) as [string, number][];
  validas.sort((a, b) => a[1] - b[1]);
  const rank: Record<string, number> = {};
  validas.forEach(([uf, t], i) => {
    const empatada = i > 0 && validas[i - 1][1] === t;
    rank[uf] = empatada ? rank[validas[i - 1][0]] : i + 1;
  });
  return rank;
}

export function energiaSemProcessamento(l: Pick<EstadoCruzamento, "situacao" | "dc">) {
  // Inclui PA (dois registros), conforme os estados solicitados na conferência.
  return l.situacao === SITUACOES_ENERGIA[0] && l.dc != null && l.dc <= 2;
}

export function resumoCruzamento(linhas: EstadoCruzamento[], totalDc: number | null) {
  if (totalDc == null || totalDc <= 0 || linhas.some(l => l.situacao == null || l.dc == null)) return null;
  const exportadores = linhas.filter(l => l.situacao === SITUACOES_ENERGIA[0]);
  const dependentes = linhas.filter(l => l.situacao === SITUACOES_ENERGIA[2]);
  return {
    exportadores: exportadores.length,
    pctExportadores: 100 * exportadores.reduce((s, l) => s + (l.dc ?? 0), 0) / totalDc,
    pctDependentes: 100 * dependentes.reduce((s, l) => s + (l.dc ?? 0), 0) / totalDc,
    principalDependente: [...dependentes].sort((a, b) => (b.dc ?? 0) - (a.dc ?? 0))[0]?.uf,
  };
}

export function fraseBalanco(razao: number | null) {
  if (razao == null || !Number.isFinite(razao)) return "indisponível";
  return razao < 1
    ? `gera ${(razao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% do que consome`
    : `gera ${razao.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}× o que consome`;
}

const WB_BASE = "https://api.worldbank.org/v2";

export interface WBIndicador {
  codigo: string;
  descricao: string;
  pais: string;
  ano: string;
  valor: number | null;
}

/** Série histórica de um indicador do World Bank para o Brasil (últimos `anos` anos). */
export async function buscarIndicadorBR(codigo: string, anos = 10): Promise<WBIndicador[]> {
  const anoFim = new Date().getFullYear();
  const anoIni = anoFim - anos;
  const url = `${WB_BASE}/country/BR/indicator/${codigo}?format=json&date=${anoIni}:${anoFim}&per_page=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WorldBank ${codigo}: HTTP ${res.status}`);
  const raw = await res.json();

  // [paginação, dados]; indicador inválido retorna só um elemento
  if (!Array.isArray(raw) || raw.length < 2 || !Array.isArray(raw[1])) {
    console.warn(`WorldBank: indicador ${codigo} não retornou dados`, raw);
    return [];
  }

  return raw[1]
    .filter((r: { value: number | null }) => r.value !== null)
    .map((r: { indicator: { id: string; value: string }; country: { value: string }; date: string; value: number }) => ({
      codigo: r.indicator.id,
      descricao: r.indicator.value,
      pais: r.country.value,
      ano: r.date,
      valor: r.value,
    }));
}

export const INDICADORES_SNI = {
  pd_pib: "GB.XPD.RSDV.GD.ZS",
  pesquisadores: "SP.POP.SCIE.RD.P6",
  exp_alta_tec: "TX.VAL.TECH.MF.ZS",
  patentes: "IP.PAT.RESD",
  internet: "IT.NET.USER.ZS",
} as const;

/** Busca os 5 indicadores de inovação do Brasil; falhas são registradas, nunca silenciadas. */
export async function buscarPainelInovacaoBR(): Promise<Record<string, WBIndicador[]>> {
  const entradas = Object.entries(INDICADORES_SNI);
  const resultados = await Promise.allSettled(entradas.map(([, codigo]) => buscarIndicadorBR(codigo)));
  const painel: Record<string, WBIndicador[]> = {};
  resultados.forEach((r, i) => {
    const [chave, codigo] = entradas[i];
    if (r.status === "fulfilled") painel[chave] = r.value;
    else console.error(`WorldBank: falha em ${codigo}`, r.reason);
  });
  return painel;
}

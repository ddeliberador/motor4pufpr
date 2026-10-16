// Macrorregiões do IBGE. Fonte única para Mapa, listagem e Data Lake,
// para que filtro regional e visão regional nunca divirjam.

export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"] as const;
export type Regiao = (typeof REGIOES)[number];

export const REGIAO_POR_UF: Record<string, Regiao> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

export const UFS_POR_REGIAO: Record<Regiao, string[]> = REGIOES.reduce(
  (acc, r) => {
    acc[r] = Object.keys(REGIAO_POR_UF).filter((uf) => REGIAO_POR_UF[uf] === r).sort();
    return acc;
  },
  {} as Record<Regiao, string[]>,
);

/** Posição (lon, lat) do rótulo de cada região no mapa, dentro do território. */
export const ROTULO_REGIAO: Record<Regiao, [number, number]> = {
  Norte: [-61.5, -4.5],
  Nordeste: [-40.5, -8.2],
  "Centro-Oeste": [-54.5, -14.5],
  Sudeste: [-45.5, -19.8],
  Sul: [-52.5, -27.6],
};

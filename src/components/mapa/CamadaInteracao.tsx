// Camada de interação (cooperação EMBRAPII): tipos e agregação dos fluxos
// UF→UF. O desenho fica a cargo do MapaBrasil (MapLibre), que recebe os
// arcos agregados e as unidades pela prop `interacao`.

export type FluxoUf = {
  ano: number | null; tecnologia: string | null;
  origem_uf: string | null; origem_lat: number | null; origem_lon: number | null;
  destino_uf: string | null; destino_lat: number | null; destino_lon: number | null;
  lacos: number | null; projetos: number | null; destinos: number | null; valor_rateado: number | null;
};
export type UnidadeEmbrapii = {
  co_unidade: number | null; unidade_embrapii: string | null; sigla: string | null; tipo_instituicao: string | null;
  uf: string | null; cidade: string | null; status_credenciamento: string | null;
  lat: number | null; lon: number | null; coordenada_aproximada: boolean | null;
  projetos: number | null; valor_total_ipca: number | null; empresas: number | null; ufs_alcancadas: number | null;
};
export type ArcoAgregado = {
  chave: string; origem: string; destino: string;
  o: [number, number]; d: [number, number];
  lacos: number; projetos: number; empresas: number; valor: number;
};

export interface CamadaInteracaoProps {
  arcos: ArcoAgregado[];
  unidades: UnidadeEmbrapii[];
  onArco: (a: ArcoAgregado) => void;
  onUnidade: (u: UnidadeEmbrapii) => void;
}

export const COR_INTERACAO = "#f59e0b";

/** Soma os fluxos filtrados por par origem→destino. */
export function agregarArcos(linhas: FluxoUf[]): ArcoAgregado[] {
  const m = new Map<string, ArcoAgregado>();
  for (const r of linhas) {
    if (!r.origem_uf || !r.destino_uf || r.origem_lat == null || r.origem_lon == null || r.destino_lat == null || r.destino_lon == null) continue;
    const k = `${r.origem_uf}>${r.destino_uf}`;
    const a = m.get(k) ?? { chave: k, origem: r.origem_uf, destino: r.destino_uf, o: [r.origem_lon, r.origem_lat], d: [r.destino_lon, r.destino_lat], lacos: 0, projetos: 0, empresas: 0, valor: 0 };
    a.lacos += Number(r.lacos ?? 0); a.projetos += Number(r.projetos ?? 0); a.empresas += Number(r.destinos ?? 0); a.valor += Number(r.valor_rateado ?? 0);
    m.set(k, a);
  }
  return [...m.values()].sort((x, y) => x.lacos - y.lacos);
}

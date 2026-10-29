// Catálogo vivo das séries históricas: o que existe de verdade em
// v_series_validas (função series_catalogo), por indicador, recorte (uf ou
// município) e segmento, com o primeiro e o último ano. O Mapa só lista
// indicadores presentes aqui com pelo menos dois períodos; o resto não aparece,
// em vez de aparecer como "ainda sem série".

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SerieCatalogada { indicador_id: string; entidade_tipo: "uf" | "municipio"; segmento: string; ano_min: number; ano_max: number; entidades: number; periodos: number }

export async function carregarCatalogoSeries(): Promise<SerieCatalogada[]> {
  const { data, error } = await supabase.rpc("series_catalogo");
  if (error) throw error;
  return ((data ?? []) as SerieCatalogada[]).map((r) => ({ ...r, segmento: r.segmento ?? "", ano_min: Number(r.ano_min), ano_max: Number(r.ano_max), entidades: Number(r.entidades), periodos: Number(r.periodos) }));
}

export function useCatalogoSeries() {
  return useQuery({ queryKey: ["series-catalogo"], queryFn: carregarCatalogoSeries, staleTime: 10 * 60_000 });
}

/** Série usável: existe no recorte e tem ao menos dois períodos (um só não é evolução). */
export function serieDisponivel(cat: SerieCatalogada[] | undefined, indicador: string, recorte: "uf" | "municipio", segmento = ""): SerieCatalogada | null {
  const r = cat?.find((c) => c.indicador_id === indicador && c.entidade_tipo === recorte && c.segmento === segmento);
  return r && r.periodos >= 2 ? r : null;
}

// Detalhamento dos registros do mapa (location_enrichment):
// - OpenAlex: domínio, campo, subcampo e tópicos de pesquisa da instituição
// - EMBRAPII: competências tecnológicas e linhas de ação da unidade
// - FORMICT: natureza jurídica/administrativa da ICT (CNPJ, Receita Federal)
// Coleta feita uma única vez e gravada na base — o mapa lê apenas da base.

import { safeSupabase } from "@/lib/supabaseClient";

export type Enriquecimento = Record<string, unknown>;

/** location_id -> dados detalhados */
export type MapaEnriquecimento = Record<string, Enriquecimento>;

export async function fetchLocationEnrichment(): Promise<MapaEnriquecimento> {
  const passo = 1000;
  const out: MapaEnriquecimento = {};
  for (let de = 0; de < 20000; de += passo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = safeSupabase.from("location_enrichment");
    const { data, error } = await builder
      .select("location_id,dados")
      .order("location_id", { ascending: true })
      .range(de, de + passo - 1);
    if (error) throw error;
    const lote = (data || []) as { location_id: string; dados: Enriquecimento }[];
    for (const r of lote) out[r.location_id] = r.dados || {};
    if (lote.length < passo) break;
  }
  return out;
}

export const listaDe = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

export const textoDe = (v: unknown): string[] =>
  typeof v === "string" && v.trim() ? [v.trim()] : [];

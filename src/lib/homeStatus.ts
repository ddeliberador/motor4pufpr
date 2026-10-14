import { safeSupabase } from "@/lib/supabaseClient";

/** Fresh aggregate-only server read: ingest_runs is not publicly readable. */
export async function carregarStatusHome(): Promise<{ bases: number; coletas: number }> {
  const { data, error } = await safeSupabase.functions.invoke("home-status");
  if (error || !data || !Number.isInteger(data.bases) || !Number.isInteger(data.coletas)
    || data.bases < 0 || data.coletas < 0) throw new Error("Contagens indisponíveis");
  return { bases: data.bases, coletas: data.coletas };
}

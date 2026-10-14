import { safeSupabase } from "@/lib/supabaseClient";

type Fonte = { fonte: string };
export const contarFontesColetadas = (linhas: Fonte[]) => new Set(linhas.map((linha) => linha.fonte)).size;

/** Fresh reads on every visit; fail the entire status line rather than inventing totals. */
export async function carregarStatusHome(): Promise<{ bases: number; coletas: number }> {
  const catalogo = safeSupabase.from("catalogo_bases").select("id", { count: "exact", head: true });
  const fontes = (async () => {
    const linhas: Fonte[] = [];
    for (let inicio = 0; ; inicio += 1000) {
      const { data, error } = await safeSupabase.from("ingest_runs")
        .select("fonte").eq("ok", true).order("id").range(inicio, inicio + 999);
      if (error) throw error;
      if (!data) throw new Error("Coletas indisponíveis");
      linhas.push(...data);
      if (data.length < 1000) return contarFontesColetadas(linhas);
    }
  })();
  const [{ count, error }, coletas] = await Promise.all([catalogo, fontes]);
  if (error || count === null) throw error ?? new Error("Catálogo indisponível");
  return { bases: count, coletas };
}
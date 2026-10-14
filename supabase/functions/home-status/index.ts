import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Deliberately public, aggregate-only endpoint: no inputs, records or credentials returned.
Deno.serve(async (req) => {
  const headers = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["POST", "GET"].includes(req.method)) return new Response("{}", { status: 405, headers });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Configuration unavailable");
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const fontes = (async () => {
      const distinct = new Set<string>();
      for (let inicio = 0; ; inicio += 1000) {
        const { data, error } = await db.from("ingest_runs").select("fonte").eq("ok", true)
          .order("id").range(inicio, inicio + 999);
        if (error || !data) throw new Error("Read failed");
        for (const row of data) distinct.add(row.fonte);
        if (data.length < 1000) return distinct.size;
      }
    })();
    const [{ count, error }, coletas] = await Promise.all([
      db.from("catalogo_bases").select("id", { count: "exact", head: true }), fontes,
    ]);
    if (error || count === null) throw new Error("Read failed");
    return new Response(JSON.stringify({ bases: count, coletas }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: "Contagens indisponíveis" }), { status: 503, headers });
  }
});

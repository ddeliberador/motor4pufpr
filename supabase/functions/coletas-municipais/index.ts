// Painel de coletas municipais (Gestão da Pesquisa → Coletas): repassa ao
// backend do Railway o disparo e o acompanhamento das séries municipais
// (ADR-0003), guardando a MCTI_API_KEY aqui. Só administradores (is_admin) do
// Motor podem chamar; o JWT do usuário é validado pelo gateway (verify_jwt).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RAILWAY_API_URL = Deno.env.get("RAILWAY_API_URL") || "https://motor4pufpr-copy-production-5681.up.railway.app/api/v1";
const MCTI_API_KEY = Deno.env.get("MCTI_API_KEY") || "";
const FONTES = new Set(["ibge_pop", "anatel_bl", "aneel_gd", "cnpj_cnae", "capes_ppg"]);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: admin, error: erroAdmin } = await sb.rpc("is_admin");
  if (erroAdmin || !admin) return json({ error: "só administradores do Motor podem disparar coletas" }, 403);
  if (!MCTI_API_KEY) return json({ error: "MCTI_API_KEY ausente nas secrets" }, 500);

  let p: { acao?: string; fonte?: string; amostra?: number; simular?: boolean } = {};
  try { p = await req.json(); } catch { /* corpo vazio = status */ }
  const cab = { "X-API-Key": MCTI_API_KEY, "Content-Type": "application/json" };
  try {
    if (p.acao === "disparar") {
      if (!p.fonte || !FONTES.has(p.fonte)) return json({ error: "fonte desconhecida" }, 400);
      const q = new URLSearchParams();
      if (p.amostra) q.set("amostra", String(Math.max(1, Math.floor(p.amostra))));
      if (p.simular) q.set("simular", "true");
      const r = await fetch(`${RAILWAY_API_URL}/coletas/municipal/${p.fonte}?${q}`, { method: "POST", headers: cab, signal: AbortSignal.timeout(30_000) });
      return json(await r.json(), r.ok ? 200 : r.status);
    }
    const r = await fetch(`${RAILWAY_API_URL}/coletas/municipal`, { headers: cab, signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return json({ error: `backend respondeu HTTP ${r.status}` }, 502);
    return json(await r.json());
  } catch (e) {
    return json({ error: `backend inacessível: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }
});

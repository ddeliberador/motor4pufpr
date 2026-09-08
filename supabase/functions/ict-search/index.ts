import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guardRequest } from "../_shared/guard.ts";

// Proxy fino para o backend Python (Railway), que usa o Tucano 2 local apenas
// para RESUMIR a lista real de instituições coletada pelo Motor — nunca para
// gerar nomes de instituição. Nenhuma chave de IA paga.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAILWAY_API_URL = Deno.env.get("RAILWAY_API_URL") ||
  "https://motor4pufpr-copy-production-5681.up.railway.app/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await guardRequest<{
      query?: string;
      institutions?: unknown;
      uf?: string;
      municipio?: string;
    }>(req, "ict-search", corsHeaders, { limit: 30 });
    if (!guard.ok) return guard.response;

    const query = typeof guard.body.query === "string" ? guard.body.query.trim().slice(0, 200) : "";
    if (!query) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const institutions = Array.isArray(guard.body.institutions)
      ? guard.body.institutions.slice(0, 25)
      : [];

    const res = await fetch(`${RAILWAY_API_URL}/analysis/icts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        institutions,
        uf: typeof guard.body.uf === "string" ? guard.body.uf.slice(0, 2) : undefined,
        municipio: typeof guard.body.municipio === "string" ? guard.body.municipio.slice(0, 80) : undefined,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Backend de ICTs retornou ${res.status}: ${text.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(text, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("ICT proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

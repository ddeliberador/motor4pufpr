import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guardRequest } from "../_shared/guard.ts";

// Proxy fino para endpoints GET do backend Python (Railway) que o navegador
// precisa consultar. A chave institucional (X-API-Key) fica só aqui, como
// secret do backend — nunca no código do repositório público.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAILWAY_API_URL = Deno.env.get("RAILWAY_API_URL") ||
  "https://motor4pufpr-copy-production-5681.up.railway.app/api/v1";
const MCTI_API_KEY = Deno.env.get("MCTI_API_KEY") || "";

// Somente caminhos conhecidos podem ser encaminhados.
const ALLOWED_PATHS = new Set(["/companies/public-by-cnae", "/incidence/ontology"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await guardRequest<{ path?: string; params?: Record<string, string | string[]> }>(
      req,
      "railway-proxy",
      corsHeaders,
      { limit: 60 },
    );
    if (!guard.ok) return guard.response;

    const path = typeof guard.body.path === "string" ? guard.body.path : "";
    if (!ALLOWED_PATHS.has(path)) {
      return new Response(JSON.stringify({ error: "path não permitido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const search = new URLSearchParams();
    const params = guard.body.params && typeof guard.body.params === "object" ? guard.body.params : {};
    for (const [k, v] of Object.entries(params)) {
      const key = String(k).slice(0, 40);
      if (Array.isArray(v)) v.slice(0, 30).forEach((item) => search.append(key, String(item).slice(0, 120)));
      else search.append(key, String(v).slice(0, 200));
    }

    const res = await fetch(`${RAILWAY_API_URL}${path}?${search.toString()}`, {
      headers: { "Content-Type": "application/json", "X-API-Key": MCTI_API_KEY },
    });

    const text = await res.text();
    return new Response(text, {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("railway-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

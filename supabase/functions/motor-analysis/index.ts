import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guardRequest } from "../_shared/guard.ts";

// Proxy fino: a geração acontece no backend Python (Railway), com o modelo
// aberto brasileiro Tucano 2 auto-hospedado via Ollama. Nenhuma chave de IA paga.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAILWAY_API_URL = Deno.env.get("RAILWAY_API_URL") ||
  "https://motor4pufpr-copy-production-5681.up.railway.app/api/v1";
const MCTI_API_KEY = Deno.env.get("MCTI_API_KEY") || "";

const PERSONAS = ["pesquisador", "universidade", "empresa", "governo"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const guard = await guardRequest<{ searchData?: any; persona?: string; entityContext?: any }>(
      req,
      "motor-analysis",
      corsHeaders,
      { limit: 20 },
    );
    if (!guard.ok) return guard.response;

    const { searchData, persona, entityContext } = guard.body;
    if (!searchData || typeof searchData !== "object") {
      return new Response(JSON.stringify({ error: "searchData is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const personaKey = typeof persona === "string" && PERSONAS.includes(persona) ? persona : "pesquisador";

    // Modelo pequeno em CPU: a geração pode levar minutos.
    const res = await fetch(`${RAILWAY_API_URL}/analysis/motor-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": MCTI_API_KEY },
      body: JSON.stringify({ searchData, persona: personaKey, entityContext }),
    });

    const text = await res.text();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Backend de análise retornou ${res.status}: ${text.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(text, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Motor analysis proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

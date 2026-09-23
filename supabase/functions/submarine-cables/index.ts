// Proxy para a API pública TeleGeography Submarine Cable Map.
// Resolve bloqueio de CORS no browser, mantendo a fonte real como origem.
// Nunca armazena dados; apenas repassa a resposta da TeleGeography.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
};

const BASE = "https://www.submarinecablemap.com/api/v3";

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const contentType = res.headers.get("content-type") || "";
  let body: string;
  try {
    body = await res.text();
  } catch (e) {
    body = `read-error: ${e}`;
  }
  if (!res.ok) {
    throw new Error(`${path}: HTTP ${res.status} (${contentType}) — ${body.slice(0, 240)}`);
  }
  if (!contentType.includes("application/json")) {
    throw new Error(`${path}: resposta não-JSON (${contentType}) — ${body.slice(0, 240)}`);
  }
  return JSON.parse(body);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let cableId: string | null = null;
  try {
    const body = await req.json();
    cableId = body?.cable_id ?? null;
  } catch { /* sem body = lista geral */ }

  try {
    if (cableId) {
      const data = await fetchJson(`/cable/${cableId}.json`);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [cables, points] = await Promise.all([
      fetchJson("/cable/all.json"),
      fetchJson("/landing-point/all.json"),
    ]);

    return new Response(JSON.stringify({ cables, points }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

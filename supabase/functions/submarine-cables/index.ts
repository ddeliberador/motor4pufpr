// Proxy para a API pública TeleGeography Submarine Cable Map.
// Resolve bloqueio de CORS no browser, mantendo a fonte real como origem.
// Nunca armazena dados; apenas repassa a resposta da TeleGeography.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
};

const BASE = "https://www.submarinecablemap.com/api/v3";

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
      const res = await fetch(`${BASE}/cable/${cableId}.json`);
      if (!res.ok) throw new Error(`TeleGeography cable ${cableId}: ${res.status}`);
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [cablesRes, pointsRes] = await Promise.all([
      fetch(`${BASE}/cable/all.json`),
      fetch(`${BASE}/landing-point/all.json`),
    ]);

    if (!cablesRes.ok) throw new Error(`cable/all.json: ${cablesRes.status}`);
    if (!pointsRes.ok) throw new Error(`landing-point/all.json: ${pointsRes.status}`);

    const cables = await cablesRes.json();
    const points = await pointsRes.json();

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

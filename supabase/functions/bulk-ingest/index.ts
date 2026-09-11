// Carga em lote de registros já coletados/decodificados fora do Motor.
// Protegida por header x-ingest-key (BULK_INGEST_KEY). Não inventa dado algum:
// grava exatamente as linhas recebidas, em blocos, e devolve contagens reais.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BULK_KEY = Deno.env.get("BULK_INGEST_KEY") || "";

const TABELAS_PERMITIDAS = new Set(["city_geocode", "research_locations"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!BULK_KEY) return json({ error: "Carga em lote não configurada no servidor" }, 503);
  if ((req.headers.get("x-ingest-key") || "") !== BULK_KEY) {
    return json({ error: "Header x-ingest-key obrigatório ou inválido" }, 401);
  }

  let body: { table?: string; rows?: Record<string, unknown>[]; on_conflict?: string; merge?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const table = body.table || "";
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!TABELAS_PERMITIDAS.has(table)) return json({ error: `table inválida. Use: ${[...TABELAS_PERMITIDAS].join(", ")}` }, 400);
  if (rows.length === 0) return json({ error: "rows vazio" }, 400);

  let inserted = 0;
  const erros: string[] = [];

  for (let i = 0; i < rows.length; i += 250) {
    const chunk = rows.slice(i, i + 250);
    const qs = body.on_conflict ? `?on_conflict=${encodeURIComponent(body.on_conflict)}` : "";
    const prefer = ["return=minimal"];
    if (body.merge && body.on_conflict) prefer.push("resolution=merge-duplicates");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: prefer.join(","),
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      erros.push(`bloco ${i}-${i + chunk.length}: HTTP ${res.status} ${await res.text()}`);
      continue;
    }
    inserted += chunk.length;
  }

  return json({ table, received: rows.length, inserted, failed: erros.length > 0, erros });
});

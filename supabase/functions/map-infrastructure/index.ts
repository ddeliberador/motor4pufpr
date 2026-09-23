import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guardRequest } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ArcFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
};

const ENERGY_LAYERS = [
  { id: 1, tipo: "UHE" },
  { id: 2, tipo: "PCH" },
  { id: 3, tipo: "CGH" },
  { id: 6, tipo: "EOL" },
  { id: 32, tipo: "UFV" },
  { id: 29, tipo: "UTE" },
] as const;

const ARC_BASE =
  "https://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/LayerToShape/MapServer";

function texto(a: Record<string, unknown>, ...chaves: string[]): string {
  for (const chave of chaves) {
    const valor = a[chave];
    if (valor != null && String(valor).trim()) return String(valor).trim();
  }
  return "";
}

function numero(a: Record<string, unknown>, ...chaves: string[]): number | undefined {
  for (const chave of chaves) {
    const valor = Number(a[chave]);
    if (Number.isFinite(valor)) return valor;
  }
  return undefined;
}

async function carregarEnergia() {
  const resultados = await Promise.allSettled(ENERGY_LAYERS.map(async ({ id, tipo }) => {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
      resultRecordCount: "100000",
    });
    const resposta = await fetch(`${ARC_BASE}/${id}/query?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(45_000),
    });
    if (!resposta.ok) throw new Error(`${tipo}: HTTP ${resposta.status}`);
    const payload = await resposta.json();
    if (payload.error) throw new Error(`${tipo}: ${payload.error.message || "erro ArcGIS"}`);
    return ((payload.features || []) as ArcFeature[]).flatMap((feature, indice) => {
      const a = feature.attributes || {};
      const longitude = Number(feature.geometry?.x);
      const latitude = Number(feature.geometry?.y);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      const objectId = texto(a, "OBJECTID", "FID", "CEG", "COD_CEG") || String(indice);
      return [{
        id: `${tipo}-${objectId}`,
        nome: texto(a, "NOME", "NomEmpreendimento", "NOME_USINA") || `${tipo} sem nome`,
        tipo,
        combustivel: texto(a, "COMBUSTIV", "COMBUSTIVEL", "FONTE", "NomFonteCombustivel"),
        potencia_kw: numero(a, "POTENCIA", "POT_FISC", "MdaPotenciaFiscalizadaKW", "POTENCIA_KW"),
        situacao: texto(a, "SITUACAO", "DscSituacaoUsina", "FASE"),
        municipio: texto(a, "MUNIC_CF", "MUNICIPIO", "NomMunicipio"),
        uf: texto(a, "UF_CF", "UF", "SigUFNomeMunicipio"),
        longitude,
        latitude,
      }];
    });
  }));

  const data = resultados.flatMap((resultado) => resultado.status === "fulfilled" ? resultado.value : []);
  const failures = resultados.flatMap((resultado, indice) =>
    resultado.status === "rejected"
      ? [{ tipo: ENERGY_LAYERS[indice].tipo, error: String(resultado.reason) }]
      : []
  );
  if (data.length === 0) throw new Error(`ANEEL sem dados. Falhas: ${JSON.stringify(failures)}`);
  return { data, failures, source: ARC_BASE };
}

async function carregarDatacenters() {
  const url = "https://www.peeringdb.com/api/fac?country=BR";
  const resposta = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Motor4PUFPR/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resposta.ok) throw new Error(`PeeringDB: HTTP ${resposta.status}`);
  const payload = await resposta.json();
  const data = (Array.isArray(payload.data) ? payload.data : []).flatMap((fac: Record<string, unknown>) => {
    const latitude = Number(fac.latitude);
    const longitude = Number(fac.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{
      id: Number(fac.id),
      nome: String(fac.name || "Datacenter sem nome"),
      cidade: fac.city ? String(fac.city) : undefined,
      uf: fac.state ? String(fac.state) : undefined,
      latitude,
      longitude,
      org: fac.org_name ? String(fac.org_name) : undefined,
      website: fac.website ? String(fac.website) : undefined,
      redes: Number.isFinite(Number(fac.net_count)) ? Number(fac.net_count) : undefined,
    }];
  });
  return { data, source: url };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const guard = await guardRequest<{ layer?: string }>(req, "map-infrastructure", corsHeaders, { limit: 20 });
    if (!guard.ok) return guard.response;
    const resultado = guard.body.layer === "energy"
      ? await carregarEnergia()
      : guard.body.layer === "datacenters"
        ? await carregarDatacenters()
        : null;
    if (!resultado) {
      return new Response(JSON.stringify({ error: "layer inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("map-infrastructure error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "falha desconhecida" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
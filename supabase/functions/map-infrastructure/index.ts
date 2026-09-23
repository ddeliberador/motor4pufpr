import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guardRequest } from "../_shared/guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Base oficial SIGA (Sistema de Informações de Geração da ANEEL), via CKAN Dados Abertos.
// O ArcGIS do SIGEL não é acessível a partir do runtime (timeout/geobloqueio).
const SIGA_RESOURCE = "11ec447d-698d-4ab8-977f-b424d5deee6a";
const SIGA_BASE = "https://dadosabertos.aneel.gov.br/api/3/action/datastore_search";
const TIPOS_VALIDOS = new Set(["UHE", "PCH", "EOL", "UFV", "UTE", "CGH", "UTN"]);
const LIMITE = 6000;

function texto(a: Record<string, unknown>, ...chaves: string[]): string {
  for (const chave of chaves) {
    const valor = a[chave];
    if (valor != null && String(valor).trim()) return String(valor).trim();
  }
  return "";
}

/** Converte números no formato brasileiro ("-20,12479858" / "1.400,00"). */
function numeroBr(valor: unknown): number | undefined {
  if (valor == null) return undefined;
  const bruto = String(valor).trim();
  if (!bruto) return undefined;
  const normalizado = bruto.includes(",")
    ? bruto.replace(/\./g, "").replace(",", ".")
    : bruto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : undefined;
}

async function buscarPagina(offset: number, limite: number) {
  const params = new URLSearchParams({
    resource_id: SIGA_RESOURCE,
    filters: JSON.stringify({ DscFaseUsina: "Operação" }),
    limit: String(limite),
    offset: String(offset),
  });
  const resposta = await fetch(`${SIGA_BASE}?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(40_000),
  });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`ANEEL SIGA: HTTP ${resposta.status} ${corpo.slice(0, 300)}`);
  }
  const payload = await resposta.json();
  if (payload.success === false) {
    throw new Error(`ANEEL SIGA: ${JSON.stringify(payload.error).slice(0, 300)}`);
  }
  return (payload.result?.records ?? []) as Record<string, unknown>[];
}

async function carregarEnergia() {
  const PAGINA = 2000;
  const registros: Record<string, unknown>[] = [];
  for (let offset = 0; offset < LIMITE; offset += PAGINA) {
    const pagina = await buscarPagina(offset, Math.min(PAGINA, LIMITE - offset));
    registros.push(...pagina);
    if (pagina.length < PAGINA) break;
  }

  const data = registros.flatMap((r, indice) => {
    const tipo = texto(r, "SigTipoGeracao").toUpperCase();
    if (!TIPOS_VALIDOS.has(tipo)) return [];
    const latitude = numeroBr(r.NumCoordNEmpreendimento);
    const longitude = numeroBr(r.NumCoordEEmpreendimento);
    if (latitude == null || longitude == null) return [];
    if (latitude < -35 || latitude > 6 || longitude < -75 || longitude > -33) return [];
    const municipioUf = texto(r, "DscMuninicpios");
    return [{
      id: `${tipo}-${texto(r, "CodCEG") || indice}`,
      nome: texto(r, "NomEmpreendimento") || `${tipo} sem nome`,
      tipo,
      combustivel: texto(r, "NomFonteCombustivel"),
      potencia_kw: numeroBr(r.MdaPotenciaFiscalizadaKw) ?? numeroBr(r.MdaPotenciaOutorgadaKw),
      situacao: texto(r, "DscFaseUsina"),
      municipio: municipioUf.split(" - ")[0] ?? "",
      uf: texto(r, "SigUFPrincipal"),
      longitude,
      latitude,
    }];
  });

  if (data.length === 0) throw new Error("ANEEL SIGA respondeu sem usinas georreferenciadas.");
  return { data, failures: [], source: `${SIGA_BASE} (resource ${SIGA_RESOURCE})` };
}

async function carregarDatacenters() {
  const url = "https://www.peeringdb.com/api/fac?country=BR";
  const resposta = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Motor4PUFPR/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  // 429 = limite de requisições do PeeringDB (origem viva indisponível no momento).
  // Devolvemos 200 com data vazia e a falha registrada: o cliente usa o snapshot
  // público validado em vez de quebrar a tela com 502.
  if (resposta.status === 429) {
    const espera = resposta.headers.get("retry-after");
    return {
      data: [],
      failures: [{ fonte: "peeringdb", error: `HTTP 429 (limite de requisições${espera ? `, retry-after ${espera}s` : ""})` }],
      source: url,
    };
  }
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
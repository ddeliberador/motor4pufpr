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

// ---------------------------------------------------------------------------
// Layer 2b — Antenas 4G/5G (OpenCelliD). Exige chave gratuita de leitura
// (secret OPENCELLID_API_KEY). Sem chave devolvemos 200 com data vazia.
// API: GET /cell/getInArea
//   BBOX = lonmin,latmin,lonmax,latmax  (longitude primeiro — padrão OGC)
//   limit máx = 100 no plano gratuito
//   radio = LTE (4G) ou NR (5G)
//   mcc = 724 (Brasil)
// ---------------------------------------------------------------------------
const MNC_OPERADORA: Record<string, string> = {
  "02": "TIM", "03": "TIM", "04": "TIM", "05": "Claro", "06": "Vivo",
  "10": "Nextel", "11": "Vivo", "15": "Sercomtel", "16": "Oi",
  "23": "Vivo", "30": "Oi", "31": "Oi", "54": "Porto Seguro", "99": "Local",
};

// BBOX no formato lonmin,latmin,lonmax,latmax. O plano gratuito limita a
// área a 4.000.000 m² (~4.000 km²) por consulta, então cobrimos as regiões
// metropolitanas das capitais com caixas de ~0,5° x 0,5° (~3.000 km²).
const QUADRANTES = [
  "-43.96,-23.36,-42.86,-22.36", // Rio de Janeiro
  "-47.22,-24.11,-46.12,-23.01", // São Paulo
  "-44.34,-20.21,-43.24,-19.11", // Belo Horizonte
  "-51.53,-30.39,-50.43,-29.29", // Porto Alegre
  "-49.54,-25.79,-48.44,-24.69", // Curitiba
  "-48.85,-26.51,-47.75,-25.41", // Florianópolis
  "-54.95,-20.77,-53.85,-19.67", // Campo Grande
  "-48.11,-16.99,-47.01,-15.89", // Goiânia
  "-48.19,-16.01,-47.09,-14.91", // Brasília
  "-38.81,-13.31,-37.71,-12.21", // Salvador
  "-35.04,-9.97,-33.94,-8.87",   // Recife
  "-38.85,-4.09,-37.75,-2.99",   // Fortaleza
  "-42.99,-5.39,-41.89,-4.29",   // Teresina
  "-44.55,-2.85,-43.45,-1.75",   // São Luís
  "-60.32,-3.42,-59.22,-2.32",   // Manaus
  "-48.81,-1.77,-47.71,-0.67",   // Belém
  "-64.06,-9.27,-62.96,-8.17",   // Porto Velho
  "-68.03,-10.27,-66.93,-9.17",  // Rio Branco
  "-61.04,2.51,-59.94,3.61",     // Boa Vista
  "-48.35,-10.5,-47.25,-9.4",    // Palmas
  "-51.42,0.33,-50.32,1.43",     // Macapá
  "-35.04,-7.44,-33.94,-6.34",   // João Pessoa
  "-35.51,-5.4,-34.41,-4.3",     // Natal
  "-37.37,-11.31,-36.27,-10.21", // Aracaju
  "-36.01,-9.99,-34.91,-8.89",   // Maceió
  "-40.61,-20.65,-39.51,-19.55", // Vitória
  "-55.03,-13.0,-53.93,-11.9",   // Cuiabá
];

async function carregarAntenas() {
  const chave = Deno.env.get("OPENCELLID_API_KEY");
  if (!chave) {
    return {
      data: [],
      failures: [{
        fonte: "opencellid",
        error: "OPENCELLID_API_KEY ausente — cadastre uma chave gratuita de leitura em Project Settings → Secrets",
      }],
      source: "https://opencellid.org/cell/getInArea",
    };
  }

  const failures: { fonte: string; error: string }[] = [];
  const data: Record<string, unknown>[] = [];
  const vistos = new Set<string>();

  const respostas = await Promise.allSettled(
    QUADRANTES.flatMap((bbox) =>
      // Busca separada para LTE (4G) e NR (5G), cada uma com limit=100
      ["LTE", "NR"].map(async (radio) => {
        const url =
          `https://opencellid.org/cell/getInArea` +
          `?key=${chave}` +
          `&BBOX=${bbox}` +
          `&format=json` +
          `&radio=${radio}` +
          `&mcc=724` +
          `&limit=100`;
        const r = await fetch(url, {
          headers: { "User-Agent": "Motor4PUFPR/1.0" },
          signal: AbortSignal.timeout(30_000),
        });
        if (!r.ok) {
          const corpo = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} (bbox ${bbox} radio ${radio}): ${corpo.slice(0, 200)}`);
        }
        return { payload: await r.json(), radio, bbox };
      })
    )
  );

  for (const resposta of respostas) {
    if (resposta.status === "rejected") {
      failures.push({
        fonte: "opencellid",
        error: String(resposta.reason).slice(0, 300),
      });
      continue;
    }
    const { payload, radio } = resposta.value;
    const celulas = (
      (payload as Record<string, unknown>).cells ??
      (payload as Record<string, unknown>).data ??
      []
    ) as Record<string, unknown>[];

    for (const c of Array.isArray(celulas) ? celulas : []) {
      const lat = Number(c.lat ?? c.latitude);
      const lon = Number(c.lon ?? c.longitude ?? c.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      // Bbox continental do Brasil
      if (lat < -35 || lat > 6 || lon < -75 || lon > -33) continue;
      const net = String(c.net ?? c.mnc ?? "").padStart(2, "0");
      const id = `erb-${radio}-${c.cell ?? c.cellid ?? `${lat.toFixed(4)}-${lon.toFixed(4)}`}`;
      if (vistos.has(id)) continue;
      vistos.add(id);
      data.push({
        id,
        lat,
        lon,
        radio: String(c.radio ?? radio),
        mcc: String(c.mcc ?? "724"),
        net,
        operadora: MNC_OPERADORA[net] || `MNC ${net}`,
        range: Number.isFinite(Number(c.range)) ? Number(c.range) : undefined,
      });
    }
  }

  // Se TODAS as requisições falharam, propaga erro visível
  if (data.length === 0 && failures.length === QUADRANTES.length * 2) {
    return {
      data: [],
      failures,
      source: "https://opencellid.org/cell/getInArea (MCC 724)",
    };
  }

  return {
    data,
    failures,
    source: "https://opencellid.org/cell/getInArea (MCC 724, limit 100/quadrante)",
  };
}

// ---------------------------------------------------------------------------
// Layer 2c — Backhaul por município (ANATEL / dados abertos).
// ZIP oficial "Mapeamento da Rede de Transporte"; usamos o CSV de evolução
// (5.570 municípios) e cruzamos com as coordenadas municipais do IBGE.
// ---------------------------------------------------------------------------
const BACKHAUL_ZIP =
  "https://www.anatel.gov.br/dadosabertos/paineis_de_dados/infraestrutura/mapeamento_rede_transporte.zip";
const COORD_MUNICIPIOS =
  "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv";

function linhasCsv(texto: string): string[] {
  return texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
}

function campos(linha: string, sep: string): string[] {
  const saida: string[] = [];
  let atual = "";
  let dentro = false;
  for (const ch of linha) {
    if (ch === '"') dentro = !dentro;
    else if (ch === sep && !dentro) { saida.push(atual); atual = ""; }
    else atual += ch;
  }
  saida.push(atual);
  return saida.map((c) => c.trim());
}

async function carregarBackhaul() {
  const { unzipSync, strFromU8 } = await import("https://esm.sh/fflate@0.8.2");

  const [respZip, respCoord] = await Promise.all([
    fetch(BACKHAUL_ZIP, { signal: AbortSignal.timeout(60_000) }),
    fetch(COORD_MUNICIPIOS, { signal: AbortSignal.timeout(30_000) }),
  ]);
  if (!respZip.ok) throw new Error(`ANATEL backhaul: HTTP ${respZip.status}`);
  if (!respCoord.ok) throw new Error(`Coordenadas municipais IBGE: HTTP ${respCoord.status}`);

  // Coordenadas por código IBGE
  const coords = new Map<string, { lat: number; lon: number }>();
  const linhasCoord = linhasCsv(await respCoord.text());
  for (const linha of linhasCoord.slice(1)) {
    const c = campos(linha, ",");
    const lat = Number(c[2]);
    const lon = Number(c[3]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    coords.set(c[0], { lat, lon });
  }

  const arquivos = unzipSync(new Uint8Array(await respZip.arrayBuffer()));
  const nomeCsv = Object.keys(arquivos).find((n) => /evolucao\.csv$/i.test(n));
  if (!nomeCsv) throw new Error("ANATEL backhaul: CSV de evolução não encontrado no ZIP");

  const linhas = linhasCsv(strFromU8(arquivos[nomeCsv]));
  const cabecalho = campos(linhas[0], ";");
  const anos = cabecalho.filter((c) => /^\d{4}$/.test(c));
  const anoRecente = anos[anos.length - 1];
  const idxAno = cabecalho.indexOf(anoRecente);

  const data = linhas.slice(1).flatMap((linha) => {
    const c = campos(linha, ";");
    const codigo = c[0];
    const posicao = coords.get(codigo);
    if (!posicao) return [];
    const meio = (c[idxAno] || "").replace(/"/g, "");
    const fibra = /fibra/i.test(meio);
    return [{
      municipio: (c[1] || "").replace(/"/g, ""),
      uf: c[2] || "",
      latitude: posicao.lat,
      longitude: posicao.lon,
      temBackhaul: fibra,
      tipo: fibra ? "Fibra óptica" : meio || "Outros meios",
    }];
  });

  if (data.length === 0) throw new Error("ANATEL backhaul respondeu sem municípios utilizáveis.");
  return { data, failures: [], source: `${BACKHAUL_ZIP} (${nomeCsv}, ano ${anoRecente})`, ano: anoRecente };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const guard = await guardRequest<{ layer?: string }>(req, "map-infrastructure", corsHeaders, { limit: 150, windowSeconds: 300 });
    if (!guard.ok) return guard.response;
    const camada = guard.body.layer;
    const resultado = camada === "energy"
      ? await carregarEnergia()
      : camada === "datacenters"
        ? await carregarDatacenters()
        : camada === "antennas"
          ? await carregarAntenas()
          : camada === "backhaul"
            ? await carregarBackhaul()
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
//
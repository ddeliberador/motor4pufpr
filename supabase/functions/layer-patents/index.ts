import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EPO_BASE = "https://ops.epo.org/3.2/rest-services";
const EPO_AUTH = "https://ops.epo.org/3.2/auth/accesstoken";

async function getEpoToken(): Promise<string | null> {
  const clientId = Deno.env.get("EPO_OPS_KEY") || Deno.env.get("EPO_CLIENT_ID");
  const clientSecret = Deno.env.get("EPO_OPS_SECRET") || Deno.env.get("EPO_CLIENT_SECRET");
  if (!clientId || !clientSecret) { console.warn("EPO credentials not set (EPO_OPS_KEY/EPO_OPS_SECRET)"); return null; }
  try {
    const res = await fetch(EPO_AUTH, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) { console.warn(`EPO auth failed: ${res.status}`); return null; }
    const data = await res.json();
    return data.access_token || null;
  } catch (e) { console.warn("EPO auth error:", e); return null; }
}

async function epoFetch(path: string, token: string, range = "1-25", timeoutMs = 20000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${EPO_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json", "X-OPS-Range": range },
    });
    if (!res.ok) { console.warn(`EPO ${res.status}: ${path}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`EPO fetch error: ${e instanceof Error ? e.message : e}`);
    return null;
  } finally { clearTimeout(t); }
}

async function searchByIpc(ipcCode: string, token: string) {
  const endYear = new Date().getFullYear();
  const startYear = endYear - 5;
  const q = encodeURIComponent(`ic="${ipcCode}" AND pd>=${startYear}0101`);
  const data = await epoFetch(`/published-data/search?q=${q}`, token);
  const sr = data?.["ops:world-patent-data"]?.["ops:biblio-search"];
  if (!sr) return { total: 0, patents: [] };
  const total = parseInt(sr?.["@total-result-count"] || "0");
  const entries = sr?.["ops:search-result"]?.["ops:publication-reference"] || [];
  const list = Array.isArray(entries) ? entries : [entries];
  const patents = list.slice(0, 15).map((p: any) => {
    const doc = p?.["document-id"] || {};
    return {
      number: `${doc["country"]?.["$"] || ""}${doc["doc-number"]?.["$"] || ""}`,
      country: doc["country"]?.["$"] || "",
      date: doc["date"]?.["$"] || "",
    };
  }).filter((p: any) => p.number);
  return { total, patents };
}

async function getBiblioDetails(nums: string[], token: string) {
  const results: any[] = [];
  for (const num of nums.slice(0, 8)) {
    const data = await epoFetch(`/published-data/publication/epodoc/${num}/biblio`, token, "1-1");
    const exDoc = data?.["ops:world-patent-data"]?.["exchange-documents"]?.["exchange-document"];
    const doc = Array.isArray(exDoc) ? exDoc[0] : exDoc;
    if (!doc) continue;
    const biblio = doc?.["bibliographic-data"];
    const titleEl = biblio?.["invention-title"];
    const titles = Array.isArray(titleEl) ? titleEl : [titleEl];
    const title = titles.find((t: any) => t?.["@lang"] === "en")?.["$"] || titles[0]?.["$"] || "";
    const parties = biblio?.["parties"]?.["applicants"]?.["applicant"];
    const apps = Array.isArray(parties) ? parties : [parties];
    const applicant = apps.find((a: any) => a?.["@data-format"] === "epodoc")
      ?.["applicant-name"]?.["name"]?.["$"] || apps[0]?.["applicant-name"]?.["name"]?.["$"] || "";
    const countryEl = biblio?.["parties"]?.["applicants"]?.["applicant"]?.[0]
      ?.["residence"]?.["country"]?.["$"] || "";
    const pubDate = biblio?.["publication-reference"]?.["document-id"]?.[0]?.["date"]?.["$"] || "";
    results.push({ number: num, title, applicant, country: countryEl, pubDate });
  }
  return results;
}

async function getApplicantRanking(ipcCode: string, token: string) {
  const endYear = new Date().getFullYear();
  const q = encodeURIComponent(`ic="${ipcCode}" AND pd>=${endYear - 5}0101`);
  const data = await epoFetch(`/published-data/search?q=${q}`, token, "1-50");
  const entries = data?.["ops:world-patent-data"]?.["ops:biblio-search"]
    ?.["ops:search-result"]?.["ops:publication-reference"] || [];
  const list = Array.isArray(entries) ? entries : [entries];
  const nums = list.slice(0, 10).map((p: any) => {
    const doc = p?.["document-id"] || {};
    return `${doc["country"]?.["$"] || ""}${doc["doc-number"]?.["$"] || ""}`;
  }).filter(Boolean);
  const details = await getBiblioDetails(nums, token);
  const byApplicant: Record<string, { count: number; country: string }> = {};
  for (const d of details) {
    if (!d.applicant) continue;
    if (!byApplicant[d.applicant]) byApplicant[d.applicant] = { count: 0, country: d.country };
    byApplicant[d.applicant].count++;
  }
  return Object.entries(byApplicant)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([name, v]) => ({ name, count: v.count, country: v.country }));
}

async function getTrend(ipcCode: string, token: string) {
  const endYear = new Date().getFullYear();
  const trend: Array<{ year: number; total: number }> = [];
  for (let y = endYear - 4; y <= endYear; y++) {
    const q = encodeURIComponent(`ic="${ipcCode}" AND pd>=${y}0101 AND pd<=${y}1231`);
    const data = await epoFetch(`/published-data/search?q=${q}`, token, "1-1");
    const total = parseInt(data?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["@total-result-count"] || "0");
    trend.push({ year: y, total });
  }
  return trend;
}

async function getBrShare(ipcCode: string, token: string) {
  const startYear = new Date().getFullYear() - 5;
  const baseQ = encodeURIComponent(`ic="${ipcCode}" AND pd>=${startYear}0101`);
  const brQ = encodeURIComponent(`ic="${ipcCode}" AND pd>=${startYear}0101 AND pa any "BRAZIL OR BRASIL"`);
  const [totalData, brData] = await Promise.all([
    epoFetch(`/published-data/search?q=${baseQ}`, token, "1-1"),
    epoFetch(`/published-data/search?q=${brQ}`, token, "1-1"),
  ]);
  const total = parseInt(totalData?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["@total-result-count"] || "0");
  const brTotal = parseInt(brData?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["@total-result-count"] || "0");
  return {
    total_mundial: total,
    total_br: brTotal,
    share_br_pct: total > 0 ? parseFloat(((brTotal / total) * 100).toFixed(1)) : 0,
    dependencia_externa_pct: total > 0 ? parseFloat((((total - brTotal) / total) * 100).toFixed(1)) : 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, ipc_codes } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const ipcCodes: string[] = Array.isArray(ipc_codes) && ipc_codes.length > 0 ? ipc_codes.slice(0, 3) : [];
    if (!ipcCodes.length) return new Response(JSON.stringify({
      available: false,
      message: "Nenhum código IPC mapeado para este tema.",
      patents: [], applicants: [], trend: [], br_share: null, trl_from_patents: null, sources: [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = await getEpoToken();
    if (!token) return new Response(JSON.stringify({
      available: false,
      message: "EPO OPS indisponível — verifique EPO_OPS_KEY e EPO_OPS_SECRET nos secrets do Supabase.",
      ipc_codes: ipcCodes, patents: [], applicants: [], trend: [], br_share: null, trl_from_patents: null, sources: [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`Layer Patents: ${query} | IPC: ${ipcCodes.join(",")} | token OK`);
    const start = Date.now();
    const primaryIpc = ipcCodes[0];

    const [searchResult, applicants, trend, brShare] = await Promise.all([
      searchByIpc(primaryIpc, token),
      getApplicantRanking(primaryIpc, token),
      getTrend(primaryIpc, token),
      getBrShare(primaryIpc, token),
    ]);

    const patentNums = searchResult.patents.map((p: any) => p.number).slice(0, 8);
    const details = await getBiblioDetails(patentNums, token);

    let trl_from_patents: any = null;
    if (searchResult.total > 0) {
      const vol = searchResult.total;
      const trl = vol > 5000 ? 7 : vol > 500 ? 6 : brShare.total_br > 0 ? 5 : 4;
      trl_from_patents = {
        estimate: trl,
        label: trl >= 7 ? "Campo com mercado estabelecido (TRL 7–9)"
          : trl >= 5 ? "Campo em desenvolvimento aplicado (TRL 4–6)"
          : "Campo em prototipagem inicial (TRL 4–5)",
        rationale: `${vol.toLocaleString("pt-BR")} patentes publicadas nos últimos 5 anos (${primaryIpc})${brShare.total_br > 0 ? ` — ${brShare.total_br} com presença BR` : " — sem presença BR identificada"}`,
        confidence: vol > 100 ? "high" : vol > 10 ? "medium" : "low",
        source: "EPO OPS",
      };
    }

    const countryCounts: Record<string, number> = {};
    for (const a of applicants) {
      if (a.country) countryCounts[a.country] = (countryCounts[a.country] || 0) + a.count;
    }
    const countryDist = Object.entries(countryCounts)
      .sort(([, a], [, b]) => b - a).slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    return new Response(JSON.stringify({
      available: true, query, ipc_codes: ipcCodes, primary_ipc: primaryIpc,
      total_patents_5y: searchResult.total, patents: details, applicants,
      country_distribution: countryDist, trend, br_share: brShare,
      trl_from_patents, sources: ["EPO OPS — Open Patent Services"],
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-patents error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro", available: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

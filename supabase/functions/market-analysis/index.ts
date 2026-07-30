import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EPO_KEY = Deno.env.get("EPO_OPS_KEY") || "";
const EPO_SECRET = Deno.env.get("EPO_OPS_SECRET") || "";
const OPS = "https://ops.epo.org/3.2";

// Cache do token OAuth na memória da instância (validade ~20min no OPS)
let opsToken: { value: string; expiresAt: number } | null = null;

async function safeFetch(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    console.warn(`fetch falhou (${url}): ${e instanceof Error ? e.message : e}`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function safeJson(url: string, timeoutMs = 20000): Promise<any> {
  const res = await safeFetch(url, {}, timeoutMs);
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ===== 1. EPO OPS — titulares de patente =====
async function getOpsToken(): Promise<string | null> {
  if (!EPO_KEY || !EPO_SECRET) return null;
  if (opsToken && opsToken.expiresAt > Date.now() + 30000) return opsToken.value;

  const basic = btoa(`${EPO_KEY}:${EPO_SECRET}`);
  const res = await safeFetch(`${OPS}/auth/accesstoken`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  }, 15000);

  if (!res || !res.ok) {
    console.error(`EPO OPS auth falhou: ${res?.status}`);
    return null;
  }
  const data = await res.json().catch(() => null);
  if (!data?.access_token) return null;
  const ttl = Number(data.expires_in || 1200) * 1000;
  opsToken = { value: data.access_token, expiresAt: Date.now() + ttl };
  return opsToken.value;
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function textOf(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v.$ ?? v["#text"] ?? "");
  return String(v);
}

function normalizeApplicant(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[.,;]+$/, "")
    .trim()
    .toUpperCase();
}

interface PatentHolder {
  applicant: string;
  families: number;
  countries: string[];
  years: number[];
  has_br_filing: boolean;
  is_brazilian: boolean;
  sample_publication: string | null;
  espacenet_url: string | null;
}

async function fetchPatentHolders(searchTerms: string[], ipcCodes: string[]) {
  if (!EPO_KEY || !EPO_SECRET) {
    return { holders: [] as PatentHolder[], total_families: 0, queries: [] as string[], available: false, reason: "EPO_OPS_KEY não configurada" };
  }
  const token = await getOpsToken();
  if (!token) {
    return { holders: [] as PatentHolder[], total_families: 0, queries: [] as string[], available: false, reason: "Falha de autenticação no EPO OPS" };
  }

  // Máximo 3 consultas (rate limit do free tier)
  const queries: string[] = [];
  if (ipcCodes.length > 0) {
    const ipcExpr = ipcCodes.slice(0, 3).map((c) => `ipc=${JSON.stringify(c.replace(/\s+/g, ""))}`).join(" or ");
    const term = searchTerms[0] ? ` and ti=${JSON.stringify(searchTerms[0])}` : "";
    queries.push(`(${ipcExpr})${term}`);
  }
  for (const term of searchTerms.slice(0, ipcCodes.length > 0 ? 1 : 2)) {
    queries.push(`ta=${JSON.stringify(term)}`);
  }

  const byApplicant: Record<string, PatentHolder> = {};
  let totalFamilies = 0;
  const usedQueries: string[] = [];

  for (const q of queries.slice(0, 3)) {
    const url = `${OPS}/rest-services/published-data/search/biblio?q=${encodeURIComponent(q)}&Range=1-50`;
    const res = await safeFetch(url, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    }, 25000);

    if (!res) continue;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`EPO OPS search [${res.status}] q="${q}": ${body.slice(0, 200)}`);
      continue;
    }
    usedQueries.push(q);

    const json = await res.json().catch(() => null);
    const result = json?.["ops:world-patent-data"]?.["ops:biblio-search"];
    if (!result) continue;
    totalFamilies += Number(result["@total-result-count"] || 0);

    const docs = asArray(result["ops:search-result"]?.["exchange-documents"]);
    for (const wrapper of docs) {
      for (const doc of asArray(wrapper?.["exchange-document"] ?? wrapper)) {
        const biblio = doc?.["bibliographic-data"];
        if (!biblio) continue;
        const country = String(doc["@country"] || "");
        const docNumber = String(doc["@doc-number"] || "");
        const kind = String(doc["@kind"] || "");
        const pubRefs = asArray(biblio["publication-reference"]?.["document-id"]);
        let year = 0;
        for (const ref of pubRefs) {
          const d = textOf(ref?.date);
          if (d && d.length >= 4) { year = Number(d.slice(0, 4)); break; }
        }

        const applicants = asArray(biblio.parties?.applicants?.applicant);
        const seen = new Set<string>();
        for (const app of applicants) {
          const name = normalizeApplicant(textOf(app?.["applicant-name"]?.name));
          if (!name || seen.has(name)) continue;
          seen.add(name);
          if (!byApplicant[name]) {
            byApplicant[name] = {
              applicant: name,
              families: 0,
              countries: [],
              years: [],
              has_br_filing: false,
              is_brazilian: /\b(BRASIL|BRAZIL|BR\b|PETROBRAS|EMBRAPA|FIOCRUZ|UNIVERSIDADE|UNIV FEDERAL|UFPR|USP|UNICAMP)\b/.test(name),
              sample_publication: null,
              espacenet_url: null,
            };
          }
          const h = byApplicant[name];
          h.families++;
          if (country && !h.countries.includes(country)) h.countries.push(country);
          if (country === "BR") h.has_br_filing = true;
          if (year && !h.years.includes(year)) h.years.push(year);
          if (!h.sample_publication && docNumber) {
            h.sample_publication = `${country}${docNumber}${kind}`;
            h.espacenet_url = `https://worldwide.espacenet.com/patent/search?q=pn%3D${encodeURIComponent(country + docNumber)}`;
          }
        }
      }
    }
  }

  const holders = Object.values(byApplicant)
    .map((h) => ({ ...h, years: h.years.sort((a, b) => b - a).slice(0, 5) }))
    .sort((a, b) => b.families - a.families)
    .slice(0, 20);

  return {
    holders,
    total_families: totalFamilies,
    queries: usedQueries,
    available: true,
    reason: holders.length === 0 ? "Nenhuma família de patente encontrada para os termos/IPC consultados" : "",
  };
}

// ===== 2. Participação no mercado público (PNCP) =====
interface Supplier {
  name: string;
  cnpj: string;
  contracts: number;
  value: number;
  share: number;
  uf?: string;
  porte?: string;
  cnae?: string;
  municipio?: string;
  razao_social?: string;
}

async function fetchPublicMarket(searchTerms: string[]) {
  const byCnpj: Record<string, Supplier> = {};
  const terms = searchTerms.filter(Boolean).slice(0, 3);

  // 1) Busca textual no índice público do PNCP (único endpoint que aceita texto livre)
  type Hit = { url: string; value: number };
  const hits: Record<string, Hit> = {};
  let matched = 0;

  for (const term of terms) {
    const data = await safeJson(
      `https://pncp.gov.br/api/search/?q=${encodeURIComponent(term)}&tipos_documento=contrato&pagina=1&tam_pagina=40`,
      20000,
    );
    const items: any[] = data?.items || [];
    matched += items.length;
    for (const it of items) {
      const url: string = it.item_url || "";
      const m = url.match(/^\/contratos\/(\d{14})\/(\d{4})\/(\d+)$/);
      if (!m) continue;
      hits[url] = { url, value: Number(it.valor_global || 0) };
    }
  }

  // 2) Detalhe de cada contrato para obter o fornecedor (CNPJ + razão social)
  const top = Object.values(hits)
    .sort((a, b) => b.value - a.value)
    .slice(0, 45);

  const details = await Promise.allSettled(
    top.map(async (h) => {
      const m = h.url.match(/^\/contratos\/(\d{14})\/(\d{4})\/(\d+)$/)!;
      const d = await safeJson(
        `https://pncp.gov.br/api/pncp/v1/orgaos/${m[1]}/contratos/${m[2]}/${m[3]}`,
        15000,
      );
      if (!d) return null;
      return {
        cnpj: String(d.niFornecedor || "").replace(/\D/g, ""),
        name: d.nomeRazaoSocialFornecedor || "",
        value: Number(d.valorGlobal || h.value || 0),
      };
    }),
  );

  for (const r of details) {
    if (r.status !== "fulfilled" || !r.value) continue;
    const { cnpj, name, value } = r.value;
    if (!cnpj || cnpj.length !== 14) continue;
    if (!byCnpj[cnpj]) byCnpj[cnpj] = { name: name || cnpj, cnpj, contracts: 0, value: 0, share: 0 };
    byCnpj[cnpj].contracts++;
    byCnpj[cnpj].value += value;
  }

  const suppliers = Object.values(byCnpj).sort((a, b) => b.value - a.value);
  const totalValue = suppliers.reduce((s, x) => s + x.value, 0);
  const totalContracts = suppliers.reduce((s, x) => s + x.contracts, 0);

  for (const s of suppliers) {
    s.share = totalValue > 0 ? (s.value / totalValue) * 100 : 0;
  }

  // HHI (0-10000) sobre o valor contratado
  const hhi = Math.round(suppliers.reduce((sum, s) => sum + s.share * s.share, 0));
  const cr4 = Math.round(suppliers.slice(0, 4).reduce((s, x) => s + x.share, 0));

  // Enriquecimento dos 5 maiores via BrasilAPI
  await Promise.all(
    suppliers.slice(0, 5).map(async (s) => {
      const d = await safeJson(`https://brasilapi.com.br/api/cnpj/v1/${s.cnpj}`, 12000);
      if (!d || d.message) return;
      s.razao_social = d.razao_social || "";
      s.uf = d.uf || "";
      s.municipio = d.municipio || "";
      s.porte = d.porte || "";
      s.cnae = d.cnae_fiscal_descricao || "";
    }),
  );

  const concentration_label =
    hhi === 0 ? "sem dados" : hhi > 2500 ? "altamente concentrado" : hhi > 1500 ? "moderadamente concentrado" : "desconcentrado";

  return {
    suppliers: suppliers.slice(0, 15),
    total_suppliers: suppliers.length,
    total_value: totalValue,
    total_contracts: totalContracts,
    matched_documents: matched,
    hhi,
    cr4,
    concentration_label,
    queried_terms: terms,
    available: suppliers.length > 0,
    reason: suppliers.length === 0 ? "Nenhum contrato público com fornecedor identificado para os termos consultados" : "",
  };
}

// ===== 3. Balança comercial por NCM (COMEX Stat) =====
function comexFilterName(code: string): string | null {
  const c = code.replace(/\D/g, "");
  if (c.length === 8) return "ncm";
  if (c.length === 4) return "heading";
  if (c.length === 2) return "chapter";
  return null;
}

async function comexFlow(flow: "export" | "import", filter: string, code: string, year: number) {
  const res = await safeFetch(
    "https://api-comexstat.mdic.gov.br/general",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flow,
        monthDetail: false,
        period: { from: `${year}-01`, to: `${year}-12` },
        filters: [{ filter, values: [Number(code.replace(/\D/g, ""))] }],
        details: [filter],
        metrics: ["metricFOB"],
      }),
    },
    25000,
  );
  if (!res || !res.ok) return 0;
  try {
    const d = await res.json();
    return (d?.data?.list || []).reduce((s: number, r: any) => s + Number(r.metricFOB || 0), 0);
  } catch {
    return 0;
  }
}

async function fetchTradeBalance(ncmCodes: Array<{ code: string; description: string }>) {
  if (!ncmCodes.length) {
    return { items: [], total_export: 0, total_import: 0, balance: 0, available: false, reason: "Sem códigos NCM na tradução ontológica" };
  }
  const year = new Date().getFullYear() - 1;
  const items: any[] = [];

  const results: PromiseSettledResult<any>[] = [];
  for (const ncm of ncmCodes.slice(0, 3)) {
    results.push(await (async () => {
      const filter = comexFilterName(ncm.code);
      if (!filter) return null;
      // COMEX limita requisições concorrentes (HTTP 429) — consultas sequenciais
      const export_fob = await comexFlow("export", filter, ncm.code, year);
      await new Promise((r) => setTimeout(r, 1200));
      const import_fob = await comexFlow("import", filter, ncm.code, year);
      return { code: ncm.code, description: ncm.description, export_fob, import_fob, year, url: "https://comexstat.mdic.gov.br/pt/geral" };
    })().then((value) => ({ status: "fulfilled" as const, value })).catch((reason) => ({ status: "rejected" as const, reason })));
    await new Promise((r) => setTimeout(r, 1200));
  }

  for (const r of results) {
    if (r.status === "fulfilled" && r.value && (r.value.export_fob > 0 || r.value.import_fob > 0)) {
      items.push({ ...r.value, balance: r.value.export_fob - r.value.import_fob });
    }
  }

  const total_export = items.reduce((s, x) => s + x.export_fob, 0);
  const total_import = items.reduce((s, x) => s + x.import_fob, 0);

  return {
    items,
    total_export,
    total_import,
    balance: total_export - total_import,
    year,
    available: items.length > 0,
    reason: items.length === 0 ? "COMEX não retornou valores para os NCM consultados" : "",
  };
}


// ===== 4. Oportunidades derivadas dos dados =====
function buildOpportunities(patents: any, market: any, trade: any, totalPapersBR: number, gt: number | null) {
  const out: Array<{ title: string; evidence: string; metric: string; source: string; url?: string; severity: "alta" | "media" | "baixa" }> = [];

  // Lacuna de titularidade
  if (patents.available && patents.holders.length > 0) {
    const brHolders = patents.holders.filter((h: any) => h.is_brazilian || h.has_br_filing);
    if (brHolders.length === 0) {
      out.push({
        title: "Lacuna de titularidade nacional",
        evidence: `Nenhum dos ${patents.holders.length} maiores titulares tem origem ou depósito no Brasil. Tecnologia dominada por atores estrangeiros — janela para licenciamento ou depósito nacional.`,
        metric: `0 de ${patents.holders.length} titulares brasileiros`,
        source: "EPO OPS / Espacenet",
        severity: "alta",
      });
    } else {
      out.push({
        title: "Base nacional de titularidade existente",
        evidence: `${brHolders.length} titular(es) com vínculo brasileiro entre os maiores depositantes — parceiros potenciais para licenciamento ou codesenvolvimento.`,
        metric: `${brHolders.length} titulares BR`,
        source: "EPO OPS / Espacenet",
        severity: "baixa",
      });
    }
  }

  // Lacuna de fornecimento
  if (market.available && market.total_suppliers > 0) {
    if (market.hhi > 2500) {
      out.push({
        title: "Mercado público concentrado — espaço para novos fornecedores",
        evidence: `HHI de ${market.hhi} indica mercado ${market.concentration_label}. Os 4 maiores fornecedores detêm ${market.cr4}% do valor contratado.`,
        metric: `HHI ${market.hhi} · CR4 ${market.cr4}%`,
        source: "PNCP",
        url: "https://pncp.gov.br",
        severity: "alta",
      });
    } else {
      out.push({
        title: "Mercado público pulverizado",
        evidence: `${market.total_suppliers} fornecedores distintos e HHI de ${market.hhi} (${market.concentration_label}) — entrada viável, mas com competição por preço.`,
        metric: `${market.total_suppliers} fornecedores · HHI ${market.hhi}`,
        source: "PNCP",
        severity: "media",
      });
    }
  }

  // Déficit comercial
  if (trade.available && trade.total_import > trade.total_export) {
    const deficit = trade.total_import - trade.total_export;
    out.push({
      title: "Déficit comercial — substituição de importações",
      evidence: `Importações de US$ ${(trade.total_import / 1e6).toFixed(1)}M contra exportações de US$ ${(trade.total_export / 1e6).toFixed(1)}M em ${trade.year} nos NCM do tema.`,
      metric: `Déficit US$ ${(deficit / 1e6).toFixed(1)}M`,
      source: "COMEX Stat/MDIC",
      url: "https://comexstat.mdic.gov.br/pt/geral",
      severity: "alta",
    });
  } else if (trade.available) {
    out.push({
      title: "Superávit comercial no segmento",
      evidence: `Exportações superam importações em US$ ${((trade.total_export - trade.total_import) / 1e6).toFixed(1)}M em ${trade.year} — capacidade produtiva instalada e competitiva.`,
      metric: `Superávit US$ ${((trade.total_export - trade.total_import) / 1e6).toFixed(1)}M`,
      source: "COMEX Stat/MDIC",
      severity: "baixa",
    });
  }

  // Ciência sem tradução
  if (totalPapersBR > 0 && gt != null && gt > 60) {
    out.push({
      title: "Base científica sem tradução comercial",
      evidence: `${totalPapersBR} publicações brasileiras no tema, mas o Gap de Tradução está em ${gt}/100 — conhecimento disponível e pouco apropriado pelo mercado.`,
      metric: `GT ${gt}/100 · ${totalPapersBR} papers BR`,
      source: "OpenAlex + índices Motor 4P",
      severity: "alta",
    });
  }

  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query: string = body?.query || "";
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchTerms: string[] = Array.isArray(body.search_terms) && body.search_terms.length ? body.search_terms : [query];
    const ipcCodes: string[] = Array.isArray(body.ipc_codes) ? body.ipc_codes : [];
    const ncmCodes = Array.isArray(body.ncm_codes) ? body.ncm_codes : [];
    const totalPapersBR: number = Number(body.knowledge_total_papers || 0);
    const gt: number | null = body.gt_index != null ? Number(body.gt_index) : null;

    console.log(`Market Analysis: ${query} | IPC ${ipcCodes.length} | NCM ${ncmCodes.length}`);
    const start = Date.now();

    const [patentsR, marketR, tradeR] = await Promise.allSettled([
      fetchPatentHolders(searchTerms, ipcCodes),
      // PNCP indexa em português — prioriza a query original do usuário
      fetchPublicMarket([query, ...searchTerms]),
      fetchTradeBalance(ncmCodes),
    ]);

    const patents = patentsR.status === "fulfilled" ? patentsR.value : { holders: [], total_families: 0, queries: [], available: false, reason: "Erro ao consultar EPO OPS" };
    const market = marketR.status === "fulfilled" ? marketR.value : { suppliers: [], total_suppliers: 0, total_value: 0, total_contracts: 0, hhi: 0, cr4: 0, concentration_label: "sem dados", queried_terms: [], available: false };
    const trade = tradeR.status === "fulfilled" ? tradeR.value : { items: [], total_export: 0, total_import: 0, balance: 0, available: false, reason: "Erro ao consultar COMEX" };

    const opportunities = buildOpportunities(patents, market, trade, totalPapersBR, gt);

    const sources: string[] = [];
    if (patents.available && patents.holders.length > 0) sources.push("EPO OPS/Espacenet");
    if (market.available) sources.push("PNCP");
    if (market.suppliers.some((s: any) => s.razao_social)) sources.push("BrasilAPI/CNPJ");
    if (trade.available) sources.push("COMEX Stat/MDIC");

    return new Response(
      JSON.stringify({
        query,
        patents,
        market,
        trade,
        opportunities,
        sources,
        processing_time_ms: Date.now() - start,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Market analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

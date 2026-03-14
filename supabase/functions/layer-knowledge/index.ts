import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function safeFetch(url: string, options?: RequestInit, timeoutMs = 20000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    if (!res.ok) {
      console.warn(`safeFetch ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`safeFetch failed for ${url}:`, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchOpenAlex(query: string) {
  const encoded = encodeURIComponent(query);
  const headers = { "User-Agent": "Motor4P-UFPR/1.0 (mailto:pesquisa@ufpr.br)" };

  const [papersData, intlData, conceptsData, totalGlobalData] = await Promise.all([
    safeFetch(`https://api.openalex.org/works?search=${encoded}&filter=institutions.country_code:BR&per_page=15&sort=cited_by_count:desc&select=id,title,publication_year,cited_by_count,authorships,primary_location,open_access,concepts,keywords,grants,abstract_inverted_index,doi,sustainable_development_goals`, { headers }),
    safeFetch(`https://api.openalex.org/works?search=${encoded}&group_by=authorships.institutions.country_code&per_page=15`, { headers }),
    safeFetch(`https://api.openalex.org/works?search=${encoded}&group_by=concepts.id&per_page=20`, { headers }),
    safeFetch(`https://api.openalex.org/works?search=${encoded}&per_page=1`, { headers }),
  ]);

  const papers = (papersData?.results || []).map((w: any) => ({
    id: w.id?.replace("https://openalex.org/", "") || "",
    title: w.title || "",
    year: w.publication_year,
    citations: w.cited_by_count || 0,
    authors: (w.authorships || []).slice(0, 8).map((a: any) => ({
      name: a.author?.display_name || "",
      institution: a.institutions?.[0]?.display_name || "",
      country: a.institutions?.[0]?.country_code || "",
      orcid: a.author?.orcid?.replace("https://orcid.org/", "") || "",
    })),
    journal: w.primary_location?.source?.display_name || "",
    is_open_access: w.open_access?.is_oa || false,
    oa_url: w.open_access?.oa_url || "",
    url: w.primary_location?.landing_page_url || w.id || "",
    doi: w.doi?.replace("https://doi.org/", "") || "",
    abstract: decodeAbstract(w.abstract_inverted_index),
    concepts: (w.concepts || []).slice(0, 8).map((c: any) => c.display_name),
    keywords: (w.keywords || []).slice(0, 6).map((k: any) => k.display_name || k.keyword || ""),
    grants: (w.grants || []).slice(0, 4).map((g: any) => ({
      funder: g.funder_display_name || "",
      award: g.award_id || "",
    })),
    sdgs: (w.sustainable_development_goals || []).slice(0, 3).map((s: any) => s.display_name || ""),
  }));

  const institutionCounts: Record<string, number> = {};
  for (const p of papers) {
    for (const a of p.authors) {
      if (a.institution) institutionCounts[a.institution] = (institutionCounts[a.institution] || 0) + 1;
    }
  }

  const international = (intlData?.group_by || [])
    .filter((g: any) => g.key && g.key !== "unknown")
    .slice(0, 15)
    .map((g: any) => ({ country_code: g.key, count: g.count }));

  const concepts = (conceptsData?.group_by || [])
    .filter((g: any) => g.key_display_name)
    .slice(0, 15)
    .map((g: any) => ({ name: g.key_display_name, count: g.count }));

  return {
    papers,
    institutionCounts,
    international,
    concepts,
    totalPapersBR: papersData?.meta?.count || papers.length,
    totalPapersGlobal: totalGlobalData?.meta?.count || papersData?.meta?.count || papers.length,
  };
}

async function searchCAPES(query: string) {
  const data = await safeFetch(`https://dadosabertos.capes.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=6`);
  if (!data?.result?.results) {
    const fallback = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CAPES pós-graduação bolsas")}&rows=5`);
    return (fallback?.result?.results || []).map((pkg: any) => ({
      title: pkg.title || "",
      description: (pkg.notes || "").slice(0, 200),
      organization: pkg.organization?.title || "CAPES",
      url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
      formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
    }));
  }
  return (data.result.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://dadosabertos.capes.gov.br/dataset/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
  }));
}

async function searchINEP(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " educação INEP")}&rows=5&fq=organization:instituto-nacional-de-estudos-e-pesquisas-educacionais-anisio-teixeira-inep`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

async function searchCNPq(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CNPq pesquisa grupos")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

async function searchDATASUS(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " saúde SUS DATASUS")}&rows=5&fq=organization:ministerio-da-saude-ms`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
  }));
}

async function searchBaseDosDados(query: string) {
  const data = await safeFetch(`https://basedosdados.org/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://basedosdados.org/dataset/${pkg.name}`,
    tags: (pkg.tags || []).slice(0, 5).map((t: any) => t.display_name),
  }));
}

const INSTITUTION_ALIASES: Record<string, string[]> = {
  "UFPR": ["universidade federal do parana", "federal university of parana"],
  "USP": ["universidade de sao paulo", "university of sao paulo"],
  "UNICAMP": ["universidade estadual de campinas", "university of campinas"],
  "UFRJ": ["universidade federal do rio de janeiro", "federal university of rio de janeiro"],
  "UFRGS": ["universidade federal do rio grande do sul"],
  "UFMG": ["universidade federal de minas gerais"],
  "UFSC": ["universidade federal de santa catarina"],
  "EMBRAPA": ["empresa brasileira de pesquisa agropecuaria", "embrapa"],
  "FIOCRUZ": ["fundacao oswaldo cruz", "fiocruz", "oswaldo cruz foundation"],
  "INPE": ["instituto nacional de pesquisas espaciais"],
  "UNESP": ["universidade estadual paulista"],
  "UNIFESP": ["universidade federal de sao paulo"],
  "UNB": ["universidade de brasilia"],
  "UFC": ["universidade federal do ceara"],
  "UFBA": ["universidade federal da bahia"],
};

function normalizeInstitutionName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function resolveInstitution(name: string): { id: string; canonical: string } | null {
  const norm = normalizeInstitutionName(name);
  for (const [id, aliases] of Object.entries(INSTITUTION_ALIASES)) {
    if (norm.includes(id.toLowerCase()) || aliases.some(a => norm.includes(a) || a.includes(norm))) {
      return { id, canonical: id };
    }
  }
  return null;
}

function findCrossBaseMatches(institutions: Record<string, number>): Record<string, { canonical: string; count: number }> {
  const resolved: Record<string, { canonical: string; count: number }> = {};
  for (const [name, count] of Object.entries(institutions)) {
    const match = resolveInstitution(name);
    if (match) {
      if (!resolved[match.id]) resolved[match.id] = { canonical: match.canonical, count: 0 };
      resolved[match.id].count += count;
    }
  }
  return resolved;
}

function decodeAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return "";
  try {
    const words: string[] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }
    return words.filter(Boolean).join(" ").slice(0, 600);
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`Layer Knowledge: ${query}`);
    const start = Date.now();

    const [openalex, capes, inep, cnpq, datasus, basedosdados] = await Promise.all([
      searchOpenAlex(query),
      searchCAPES(query),
      searchINEP(query),
      searchCNPq(query),
      searchDATASUS(query),
      searchBaseDosDados(query),
    ]);

    const totalPapers = openalex.totalPapersBR;
    const countriesActive = openalex.international.length;
    const density = countriesActive > 0 ? Math.round(totalPapers / countriesActive) : 0;

    const instValues = Object.values(openalex.institutionCounts).sort((a, b) => b - a).slice(0, 10);
    const instTotal = instValues.reduce((s, v) => s + v, 0) || 1;
    const hhi = instValues.reduce((s, v) => s + Math.pow(v / instTotal, 2), 0);
    const concentration = Math.round(hhi * 10000);

    const conceptCounts = openalex.concepts.map((c: any) => c.count);
    const conceptTotal = conceptCounts.reduce((s: number, v: number) => s + v, 0) || 1;
    const entropy = -conceptCounts.reduce((s: number, v: number) => { const p = v / conceptTotal; return s + (p > 0 ? p * Math.log2(p) : 0); }, 0);
    const maxEntropy = Math.log2(conceptCounts.length || 1) || 1;
    const specialization = Math.round((1 - entropy / maxEntropy) * 100);

    const resolved_institutions = findCrossBaseMatches(openalex.institutionCounts);

    const sources: string[] = [];
    if (openalex.papers.length > 0) sources.push("OpenAlex");
    if (capes.length > 0) sources.push("CAPES");
    if (inep.length > 0) sources.push("INEP");
    if (cnpq.length > 0) sources.push("CNPq");
    if (datasus.length > 0) sources.push("DATASUS");
    if (basedosdados.length > 0) sources.push("Base dos Dados");

    return new Response(JSON.stringify({
      papers: openalex.papers,
      total_papers: totalPapers,
      total_papers_global: openalex.totalPapersGlobal,
      institutions: openalex.institutionCounts,
      resolved_institutions,
      international: openalex.international,
      concepts: openalex.concepts,
      capes_datasets: capes,
      inep_datasets: inep,
      cnpq_datasets: cnpq,
      datasus_datasets: datasus,
      basedosdados_datasets: basedosdados,
      density,
      concentration,
      specialization,
      sources,
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Layer Knowledge error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

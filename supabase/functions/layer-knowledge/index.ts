import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function safeFetch(url: string, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ===== OpenAlex: papers + institutions + international + concepts =====
async function searchOpenAlex(query: string) {
  const encoded = encodeURIComponent(query);
  const [papersData, intlData, conceptsData] = await Promise.all([
    safeFetch(`https://api.openalex.org/works?search=${encoded}&filter=institutions.country_code:BR&per_page=15&sort=cited_by_count:desc&select=id,title,publication_year,cited_by_count,authorships,primary_location,open_access,concepts`),
    safeFetch(`https://api.openalex.org/works?search=${encoded}&group_by=authorships.institutions.country_code&per_page=15`),
    safeFetch(`https://api.openalex.org/works?search=${encoded}&group_by=concepts.id&per_page=20`),
  ]);

  const papers = (papersData?.results || []).map((w: any) => ({
    id: w.id?.replace("https://openalex.org/", "") || "",
    title: w.title || "",
    year: w.publication_year,
    citations: w.cited_by_count || 0,
    authors: (w.authorships || []).slice(0, 5).map((a: any) => ({
      name: a.author?.display_name || "",
      institution: a.institutions?.[0]?.display_name || "",
      country: a.institutions?.[0]?.country_code || "",
    })),
    journal: w.primary_location?.source?.display_name || "",
    is_open_access: w.open_access?.is_oa || false,
    url: w.primary_location?.landing_page_url || w.id || "",
    concepts: (w.concepts || []).slice(0, 5).map((c: any) => c.display_name),
  }));

  // Institution counts
  const institutionCounts: Record<string, number> = {};
  for (const p of papers) {
    for (const a of p.authors) {
      if (a.institution) institutionCounts[a.institution] = (institutionCounts[a.institution] || 0) + 1;
    }
  }

  // International distribution
  const international = (intlData?.group_by || [])
    .filter((g: any) => g.key && g.key !== "unknown")
    .slice(0, 15)
    .map((g: any) => ({ country_code: g.key, count: g.count }));

  // Concept distribution for specialization
  const concepts = (conceptsData?.group_by || [])
    .filter((g: any) => g.key_display_name)
    .slice(0, 15)
    .map((g: any) => ({ name: g.key_display_name, count: g.count }));

  const totalPapers = papersData?.meta?.count || papers.length;

  return { papers, institutionCounts, international, concepts, totalPapers };
}

// ===== CAPES datasets =====
async function searchCAPES(query: string) {
  const data = await safeFetch(`https://dadosabertos.capes.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=6`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://dadosabertos.capes.gov.br/dataset/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
  }));
}

// ===== INEP datasets =====
async function searchINEP(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " educação INEP")}&rows=5&fq=organization:instituto-nacional-de-estudos-e-pesquisas-educacionais-anisio-teixeira-inep`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== CNPq groups proxy via dados.gov =====
async function searchCNPq(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CNPq pesquisa grupos")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Layer Knowledge: ${query}`);
    const start = Date.now();

    const [openalex, capes, inep, cnpq] = await Promise.all([
      searchOpenAlex(query),
      searchCAPES(query),
      searchINEP(query),
      searchCNPq(query),
    ]);

    // ===== COMPUTED OUTPUTS =====
    const totalPapers = openalex.totalPapers;
    const countriesActive = openalex.international.length;

    // Densidade científica = papers / países atuantes
    const density = countriesActive > 0 ? Math.round(totalPapers / countriesActive) : 0;

    // Concentração institucional (HHI simplificado das top 10)
    const instValues = Object.values(openalex.institutionCounts).sort((a, b) => b - a).slice(0, 10);
    const instTotal = instValues.reduce((s, v) => s + v, 0) || 1;
    const hhi = instValues.reduce((s, v) => s + Math.pow(v / instTotal, 2), 0);
    const concentration = Math.round(hhi * 10000); // HHI em base 10000

    // Índice de especialização temática (entropia normalizada dos concepts)
    const conceptCounts = openalex.concepts.map((c: any) => c.count);
    const conceptTotal = conceptCounts.reduce((s: number, v: number) => s + v, 0) || 1;
    const entropy = -conceptCounts.reduce((s: number, v: number) => {
      const p = v / conceptTotal;
      return s + (p > 0 ? p * Math.log2(p) : 0);
    }, 0);
    const maxEntropy = Math.log2(conceptCounts.length || 1) || 1;
    const specialization = Math.round((1 - entropy / maxEntropy) * 100); // 0=diverso, 100=especializado

    // Active sources tracking
    const sources: string[] = [];
    if (openalex.papers.length > 0) sources.push("OpenAlex");
    if (capes.length > 0) sources.push("CAPES");
    if (inep.length > 0) sources.push("INEP");
    if (cnpq.length > 0) sources.push("CNPq");

    const result = {
      papers: openalex.papers,
      total_papers: totalPapers,
      institutions: openalex.institutionCounts,
      international: openalex.international,
      concepts: openalex.concepts,
      capes_datasets: capes,
      inep_datasets: inep,
      cnpq_datasets: cnpq,
      // Computed outputs
      density,
      concentration,
      specialization,
      // Meta
      sources,
      processing_time_ms: Date.now() - start,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Layer Knowledge error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

// ===== GitHub repos =====
async function searchGitHub(query: string) {
  const data = await safeFetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=10`);
  return (data?.items || []).map((r: any) => ({
    name: r.full_name || "",
    description: (r.description || "").slice(0, 150),
    stars: r.stargazers_count || 0,
    language: r.language || "",
    url: r.html_url || "",
    updated: r.updated_at?.split("T")[0] || "",
    forks: r.forks_count || 0,
  }));
}

// ===== INPI patents via dados.gov.br =====
async function searchINPI(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " patente INPI propriedade industrial")}&rows=8`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
    structured: false,
  }));
}

// ===== RAIS/CAGED employment via dados.gov.br =====
async function searchRAIS(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " RAIS CAGED emprego trabalho")}&rows=6`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    structured: false,
  }));
}

// ===== Embrapii/Finep via dados.gov.br =====
async function searchEmbrapiiFinep(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " Embrapii Finep inovação")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    structured: false,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, knowledge_papers, knowledge_total_papers } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Layer Technology: ${query}`);
    const start = Date.now();

    const [github, inpi, rais, embrapii] = await Promise.all([
      searchGitHub(query),
      searchINPI(query),
      searchRAIS(query),
      searchEmbrapiiFinep(query),
    ]);

    // ===== COMPUTED OUTPUTS =====
    const totalRepos = github.length;
    const totalStars = github.reduce((s: number, r: any) => s + (r.stars || 0), 0);
    const patentDatasets = inpi.length;
    const employmentDatasets = rais.length;

    // Densidade tecnológica = repos + datasets_patente
    const tech_density = totalRepos + patentDatasets;

    // TRL proxy estimation (needs cross-layer data passed in)
    const papersCount = knowledge_total_papers || 0;
    const signals = {
      has_papers: papersCount > 0,
      has_repos: totalRepos > 0,
      has_patents: patentDatasets > 0,
      has_employment: employmentDatasets > 0,
      high_stars: totalStars > 100,
    };
    const signalCount = Object.values(signals).filter(Boolean).length;
    const trl_estimate = Math.min(9, signalCount + 2);
    const trl_label = trl_estimate <= 3 ? "Pesquisa básica" :
      trl_estimate <= 5 ? "Protótipo/Validação" :
      trl_estimate <= 7 ? "Demonstração" : "Mercado";

    // Índice Ciência→Patente (se dados de knowledge disponíveis)
    const science_to_patent = patentDatasets > 0 && papersCount > 0
      ? Math.round(papersCount / patentDatasets)
      : papersCount > 0 ? Infinity : 0;

    // Language distribution
    const languageDistribution: Record<string, number> = {};
    for (const r of github) {
      if (r.language) languageDistribution[r.language] = (languageDistribution[r.language] || 0) + 1;
    }

    const sources: string[] = [];
    if (github.length > 0) sources.push("GitHub");
    if (inpi.length > 0) sources.push("INPI/dados.gov");
    if (rais.length > 0) sources.push("RAIS/CAGED");
    if (embrapii.length > 0) sources.push("Embrapii/Finep");

    const result = {
      github_repos: github,
      patent_datasets: inpi,
      employment_datasets: rais,
      innovation_datasets: embrapii,
      // Computed outputs
      tech_density,
      trl_estimate,
      trl_label,
      trl_signals: signals,
      science_to_patent: science_to_patent === Infinity ? null : science_to_patent,
      language_distribution: languageDistribution,
      total_stars: totalStars,
      // Meta
      sources,
      processing_time_ms: Date.now() - start,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Layer Technology error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

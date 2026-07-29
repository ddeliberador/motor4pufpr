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
    if (!res.ok) { console.warn(`safeFetch ${res.status} for ${url}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`safeFetch failed for ${url}:`, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchGitHub(query: string, searchTerms: string[]) {
  const ghToken = Deno.env.get("GITHUB_TOKEN") || "";
  const ghHeaders: Record<string, string> = { "User-Agent": "Motor4P-UFPR" };
  if (ghToken) ghHeaders["Authorization"] = `token ${ghToken}`;

  // GitHub funciona melhor com termos em inglês
  // Os search_terms do ontology_engine já incluem a versão em inglês
  const allRepos: any[] = [];
  const seenNames = new Set<string>();

  const termsToTry = [query, ...searchTerms.filter((t) => t !== query)].slice(0, 3);

  for (const term of termsToTry) {
    const data = await safeFetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(term + " Brazil OR Brasil")}&sort=stars&per_page=8`,
      { headers: ghHeaders }
    );
    for (const r of (data?.items || [])) {
      if (!seenNames.has(r.full_name)) {
        seenNames.add(r.full_name);
        allRepos.push({
          name: r.full_name || "",
          description: (r.description || "").slice(0, 150),
          stars: r.stargazers_count || 0,
          language: r.language || "",
          url: r.html_url || "",
          updated: r.updated_at?.split("T")[0] || "",
          forks: r.forks_count || 0,
        });
      }
    }
  }

  // Segundo passo: busca sem filtro Brasil para comparação global
  const globalData = await safeFetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(termsToTry[0])}&sort=stars&per_page=5`,
    { headers: ghHeaders }
  );
  const globalRepos = (globalData?.items || [])
    .filter((r: any) => !seenNames.has(r.full_name))
    .map((r: any) => ({
      name: r.full_name || "",
      description: (r.description || "").slice(0, 150),
      stars: r.stargazers_count || 0,
      language: r.language || "",
      url: r.html_url || "",
      updated: r.updated_at?.split("T")[0] || "",
      forks: r.forks_count || 0,
      is_global: true,
    }));

  return { br_repos: allRepos.slice(0, 10), global_repos: globalRepos.slice(0, 5) };
}

async function searchINPI(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " patente INPI propriedade industrial")}&rows=8`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchRAIS(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " RAIS CAGED emprego trabalho")}&rows=6`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchEmbrapiiFinep(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " Embrapii Finep inovação")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchCNPJQSA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CNPJ empresa cadastro societário")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchTransportes(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " transporte infraestrutura rodovia aviação")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchANVISA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " ANVISA medicamento registro saúde")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, knowledge_papers, knowledge_total_papers, search_terms, ipc_codes } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const searchTerms: string[] = Array.isArray(search_terms) && search_terms.length > 0 ? search_terms : [query];
    const ipcCodes: string[] = Array.isArray(ipc_codes) ? ipc_codes : [];

    console.log(`Layer Technology: ${query} | termos: ${searchTerms.join(", ")} | IPC: ${ipcCodes.length}`);
    const start = Date.now();

    const [githubResult, inpi, rais, embrapii, cnpj_qsa, transportes, anvisa] = await Promise.all([
      searchGitHub(query, searchTerms), searchINPI(query), searchRAIS(query), searchEmbrapiiFinep(query),
      searchCNPJQSA(query), searchTransportes(query), searchANVISA(query),
    ]);

    const github = githubResult.br_repos;
    const globalRepos = githubResult.global_repos;

    const totalRepos = github.length;
    const totalStars = github.reduce((s: number, r: any) => s + (r.stars || 0), 0);
    const globalStars = globalRepos.reduce((s: number, r: any) => s + (r.stars || 0), 0);
    const patentDatasets = inpi.length;
    const employmentDatasets = rais.length;
    const tech_density = totalRepos + patentDatasets;
    const papersCount = knowledge_total_papers || 0;

    const signals = {
      has_papers: papersCount > 0, has_repos: totalRepos > 0, has_patents: patentDatasets > 0,
      has_employment: employmentDatasets > 0, high_stars: totalStars > 100,
      has_cnpj_data: cnpj_qsa.length > 0, has_transport_data: transportes.length > 0,
    };
    const signalCount = Object.values(signals).filter(Boolean).length;
    const trl_estimate = Math.min(9, signalCount + 1);
    const trl_label = trl_estimate <= 3 ? "Pesquisa básica" : trl_estimate <= 5 ? "Protótipo/Validação" : trl_estimate <= 7 ? "Demonstração" : "Mercado";
    const science_to_patent = patentDatasets > 0 && papersCount > 0 ? Math.round(papersCount / patentDatasets) : papersCount > 0 ? null : 0;

    const languageDistribution: Record<string, number> = {};
    for (const r of github) {
      if (r.language) languageDistribution[r.language] = (languageDistribution[r.language] || 0) + 1;
    }

    const sources: string[] = [];
    if (github.length > 0) sources.push("GitHub");
    if (inpi.length > 0) sources.push("INPI/dados.gov");
    if (rais.length > 0) sources.push("RAIS/CAGED");
    if (embrapii.length > 0) sources.push("Embrapii/Finep");
    if (cnpj_qsa.length > 0) sources.push("CNPJ/QSA");
    if (transportes.length > 0) sources.push("Transportes");
    if (anvisa.length > 0) sources.push("ANVISA");

    return new Response(JSON.stringify({
      github_repos: github, github_global_repos: globalRepos, patent_datasets: inpi, employment_datasets: rais,
      innovation_datasets: embrapii, cnpj_qsa_datasets: cnpj_qsa,
      transport_datasets: transportes, anvisa_datasets: anvisa,
      tech_density, trl_estimate, trl_label, trl_signals: signals,
      science_to_patent, language_distribution: languageDistribution,
      total_stars: totalStars, global_total_stars: globalStars,
      ipc_codes: ipcCodes, search_terms_used: searchTerms,
      sources, processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Layer Technology error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

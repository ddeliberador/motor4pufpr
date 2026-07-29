import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CBO local — fallback quando o Railway não retorna cbo_codes
// Referência: CBO 2002 (MTE)
const CBO_KEYWORD_MAP: Record<string, Array<{ code: string; description: string; area: string }>> = {
  "bateria": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em eletrotécnica", area: "Técnico" },
    { code: "2112-10", description: "Físico", area: "Pesquisa" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
  ],
  "litio": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
    { code: "3141-05", description: "Técnico em eletrotécnica", area: "Técnico" },
  ],
  "sodio": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
  ],
  "energia": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em eletrotécnica", area: "Técnico" },
    { code: "3141-30", description: "Técnico em energias renováveis", area: "Técnico" },
    { code: "2122-30", description: "Engenheiro de energias renováveis", area: "Engenharia" },
  ],
  "solar": [
    { code: "2122-30", description: "Engenheiro de energias renováveis", area: "Engenharia" },
    { code: "3141-30", description: "Técnico em energias renováveis", area: "Técnico" },
    { code: "2112-20", description: "Físico (energia solar)", area: "Pesquisa" },
  ],
  "hidrogenio": [
    { code: "2143-15", description: "Engenheiro químico", area: "Engenharia" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
    { code: "2122-30", description: "Engenheiro de energias renováveis", area: "Engenharia" },
  ],
  "inteligencia": [
    { code: "2124-05", description: "Analista de sistemas computacionais", area: "TI" },
    { code: "2124-20", description: "Engenheiro de software", area: "TI" },
    { code: "2523-10", description: "Cientista de dados", area: "TI" },
    { code: "2124-10", description: "Analista de desenvolvimento de sistemas", area: "TI" },
  ],
  "artificial": [
    { code: "2124-05", description: "Analista de sistemas computacionais", area: "TI" },
    { code: "2124-20", description: "Engenheiro de software", area: "TI" },
    { code: "2523-10", description: "Cientista de dados", area: "TI" },
  ],
  "software": [
    { code: "2124-20", description: "Engenheiro de software", area: "TI" },
    { code: "2124-10", description: "Analista de desenvolvimento de sistemas", area: "TI" },
    { code: "3172-20", description: "Técnico em informática", area: "Técnico" },
  ],
  "semicondutor": [
    { code: "2122-05", description: "Engenheiro eletrônico", area: "Engenharia" },
    { code: "3172-10", description: "Técnico em eletrônica", area: "Técnico" },
    { code: "2112-05", description: "Físico", area: "Pesquisa" },
  ],
  "chip": [
    { code: "2122-05", description: "Engenheiro eletrônico", area: "Engenharia" },
    { code: "3172-10", description: "Técnico em eletrônica", area: "Técnico" },
  ],
  "robotica": [
    { code: "2122-10", description: "Engenheiro de controle e automação", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em mecatrônica", area: "Técnico" },
    { code: "7843-10", description: "Operador de robótica industrial", area: "Operacional" },
  ],
  "automacao": [
    { code: "2122-10", description: "Engenheiro de controle e automação", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em mecatrônica", area: "Técnico" },
    { code: "2143-05", description: "Engenheiro mecânico", area: "Engenharia" },
  ],
  "biotecnologia": [
    { code: "2234-05", description: "Biólogo", area: "Ciências biológicas" },
    { code: "3222-10", description: "Técnico em biotecnologia", area: "Técnico" },
    { code: "2112-15", description: "Biofísico", area: "Pesquisa" },
  ],
  "crispr": [
    { code: "2234-05", description: "Biólogo", area: "Ciências biológicas" },
    { code: "3222-10", description: "Técnico em biotecnologia", area: "Técnico" },
  ],
  "grafeno": [
    { code: "2112-10", description: "Físico (nanomateriais)", area: "Pesquisa" },
    { code: "2113-15", description: "Químico (nanoquímica)", area: "Química" },
    { code: "2122-25", description: "Engenheiro de materiais", area: "Engenharia" },
  ],
  "nanotecnologia": [
    { code: "2112-10", description: "Físico (nanomateriais)", area: "Pesquisa" },
    { code: "2113-15", description: "Químico (nanoquímica)", area: "Química" },
    { code: "2122-25", description: "Engenheiro de materiais", area: "Engenharia" },
    { code: "3131-35", description: "Técnico em nanotecnologia", area: "Técnico" },
  ],
  "farmaco": [
    { code: "2236-05", description: "Farmacêutico", area: "Saúde" },
    { code: "2236-25", description: "Farmacêutico industrial", area: "Saúde" },
    { code: "3222-20", description: "Técnico em farmácia", area: "Técnico" },
  ],
  "medicamento": [
    { code: "2236-05", description: "Farmacêutico", area: "Saúde" },
    { code: "2236-25", description: "Farmacêutico industrial", area: "Saúde" },
    { code: "3222-20", description: "Técnico em farmácia", area: "Técnico" },
  ],
  "biomaterial": [
    { code: "2236-10", description: "Biomédico", area: "Saúde" },
    { code: "2234-15", description: "Engenheiro biomédico", area: "Engenharia" },
    { code: "3222-05", description: "Técnico de laboratório", area: "Técnico" },
  ],
  "telecomunicacao": [
    { code: "2122-15", description: "Engenheiro de telecomunicações", area: "Engenharia" },
    { code: "3172-05", description: "Técnico em telecomunicações", area: "Técnico" },
    { code: "2523-05", description: "Analista de redes", area: "TI" },
  ],
  "iot": [
    { code: "2122-15", description: "Engenheiro de telecomunicações", area: "Engenharia" },
    { code: "3172-15", description: "Técnico em redes de computadores", area: "Técnico" },
    { code: "2124-05", description: "Analista de sistemas computacionais", area: "TI" },
  ],
  "aeronave": [
    { code: "2143-20", description: "Engenheiro aeronáutico", area: "Engenharia" },
    { code: "3143-10", description: "Técnico em mecânica aeronáutica", area: "Técnico" },
    { code: "3143-05", description: "Técnico em aviônica", area: "Técnico" },
  ],
  "drone": [
    { code: "2143-20", description: "Engenheiro aeronáutico", area: "Engenharia" },
    { code: "3143-05", description: "Técnico em aviônica", area: "Técnico" },
    { code: "2122-10", description: "Engenheiro de controle e automação", area: "Engenharia" },
  ],
  "mineracao": [
    { code: "2143-10", description: "Engenheiro de minas", area: "Engenharia" },
    { code: "3132-05", description: "Técnico em mineração", area: "Técnico" },
    { code: "7121-05", description: "Operador de mineração", area: "Operacional" },
  ],
  "aco": [
    { code: "2143-25", description: "Engenheiro metalúrgico", area: "Engenharia" },
    { code: "3131-25", description: "Técnico em metalurgia", area: "Técnico" },
    { code: "7231-25", description: "Operador de processos metalúrgicos", area: "Operacional" },
  ],
  "quimico": [
    { code: "2113-10", description: "Químico industrial", area: "Química" },
    { code: "3131-10", description: "Técnico em química", area: "Técnico" },
    { code: "2143-15", description: "Engenheiro químico", area: "Engenharia" },
  ],
};

function resolveCboFromQuery(query: string): Array<{ code: string; description: string; area: string }> {
  const terms = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
  const seen = new Set<string>();
  const result: Array<{ code: string; description: string; area: string }> = [];
  for (const term of terms) {
    for (const [keyword, cbos] of Object.entries(CBO_KEYWORD_MAP)) {
      if (term.includes(keyword) || keyword.includes(term)) {
        for (const cbo of cbos) {
          if (!seen.has(cbo.code)) {
            seen.add(cbo.code);
            result.push(cbo);
          }
        }
      }
    }
  }
  return result.slice(0, 6);
}

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
    const { query, knowledge_papers, knowledge_total_papers, search_terms, ipc_codes, cbo_codes } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const searchTerms: string[] = Array.isArray(search_terms) && search_terms.length > 0 ? search_terms : [query];
    const ipcCodes: string[] = Array.isArray(ipc_codes) ? ipc_codes : [];

    // Resolve CBOs: prioridade para os vindos da ontologia Railway, fallback para mapeamento local
    const cbosFromOntology: Array<{ code: string; description: string; area?: string }> =
      Array.isArray(cbo_codes) && cbo_codes.length > 0 ? cbo_codes : resolveCboFromQuery(query);

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

    // ─────────────────────────────────────────────────────────────────
    // TRL — Technology Readiness Level (adaptado para dados públicos BR)
    // Referência: NASA TRL / EMBRAPII / ISO 16290:2013
    // Dados abertos permitem distinguir 3 faixas, não 9 níveis.
    // ─────────────────────────────────────────────────────────────────

    const hasScientificBase = papersCount > 0;

    const hasStructuredPatents = ipcCodes.length > 0;
    const hasRepoTraction = totalStars > 50;
    const hasHighRepoTraction = totalStars > 500;
    const hasMeaningfulRepos = totalRepos >= 3;
    const hasInnovationFunding = embrapii.length > 0 && embrapii.some((d: any) =>
      d.title?.toLowerCase().includes(query.toLowerCase().split(" ")[0])
    );
    const hasPublicContracts = (knowledge_papers || 0) > 0;
    const hasEmploymentSignal = employmentDatasets > 0 && rais.some((d: any) =>
      d.title?.toLowerCase().includes(query.toLowerCase().split(" ")[0])
    );

    let trl_estimate: number;
    let trl_label: string;
    let trl_confidence: "high" | "medium" | "low";
    let trl_faixa: 1 | 2 | 3;
    let trl_rationale: string;

    if (hasHighRepoTraction && hasEmploymentSignal) {
      trl_estimate = 8;
      trl_label = "Demonstração / Mercado (TRL 7–9)";
      trl_faixa = 3;
      trl_confidence = "medium";
      trl_rationale = `Alta tração open source (${totalStars} stars) + emprego formal identificado`;
    } else if (hasHighRepoTraction || (hasMeaningfulRepos && hasEmploymentSignal)) {
      trl_estimate = 7;
      trl_label = "Demonstração / Mercado (TRL 7–9)";
      trl_faixa = 3;
      trl_confidence = "low";
      trl_rationale = hasHighRepoTraction
        ? `Tração open source alta (${totalStars} stars) — mercado em formação`
        : `Repos + emprego formal — aplicação emergindo`;
    } else if (hasStructuredPatents && (hasRepoTraction || hasMeaningfulRepos)) {
      trl_estimate = 6;
      trl_label = "Desenvolvimento / Validação (TRL 4–6)";
      trl_faixa = 2;
      trl_confidence = "medium";
      trl_rationale = `Patentes IPC identificadas (${ipcCodes.length}) + código aberto com tração`;
    } else if (hasStructuredPatents || (hasRepoTraction && hasScientificBase)) {
      trl_estimate = 5;
      trl_label = "Desenvolvimento / Validação (TRL 4–6)";
      trl_faixa = 2;
      trl_confidence = "medium";
      trl_rationale = hasStructuredPatents
        ? `Patentes identificadas via IPC (${ipcCodes.length} códigos) — campo em P&D aplicado`
        : `Repos com tração (${totalStars} stars) + ${papersCount} papers científicos`;
    } else if (hasInnovationFunding || (hasMeaningfulRepos && hasScientificBase)) {
      trl_estimate = 4;
      trl_label = "Desenvolvimento / Validação (TRL 4–6)";
      trl_faixa = 2;
      trl_confidence = "low";
      trl_rationale = hasInnovationFunding
        ? "Financiamento de inovação (Embrapii/Finep) identificado"
        : `${totalRepos} repos + base científica — prototipagem em curso`;
    } else if (hasScientificBase) {
      trl_estimate = 3;
      trl_label = "Pesquisa Básica (TRL 1–3)";
      trl_faixa = 1;
      trl_confidence = papersCount > 100 ? "high" : "medium";
      trl_rationale = `${papersCount} papers científicos — campo em fase de pesquisa básica`;
    } else {
      trl_estimate = 1;
      trl_label = "Pesquisa Básica (TRL 1–3)";
      trl_faixa = 1;
      trl_confidence = "low";
      trl_rationale = "Dados insuficientes para classificação — campo muito específico ou emergente";
    }

    const signals = {
      has_papers: hasScientificBase,
      has_repos: hasMeaningfulRepos,
      has_patents: hasStructuredPatents,
      has_employment: hasEmploymentSignal,
      high_stars: hasHighRepoTraction,
      has_innovation_funding: hasInnovationFunding,
    };

    const science_to_patent = hasStructuredPatents && papersCount > 0
      ? Math.round(papersCount / Math.max(ipcCodes.length, 1))
      : null;

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

    // Novo CAGED — busca por CBO se API key disponível
    const TRANSP_KEY = Deno.env.get("TRANSPARENCIA_API_KEY");
    let cagedData = null;
    if (TRANSP_KEY && cbosFromOntology.length > 0) {
      try {
        cagedData = await fetchCaged(cbosFromOntology, TRANSP_KEY);
        if (cagedData) console.log(`CAGED: ${cagedData.cbo_results?.length || 0} CBOs, saldo ${cagedData.summary?.total_saldo}`);
      } catch (e) {
        console.warn("CAGED falhou:", e instanceof Error ? e.message : e);
      }
    }
    if (cagedData) sources.push("Novo CAGED/MTE");

    return new Response(JSON.stringify({
      github_repos: github,
      caged_data: cagedData,
      cbo_codes_used: cbosFromOntology,
      github_global_repos: globalRepos, patent_datasets: inpi, employment_datasets: rais,
      innovation_datasets: embrapii, cnpj_qsa_datasets: cnpj_qsa,
      transport_datasets: transportes, anvisa_datasets: anvisa,
      tech_density, trl_estimate, trl_label, trl_faixa, trl_confidence, trl_rationale,
      trl_signals: signals, science_to_patent, language_distribution: languageDistribution,
      total_stars: totalStars, global_total_stars: globalStars,
      ipc_codes: ipcCodes, search_terms_used: searchTerms,
      sources, processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Layer Technology error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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

// ===== BrasilAPI CNPJ Lookup =====
async function lookupCNPJ(cnpj: string): Promise<any> {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return null;
  const data = await safeFetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
  if (!data || data.message) return null;
  return {
    cnpj: data.cnpj || clean,
    razao_social: data.razao_social || "",
    nome_fantasia: data.nome_fantasia || "",
    cnae_fiscal: data.cnae_fiscal || "",
    cnae_descricao: data.cnae_fiscal_descricao || "",
    porte: data.porte || "",
    natureza_juridica: data.natureza_juridica || "",
    uf: data.uf || "",
    municipio: data.municipio || "",
    situacao_cadastral: data.descricao_situacao_cadastral || "",
    capital_social: data.capital_social || 0,
    qsa: (data.qsa || []).map((s: any) => ({
      nome: s.nome_socio || "",
      qualificacao: s.qualificacao_socio || "",
      cnpj_cpf: s.cnpj_cpf_do_socio || "",
      data_entrada: s.data_entrada_sociedade || "",
    })),
    total_socios: (data.qsa || []).length,
  };
}

// ===== Search companies in sector via CNPJ datasets =====
async function searchCompaniesInSector(query: string): Promise<any[]> {
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(
      query + " empresa CNPJ cadastro"
    )}&rows=8`
  );
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 250),
    organization: pkg.organization?.title || "",
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
  }));
}

// ===== Search international competitors via OpenAlex affiliations =====
async function searchInternationalCompanies(query: string): Promise<any[]> {
  const data = await safeFetch(
    `https://api.openalex.org/works?filter=default.search:${encodeURIComponent(query)}&per_page=50&select=id,authorships`
  );
  if (!data?.results) return [];

  // Extract corporate/industry affiliations (non-university)
  const orgCounts: Record<string, { count: number; country: string; type: string }> = {};
  for (const work of data.results) {
    for (const auth of work.authorships || []) {
      for (const inst of auth.institutions || []) {
        const name = inst.display_name || "";
        const type = inst.type || "";
        const country = inst.country_code || "";
        // Filter for companies/non-academic
        if (type === "company" || type === "facility" || type === "nonprofit") {
          if (!orgCounts[name]) orgCounts[name] = { count: 0, country, type };
          orgCounts[name].count++;
        }
      }
    }
  }

  return Object.entries(orgCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([name, info]) => ({
      name,
      country: info.country,
      type: info.type,
      publications: info.count,
      origin: "international",
    }));
}

// ===== Search BR companies via GitHub orgs =====
async function searchGitHubOrgs(query: string): Promise<any[]> {
  const data = await safeFetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=20`
  );
  if (!data?.items) return [];

  const orgCounts: Record<string, { stars: number; url: string; repos: number }> = {};
  for (const repo of data.items) {
    const owner = repo.owner?.login || "";
    const ownerType = repo.owner?.type || "";
    if (ownerType === "Organization" && owner) {
      if (!orgCounts[owner]) orgCounts[owner] = { stars: 0, url: repo.owner?.html_url || "", repos: 0 };
      orgCounts[owner].stars += repo.stargazers_count || 0;
      orgCounts[owner].repos++;
    }
  }

  return Object.entries(orgCounts)
    .sort((a, b) => b[1].stars - a[1].stars)
    .slice(0, 10)
    .map(([name, info]) => ({
      name,
      stars: info.stars,
      repos: info.repos,
      url: info.url,
      origin: "github",
    }));
}

// ===== Search via PNCP for companies with contracts =====
async function searchPNCPCompanies(query: string): Promise<any[]> {
  const data = await safeFetch(
    `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?q=${encodeURIComponent(query)}&pagina=1&tamanhoPagina=20`
  );
  if (!data?.data) return [];

  const companyCounts: Record<string, { cnpj: string; contracts: number; totalValue: number }> = {};
  for (const item of data.data) {
    const fornecedor = item.nomeRazaoSocialFornecedor || "";
    const cnpj = item.cnpjFornecedor || "";
    if (fornecedor && cnpj) {
      if (!companyCounts[fornecedor]) companyCounts[fornecedor] = { cnpj, contracts: 0, totalValue: 0 };
      companyCounts[fornecedor].contracts++;
      companyCounts[fornecedor].totalValue += item.valorTotalEstimado || 0;
    }
  }

  return Object.entries(companyCounts)
    .sort((a, b) => b[1].contracts - a[1].contracts)
    .slice(0, 10)
    .map(([name, info]) => ({
      name,
      cnpj: info.cnpj,
      contracts: info.contracts,
      total_value: info.totalValue,
      origin: "pncp",
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, cnpjs } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Competitor Search: ${query}, CNPJs: ${cnpjs?.length || 0}`);
    const start = Date.now();

    // Run all searches in parallel
    const [datasets, international, githubOrgs, pncpCompanies, ...cnpjResults] = await Promise.all([
      searchCompaniesInSector(query),
      searchInternationalCompanies(query),
      searchGitHubOrgs(query),
      searchPNCPCompanies(query),
      ...(cnpjs || []).slice(0, 5).map((c: string) => lookupCNPJ(c)),
    ]);

    // Deduplicate CNPJ lookups
    const cnpjDetails = cnpjResults.filter(Boolean);

    // Build unified competitor list
    const competitors_br: any[] = [];
    const competitors_intl: any[] = [];

    // From PNCP (real companies with CNPJ that won public contracts)
    for (const c of pncpCompanies) {
      competitors_br.push({
        name: c.name,
        cnpj: c.cnpj,
        source: "PNCP",
        signal: "Contratos públicos",
        contracts: c.contracts,
        total_value: c.total_value,
        qsa: [],
      });
    }

    // Enrich top BR competitors with CNPJ/QSA data
    const enrichPromises = competitors_br.slice(0, 5).map(async (comp) => {
      if (comp.cnpj) {
        const detail = await lookupCNPJ(comp.cnpj);
        if (detail) {
          comp.razao_social = detail.razao_social;
          comp.nome_fantasia = detail.nome_fantasia;
          comp.cnae_descricao = detail.cnae_descricao;
          comp.porte = detail.porte;
          comp.uf = detail.uf;
          comp.municipio = detail.municipio;
          comp.capital_social = detail.capital_social;
          comp.qsa = detail.qsa;
          comp.total_socios = detail.total_socios;
        }
      }
    });
    await Promise.all(enrichPromises);

    // International competitors from OpenAlex
    for (const c of international) {
      competitors_intl.push({
        name: c.name,
        country: c.country,
        type: c.type,
        publications: c.publications,
        source: "OpenAlex",
      });
    }

    // GitHub organizations as tech competitors
    for (const g of githubOrgs) {
      const existing = competitors_intl.find((c) => c.name.toLowerCase().includes(g.name.toLowerCase()));
      if (existing) {
        existing.github_stars = g.stars;
        existing.github_repos = g.repos;
        existing.github_url = g.url;
      } else {
        competitors_intl.push({
          name: g.name,
          country: "",
          type: "tech_org",
          github_stars: g.stars,
          github_repos: g.repos,
          github_url: g.url,
          source: "GitHub",
        });
      }
    }

    const sources: string[] = [];
    if (pncpCompanies.length > 0) sources.push("PNCP");
    if (international.length > 0) sources.push("OpenAlex");
    if (githubOrgs.length > 0) sources.push("GitHub");
    if (datasets.length > 0) sources.push("dados.gov.br");
    if (cnpjDetails.length > 0) sources.push("BrasilAPI/CNPJ");

    const result = {
      query,
      competitors_br,
      competitors_intl,
      cnpj_details: cnpjDetails,
      sector_datasets: datasets,
      summary: {
        total_br: competitors_br.length,
        total_intl: competitors_intl.length,
        cnpjs_enriched: cnpjDetails.length,
        sources,
      },
      processing_time_ms: Date.now() - start,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Competitor search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

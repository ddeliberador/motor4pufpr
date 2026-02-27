import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function safeFetch(url: string, timeoutMs = 10000): Promise<any> {
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

// ===== OpenAlex: papers + institutions =====
async function searchOpenAlex(query: string) {
  const encoded = encodeURIComponent(query);

  // Papers
  const papersData = await safeFetch(
    `https://api.openalex.org/works?search=${encoded}&filter=institutions.country_code:BR&per_page=15&sort=cited_by_count:desc&select=id,title,publication_year,cited_by_count,authorships,primary_location,open_access,concepts`
  );
  const papers = (papersData?.results || []).map((w: any) => ({
    id: w.id?.replace("https://openalex.org/", "") || "",
    title: w.title || "",
    year: w.publication_year,
    citations: w.cited_by_count || 0,
    authors: (w.authorships || []).slice(0, 3).map((a: any) => ({
      name: a.author?.display_name || "",
      institution: a.institutions?.[0]?.display_name || "",
      country: a.institutions?.[0]?.country_code || "",
    })),
    journal: w.primary_location?.source?.display_name || "",
    is_open_access: w.open_access?.is_oa || false,
    url: w.primary_location?.landing_page_url || w.id || "",
    concepts: (w.concepts || []).slice(0, 3).map((c: any) => c.display_name),
  }));

  // Brazilian institutions working on this topic
  const instData = await safeFetch(
    `https://api.openalex.org/works?search=${encoded}&filter=institutions.country_code:BR&group_by=authorships.institutions.lineage`
  );
  const institutionCounts: Record<string, number> = {};
  const stateCounts: Record<string, number> = {};
  
  // Extract from papers instead for reliability
  for (const p of papers) {
    for (const a of p.authors) {
      if (a.institution) {
        institutionCounts[a.institution] = (institutionCounts[a.institution] || 0) + 1;
      }
    }
  }

  // International comparison
  const intlData = await safeFetch(
    `https://api.openalex.org/works?search=${encoded}&group_by=authorships.institutions.country_code&per_page=10`
  );
  const international = (intlData?.group_by || [])
    .filter((g: any) => g.key && g.key !== "unknown")
    .slice(0, 10)
    .map((g: any) => ({
      country_code: g.key,
      count: g.count,
    }));

  return { papers, institutionCounts, stateCounts, international, totalPapers: papersData?.meta?.count || papers.length };
}

// ===== BCB macro snapshot =====
async function getBCBSnapshot() {
  const series = [
    { code: 432, name: "Taxa Selic", unit: "% a.a." },
    { code: 433, name: "IPCA mensal", unit: "%" },
    { code: 24364, name: "IBC-Br", unit: "índice" },
    { code: 1, name: "Câmbio USD/BRL", unit: "R$" },
  ];
  const results = await Promise.all(
    series.map(async (s) => {
      const data = await safeFetch(
        `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.code}/dados/ultimos/12?formato=json`
      );
      if (Array.isArray(data) && data.length > 0) {
        const history = data.map((d: any) => ({ date: d.data, value: parseFloat(d.valor) }));
        const last = history[history.length - 1];
        const prev = history.length > 1 ? history[history.length - 2] : null;
        const variation = prev ? ((last.value - prev.value) / Math.abs(prev.value)) * 100 : null;
        return { name: s.name, unit: s.unit, value: last.value, date: last.date, variation: variation !== null ? parseFloat(variation.toFixed(2)) : null, history };
      }
      return { name: s.name, unit: s.unit, value: null, date: null, variation: null, history: [] };
    })
  );
  return results;
}

// ===== IPEAData =====
async function searchIPEAData(query: string) {
  const meta = await safeFetch(
    `http://www.ipeadata.gov.br/api/odata4/Metadados?$filter=contains(SERNOME,'${encodeURIComponent(query)}')&$top=6&$select=SERCODIGO,SERNOME,SERTEMA,FNTSIGLA,PERNOME`
  );
  const series = (meta?.value || []).map((s: any) => ({
    code: s.SERCODIGO, name: s.SERNOME, theme: s.SERTEMA, source: s.FNTSIGLA, frequency: s.PERNOME || null,
  }));
  const withValues = await Promise.all(
    series.slice(0, 4).map(async (s: any) => {
      const data = await safeFetch(
        `http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${s.code}')?$top=12&$orderby=VALDATA desc&$select=VALDATA,VALVALOR`
      );
      const values = (data?.value || []).map((v: any) => ({ date: v.VALDATA?.split("T")[0] || "", value: v.VALVALOR })).reverse();
      return { ...s, values, lastValue: values.length > 0 ? values[values.length - 1].value : null };
    })
  );
  const remaining = series.slice(4).map((s: any) => ({ ...s, values: [], lastValue: null }));
  return [...withValues, ...remaining];
}

// ===== PNCP =====
async function searchPNCP(query: string) {
  const data = await safeFetch(
    `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?q=${encodeURIComponent(query)}&tamanhoPagina=10&pagina=1`
  );
  if (!data) return [];
  const items = Array.isArray(data) ? data : data.data || [];
  return items.slice(0, 10).map((item: any) => ({
    object: item.objetoCompra || item.objeto || "",
    organ: item.orgaoEntidade?.razaoSocial || "",
    modality: item.modalidadeNome || "",
    value: item.valorTotalEstimado || 0,
    status: item.situacaoCompra || "",
    date: item.dataPublicacao || "",
    uf: item.unidadeOrgao?.ufSigla || "",
    url: item.linkSistemaOrigem || item.linkPublicacao || `https://pncp.gov.br/app/editais?q=${encodeURIComponent(query)}`,
  }));
}

// ===== Querido Diário =====
async function searchQueridoDiario(query: string) {
  const data = await safeFetch(
    `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(query)}&size=8&sort_by=relevance`
  );
  return (data?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "",
    state: g.state_code || "",
    date: g.date || "",
    excerpts: (g.excerpts || []).slice(0, 1),
    url: g.txt_url || g.url || "",
  }));
}

// ===== dados.gov.br =====
async function searchDadosGov(query: string) {
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=8`
  );
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    resourceCount: pkg.num_resources || 0,
  }));
}

// ===== COMEX Stat (balança comercial) =====
async function searchCOMEX(query: string) {
  // dados.gov.br has COMEX data
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " exportação importação comércio exterior")}&rows=3&fq=organization:ministerio-do-desenvolvimento-industria-comercio-e-servicos`
  );
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
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

    console.log(`Motor search for: ${query}`);
    const start = Date.now();

    const [openalex, bcb, ipeadata, pncp, gazettes, dados_gov, comex] = await Promise.all([
      searchOpenAlex(query),
      getBCBSnapshot(),
      searchIPEAData(query),
      searchPNCP(query),
      searchQueridoDiario(query),
      searchDadosGov(query),
      searchCOMEX(query),
    ]);

    const processingTime = Date.now() - start;

    // Count active sources
    const activeSources: string[] = [];
    if (openalex.papers.length > 0) activeSources.push("OpenAlex");
    if (bcb.some((b: any) => b.value !== null)) activeSources.push("BCB/SGS");
    if (ipeadata.length > 0) activeSources.push("IPEAData");
    if (pncp.length > 0) activeSources.push("PNCP");
    if (gazettes.length > 0) activeSources.push("Querido Diário");
    if (dados_gov.length > 0) activeSources.push("Portal Dados Abertos");
    if (comex.length > 0) activeSources.push("COMEX Stat");

    const result = {
      query,
      scientific: {
        papers: openalex.papers,
        total_papers: openalex.totalPapers,
        by_institution: openalex.institutionCounts,
        international: openalex.international,
      },
      productive: {
        macro_indicators: bcb,
        ipeadata_series: ipeadata,
        comex_datasets: comex,
      },
      institutional: {
        public_contracts: pncp,
        official_gazettes: gazettes,
        open_datasets: dados_gov,
      },
      stats: {
        papers: openalex.totalPapers,
        contracts: pncp.length,
        gazettes: gazettes.length,
        datasets: dados_gov.length,
        countries: openalex.international.length,
        macro_indicators: bcb.filter((b: any) => b.value !== null).length,
        ipeadata_series: ipeadata.length,
      },
      meta: {
        processing_time_ms: processingTime,
        sources: activeSources,
        source_count: activeSources.length,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Motor search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

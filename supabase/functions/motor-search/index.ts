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

// ===== 1. OpenAlex: papers + institutions + international =====
async function searchOpenAlex(query: string) {
  const encoded = encodeURIComponent(query);
  const [papersData, intlData] = await Promise.all([
    safeFetch(`https://api.openalex.org/works?search=${encoded}&filter=institutions.country_code:BR&per_page=15&sort=cited_by_count:desc&select=id,title,publication_year,cited_by_count,authorships,primary_location,open_access,concepts`),
    safeFetch(`https://api.openalex.org/works?search=${encoded}&group_by=authorships.institutions.country_code&per_page=10`),
  ]);
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
    concepts: (w.concepts || []).slice(0, 5).map((c: any) => c.display_name),
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
  return { papers, institutionCounts, international, totalPapers: papersData?.meta?.count || papers.length };
}

// ===== 2. BCB macro snapshot =====
async function getBCBSnapshot() {
  const series = [
    { code: 432, name: "Taxa Selic", unit: "% a.a." },
    { code: 433, name: "IPCA mensal", unit: "%" },
    { code: 24364, name: "IBC-Br", unit: "índice" },
    { code: 1, name: "Câmbio USD/BRL", unit: "R$" },
    { code: 27574, name: "Crédito PJ total", unit: "R$ mi" },
    { code: 20542, name: "Dívida pública/PIB", unit: "%" },
  ];
  return Promise.all(
    series.map(async (s) => {
      const data = await safeFetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.code}/dados/ultimos/12?formato=json`);
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
}

// ===== 3. IPEAData =====
async function searchIPEAData(query: string) {
  const meta = await safeFetch(`http://www.ipeadata.gov.br/api/odata4/Metadados?$filter=contains(SERNOME,'${encodeURIComponent(query)}')&$top=8&$select=SERCODIGO,SERNOME,SERTEMA,FNTSIGLA,PERNOME`);
  const series = (meta?.value || []).map((s: any) => ({
    code: s.SERCODIGO, name: s.SERNOME, theme: s.SERTEMA, source: s.FNTSIGLA, frequency: s.PERNOME || null,
  }));
  const withValues = await Promise.all(
    series.slice(0, 6).map(async (s: any) => {
      const data = await safeFetch(`http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${s.code}')?$top=12&$orderby=VALDATA desc&$select=VALDATA,VALVALOR`);
      const values = (data?.value || []).map((v: any) => ({ date: v.VALDATA?.split("T")[0] || "", value: v.VALVALOR })).reverse();
      return { ...s, values, lastValue: values.length > 0 ? values[values.length - 1].value : null };
    })
  );
  return [...withValues, ...series.slice(6).map((s: any) => ({ ...s, values: [], lastValue: null }))];
}

// ===== 4. PNCP =====
async function searchPNCP(query: string) {
  const data = await safeFetch(`https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?q=${encodeURIComponent(query)}&tamanhoPagina=15&pagina=1`);
  if (!data) return [];
  const items = Array.isArray(data) ? data : data.data || [];
  return items.slice(0, 15).map((item: any) => ({
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

// ===== 5. Querido Diário =====
async function searchQueridoDiario(query: string) {
  const data = await safeFetch(`https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(query)}&size=10&sort_by=relevance`);
  return (data?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "",
    state: g.state_code || "",
    date: g.date || "",
    excerpts: (g.excerpts || []).slice(0, 2),
    url: g.txt_url || g.url || "",
  }));
}

// ===== 6. dados.gov.br =====
async function searchDadosGov(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=10`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    resourceCount: pkg.num_resources || 0,
  }));
}

// ===== 7. IBGE/SIDRA =====
async function searchIBGE(query: string) {
  const [indicators, localities] = await Promise.all([
    safeFetch(`https://servicodados.ibge.gov.br/api/v2/indicadores?qtd=8`),
    safeFetch(`https://servicodados.ibge.gov.br/api/v1/pesquisas/-/periodos/-/indicadores?qtd=5`),
  ]);
  // Aggregate indicators
  const aggs = await safeFetch(`https://servicodados.ibge.gov.br/api/v1/pesquisas`);
  const pesquisas = (aggs || []).slice(0, 10).map((p: any) => ({
    id: p.id, name: p.nome, description: p.descricao?.slice(0, 150) || "",
  }));
  // Key economic indicators
  const keyIndicators = await Promise.all([
    safeFetch(`https://servicodados.ibge.gov.br/api/v2/indicadores/4094/resultados`), // PNAD desocupação
    safeFetch(`https://servicodados.ibge.gov.br/api/v2/indicadores/5938/resultados`), // PIB
  ]);
  return {
    pesquisas,
    pnad: keyIndicators[0] ? { name: "PNAD - Desocupação", data: keyIndicators[0] } : null,
    pib: keyIndicators[1] ? { name: "PIB Trimestral", data: keyIndicators[1] } : null,
  };
}

// ===== 8. GitHub repos =====
async function searchGitHub(query: string) {
  const data = await safeFetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=8`);
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

// ===== 9. BrasilAPI CNPJ by CNAE =====
async function searchBrasilAPICNAE(query: string) {
  // Get IBGE municipalities data as proxy for economic activity
  const munis = await safeFetch(`https://brasilapi.com.br/api/ibge/municipios/v1/PR`);
  return {
    municipalities_pr: (munis || []).slice(0, 10).map((m: any) => ({
      name: m.nome, code: m.codigo_ibge,
    })),
  };
}

// ===== 10. Portal da Transparência =====
async function searchTransparencia(query: string) {
  // Convênios
  const convenios = await safeFetch(`https://api.portaldatransparencia.gov.br/api-de-dados/convenios?pagina=1&tamanhoPagina=8&objeto=${encodeURIComponent(query)}`, 15000);
  // CEIS - empresas sancionadas
  const ceis = await safeFetch(`https://api.portaldatransparencia.gov.br/api-de-dados/ceis?pagina=1&tamanhoPagina=5&nomeFantasia=${encodeURIComponent(query)}`, 15000);
  return {
    convenios: (convenios || []).map((c: any) => ({
      object: c.objeto?.slice(0, 200) || "",
      proponent: c.proponente?.nome || "",
      value: c.valor || 0,
      grantor: c.orgaoSuperior?.nome || "",
      startDate: c.dataInicioVigencia || "",
      endDate: c.dataFimVigencia || "",
      situation: c.situacao || "",
    })),
    sanctions: (ceis || []).map((s: any) => ({
      company: s.nomeFantasia || s.razaoSocial || "",
      type: s.tipoSancao || "",
      organ: s.orgaoSancionador?.nome || "",
      date: s.dataInicioSancao || "",
    })),
  };
}

// ===== 11. SICONFI Tesouro =====
async function searchSICONFI(query: string) {
  // Extratos de declaração
  const data = await safeFetch(`https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf?an_exercicio=2024&nr_periodo=1&tp_rgf=RGF&id_ente=41`, 15000);
  return (data?.items || []).slice(0, 8).map((item: any) => ({
    entity: item.instituicao || "",
    year: item.exercicio || 2024,
    period: item.periodicidade || "",
    url: item.anexo || "",
  }));
}

// ===== 12. ANEEL Geração Distribuída =====
async function searchANEEL(query: string) {
  const data = await safeFetch(`https://dadosabertos.aneel.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=8`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://dadosabertos.aneel.gov.br/dataset/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
  }));
}

// ===== 13. CVM Companhias =====
async function searchCVM(query: string) {
  const data = await safeFetch(`https://dados.cvm.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=6`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.cvm.gov.br/dataset/${pkg.name}`,
  }));
}

// ===== 14. ANATEL Telecom =====
async function searchANATEL(query: string) {
  const data = await safeFetch(`https://informacoes.anatel.gov.br/paineis/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: pkg.url || "",
  }));
}

// ===== 15. CAPES Bolsas =====
async function searchCAPES(query: string) {
  const data = await safeFetch(`https://dadosabertos.capes.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=6`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://dadosabertos.capes.gov.br/dataset/${pkg.name}`,
  }));
}

// ===== 16. INEP Educação =====
async function searchINEP(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " educação INEP")}&rows=5&fq=organization:instituto-nacional-de-estudos-e-pesquisas-educacionais-anisio-teixeira-inep`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== 17. INPE Desmatamento =====
async function searchINPE() {
  const data = await safeFetch(`http://terrabrasilis.dpi.inpe.br/api/v1/deter/alerts?limit=5`);
  return data || [];
}

// ===== 18. COMEX balança comercial =====
async function searchCOMEX(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " exportação importação comércio exterior")}&rows=5&fq=organization:ministerio-do-desenvolvimento-industria-comercio-e-servicos`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== 19. TCU Auditorias =====
async function searchTCU(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " TCU auditoria")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== 20. IBAMA Ambiental =====
async function searchIBAMA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " IBAMA ambiental")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== 21. ANVISA Saúde =====
async function searchANVISA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " ANVISA medicamento")}&rows=5`);
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

    console.log(`Motor search for: ${query}`);
    const start = Date.now();

    // All 21 sources in parallel
    const [
      openalex, bcb, ipeadata, pncp, gazettes, dados_gov,
      ibge, github, brasilapi, transparencia, siconfi,
      aneel, cvm, anatel, capes, inep, inpe, comex, tcu, ibama, anvisa,
    ] = await Promise.all([
      searchOpenAlex(query),
      getBCBSnapshot(),
      searchIPEAData(query),
      searchPNCP(query),
      searchQueridoDiario(query),
      searchDadosGov(query),
      searchIBGE(query),
      searchGitHub(query),
      searchBrasilAPICNAE(query),
      searchTransparencia(query),
      searchSICONFI(query),
      searchANEEL(query),
      searchCVM(query),
      searchANATEL(query),
      searchCAPES(query),
      searchINEP(query),
      searchINPE(),
      searchCOMEX(query),
      searchTCU(query),
      searchIBAMA(query),
      searchANVISA(query),
    ]);

    const processingTime = Date.now() - start;

    // Count active sources
    const activeSources: string[] = [];
    if (openalex.papers.length > 0) activeSources.push("OpenAlex");
    if (bcb.some((b: any) => b.value !== null)) activeSources.push("BCB/SGS");
    if (ipeadata.length > 0) activeSources.push("IPEAData");
    if (pncp.length > 0) activeSources.push("PNCP");
    if (gazettes.length > 0) activeSources.push("Querido Diário");
    if (dados_gov.length > 0) activeSources.push("Dados Abertos");
    if (ibge.pesquisas?.length > 0) activeSources.push("IBGE/SIDRA");
    if (github.length > 0) activeSources.push("GitHub");
    if (brasilapi.municipalities_pr?.length > 0) activeSources.push("BrasilAPI");
    if (transparencia.convenios?.length > 0 || transparencia.sanctions?.length > 0) activeSources.push("Transparência");
    if (siconfi.length > 0) activeSources.push("SICONFI/Tesouro");
    if (aneel.length > 0) activeSources.push("ANEEL");
    if (cvm.length > 0) activeSources.push("CVM");
    if (anatel.length > 0) activeSources.push("ANATEL");
    if (capes.length > 0) activeSources.push("CAPES");
    if (inep.length > 0) activeSources.push("INEP");
    if (Array.isArray(inpe) && inpe.length > 0) activeSources.push("INPE DETER");
    if (comex.length > 0) activeSources.push("COMEX");
    if (tcu.length > 0) activeSources.push("TCU");
    if (ibama.length > 0) activeSources.push("IBAMA");
    if (anvisa.length > 0) activeSources.push("ANVISA");

    // ===== COMPUTE STRATEGIC INDICES =====
    const totalPapers = openalex.totalPapers || 0;
    const totalContracts = pncp.length;
    const totalConvenios = transparencia.convenios?.length || 0;
    const totalGithub = github.length;
    const brCount = openalex.international.find((c: any) => c.country_code === "BR")?.count || 0;
    const topForeignCount = openalex.international
      .filter((c: any) => c.country_code !== "BR")
      .sort((a: any, b: any) => b.count - a.count)[0]?.count || 0;
    const totalIntlPapers = openalex.international.reduce((s: number, c: any) => s + c.count, 0) || 1;

    // GT — Gargalo de Tradução: papers vs contratos+convênios (0-100, higher = bigger gap)
    const translationDenominator = totalContracts + totalConvenios + totalGithub;
    const gt = translationDenominator > 0
      ? Math.min(100, Math.round((totalPapers / translationDenominator) * 10))
      : totalPapers > 0 ? 100 : 0;

    // CD — Concentração e Dependência (% produção estrangeira vs BR)
    const cd = totalIntlPapers > 0
      ? Math.round(((totalIntlPapers - brCount) / totalIntlPapers) * 100)
      : 0;

    // AUE — Articulação Universidade-Empresa (institutions in papers that also appear in contracts)
    const institutionNames = Object.keys(openalex.institutionCounts).map((n: string) => n.toLowerCase());
    const contractOrgans = pncp.map((c: any) => (c.organ || "").toLowerCase());
    const convenioProponents = (transparencia.convenios || []).map((c: any) => (c.proponent || "").toLowerCase());
    const allInstitutional = [...contractOrgans, ...convenioProponents];
    let matchCount = 0;
    for (const inst of institutionNames) {
      if (allInstitutional.some((o: string) => o.includes(inst.slice(0, 15)) || inst.includes(o.slice(0, 15)))) {
        matchCount++;
      }
    }
    const aue = institutionNames.length > 0
      ? Math.round((matchCount / institutionNames.length) * 100)
      : 0;

    // EI — Efetividade Instrumental (convênios+contratos value vs volume)
    const totalContractValue = pncp.reduce((s: number, c: any) => s + (c.value || 0), 0);
    const totalConvenioValue = (transparencia.convenios || []).reduce((s: number, c: any) => s + (c.value || 0), 0);
    const totalInstrumentalValue = totalContractValue + totalConvenioValue;
    const ei = translationDenominator > 0 && totalInstrumentalValue > 0
      ? Math.min(100, Math.round(Math.log10(totalInstrumentalValue / translationDenominator) * 20 + 50))
      : 0;

    // UF concentration from contracts
    const ufDistribution: Record<string, number> = {};
    for (const c of pncp) {
      if (c.uf) ufDistribution[c.uf] = (ufDistribution[c.uf] || 0) + 1;
    }

    const strategic_indices = {
      gt: { value: gt, label: "Gargalo de Tradução", description: "Proporção ciência vs aplicação — quanto maior, mais ciência sem tradução prática", formula: "papers / (contratos + convênios + repos) × 10" },
      cd: { value: cd, label: "Dependência Externa", description: "% da produção científica fora do Brasil", formula: "(papers_estrangeiros / total_papers) × 100" },
      aue: { value: aue, label: "Articulação U-E", description: "% de instituições científicas presentes também em contratos/convênios", formula: "(instituições_com_match / total_instituições) × 100" },
      ei: { value: ei, label: "Efetividade Instrumental", description: "Relação entre valor financeiro e volume de instrumentos públicos", formula: "log10(valor_total / qtd_instrumentos) × 20 + 50" },
      uf_distribution: ufDistribution,
    };

    const result = {
      query,
      scientific: {
        papers: openalex.papers,
        total_papers: openalex.totalPapers,
        by_institution: openalex.institutionCounts,
        international: openalex.international,
        capes_datasets: capes,
        inep_datasets: inep,
      },
      technological: {
        github_repos: github,
      },
      productive: {
        macro_indicators: bcb,
        ipeadata_series: ipeadata,
        comex_datasets: comex,
        ibge: ibge,
        aneel_datasets: aneel,
        cvm_datasets: cvm,
        anatel_datasets: anatel,
        anvisa_datasets: anvisa,
      },
      institutional: {
        public_contracts: pncp,
        official_gazettes: gazettes,
        open_datasets: dados_gov,
        transparencia: transparencia,
        siconfi: siconfi,
        tcu_datasets: tcu,
        ibama_datasets: ibama,
        inpe_alerts: Array.isArray(inpe) ? inpe : [],
      },
      strategic_indices,
      stats: {
        papers: openalex.totalPapers,
        contracts: pncp.length,
        gazettes: gazettes.length,
        datasets: dados_gov.length + aneel.length + cvm.length + capes.length + inep.length + tcu.length + ibama.length + anvisa.length + anatel.length,
        countries: openalex.international.length,
        macro_indicators: bcb.filter((b: any) => b.value !== null).length,
        ipeadata_series: ipeadata.length,
        github_repos: github.length,
        convenios: transparencia.convenios?.length || 0,
        sanctions: transparencia.sanctions?.length || 0,
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

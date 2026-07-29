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

async function searchPNCP(query: string, searchTerms: string[], cnaeCodes: string[]) {
  // Tenta múltiplos termos de busca e agrega resultados únicos
  const allResults: any[] = [];
  const seenIds = new Set<string>();

  // Busca com cada termo expandido (máx 3 para não sobrecarregar)
  const termsToTry = [query, ...searchTerms.filter((t) => t !== query)].slice(0, 3);

  for (const term of termsToTry) {
    const data = await safeFetch(
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?tamanhoPagina=10&pagina=1&q=${encodeURIComponent(term)}`
    );
    const items = Array.isArray(data) ? data : (data?.data || data?.content || []);
    for (const item of items) {
      const id = item.id || item.numeroCompra || JSON.stringify(item).slice(0, 40);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        allResults.push({
          object: item.objetoCompra || item.objeto || "",
          organ: item.orgaoEntidade?.razaoSocial || item.nomeOrgao || "",
          modality: item.modalidadeNome || item.modalidade || "",
          value: item.valorTotalEstimado || item.valorTotal || 0,
          status: item.situacaoCompra || item.situacao || "",
          date: item.dataPublicacao || item.dataCadastramento || "",
          uf: item.unidadeOrgao?.ufSigla || item.uf || "",
          url: item.linkSistemaOrigem || item.linkPublicacao || `https://pncp.gov.br/app/editais?q=${encodeURIComponent(term)}`,
          search_term_used: term,
        });
      }
    }
  }

  // Fallback se nenhum resultado
  if (allResults.length === 0) {
    const fallback = await safeFetch(
      `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " licitação contrato compras públicas ciência tecnologia")}&rows=5`
    );
    return (fallback?.result?.results || []).map((pkg: any) => ({
      object: pkg.title || "",
      organ: pkg.organization?.title || "",
      modality: "Dataset",
      value: 0,
      status: "dataset",
      date: "",
      uf: "",
      url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
      search_term_used: query,
    }));
  }

  return allResults.slice(0, 15);
}

async function searchTransparencia(query: string) {
  const CHAVE_API = Deno.env.get("TRANSPARENCIA_API_KEY") || "";
  if (!CHAVE_API) {
    console.warn("TRANSPARENCIA_API_KEY não configurada — usando fallback dados.gov.br");
    const fallback = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " convênio transferência federal")}&rows=6`);
    return {
      convenios: (fallback?.result?.results || []).map((pkg: any) => ({
        object: pkg.title || "", proponent: pkg.organization?.title || "",
        value: 0, grantor: "", startDate: "", endDate: "", situation: "dataset",
      })),
      sanctions: [],
    };
  }
  const headers = { "chave-api": CHAVE_API };
  const [convenios, ceis] = await Promise.all([
    safeFetch(`https://api.portaldatransparencia.gov.br/api-de-dados/convenios?pagina=1&tamanhoPagina=8&objeto=${encodeURIComponent(query)}`, { headers }, 25000),
    safeFetch(`https://api.portaldatransparencia.gov.br/api-de-dados/ceis?pagina=1&tamanhoPagina=5&nomeFantasia=${encodeURIComponent(query)}`, { headers }, 25000),
  ]);
  return {
    convenios: (convenios || []).map((c: any) => ({
      object: c.objeto?.slice(0, 200) || "", proponent: c.proponente?.nome || "",
      value: c.valor || 0, grantor: c.orgaoSuperior?.nome || "",
      startDate: c.dataInicioVigencia || "", endDate: c.dataFimVigencia || "", situation: c.situacao || "",
    })),
    sanctions: (ceis || []).map((s: any) => ({
      company: s.nomeFantasia || s.razaoSocial || "", type: s.tipoSancao || "",
      organ: s.orgaoSancionador?.nome || "", date: s.dataInicioSancao || "",
    })),
  };
}

async function searchSICONFI() {
  const data = await safeFetch(`https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf?an_exercicio=2024&nr_periodo=1&tp_rgf=RGF&id_ente=41`, undefined, 25000);
  return (data?.items || []).slice(0, 8).map((item: any) => ({
    entity: item.instituicao || "", year: item.exercicio || 2024, period: item.periodicidade || "", url: item.anexo || "",
  }));
}

async function searchQueridoDiario(query: string) {
  const data = await safeFetch(`https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(query)}&size=10&sort_by=relevance`);
  return (data?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "", state: g.state_code || "",
    date: g.date || "", excerpts: (g.excerpts || []).slice(0, 2), url: g.file_url || "",
  }));
}

async function searchFundingDatasets(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " BNDES Finep FNDCT inovação financiamento")}&rows=6`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchTCU(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " TCU controle auditoria")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({ title: pkg.title || "", description: (pkg.notes || "").slice(0, 200), url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false }));
}

async function searchTSE(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " TSE eleições financiamento campanha")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({ title: pkg.title || "", description: (pkg.notes || "").slice(0, 150), url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false }));
}

async function searchSIOP(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " SIOP orçamento federal execução")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({ title: pkg.title || "", description: (pkg.notes || "").slice(0, 150), url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false }));
}

async function searchDataJud(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CNJ judiciário processos")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({ title: pkg.title || "", description: (pkg.notes || "").slice(0, 150), url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false }));
}

async function searchIBAMA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " IBAMA ambiental licenciamento")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({ title: pkg.title || "", description: (pkg.notes || "").slice(0, 150), url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, knowledge_total_papers } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`Layer Policy: ${query}`);
    const start = Date.now();

    const [pncp, transparencia, siconfi, gazettes, funding, tcu, tse, siop, datajud, ibama] = await Promise.all([
      searchPNCP(query), searchTransparencia(query), searchSICONFI(), searchQueridoDiario(query),
      searchFundingDatasets(query), searchTCU(query), searchTSE(query), searchSIOP(query), searchDataJud(query), searchIBAMA(query),
    ]);

    const totalContracts = pncp.length;
    const totalConvenios = transparencia.convenios.length;
    const totalContractValue = pncp.reduce((s: number, c: any) => s + (c.value || 0), 0);
    const totalConvenioValue = transparencia.convenios.reduce((s: number, c: any) => s + (c.value || 0), 0);
    const totalInstrumentalValue = totalContractValue + totalConvenioValue;
    const papersCount = knowledge_total_papers || 0;
    const instrumental_intensity = papersCount > 0 ? parseFloat(((totalContracts + totalConvenios) / papersCount).toFixed(3)) : 0;

    const fiscal_capacity: Record<string, number> = {};
    const uf_distribution: Record<string, number> = {};
    for (const c of pncp) {
      if (c.uf) { fiscal_capacity[c.uf] = (fiscal_capacity[c.uf] || 0) + (c.value || 0); uf_distribution[c.uf] = (uf_distribution[c.uf] || 0) + 1; }
    }

    const spending_effectiveness = papersCount > 0 && totalInstrumentalValue > 0 ? Math.round(Math.log10(totalInstrumentalValue / papersCount) * 20 + 50) : 0;

    const sources: string[] = [];
    if (pncp.length > 0) sources.push("PNCP");
    if (transparencia.convenios.length > 0 || transparencia.sanctions.length > 0) sources.push("Transparência");
    if (siconfi.length > 0) sources.push("SICONFI");
    if (gazettes.length > 0) sources.push("Querido Diário");
    if (funding.length > 0) sources.push("BNDES/FNDCT");
    if (tcu.length > 0) sources.push("TCU");
    if (tse.length > 0) sources.push("TSE");
    if (siop.length > 0) sources.push("SIOP");
    if (datajud.length > 0) sources.push("DataJud/CNJ");
    if (ibama.length > 0) sources.push("IBAMA");

    return new Response(JSON.stringify({
      contracts: pncp, convenios: transparencia.convenios, sanctions: transparencia.sanctions,
      gazettes, siconfi, funding_datasets: funding, tcu_datasets: tcu, tse_datasets: tse,
      siop_datasets: siop, datajud_datasets: datajud, ibama_datasets: ibama,
      total_contracts: totalContracts, total_convenios: totalConvenios,
      total_contract_value: totalContractValue, total_convenio_value: totalConvenioValue,
      total_instrumental_value: totalInstrumentalValue, instrumental_intensity,
      fiscal_capacity, uf_distribution, spending_effectiveness, sources,
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Layer Policy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

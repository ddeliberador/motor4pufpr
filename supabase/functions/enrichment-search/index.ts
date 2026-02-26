import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Parallel fetcher with timeout
async function safeFetch(url: string, timeoutMs = 8000): Promise<any> {
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

// IPEAData search
async function searchIPEAData(query: string) {
  const data = await safeFetch(
    `http://www.ipeadata.gov.br/api/odata4/Metadados?$filter=contains(SERNOME,'${encodeURIComponent(query)}')&$top=8&$select=SERCODIGO,SERNOME,SERTEMA,FNTSIGLA`
  );
  return (data?.value || []).map((s: any) => ({
    code: s.SERCODIGO,
    name: s.SERNOME,
    theme: s.SERTEMA,
    source: s.FNTSIGLA,
  }));
}

// BCB macro snapshot (últimos valores de séries-chave)
async function getBCBSnapshot() {
  const series = [
    { code: 432, name: "Taxa Selic" },
    { code: 433, name: "IPCA mensal" },
    { code: 24364, name: "IBC-Br" },
    { code: 1, name: "Câmbio USD" },
  ];
  const results = await Promise.all(
    series.map(async (s) => {
      const data = await safeFetch(
        `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.code}/dados/ultimos/1?formato=json`
      );
      if (Array.isArray(data) && data.length > 0) {
        return { name: s.name, value: data[0].valor, date: data[0].data };
      }
      return { name: s.name, value: null, date: null };
    })
  );
  return results;
}

// PNCP search
async function searchPNCP(query: string) {
  const data = await safeFetch(
    `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?q=${encodeURIComponent(query)}&tamanhoPagina=8&pagina=1`
  );
  if (!data) return [];
  const items = Array.isArray(data) ? data : data.data || [];
  return items.slice(0, 8).map((item: any) => ({
    object: item.objetoCompra || item.objeto || "",
    organ: item.orgaoEntidade?.razaoSocial || "",
    modality: item.modalidadeNome || "",
    value: item.valorTotalEstimado || 0,
    status: item.situacaoCompra || "",
    date: item.dataPublicacao || "",
    uf: item.unidadeOrgao?.ufSigla || "",
  }));
}

// Querido Diário search
async function searchQueridoDiario(query: string) {
  const data = await safeFetch(
    `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(query)}&size=6&sort_by=relevance`
  );
  return (data?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "",
    state: g.state_code || "",
    date: g.date || "",
    excerpts: (g.excerpts || []).slice(0, 1),
    url: g.url || "",
  }));
}

// dados.gov.br search (Portal Dados Abertos)
async function searchDadosGov(query: string) {
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=6`
  );
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    organization: pkg.organization?.title || "",
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
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
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Enrichment search for: ${query}`);
    const start = Date.now();

    // Execute ALL searches in parallel
    const [ipeadata, bcb, pncp, gazettes, dados_gov] = await Promise.all([
      searchIPEAData(query),
      getBCBSnapshot(),
      searchPNCP(query),
      searchQueridoDiario(query),
      searchDadosGov(query),
    ]);

    const processingTime = Date.now() - start;

    const result = {
      query,
      productive: {
        ipeadata_series: ipeadata,
        macro_indicators: bcb,
      },
      institutional: {
        public_contracts: pncp,
        official_gazettes: gazettes,
        open_datasets: dados_gov,
      },
      meta: {
        processing_time_ms: processingTime,
        sources: [
          ipeadata.length > 0 ? "IPEAData" : null,
          bcb.some((b: any) => b.value) ? "BCB/SGS" : null,
          pncp.length > 0 ? "PNCP" : null,
          gazettes.length > 0 ? "Querido Diário" : null,
          dados_gov.length > 0 ? "Portal Dados Abertos" : null,
        ].filter(Boolean),
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Enrichment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

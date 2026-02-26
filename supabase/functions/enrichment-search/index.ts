import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// IPEAData: busca séries E últimos valores
async function searchIPEAData(query: string) {
  const meta = await safeFetch(
    `http://www.ipeadata.gov.br/api/odata4/Metadados?$filter=contains(SERNOME,'${encodeURIComponent(query)}')&$top=6&$select=SERCODIGO,SERNOME,SERTEMA,FNTSIGLA,PERNOME`
  );
  const series = (meta?.value || []).map((s: any) => ({
    code: s.SERCODIGO,
    name: s.SERNOME,
    theme: s.SERTEMA,
    source: s.FNTSIGLA,
    frequency: s.PERNOME || null,
  }));

  // Fetch last 12 values for top 4 series
  const withValues = await Promise.all(
    series.slice(0, 4).map(async (s: any) => {
      const data = await safeFetch(
        `http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${s.code}')?$top=12&$orderby=VALDATA desc&$select=VALDATA,VALVALOR`
      );
      const values = (data?.value || []).map((v: any) => ({
        date: v.VALDATA?.split("T")[0] || "",
        value: v.VALVALOR,
      })).reverse();
      return { ...s, values, lastValue: values.length > 0 ? values[values.length - 1].value : null };
    })
  );

  // Keep remaining without values
  const remaining = series.slice(4).map((s: any) => ({ ...s, values: [], lastValue: null }));
  return [...withValues, ...remaining];
}

// BCB macro snapshot com últimos 12 valores para mini gráficos
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
        return {
          name: s.name,
          unit: s.unit,
          value: last.value,
          date: last.date,
          variation: variation !== null ? parseFloat(variation.toFixed(2)) : null,
          history,
        };
      }
      return { name: s.name, unit: s.unit, value: null, date: null, variation: null, history: [] };
    })
  );
  return results;
}

// PNCP with direct links
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
    url: item.linkSistemaOrigem || item.linkPublicacao || `https://pncp.gov.br/app/editais?q=${encodeURIComponent(query)}`,
  }));
}

// Querido Diário
async function searchQueridoDiario(query: string) {
  const data = await safeFetch(
    `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(query)}&size=6&sort_by=relevance`
  );
  return (data?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "",
    state: g.state_code || "",
    date: g.date || "",
    excerpts: (g.excerpts || []).slice(0, 1),
    url: g.txt_url || g.url || "",
  }));
}

// dados.gov.br
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
    resourceCount: pkg.num_resources || 0,
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
          bcb.some((b: any) => b.value !== null) ? "BCB/SGS" : null,
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

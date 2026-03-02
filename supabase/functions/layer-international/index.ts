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

// ===== BCB macro snapshot (expandido) =====
async function getBCBSnapshot() {
  const series = [
    { code: 432, name: "Taxa Selic", unit: "% a.a." },
    { code: 433, name: "IPCA mensal", unit: "%" },
    { code: 24364, name: "IBC-Br", unit: "índice" },
    { code: 1, name: "Câmbio USD/BRL", unit: "R$" },
    { code: 27574, name: "Crédito PJ total", unit: "R$ mi" },
    { code: 20542, name: "Dívida pública/PIB", unit: "%" },
    // Novas séries BCB (inspiradas pela matriz BR/ACC)
    { code: 17622, name: "PIX transações", unit: "milhões" },
    { code: 1178, name: "Base monetária M1", unit: "R$ mi" },
    { code: 3546, name: "Reservas internacionais", unit: "US$ mi" },
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

// ===== IPEAData =====
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

// ===== COMEX =====
async function searchCOMEX(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " exportação importação comércio exterior")}&rows=5&fq=organization:ministerio-do-desenvolvimento-industria-comercio-e-servicos`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    structured: false,
  }));
}

// ===== B3 / CVM (mercado de capitais) =====
async function searchB3CVM(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " B3 CVM ações mercado capitais")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== INSS/PREVIC (previdência) =====
async function searchPrevidencia(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " previdência INSS benefício aposentadoria")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== ANS (saúde suplementar) =====
async function searchANS(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " saúde suplementar ANS operadora plano")}&rows=4&fq=organization:agencia-nacional-de-saude-suplementar-ans`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

// ===== ANA (recursos hídricos) =====
async function searchANA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " água recursos hídricos")}&rows=4&fq=organization:agencia-nacional-de-aguas-e-saneamento-basico-ana`);
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
    const { query, knowledge_international, knowledge_total_papers } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Layer International: ${query}`);
    const start = Date.now();

    const [bcb, ipeadata, comex, b3cvm, previdencia, ans, ana] = await Promise.all([
      getBCBSnapshot(),
      searchIPEAData(query),
      searchCOMEX(query),
      searchB3CVM(query),
      searchPrevidencia(query),
      searchANS(query),
      searchANA(query),
    ]);

    // ===== COMPUTED OUTPUTS using cross-layer data =====
    const intl = knowledge_international || [];
    const totalIntlPapers = intl.reduce((s: number, c: any) => s + (c.count || 0), 0) || 1;
    const brCount = intl.find((c: any) => c.country_code === "BR")?.count || 0;

    const dependency_index = Math.round(((totalIntlPapers - brCount) / totalIntlPapers) * 100);

    const top10 = [...intl].sort((a: any, b: any) => b.count - a.count).slice(0, 10);
    const top10Total = top10.reduce((s: number, c: any) => s + c.count, 0) || 1;
    const br_share = brCount > 0 ? parseFloat(((brCount / top10Total) * 100).toFixed(1)) : 0;

    const brRank = top10.findIndex((c: any) => c.country_code === "BR") + 1;
    const competitiveness = brRank > 0 ? brRank : top10.length + 1;

    const countriesWithCoauthorship = intl.length;
    const global_insertion = Math.round((countriesWithCoauthorship / 195) * 100);

    const country_distribution = intl.reduce((acc: Record<string, number>, c: any) => {
      acc[c.country_code] = c.count;
      return acc;
    }, {} as Record<string, number>);

    const sources: string[] = [];
    if (bcb.some((b: any) => b.value !== null)) sources.push("BCB/SGS");
    if (ipeadata.length > 0) sources.push("IPEAData");
    if (comex.length > 0) sources.push("COMEX");
    if (intl.length > 0) sources.push("OpenAlex (coautoria)");
    if (b3cvm.length > 0) sources.push("B3/CVM");
    if (previdencia.length > 0) sources.push("INSS/PREVIC");
    if (ans.length > 0) sources.push("ANS");
    if (ana.length > 0) sources.push("ANA");

    const result = {
      country_distribution,
      macro_indicators: bcb,
      ipeadata_series: ipeadata,
      comex_datasets: comex,
      b3cvm_datasets: b3cvm,
      previdencia_datasets: previdencia,
      ans_datasets: ans,
      ana_datasets: ana,
      dependency_index,
      br_share,
      competitiveness_rank: competitiveness,
      global_insertion,
      countries_with_coauthorship: countriesWithCoauthorship,
      sources,
      processing_time_ms: Date.now() - start,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Layer International error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

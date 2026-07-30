import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeFetch(url: string, options?: RequestInit, timeoutMs = 20000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...options });
    if (!res.ok) { console.warn(`safeFetch ${res.status}: ${url}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`safeFetch error: ${e instanceof Error ? e.message : e}`);
    return null;
  } finally { clearTimeout(t); }
}

// 1. Datasets CNPq no dados.gov.br — bolsas por modalidade e área
async function fetchCnpqDatasets(query: string) {
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " bolsas CNPq pesquisa")}&fq=organization:cnpq&rows=10`
  );
  const results = data?.result?.results || [];
  return results.map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 300),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    resources: (pkg.resources || []).slice(0, 3).map((r: any) => ({
      name: r.name || r.description || "",
      format: r.format || "",
      url: r.url || "",
    })),
    organization: pkg.organization?.title || "CNPq",
    modified: pkg.metadata_modified?.slice(0, 10) || "",
  }));
}

// 2. Chamadas abertas CNPq via dados.gov.br
async function fetchChamadas(query: string) {
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent("chamadas CNPq edital " + query)}&rows=8`
  );
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 250),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    organization: pkg.organization?.title || "",
    modified: pkg.metadata_modified?.slice(0, 10) || "",
  }));
}

// 3. Convênios CNPq/MCTI via Portal da Transparência
// Órgão MCTI = 24000; busca convênios cujo objeto menciona o tema
async function fetchConveniosCnpq(query: string, apiKey: string) {
  const TP = "https://api.portaldatransparencia.gov.br/api-de-dados";
  const headers = { "chave-api-dados": apiKey, "Accept": "application/json" };

  const norm = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const terms = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/).filter(w => w.length > 3).slice(0, 5);

  const now = new Date();
  // Últimos 6 meses em janelas de 1 mês (limite da API)
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const windows: [string, string][] = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    windows.push([fmt(start), fmt(end)]);
  }

  const pages = await Promise.all(
    windows.map(([di, df]) =>
      safeFetch(
        `${TP}/convenios?pagina=1&tamanhoPagina=100&dataInicial=${encodeURIComponent(di)}&dataFinal=${encodeURIComponent(df)}&codigoOrgao=24000`,
        { headers }, 25000
      )
    )
  );

  const seen = new Set<string>();
  const convenios: any[] = [];

  for (const page of pages) {
    for (const c of (Array.isArray(page) ? page : [])) {
      const objeto: string = c?.dimConvenio?.objeto || "";
      const convenente: string = c?.convenente?.nome || c?.convenente?.razaoSocialReceita || "";
      const haystack = norm(`${objeto} ${convenente}`);
      if (terms.length > 0 && !terms.some(t => haystack.includes(t))) continue;
      const key = c?.dimConvenio?.numero || objeto.slice(0, 40);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      convenios.push({
        objeto: objeto.slice(0, 250),
        convenente,
        uf: c?.municipioConvenente?.uf?.sigla || "",
        valor: c?.valor || 0,
        valorLiberado: c?.valorLiberado || 0,
        dataInicio: c?.dataInicioVigencia || "",
        dataFim: c?.dataFinalVigencia || "",
        situacao: c?.situacao || "",
        numero: c?.dimConvenio?.numero || "",
      });
    }
  }

  // Agrupa por convenente (universidade/ICT)
  const byIes: Record<string, { convenente: string; uf: string; count: number; valor: number; convenios: any[] }> = {};
  for (const c of convenios) {
    const key = c.convenente || "Não identificado";
    if (!byIes[key]) byIes[key] = { convenente: key, uf: c.uf, count: 0, valor: 0, convenios: [] };
    byIes[key].count++;
    byIes[key].valor += c.valor;
    byIes[key].convenios.push(c);
  }

  const ranking = Object.values(byIes)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15);

  return {
    total: convenios.length,
    total_valor: convenios.reduce((s, c) => s + c.valor, 0),
    ranking_ies: ranking,
    convenios_recentes: convenios.sort((a, b) => b.valor - a.valor).slice(0, 10),
  };
}

// 4. Bolsas por modalidade — tabela de referência + links diretos CNPq
function getBolsasModalidades() {
  return [
    {
      sigla: "PQ",
      nome: "Pesquisador",
      descricao: "Bolsas para pesquisadores com produtividade comprovada (PQ-1A a PQ-2)",
      niveis: ["PQ-1A", "PQ-1B", "PQ-1C", "PQ-1D", "PQ-2"],
      url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas/no-pais/pesquisador",
    },
    {
      sigla: "PD",
      nome: "Pós-Doutorado",
      descricao: "Para doutores em início de carreira vinculados a instituições de pesquisa",
      niveis: ["Júnior", "Sênior"],
      url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas/no-pais/pos-doutorado",
    },
    {
      sigla: "GD",
      nome: "Doutorado",
      descricao: "Bolsas para alunos regulares em programas de doutorado reconhecidos",
      niveis: ["GD"],
      url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas/no-pais/doutorado",
    },
    {
      sigla: "GM",
      nome: "Mestrado",
      descricao: "Bolsas para alunos regulares em programas de mestrado reconhecidos",
      niveis: ["GM"],
      url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas/no-pais/mestrado",
    },
    {
      sigla: "IC",
      nome: "Iniciação Científica",
      descricao: "PIBIC e PIBITI para graduandos vinculados a projetos de pesquisa",
      niveis: ["PIBIC", "PIBITI", "PIBIC-EM"],
      url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas/no-pais/iniciacao-cientifica",
    },
    {
      sigla: "DTI",
      nome: "Desenvolvimento Tecnológico Industrial",
      descricao: "Para profissionais em projetos de P&D com empresas parceiras",
      niveis: ["DTI-A", "DTI-B", "DTI-C"],
      url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas/no-pais/desenvolvimento-tecnologico-industrial",
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, cnpq_areas } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const TRANSP_KEY = Deno.env.get("TRANSPARENCIA_API_KEY");
    console.log(`Layer CNPq: ${query} | áreas: ${cnpq_areas?.length || 0} | transp: ${!!TRANSP_KEY}`);
    const start = Date.now();

    const [datasets, chamadas, convenios] = await Promise.all([
      fetchCnpqDatasets(query),
      fetchChamadas(query),
      TRANSP_KEY
        ? fetchConveniosCnpq(query, TRANSP_KEY)
        : Promise.resolve(null),
    ]);

    const modalidades = getBolsasModalidades();

    const sources: string[] = ["CNPq/dados.gov.br"];
    if (convenios) sources.push("Portal da Transparência/MCTI");

    return new Response(JSON.stringify({
      datasets,
      chamadas,
      convenios,
      modalidades,
      cnpq_areas: cnpq_areas || [],
      sources,
      links_uteis: [
        { label: "Chamadas abertas CNPq", url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/chamadas-abertas" },
        { label: "Painel de Fomento CNPq", url: "https://dadosabertos.cnpq.br/" },
        { label: "Plataforma Sucupira (CAPES)", url: "https://sucupira.capes.gov.br/" },
        { label: "Dados abertos CNPq", url: "https://dados.gov.br/dados/organizacoes/visualizar/cnpq" },
        { label: "Tabela de valores de bolsas", url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas/valores-das-bolsas" },
      ],
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-cnpq error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

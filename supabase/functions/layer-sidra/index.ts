import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIDRA = "https://apisidra.ibge.gov.br/values";

// CNAE 2 dígitos → código de classificação SIDRA (divisão CNAE)
// Usado para filtrar PINTEC e CEMPRE por setor do tema
const CNAE_TO_SIDRA_DIVISION: Record<string, string> = {
  "10": "Alimentos", "11": "Bebidas", "13": "Têxtil", "14": "Vestuário",
  "19": "Petróleo", "20": "Química", "21": "Farmacêutico", "22": "Plásticos",
  "24": "Metalurgia", "25": "Metal", "26": "Eletrônica/TI", "27": "Eletroeletrônico",
  "28": "Máquinas", "29": "Veículos", "30": "Outros transportes",
  "32": "Equip. médicos", "35": "Energia", "36": "Água/saneamento",
  "58": "Publicações/software", "61": "Telecom", "62": "TI/software",
  "63": "Serviços de informação", "72": "P&D", "75": "Vet/agro",
};

async function safeFetch(url: string, timeoutMs = 15000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "Accept": "application/json" } });
    if (!res.ok) { console.warn(`SIDRA ${res.status}: ${url}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`SIDRA timeout/erro: ${e instanceof Error ? e.message : e}`);
    return null;
  } finally { clearTimeout(t); }
}

// Extrai divisão CNAE (2 dígitos) dos codes da ontologia
function extractCnaeDivisions(cnaeCodes: string[]): string[] {
  const divs = new Set<string>();
  for (const c of cnaeCodes) {
    const div = c.replace(/\D/g, "").slice(0, 2);
    if (div) divs.add(div);
  }
  return [...divs].slice(0, 3);
}

// CNPq area → tabela SIDRA de titulados
const CNPQ_TO_SIDRA_AREA: Record<string, string> = {
  "10000000": "1",
  "10100008": "1",
  "10200003": "1",
  "10300007": "1",
  "10500006": "2",
  "10600000": "1",
  "20000006": "2",
  "30000003": "3",
  "30300002": "1",
  "30400007": "2",
  "40000001": "4",
  "40100006": "4",
  "40300005": "4",
};

// Casa a divisão CNAE (2 dígitos) com o rótulo das categorias SIDRA,
// que vêm no formato "35 ELETRICIDADE, GÁS ..." ou "C Indústrias de transformação"
function matchesDivision(label: string, divisions: string[]): boolean {
  const m = label.match(/^(\d{2})[\s.]/);
  if (!m) return false;
  return divisions.includes(m[1]);
}

// ── 1. PINTEC — empresas que inovaram por atividade ────────────────────────
// Tabela 5453 (PINTEC 2017): v630 = total de empresas, v5977 = empresas que inovaram
async function fetchPintec(cnaeDivisions: string[]) {
  const data = await safeFetch(
    `${SIDRA}/t/5453/n1/all/v/630,5977/p/last%201/c696/all`
  );
  if (!data || !Array.isArray(data) || data.length < 2) return null;

  const rows = data.slice(1);
  const periodo = rows[0]?.D3N || "";

  const byActivity: Record<string, any> = {};
  for (const r of rows) {
    const act = r.D4N || "";
    if (!act || r.V === "..." || r.V === "-" || r.V == null) continue;
    if (!byActivity[act]) byActivity[act] = { atividade: act };
    const v = Number(r.V);
    if (r.D2C === "630") byActivity[act].total = v;
    if (r.D2C === "5977") byActivity[act].inovadoras = v;
  }

  const all = Object.values(byActivity)
    .filter((s: any) => s.total > 0 && s.inovadoras >= 0)
    .map((s: any) => ({
      atividade: s.atividade,
      valor: ((s.inovadoras / s.total) * 100).toFixed(1),
      unidade: "%",
      empresas: s.total,
      inovadoras: s.inovadoras,
    }));

  const relevant = all.filter((s) => matchesDivision(s.atividade, cnaeDivisions));
  const setores = relevant.length > 0 ? relevant : all.filter((s) => /^(total|[a-z] )/i.test(s.atividade)).slice(0, 5);
  if (!setores.length) return null;

  return {
    fonte: "PINTEC — IBGE",
    periodo,
    descricao: "Taxa de empresas que implementaram inovação de produto e/ou processo",
    setores: setores.slice(0, 8),
    url: "https://sidra.ibge.gov.br/tabela/5453",
  };
}

// ── 2. CEMPRE — empresas e pessoal por atividade ──────────────────────────
// Tabela 992: v2585 = nº de empresas, v707 = pessoal ocupado total
async function fetchCempre(cnaeDivisions: string[]) {
  const data = await safeFetch(
    `${SIDRA}/t/992/n1/all/v/2585,707/p/last%201/c12762/all`
  );
  if (!data || !Array.isArray(data) || data.length < 2) return null;

  const rows = data.slice(1);
  const periodo = rows[0]?.D3N || "";

  const byActivity: Record<string, any> = {};
  for (const r of rows) {
    const act = r.D4N || "";
    if (!act || r.V === "..." || r.V === "-" || r.V == null) continue;
    if (!byActivity[act]) byActivity[act] = { atividade: act };
    if (r.D2C === "2585") byActivity[act].empresas = Number(r.V).toLocaleString("pt-BR");
    if (r.D2C === "707") byActivity[act].pessoal = Number(r.V).toLocaleString("pt-BR");
  }

  const all = Object.values(byActivity).filter((s: any) => s.empresas || s.pessoal);
  const relevant = all.filter((s: any) => matchesDivision(s.atividade, cnaeDivisions));
  const setores = relevant.length > 0 ? relevant : all.slice(0, 5);
  if (!setores.length) return null;

  return {
    fonte: "CEMPRE — IBGE",
    periodo,
    descricao: "Empresas ativas e pessoal ocupado por atividade econômica",
    setores: setores.slice(0, 8),
    url: "https://sidra.ibge.gov.br/tabela/992",
  };
}

// ── 3. Capacidade formativa — população com ensino superior ────────────────
// Tabela 10367 (PNAD Contínua anual): população por nível de instrução
async function fetchPosGraduacao(_cnpqAreas: string[]) {
  const data = await safeFetch(
    `${SIDRA}/t/10367/n1/all/v/606/p/last%203/c1568/11631,11632`
  );
  if (!data || !Array.isArray(data) || data.length < 2) return null;

  const rows = data.slice(1).filter((r: any) => r.V && r.V !== "..." && r.V !== "-");
  if (!rows.length) return null;

  const byArea: Record<string, any[]> = {};
  for (const r of rows) {
    const area = r.D4N || "Geral";
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push({ ano: r.D3N || "", valor: `${Number(r.V).toLocaleString("pt-BR")} mil` });
  }

  const areas = Object.entries(byArea)
    .map(([area, series]) => ({ area, series: series.slice(-3).reverse() }))
    .slice(0, 8);

  if (!areas.length) return null;

  return {
    fonte: "PNAD Contínua — IBGE",
    anos: [...new Set(rows.map((r: any) => r.D3N))].slice(-3),
    descricao: "População por nível de instrução superior (estoque de capital humano qualificado)",
    areas,
    url: "https://sidra.ibge.gov.br/tabela/10367",
  };
}

// ── 4. PIB setorial ────────────────────────────────────────────────────────
// Tabela 1846 (Contas Nacionais Trimestrais): valores correntes por setor
async function fetchPibSetorial() {
  const data = await safeFetch(
    `${SIDRA}/t/1846/n1/all/v/585/p/last%204/c11255/90687,90691,90696,90707`
  );
  if (!data || !Array.isArray(data) || data.length < 2) return null;

  const rows = data.slice(1).filter((r: any) => r.V && r.V !== "..." && r.V !== "-");
  if (!rows.length) return null;

  return {
    fonte: "Contas Nacionais Trimestrais — IBGE",
    descricao: "PIB e valor adicionado por setor (Agropecuária, Indústria, Serviços)",
    series: rows.slice(-12).map((r: any) => ({
      componente: r.D4N || "",
      periodo: r.D3N || "",
      valor: Number(r.V).toLocaleString("pt-BR"),
      unidade: r.MN || "Milhões de Reais",
    })),
    url: "https://sidra.ibge.gov.br/tabela/1846",
  };
}

// ── 5. Distribuição territorial da população com superior completo ─────────
// Tabela 10367 por UF (N3)
async function fetchGraduacao() {
  const data = await safeFetch(
    `${SIDRA}/t/10367/n3/all/v/606/p/last%201/c1568/11632`
  );
  if (!data || !Array.isArray(data) || data.length < 2) return null;

  const rows = data.slice(1).filter((r: any) => r.V && r.V !== "..." && r.V !== "-");
  if (!rows.length) return null;

  const areas = rows
    .map((r: any) => ({
      area: r.D1N || "",
      periodo: r.D3N || "",
      valor: `${Number(r.V).toLocaleString("pt-BR")} mil`,
      raw: Number(r.V),
    }))
    .sort((a: any, b: any) => b.raw - a.raw)
    .slice(0, 10)
    .map(({ raw: _raw, ...rest }: any) => rest);

  return {
    fonte: "PNAD Contínua — IBGE",
    descricao: "População com ensino superior completo por unidade da federação",
    areas,
    url: "https://sidra.ibge.gov.br/tabela/10367",
  };
}


// ── Orquestrador ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, cnae_codes, cnpq_areas, persona } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const cnaeCodes: string[] = Array.isArray(cnae_codes) ? cnae_codes : [];
    const cnpqAreas: string[] = Array.isArray(cnpq_areas) ? cnpq_areas.map((a: any) => a.code || a) : [];
    const cnaeDivisions = extractCnaeDivisions(cnaeCodes);

    console.log(`Layer SIDRA: ${query} | CNAE divs: ${cnaeDivisions.join(",")} | persona: ${persona}`);
    const start = Date.now();

    const [pintec, cempre, posgrad, pib, graduacao] = await Promise.all([
      fetchPintec(cnaeDivisions),
      fetchCempre(cnaeDivisions),
      fetchPosGraduacao(cnpqAreas),
      fetchPibSetorial(),
      fetchGraduacao(),
    ]);

    const sources: string[] = [];
    if (pintec) sources.push("PINTEC/IBGE");
    if (cempre) sources.push("CEMPRE/IBGE");
    if (posgrad) sources.push("PNAD Contínua/IBGE");
    if (pib) sources.push("Contas Nacionais/IBGE");
    if (graduacao) sources.push("PNAD Contínua UF/IBGE");


    return new Response(JSON.stringify({
      pintec,
      cempre,
      pos_graduacao: posgrad,
      pib_setorial: pib,
      graduacao,
      cnae_divisions: cnaeDivisions.map(d => ({
        code: d,
        label: CNAE_TO_SIDRA_DIVISION[d] || `Divisão ${d}`,
      })),
      sources,
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-sidra error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

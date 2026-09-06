import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * layer-regional — Visão Regional (nível municipal)
 * Fontes reais (verificadas em backend/app/connectors/):
 *  - SIDRA/IBGE tabela 5938 (PIB dos municípios) — variáveis confirmadas em
 *    https://servicodados.ibge.gov.br/api/v3/agregados/5938/metadados
 *  - SICONFI/Tesouro Nacional (RREO Anexo 01 = receitas/despesas; Anexo 02 = despesas por função)
 *  - Querido Diário (diários oficiais municipais)
 *  - Portal da Transparência (convênios) — apenas com TRANSPARENCIA_API_KEY
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIDRA = "https://apisidra.ibge.gov.br/values";
const SICONFI = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo";
const QD = "https://queridodiario.ok.org.br/api/gazettes";
const TP = "https://api.portaldatransparencia.gov.br/api-de-dados";

// Códigos de variável confirmados na tabela 5938 (unidade: Mil Reais)
const SIDRA_VARS: Record<string, string> = {
  "37": "PIB a preços correntes",
  "498": "Valor adicionado bruto total",
  "513": "VA da agropecuária",
  "517": "VA da indústria",
  "6575": "VA dos serviços (exclusive adm. pública)",
  "525": "VA da administração, defesa, educação e saúde públicas",
};

interface Block<T> {
  available: boolean;
  reason?: string;
  data?: T;
  source: { name: string; url: string };
}

async function safeFetch(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<{ ok: boolean; status: number; json: any; error?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { Accept: "application/json", ...(init.headers || {}) } });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) return { ok: false, status: res.status, json, error: `HTTP ${res.status}` };
    if (json === null) return { ok: false, status: res.status, json: null, error: "Resposta não é JSON (serviço possivelmente fora do ar)" };
    return { ok: true, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: e instanceof Error ? (e.name === "AbortError" ? "Timeout" : e.message) : String(e) };
  } finally {
    clearTimeout(t);
  }
}

const num = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// ---------- a) PIB municipal (SIDRA 5938) ----------
async function fetchPib(municipioIbge: string): Promise<Block<any>> {
  const vars = Object.keys(SIDRA_VARS).join(",");
  const url = `${SIDRA}/t/5938/n6/${municipioIbge}/v/${vars}/p/last%203`;
  const source = { name: "IBGE/SIDRA — Tabela 5938 (PIB dos Municípios)", url: `https://sidra.ibge.gov.br/tabela/5938` };
  const r = await safeFetch(url);
  if (!r.ok) return { available: false, reason: `IBGE/SIDRA indisponível (${r.error})`, source };
  const rows: any[] = Array.isArray(r.json) ? r.json.slice(1) : [];
  if (rows.length === 0) return { available: false, reason: "IBGE não publica PIB para este município na tabela 5938", source };

  const series: Record<string, Array<{ year: string; value: number }>> = {};
  let municipioNome = "";
  for (const row of rows) {
    const v = num(row.V);
    if (v === null) continue; // "...", "-", "X" = não disponível
    municipioNome = row.D1N || municipioNome;
    const code = String(row.D2C);
    (series[code] ||= []).push({ year: String(row.D3N), value: v * 1000 }); // Mil Reais → R$
  }
  const indicators = Object.entries(SIDRA_VARS).map(([code, label]) => {
    const s = (series[code] || []).sort((a, b) => a.year.localeCompare(b.year));
    const last = s[s.length - 1] || null;
    const prev = s.length > 1 ? s[s.length - 2] : null;
    return {
      code, label,
      value: last?.value ?? null,
      year: last?.year ?? null,
      variation_pct: last && prev && prev.value > 0 ? Math.round(((last.value - prev.value) / prev.value) * 1000) / 10 : null,
      history: s,
      note: last ? null : "Variável não divulgada para este município",
    };
  });
  const pib = indicators.find((i) => i.code === "37");
  if (!pib?.value) return { available: false, reason: "PIB total não divulgado para este município (municípios pequenos podem não ter todas as variáveis)", source };

  const ind = indicators.find((i) => i.code === "517")?.value ?? null;
  const vaTotal = indicators.find((i) => i.code === "498")?.value ?? null;
  return {
    available: true,
    source,
    data: {
      municipio: municipioNome,
      pib_total: pib.value,
      pib_year: pib.year,
      pib_variation_pct: pib.variation_pct,
      industry_share_pct: ind !== null && vaTotal ? Math.round((ind / vaTotal) * 1000) / 10 : null,
      indicators,
    },
  };
}

// ---------- b) Execução orçamentária (SICONFI RREO) ----------
async function fetchSiconfiYear(municipioIbge: string, year: number) {
  const base = `${SICONFI}?an_exercicio=${year}&nr_periodo=6&co_tipo_demonstrativo=RREO&id_ente=${municipioIbge}`;
  const [a1, a2] = await Promise.all([
    safeFetch(`${base}&no_anexo=${encodeURIComponent("RREO-Anexo 01")}`, {}, 30000),
    safeFetch(`${base}&no_anexo=${encodeURIComponent("RREO-Anexo 02")}`, {}, 30000),
  ]);
  return { a1, a2 };
}

async function fetchSiconfi(municipioIbge: string): Promise<Block<any>> {
  const source = { name: "SICONFI / Tesouro Nacional — RREO 6º bimestre", url: "https://siconfi.tesouro.gov.br/siconfi/pages/public/consulta_finbra/finbra_list.jsf" };
  const currentYear = new Date().getFullYear();
  let used: number | null = null;
  let a1: any = null, a2: any = null, lastErr = "";
  for (const y of [currentYear, currentYear - 1, currentYear - 2]) {
    const r = await fetchSiconfiYear(municipioIbge, y);
    if (!r.a1.ok && !r.a2.ok) { lastErr = r.a1.error || ""; continue; }
    const items1 = r.a1.json?.items || [];
    if (items1.length > 0) { used = y; a1 = items1; a2 = r.a2.json?.items || []; break; }
  }
  if (!used) {
    return {
      available: false,
      reason: lastErr ? `SICONFI indisponível (${lastErr})` : `Município sem RREO do 6º bimestre entregue ao SICONFI (${currentYear}–${currentYear - 2})`,
      source,
    };
  }

  const pick = (rows: any[], contaMatch: (c: string) => boolean, colMatch: (c: string) => boolean) => {
    const row = rows.find((r) => contaMatch(String(r.conta || "")) && colMatch(String(r.coluna || "")));
    return row ? num(row.valor) : null;
  };
  const upper = (s: string) => s.toUpperCase();

  const receitaTotal = pick(a1, (c) => upper(c).startsWith("TOTAL DAS RECEITAS"), (c) => c.startsWith("Até o Bimestre"));
  const receitaPrevista = pick(a1, (c) => upper(c).startsWith("TOTAL DAS RECEITAS"), (c) => c.startsWith("PREVISÃO ATUALIZADA"));
  const despesaEmpenhada = pick(a1, (c) => upper(c).startsWith("TOTAL DAS DESPESAS"), (c) => c.startsWith("DESPESAS EMPENHADAS ATÉ O BIMESTRE"));
  const despesaLiquidada = pick(a1, (c) => upper(c).startsWith("TOTAL DAS DESPESAS"), (c) => c.startsWith("DESPESAS LIQUIDADAS ATÉ O BIMESTRE"));
  const despesaPaga = pick(a1, (c) => upper(c).startsWith("TOTAL DAS DESPESAS"), (c) => c.startsWith("DESPESAS PAGAS ATÉ O BIMESTRE"));

  // Função 19 — Ciência e Tecnologia (Anexo 02, despesas por função)
  const ctRows = a2.filter((r: any) => /ci[êe]ncia e tecnologia/i.test(String(r.conta || "")));
  const ct = ctRows.length > 0
    ? {
        dotacao_atualizada: pick(ctRows, () => true, (c) => c.startsWith("DOTAÇÃO ATUALIZADA")),
        empenhado: pick(ctRows, () => true, (c) => c.startsWith("DESPESAS EMPENHADAS ATÉ O BIMESTRE")),
        liquidado: pick(ctRows, () => true, (c) => c.startsWith("DESPESAS LIQUIDADAS ATÉ O BIMESTRE")),
      }
    : null;

  // Maiores funções por despesa empenhada (contexto)
  const totalFunc = a2.filter((r: any) => String(r.coluna || "").startsWith("DESPESAS EMPENHADAS ATÉ O BIMESTRE") && r.cod_conta === "RREO2TotalDespesas")
    .map((r: any) => ({ funcao: String(r.conta), value: num(r.valor) || 0 }))
    .filter((r: any) => !/^(DESPESAS|TOTAL|RESERVA|SUBTOTAL)/i.test(r.funcao) && !/\(/.test(r.funcao) && r.value > 0)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 6);

  return {
    available: true,
    source,
    data: {
      year: used,
      periodo: "6º bimestre (acumulado no ano)",
      receita_total: receitaTotal,
      receita_prevista: receitaPrevista,
      despesa_empenhada: despesaEmpenhada,
      despesa_liquidada: despesaLiquidada,
      despesa_paga: despesaPaga,
      ciencia_tecnologia: ct,
      ciencia_tecnologia_share_pct: ct?.empenhado && despesaEmpenhada ? Math.round((ct.empenhado / despesaEmpenhada) * 10000) / 100 : null,
      ct_note: ct ? null : "Função 19 (Ciência e Tecnologia) não aparece no RREO deste município — o município não classificou despesas nessa função.",
      top_funcoes: totalFunc,
    },
  };
}

// ---------- c) Diário Oficial local (Querido Diário) ----------
async function fetchGazettes(query: string, municipioIbge: string): Promise<Block<any>> {
  const url = `${QD}?querystring=${encodeURIComponent(query)}&territory_ids=${municipioIbge}&size=10&sort_by=relevance`;
  const source = { name: "Querido Diário (Open Knowledge Brasil)", url: `https://queridodiario.ok.org.br/pesquisa?term=${encodeURIComponent(query)}&territory_ids=${municipioIbge}` };
  const r = await safeFetch(url, { redirect: "follow" }, 25000);
  if (!r.ok) return { available: false, reason: `Querido Diário indisponível (${r.error})`, source };
  const total = r.json?.total_gazettes ?? 0;
  const items = (r.json?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "",
    state: g.state_code || "",
    date: g.date || "",
    edition: g.edition || "",
    is_extra: !!g.is_extra_edition,
    excerpt: (Array.isArray(g.excerpts) ? g.excerpts[0] : g.highlight || "") || "",
    url: g.url || g.txt_url || "",
  }));
  if (items.length === 0) {
    return { available: false, reason: `Nenhuma menção a "${query}" nos diários oficiais deste município indexados pelo Querido Diário (cobertura parcial de municípios)`, source, data: { total: 0, items: [] } };
  }
  return { available: true, source, data: { total, items } };
}

// ---------- d) Convênios federais (Portal da Transparência) ----------
async function fetchConvenios(municipioIbge: string, searchTerms: string[]): Promise<Block<any>> {
  const source = { name: "Portal da Transparência (CGU) — Convênios", url: "https://portaldatransparencia.gov.br/convenios" };
  const key = Deno.env.get("TRANSPARENCIA_API_KEY") || "";
  if (!key) return { available: false, reason: "Requer TRANSPARENCIA_API_KEY", source };

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const now = new Date();
  const windows: Array<[string, string]> = [];
  for (let i = 0; i < 12; i++) {
    const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    windows.push([fmt(s), fmt(e)]);
  }
  const pages = await Promise.all(windows.map(([di, df]) =>
    safeFetch(`${TP}/convenios?codigoIBGE=${municipioIbge}&pagina=1&tamanhoPagina=100&dataInicial=${encodeURIComponent(di)}&dataFinal=${encodeURIComponent(df)}`,
      { headers: { "chave-api-dados": key } }, 25000)
  ));
  const failed = pages.filter((p) => !p.ok);
  if (failed.length === pages.length) return { available: false, reason: `Portal da Transparência indisponível (${failed[0]?.error})`, source };

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = searchTerms.map(norm).flatMap((t) => t.split(/\s+/).filter((w) => w.length > 3));
  const seen = new Set<string>();
  const all: any[] = [];
  for (const p of pages) {
    for (const c of (Array.isArray(p.json) ? p.json : [])) {
      const key2 = c?.dimConvenio?.numero || String(c?.id || "");
      if (!key2 || seen.has(key2)) continue;
      seen.add(key2);
      const objeto: string = c?.dimConvenio?.objeto || "";
      all.push({
        object: objeto.slice(0, 220),
        proponent: c?.convenente?.nome || c?.convenente?.razaoSocialReceita || "",
        value: c?.valor || 0,
        released: c?.valorLiberado || 0,
        grantor: c?.orgao?.orgaoMaximo?.nome || c?.orgao?.nome || "",
        startDate: c?.dataInicioVigencia || "",
        endDate: c?.dataFinalVigencia || "",
        situation: c?.situacao || "",
        related_to_theme: terms.length > 0 && terms.some((t) => norm(objeto).includes(t)),
      });
    }
  }
  all.sort((a, b) => (Number(b.related_to_theme) - Number(a.related_to_theme)) || (b.value - a.value));
  const totalValue = all.reduce((s, c) => s + (c.value || 0), 0);
  if (all.length === 0) return { available: false, reason: "Nenhum convênio federal vigente nos últimos 12 meses para este município", source, data: { total: 0, total_value: 0, items: [] } };
  return { available: true, source, data: { total: all.length, total_value: totalValue, related_count: all.filter((c) => c.related_to_theme).length, items: all.slice(0, 15) } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const start = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const query: string = String(body.query || "").trim();
    const searchTerms: string[] = Array.isArray(body.search_terms) && body.search_terms.length ? body.search_terms : [query];
    const municipioIbge: string = String(body.municipio_ibge || "").trim();
    const uf = body.uf || "";
    const municipio = body.municipio || "";

    if (!municipioIbge) {
      return new Response(JSON.stringify({ available: false, reason: "Nenhum município selecionado", sources: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [pib, siconfi, gazettes, convenios] = await Promise.all([
      fetchPib(municipioIbge),
      fetchSiconfi(municipioIbge),
      fetchGazettes(query, municipioIbge),
      fetchConvenios(municipioIbge, searchTerms),
    ]);

    const sources = [pib, siconfi, gazettes, convenios].filter((b) => b.available).map((b) => b.source.name);

    return new Response(JSON.stringify({
      available: true,
      location: { uf, uf_nome: body.uf_nome || "", municipio, municipio_ibge: municipioIbge },
      query,
      pib,
      siconfi,
      gazettes,
      convenios,
      sources,
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ available: false, reason: e instanceof Error ? e.message : "Erro interno", sources: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

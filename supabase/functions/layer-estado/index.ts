import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * layer-estado — Painel Estadual de Inovação (nível UF)
 * Fontes reais verificadas:
 *  - SIDRA/IBGE tabela 5938 (PIB) nos níveis N3 (UF) e N1 (Brasil)
 *    variáveis confirmadas em https://servicodados.ibge.gov.br/api/v3/agregados/5938/metadados
 *  - SIDRA/IBGE tabela 6579 (Estimativas de população residente)
 *  - SIDRA/IBGE tabela 10457 (Pesquisa Industrial Anual — composição da indústria
 *    por divisão da CNAE 2.0 no nível UF)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIDRA = "https://apisidra.ibge.gov.br/values";

const UF_IBGE: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
  MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27", SE: "28", BA: "29",
  MG: "31", ES: "32", RJ: "33", SP: "35",
  PR: "41", SC: "42", RS: "43",
  MS: "50", MT: "51", GO: "52", DF: "53",
};

// Variáveis da tabela 5938 (unidade: Mil Reais)
const V = {
  pib: "37",
  va_total: "498",
  agro: "513",
  industria: "517",
  servicos: "6575",
  admin: "525",
};

interface Block<T> {
  available: boolean;
  reason?: string;
  data?: T;
  source: { name: string; url: string };
}

async function safeFetch(url: string, init: RequestInit = {}, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { Accept: "application/json", ...(init.headers || {}) } });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) return { ok: false, status: res.status, json, error: `HTTP ${res.status}` };
    if (json === null) return { ok: false, status: res.status, json: null, error: "Resposta não é JSON" };
    return { ok: true, status: res.status, json, error: undefined as string | undefined };
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

type Series = Record<string, Record<string, number>>; // varCode -> year -> value (R$)

async function fetchPibLevel(level: string): Promise<{ series: Series; name: string } | { error: string }> {
  const vars = Object.values(V).join(",");
  const r = await safeFetch(`${SIDRA}/t/5938/${level}/v/${vars}/p/last%2012`, {}, 30000);
  if (!r.ok) return { error: r.error || "indisponível" };
  const rows: any[] = Array.isArray(r.json) ? r.json.slice(1) : [];
  if (rows.length === 0) return { error: "sem linhas retornadas" };
  const series: Series = {};
  let name = "";
  for (const row of rows) {
    const v = num(row.V);
    name = row.D1N || name;
    if (v === null) continue; // "..." = não divulgado
    const code = String(row.D2C);
    const year = String(row.D3N);
    (series[code] ||= {})[year] = v * 1000; // Mil Reais → R$
  }
  return { series, name };
}

async function fetchPopulation(ufCode: string): Promise<Record<string, number>> {
  const r = await safeFetch(`${SIDRA}/t/6579/n3/${ufCode}/p/last%2012`, {}, 30000);
  if (!r.ok) return {};
  const rows: any[] = Array.isArray(r.json) ? r.json.slice(1) : [];
  const out: Record<string, number> = {};
  for (const row of rows) {
    const v = num(row.V);
    const year = String(row.D2N || row.D3N || "");
    if (v !== null && /^\d{4}$/.test(year)) out[year] = v;
  }
  return out;
}

async function fetchPopulationBR(): Promise<Record<string, number>> {
  const r = await safeFetch(`${SIDRA}/t/6579/n1/1/p/last%2012`, {}, 30000);
  if (!r.ok) return {};
  const rows: any[] = Array.isArray(r.json) ? r.json.slice(1) : [];
  const out: Record<string, number> = {};
  for (const row of rows) {
    const v = num(row.V);
    const year = String(row.D2N || row.D3N || "");
    if (v !== null && /^\d{4}$/.test(year)) out[year] = v;
  }
  return out;
}

// ---------- d) Composição da indústria do estado (IBGE/PIA, tabela 10457) ----------
// Variáveis confirmadas em https://servicodados.ibge.gov.br/api/v3/agregados/10457/metadados
//  811 = Valor da transformação industrial (Mil Reais) | 631 = Pessoal ocupado em 31/12
//  Classificação 12762 = CNAE 2.0 (divisões). Nível N3 = UF.
const INDUSTRY_SOURCE = {
  name: "IBGE/SIDRA — Tabela 10457 (Pesquisa Industrial Anual, unidades locais por UF e divisão CNAE)",
  url: "https://sidra.ibge.gov.br/tabela/10457",
};

// Rótulo curto e compreensível para cada divisão CNAE industrial
const DIVISION_LABEL: Record<string, string> = {
  "05": "Carvão mineral", "06": "Petróleo e gás", "07": "Minérios metálicos",
  "08": "Minerais não-metálicos (extração)", "09": "Apoio à mineração",
  "10": "Alimentos", "11": "Bebidas", "12": "Fumo", "13": "Têxteis",
  "14": "Vestuário", "15": "Couro e calçados", "16": "Madeira",
  "17": "Celulose e papel", "18": "Impressão", "19": "Derivados de petróleo e biocombustíveis",
  "20": "Química", "21": "Farmacêuticos", "22": "Borracha e plástico",
  "23": "Cimento, vidro e cerâmica", "24": "Metalurgia (ferro e aço)", "25": "Produtos de metal",
  "26": "Eletrônicos e informática", "27": "Máquinas e materiais elétricos",
  "28": "Máquinas e equipamentos", "29": "Veículos automotores",
  "30": "Outros transportes (aeronaves, navios)", "31": "Móveis",
  "32": "Produtos diversos", "33": "Manutenção e instalação de máquinas",
};

async function fetchIndustrialComposition(ufCode: string): Promise<Block<any>> {
  const unavailable = (reason: string): Block<any> => ({ available: false, reason, source: INDUSTRY_SOURCE });
  try {
    const r = await safeFetch(
      `${SIDRA}/t/10457/n3/${ufCode}/v/811,631/p/last%201/c12762/all`,
      {},
      30000,
    );
    if (!r.ok) return unavailable(`IBGE/SIDRA não respondeu para a composição industrial (${r.error})`);
    const rows: any[] = Array.isArray(r.json) ? r.json.slice(1) : [];
    if (rows.length === 0) return unavailable("O IBGE não retornou a composição industrial deste estado");

    let year = "";
    let totalVti: number | null = null;
    let totalJobs: number | null = null;
    const map = new Map<string, { code: string; label: string; cnae_label: string; vti: number | null; jobs: number | null }>();

    for (const row of rows) {
      const varCode = String(row.D2C);
      const cnaeName = String(row.D4N || "");
      const value = num(row.V); // "X" (sigilo) e "-" viram null
      year = String(row.D3N || year);

      if (/^total$/i.test(cnaeName.trim())) {
        if (varCode === "811") totalVti = value !== null ? value * 1000 : totalVti;
        if (varCode === "631") totalJobs = value !== null ? value : totalJobs;
        continue;
      }
      const m = cnaeName.match(/^(\d{2})\s+(.*)$/); // apenas divisões (2 dígitos), ignora seções B/C
      if (!m) continue;
      const code = m[1];
      const entry = map.get(code) || {
        code,
        label: DIVISION_LABEL[code] || m[2],
        cnae_label: `${code} — ${m[2]}`,
        vti: null,
        jobs: null,
      };
      if (varCode === "811") entry.vti = value !== null ? value * 1000 : null;
      if (varCode === "631") entry.jobs = value;
      map.set(code, entry);
    }

    const all = [...map.values()];
    const items = all
      .filter((i) => (i.vti !== null && i.vti > 0) || (i.jobs !== null && i.jobs > 0))
      .map((i) => ({
        ...i,
        vti_share_pct: i.vti !== null && totalVti ? Math.round((i.vti / totalVti) * 1000) / 10 : null,
        jobs_share_pct: i.jobs !== null && totalJobs ? Math.round((i.jobs / totalJobs) * 1000) / 10 : null,
      }))
      .sort((a, b) => (b.vti ?? 0) - (a.vti ?? 0) || (b.jobs ?? 0) - (a.jobs ?? 0));

    if (items.length === 0) return unavailable("Nenhum setor industrial divulgado para este estado (dados sob sigilo estatístico)");

    const withVti = items.filter((i) => i.vti !== null);
    const suppressed = all.length - withVti.length;

    return {
      available: true,
      source: INDUSTRY_SOURCE,
      data: {
        year,
        total_vti: totalVti,
        total_jobs: totalJobs,
        items,
        top: items.slice(0, 3).map((i) => i.label),
        suppressed_count: suppressed > 0 ? suppressed : 0,
      },
      note: "Valor da transformação industrial (VTI) por divisão da CNAE 2.0 — o quanto cada tipo de indústria agrega de valor no estado. Setores marcados como sigilo estatístico pelo IBGE não aparecem no gráfico.",
    } as Block<any>;
  } catch (e) {
    return unavailable(`Falha ao consultar o IBGE (${e instanceof Error ? e.message : String(e)})`);
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const start = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const uf = String(body.uf || "").trim().toUpperCase();
    const ufNomeIn = String(body.uf_nome || "").trim();
    const ufCode = UF_IBGE[uf];

    if (!ufCode) {
      return new Response(JSON.stringify({ available: false, reason: "Nenhum estado selecionado", sources: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [ufPib, brPib, popUf, popBr, composicao_industrial] = await Promise.all([
      fetchPibLevel(`n3/${ufCode}`),
      fetchPibLevel("n1/1"),
      fetchPopulation(ufCode),
      fetchPopulationBR(),
      fetchIndustrialComposition(ufCode),
    ]);

    const pibSource = { name: "IBGE/SIDRA — Tabela 5938 (PIB, níveis UF e Brasil)", url: "https://sidra.ibge.gov.br/tabela/5938" };
    const popSource = { name: "IBGE/SIDRA — Tabela 6579 (Estimativas de população residente)", url: "https://sidra.ibge.gov.br/tabela/6579" };

    if ("error" in ufPib || "error" in brPib) {
      const err = ("error" in ufPib ? ufPib.error : "") || ("error" in brPib ? (brPib as any).error : "");
      return new Response(JSON.stringify({
        available: false,
        reason: `IBGE/SIDRA indisponível (${err})`,
        location: { uf, uf_nome: ufNomeIn },
        composicao_industrial,
        sources: composicao_industrial.available ? [composicao_industrial.source.name] : [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ufSeries = ufPib.series;
    const brSeries = brPib.series;
    const ufNome = ufNomeIn || ufPib.name || uf;

    const years = Object.keys(ufSeries[V.pib] || {}).sort().slice(-10);
    const sectorYears = Object.keys(ufSeries[V.industria] || {}).sort().slice(-10);

    // a) PIB total e per capita (UF vs Brasil)
    const pib_total = years.map((y) => ({
      year: y,
      uf: ufSeries[V.pib]?.[y] ?? null,
      br: brSeries[V.pib]?.[y] ?? null,
      uf_share_pct: ufSeries[V.pib]?.[y] && brSeries[V.pib]?.[y]
        ? Math.round((ufSeries[V.pib][y] / brSeries[V.pib][y]) * 10000) / 100
        : null,
    }));

    const pib_per_capita = years.map((y) => ({
      year: y,
      uf: ufSeries[V.pib]?.[y] && popUf[y] ? Math.round(ufSeries[V.pib][y] / popUf[y]) : null,
      br: brSeries[V.pib]?.[y] && popBr[y] ? Math.round(brSeries[V.pib][y] / popBr[y]) : null,
    }));

    // Participação setorial na economia estadual (% do VA total)
    const SECTORS = [
      { key: "agropecuaria", label: "Agropecuária", code: V.agro },
      { key: "industria", label: "Indústria", code: V.industria },
      { key: "servicos", label: "Serviços (exceto setor público)", code: V.servicos },
      { key: "administracao", label: "Administração, defesa, educação e saúde públicas", code: V.admin },
    ];
    const lastSectorYear = sectorYears[sectorYears.length - 1] || null;
    const vaTotalLast = lastSectorYear ? (ufSeries[V.va_total]?.[lastSectorYear] ?? null) : null;
    const sector_shares = lastSectorYear
      ? SECTORS.map((s) => {
          const value = ufSeries[s.code]?.[lastSectorYear] ?? null;
          return {
            key: s.key,
            label: s.label,
            value,
            share_pct: value !== null && vaTotalLast ? Math.round((value / vaTotalLast) * 1000) / 10 : null,
          };
        })
      : [];
    const sector_history = sectorYears.map((y) => {
      const total = ufSeries[V.va_total]?.[y] ?? null;
      const row: any = { year: y };
      for (const s of SECTORS) {
        const v = ufSeries[s.code]?.[y] ?? null;
        row[s.key] = v !== null && total ? Math.round((v / total) * 1000) / 10 : null;
      }
      return row;
    });

    // b) Participação da indústria estadual na indústria nacional (cálculo local)
    const industry_share_national = sectorYears.map((y) => {
      const u = ufSeries[V.industria]?.[y] ?? null;
      const b = brSeries[V.industria]?.[y] ?? null;
      return { year: y, share_pct: u !== null && b ? Math.round((u / b) * 10000) / 100 : null, uf: u, br: b };
    });
    const lastIndustry = [...industry_share_national].reverse().find((r) => r.share_pct !== null) || null;

    // c) Demografia
    const popYears = Object.keys(popUf).sort().slice(-10);
    const demografia: Block<any> = popYears.length
      ? {
          available: true,
          source: popSource,
          data: {
            year: popYears[popYears.length - 1],
            population: popUf[popYears[popYears.length - 1]],
            population_br: popBr[popYears[popYears.length - 1]] ?? null,
            share_pct: popBr[popYears[popYears.length - 1]]
              ? Math.round((popUf[popYears[popYears.length - 1]] / popBr[popYears[popYears.length - 1]]) * 10000) / 100
              : null,
            variation_pct: popYears.length > 1
              ? Math.round(((popUf[popYears[popYears.length - 1]] - popUf[popYears[0]]) / popUf[popYears[0]]) * 1000) / 10
              : null,
            history: popYears.map((y) => ({ year: y, value: popUf[y] })),
          },
        }
      : { available: false, reason: "IBGE não retornou estimativas de população para este estado", source: popSource };

    const lastPibRow = [...pib_total].reverse().find((r) => r.uf !== null) || null;

    const sources = [pibSource.name, ...(demografia.available ? [popSource.name] : []), ...(composicao_industrial.available ? [composicao_industrial.source.name] : [])];

    return new Response(JSON.stringify({
      available: true,
      location: { uf, uf_nome: ufNome, uf_ibge: ufCode },
      resumo: {
        pib_year: lastPibRow?.year ?? null,
        pib_total: lastPibRow?.uf ?? null,
        pib_share_national_pct: lastPibRow?.uf_share_pct ?? null,
        industry_share_national_pct: lastIndustry?.share_pct ?? null,
        industry_share_year: lastIndustry?.year ?? null,
        population: demografia.available ? demografia.data.population : null,
      },
      pib: { available: pib_total.length > 0, source: pibSource, data: { years, pib_total, pib_per_capita }, reason: pib_total.length ? undefined : "Série do PIB não divulgada para este estado" },
      setores: {
        available: sector_shares.some((s) => s.share_pct !== null),
        source: pibSource,
        reason: sector_shares.some((s) => s.share_pct !== null) ? undefined : "IBGE ainda não divulgou o valor adicionado por setor para este estado",
        data: { year: lastSectorYear, shares: sector_shares, history: sector_history },
      },
      industria_nacional: {
        available: industry_share_national.some((r) => r.share_pct !== null),
        source: pibSource,
        reason: industry_share_national.some((r) => r.share_pct !== null) ? undefined : "Sem valor adicionado industrial divulgado para o cálculo",
        data: { series: industry_share_national, last: lastIndustry },
        note: "Cálculo do Motor da Inovação: valor adicionado da indústria da UF ÷ valor adicionado da indústria do Brasil, ano a ano (IBGE/SIDRA 5938).",
      },
      demografia,
      composicao_industrial,
      per_capita_note: "PIB per capita calculado pelo Motor da Inovação: PIB (tabela 5938) ÷ população estimada (tabela 6579), ambos do IBGE.",
      sources,
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ available: false, reason: e instanceof Error ? e.message : "Erro interno", sources: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deploy: composicao industrial do estado

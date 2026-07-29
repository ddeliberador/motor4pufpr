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

// ── 1. PINTEC — % empresas que inovaram por setor ──────────────────────────
async function fetchPintec(cnaeDivisions: string[]) {
  const data = await safeFetch(
    `${SIDRA}/t/7357/n1/all/v/allxp/p/last%201`
  );
  if (!data || !Array.isArray(data)) return null;

  const rows = data.slice(1);
  if (!rows.length) return null;

  const relevant = rows.filter((r: any) => {
    const activity = (r.D2N || "").toLowerCase();
    return cnaeDivisions.some(div => {
      const label = CNAE_TO_SIDRA_DIVISION[div]?.toLowerCase() || "";
      return label && activity.includes(label.split("/")[0].toLowerCase());
    });
  });

  const sample = relevant.length > 0 ? relevant : rows.slice(0, 5);
  return {
    fonte: "PINTEC — IBGE",
    periodo: rows[0]?.D3N || "",
    descricao: "Empresas que implementaram inovação de produto ou processo",
    setores: sample.map((r: any) => ({
      atividade: r.D2N || "",
      valor: r.V || "",
      unidade: r.MN || "%",
    })).filter((s: any) => s.valor && s.valor !== "..."),
    url: "https://sidra.ibge.gov.br/tabela/6829",
  };
}

// ── 2. CEMPRE — empresas e pessoal por atividade ──────────────────────────
async function fetchCempre(cnaeDivisions: string[]) {
  const data = await safeFetch(
    `${SIDRA}/t/992/n1/all/v/29,179/p/last%201`
  );
  if (!data || !Array.isArray(data)) return null;

  const rows = data.slice(1);
  const relevant = rows.filter((r: any) => {
    const activity = (r.D2N || "").toLowerCase();
    return cnaeDivisions.some(div => {
      const label = CNAE_TO_SIDRA_DIVISION[div]?.toLowerCase() || "";
      return label && activity.includes(label.split("/")[0].toLowerCase());
    });
  });

  const sample = relevant.length > 0 ? relevant.slice(0, 5) : rows.slice(0, 5);

  const byActivity: Record<string, any> = {};
  for (const r of sample) {
    const act = r.D2N || "Setor";
    if (!byActivity[act]) byActivity[act] = { atividade: act };
    if (r.V1N === "Número de unidades locais" || r.D4N?.includes("29")) {
      byActivity[act].empresas = r.V;
    } else {
      byActivity[act].pessoal = r.V;
    }
  }

  return {
    fonte: "CEMPRE — IBGE",
    periodo: rows[0]?.D3N || "",
    descricao: "Empresas ativas e pessoal ocupado por atividade econômica",
    setores: Object.values(byActivity).filter((s: any) => s.empresas || s.pessoal),
    url: "https://sidra.ibge.gov.br/tabela/992",
  };
}

// ── 3. Pós-graduação — Titulados por área ──────────────────────────────────
async function fetchPosGraduacao(_cnpqAreas: string[]) {
  // Tabela 7301: Funções docentes na educação superior por grau de formação
  const data = await safeFetch(
    `${SIDRA}/t/7301/n1/all/v/allxp/p/last%203`
  );
  if (!data || !Array.isArray(data)) return null;

  const rows = data.slice(1).filter((r: any) => r.V && r.V !== "...");
  if (!rows.length) return null;

  const byArea: Record<string, any[]> = {};
  for (const r of rows) {
    const area = r.D2N || r.D3N || "Geral";
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push({ ano: r.D3N || r.D4N || "", valor: r.V });
  }

  const areas = Object.entries(byArea)
    .filter(([, s]) => s.some((x) => x.valor && x.valor !== "..."))
    .slice(0, 8)
    .map(([area, series]) => ({ area, series: series.slice(0, 2) }));

  if (!areas.length) return null;

  return {
    fonte: "Censo Ed. Superior/INEP via SIDRA — IBGE",
    descricao: "Docentes da educação superior por grau de formação",
    areas,
    url: "https://sidra.ibge.gov.br/tabela/7301",
  };
}


// ── 4. PIB setorial ────────────────────────────────────────────────────────
async function fetchPibSetorial() {
  const data = await safeFetch(
    `${SIDRA}/t/6784/n1/all/v/9318/p/last%205`
  );
  if (!data || !Array.isArray(data)) return null;

  const rows = data.slice(1).filter((r: any) => r.V && r.V !== "...");
  if (!rows.length) return null;

  return {
    fonte: "SCN — IBGE",
    descricao: "PIB e componentes da oferta (Agropecuária, Indústria, Serviços)",
    series: rows.slice(0, 10).map((r: any) => ({
      componente: r.D2N || "",
      periodo: r.D3N || "",
      valor: r.V || "",
      unidade: r.MN || "R$ milhões",
    })),
    url: "https://sidra.ibge.gov.br/tabela/6784",
  };
}

// ── 5. Graduados por área ─────────────────────────────────────────────────
async function fetchGraduacao() {
  const data = await safeFetch(
    `${SIDRA}/t/1616/n1/all/v/allxp/p/last%202`
  );
  if (!data || !Array.isArray(data)) return null;

  const rows = data.slice(1).filter((r: any) => r.V && r.V !== "...");
  return {
    fonte: "Censo da Educação Superior/INEP via SIDRA",
    descricao: "Matrículas em cursos de graduação presencial por área geral",
    areas: rows.slice(0, 10).map((r: any) => ({
      area: r.D2N || "",
      periodo: r.D3N || "",
      valor: r.V || "",
    })),
    url: "https://sidra.ibge.gov.br/tabela/1616",
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
    if (posgrad) sources.push("PNPG-CAPES/IBGE");
    if (pib) sources.push("SCN/IBGE");
    if (graduacao) sources.push("Censo Ed. Superior/IBGE");

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

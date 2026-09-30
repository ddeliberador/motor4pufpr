import { useMemo } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { carregarCatalogo, useCatalogo, detalhesDe, type CatalogoBase } from "@/lib/catalogo";
import { buscarModelosHF, buscarContratosIA } from "@/utils/cruzarLayers";

export type ColumnKind = "dimension" | "metric";

export type DatasetColumn = {
  name: string;
  label: string;
  kind: ColumnKind;
};

export type DatasetDef = {
  key: string;
  table: string;
  label: string;
  descricao: string;
  columns: DatasetColumn[];
  /** Bases cruzadas: montadas no cliente juntando outras tabelas. */
  cruzado?: boolean;
  camada?: boolean;
  semConector?: boolean;
  load?: () => Promise<Record<string, unknown>[]>;
};

const d = (name: string, label: string): DatasetColumn => ({ name, label, kind: "dimension" });
const m = (name: string, label: string): DatasetColumn => ({ name, label, kind: "metric" });

/** Conectores em código (como ler cada base). Quais aparecem, nome, descrição e colunas vêm do catálogo. */
const CONECTORES: DatasetDef[] = [
  {
    key: "atores_sni",
    table: "research_locations",
    label: "Atores do SNI",
    descricao: "Instituições, ICTs, parques e unidades mapeadas no território.",
    columns: [
      d("tipo", "tipo"),
      d("uf", "uf"),
      d("municipio", "municipio"),
      d("fonte", "fonte"),
      d("nome", "nome"),
      m("quality_score", "quality_score"),
      m("latitude", "latitude"),
      m("longitude", "longitude"),
    ],
  },
  {
    key: "especializacao_cientifica",
    table: "science_specialization_index",
    label: "Especialização científica",
    descricao: "Índice de especialização por área do conhecimento.",
    columns: [
      d("grande_area_pt", "grande_area_pt"),
      d("area_pt", "area_pt"),
      d("periodo", "periodo"),
      d("fonte", "fonte"),
      m("quadrante", "quadrante"),
      m("ie", "ie"),
      m("participacao_brasil_pct", "participacao_brasil_pct"),
      m("volume_brasil", "volume_brasil"),
      m("crescimento_pct", "crescimento_pct"),
    ],
  },
  {
    key: "institutos_regionais",
    table: "regional_institutes",
    label: "Institutos regionais",
    descricao: "Institutos e agências estaduais de fomento à pesquisa.",
    columns: [d("uf", "uf"), d("tipo", "tipo"), d("nome", "nome")],
  },
  {
    key: "geocodificacao_municipios",
    table: "city_geocode",
    label: "Geocodificação de municípios",
    descricao: "Municípios com coordenada resolvida e origem do geocode.",
    columns: [
      d("uf", "uf"),
      d("cidade", "cidade"),
      d("fonte_geocode", "fonte_geocode"),
      m("lat", "lat"),
      m("lon", "lon"),
    ],
  },
  {
    key: "conectividade_municipios",
    table: "",
    label: "Conectividade dos municípios (Anatel)",
    descricao: "Backhaul por município, base usada na camada de infraestrutura do Mapa.",
    columns: [
      d("uf", "uf"),
      d("municipio", "municipio"),
      d("tipo", "tipo"),
      d("tem_backhaul", "tem_backhaul"),
      d("ano", "ano"),
    ],
    load: async () => (await basesCruzadas()).backhaul,
  },
  // ── Camadas do Mapa (mesmas fontes e caminhos de consumo que o /mapa usa) ──
  {
    key: "l1_usinas", table: "", camada: true,
    label: "Mapa · L1 Energia — usinas (ANEEL SIGA)",
    descricao: "Usinas georreferenciadas da ANEEL, via função do Mapa.",
    columns: [d("uf", "uf"), d("municipio", "municipio"), d("tipo", "tipo"), d("combustivel", "combustivel"), d("situacao", "situacao"), m("potencia_kw", "potencia_kw")],
    load: carregarUsinas,
  },
  {
    key: "l2_cabos", table: "", camada: true,
    label: "Mapa · L2 Cabos submarinos (TeleGeography)",
    descricao: "Cabos com aterragem confirmada no Brasil (snapshot do Mapa).",
    columns: [d("cabo", "cabo"), d("aterragem_br", "aterragem_br"), m("aterragens_total", "aterragens_total"), m("aterragens_br", "aterragens_br")],
    load: carregarCabos,
  },
  {
    key: "l2_antenas", table: "", camada: true,
    label: "Mapa · L2 Antenas — ERBs licenciadas (ANATEL)",
    descricao: "Estações rádio base por município e operadora (snapshot do Mapa).",
    columns: [d("uf", "uf"), d("municipio", "municipio"), d("operadora", "operadora"), m("estacoes", "estacoes")],
    load: carregarAntenas,
  },
  {
    key: "l3_datacenters", table: "", camada: true,
    label: "Mapa · L3 Datacenters (PeeringDB)",
    descricao: "Datacenters no Brasil; ao vivo pela função do Mapa, snapshot se o PeeringDB falhar.",
    columns: [d("uf", "uf"), d("cidade", "cidade"), d("org", "org"), d("nome", "nome"), m("redes", "redes")],
    load: carregarDatacenters,
  },
  {
    key: "l4_modelos", table: "", camada: true,
    label: "Mapa · L4 Modelos de IA (Hugging Face)",
    descricao: "Modelos ligados ao Brasil no Hugging Face (mesma consulta da Layer 4).",
    columns: [d("autor", "autor"), d("tarefa", "tarefa"), d("modelo", "modelo"), m("downloads", "downloads"), m("likes", "likes")],
    load: async () => (await buscarModelosHF()).map((x) => ({ autor: x.author, tarefa: x.tarefa || null, modelo: x.id, downloads: x.downloads, likes: x.likes })),
  },
  {
    key: "l5_contratos_ia", table: "", camada: true,
    label: "Mapa · L5 Contratos de IA (PNCP)",
    descricao: "Contratos públicos com \"inteligência artificial\" (mesma consulta da Layer 5).",
    columns: [d("orgao", "orgao"), d("ano_fim_vigencia", "ano_fim_vigencia"), m("valor", "valor")],
    load: async () => (await buscarContratosIA()).map((c) => ({ orgao: c.fornecedor, ano_fim_vigencia: c.dataVigencia?.slice(0, 4) ?? null, valor: c.valor })),
  },
  {
    key: "l6_producao", table: "", camada: true,
    label: "Mapa · L6 Produção científica dos atores (OpenAlex)",
    descricao: "Artigos e citações gravados nos atores do SNI (mesma regra da Layer 6).",
    columns: [d("uf", "uf"), d("tipo", "tipo"), d("municipio", "municipio"), d("nome", "nome"), m("artigos", "artigos"), m("citacoes", "citacoes")],
    load: carregarProducao,
  },
  {
    key: "l7_politicas", table: "", camada: true,
    label: "Mapa · L1–L7 Políticas públicas (curadoria)",
    descricao: "Políticas vinculadas às camadas no painel de Políticas do Mapa.",
    columns: [d("layer", "layer"), d("camada", "camada"), d("orgao", "orgao"), d("status", "status"), d("ano", "ano"), d("politica", "politica"), m("investimento_publico_brl", "investimento_publico_brl")],
    load: carregarPoliticas,
  },
  {
    key: "cruzado_municipios",
    table: "",
    cruzado: true,
    label: "Cruzamento: municípios × atores × conectividade",
    descricao: "Cada município (Anatel) com o número de atores do SNI e se tem backhaul.",
    columns: [
      d("uf", "uf"),
      d("municipio", "municipio"),
      d("tipo_backhaul", "tipo_backhaul"),
      d("tem_backhaul", "tem_backhaul"),
      d("tem_ator_sni", "tem_ator_sni"),
      m("atores_sni", "atores_sni"),
      m("qualidade_media", "qualidade_media"),
    ],
    load: carregarCruzadoMunicipios,
  },
  {
    key: "cruzado_uf",
    table: "",
    cruzado: true,
    label: "Cruzamento: estados (atores, conectividade, institutos)",
    descricao: "Uma linha por UF reunindo as bases do Mapa e do Motor.",
    columns: [
      d("uf", "uf"),
      m("atores_sni", "atores_sni"),
      m("municipios", "municipios"),
      m("municipios_com_ator", "municipios_com_ator"),
      m("pct_municipios_backhaul", "pct_municipios_backhaul"),
      m("institutos_regionais", "institutos_regionais"),
    ],
    load: carregarCruzadoUf,
  },
];

type Linha = Record<string, unknown>;

async function lerTudo(table: string, cols: string): Promise<Linha[]> {
  const out: Linha[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from(table as never).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data ?? []) as unknown as Linha[];
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const chaveMun = (m: unknown, uf: unknown) =>
  `${String(m ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()}|${String(uf ?? "").toUpperCase()}`;

/** Conectividade vem pela função do Mapa (map-infrastructure), a camada de consumo — a tabela não é lida direto. */
async function lerBackhaulPelaFuncao(): Promise<Linha[]> {
  const { data, error } = await supabase.functions.invoke("map-infrastructure", { body: { layer: "backhaul" } });
  if (error) throw new Error(`Conectividade (Anatel): ${error.message}`);
  const p = data as { data?: Linha[]; ano?: string; indisponivel?: boolean; failures?: unknown[] } | null;
  if (!p || p.indisponivel || !Array.isArray(p.data) || p.data.length === 0)
    throw new Error(`Conectividade (Anatel) indisponível: ${JSON.stringify(p?.failures ?? [])}`);
  return p.data.map((b) => ({
    uf: b.uf, municipio: b.municipio, tipo: b.tipo,
    tem_backhaul: b.temBackhaul ? "sim" : "não", ano: p.ano ?? null,
  }));
}

async function jsonPublico<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

async function carregarUsinas(): Promise<Linha[]> {
  const { data, error } = await supabase.functions.invoke("map-infrastructure", { body: { layer: "energy" } });
  if (error) throw new Error(`ANEEL: ${error.message}`);
  const p = data as { data?: Linha[]; failures?: { error: string }[] } | null;
  if (!p?.data?.length) throw new Error(`ANEEL indisponível: ${(p?.failures ?? []).map((f) => f.error).join("; ") || "sem dados"}`);
  return p.data.map((u) => ({ uf: u.uf || null, municipio: u.municipio || null, tipo: u.tipo, combustivel: u.combustivel || null, situacao: u.situacao || null, potencia_kw: u.potencia_kw ?? null }));
}

async function carregarCabos(): Promise<Linha[]> {
  const d = await jsonPublico<{ cables: { name: string; landing_point_ids?: string[] }[] }>("/submarine-cablemap/data.json");
  return d.cables.flatMap((c) => {
    const ids = c.landing_point_ids ?? [];
    const br = ids.filter((i) => /-brazil$/.test(i)).length;
    if (!br) return [];
    return [{ cabo: c.name, aterragem_br: "sim", aterragens_total: ids.length, aterragens_br: br }];
  });
}

async function carregarAntenas(): Promise<Linha[]> {
  const d = await jsonPublico<{ municipios: { municipio: string; uf: string; estacoes: number; operadoras: Record<string, number> }[] }>("/anatel-erb-br.json");
  return d.municipios.flatMap((mu) => Object.entries(mu.operadoras).map(([op, n]) => ({ uf: mu.uf, municipio: mu.municipio, operadora: op, estacoes: n })));
}

async function carregarDatacenters(): Promise<Linha[]> {
  const { data, error } = await supabase.functions.invoke("map-infrastructure", { body: { layer: "datacenters" } });
  let lista = (data as { data?: Linha[] } | null)?.data;
  if (error || !lista?.length) lista = (await jsonPublico<{ data: Linha[] }>("/peeringdb-br.json")).data;
  return lista.map((x) => ({ uf: x.uf ?? null, cidade: x.cidade ?? null, org: x.org ?? null, nome: x.nome, redes: x.redes ?? null }));
}

async function carregarProducao(): Promise<Linha[]> {
  const rows = await lerTudo("research_locations", "nome,uf,tipo,municipio,artigos:raw_metadata->works_count,citacoes:raw_metadata->cited_by_count");
  return rows.filter((r) => Number(r.artigos) > 0).map((r) => ({ ...r, artigos: Number(r.artigos), citacoes: Number(r.citacoes ?? 0) }));
}

async function carregarPoliticas(): Promise<Linha[]> {
  const d = await jsonPublico<{ layers: { layer: string; nome: string; politicas: Record<string, unknown>[] }[] }>("/politicas-layers.json");
  return d.layers.flatMap((l) => l.politicas.map((p) => ({
    layer: l.layer, camada: l.nome, orgao: p.orgao ?? null, status: p.status ?? null, ano: p.ano ?? null,
    politica: p.nome, investimento_publico_brl: typeof p.investimento_publico_brl === "number" ? p.investimento_publico_brl : null,
  })));
}

let cacheCruz: Promise<{ atores: Linha[]; backhaul: Linha[] }> | null = null;
function basesCruzadas() {
  cacheCruz ??= Promise.all([
    lerTudo("research_locations", "uf,municipio,quality_score"),
    lerBackhaulPelaFuncao(),
  ]).then(([atores, backhaul]) => ({ atores, backhaul })).catch((e) => { cacheCruz = null; throw e; });
  return cacheCruz;
}

async function carregarCruzadoMunicipios(): Promise<Linha[]> {
  const { atores, backhaul } = await basesCruzadas();
  const agg = new Map<string, { n: number; q: number; qn: number }>();
  for (const a of atores) {
    const k = chaveMun(a.municipio, a.uf);
    const g = agg.get(k) ?? { n: 0, q: 0, qn: 0 };
    g.n++;
    if (typeof a.quality_score === "number") { g.q += a.quality_score; g.qn++; }
    agg.set(k, g);
  }
  return backhaul.map((b) => {
    const g = agg.get(chaveMun(b.municipio, b.uf));
    return {
      uf: b.uf, municipio: b.municipio, tipo_backhaul: b.tipo,
      tem_backhaul: b.tem_backhaul,
      tem_ator_sni: g ? "sim" : "não",
      atores_sni: g?.n ?? 0,
      qualidade_media: g && g.qn ? Math.round(g.q / g.qn) : null,
    };
  });
}

async function carregarCruzadoUf(): Promise<Linha[]> {
  const [{ atores, backhaul }, inst] = await Promise.all([
    basesCruzadas(),
    lerTudo("regional_institutes", "uf"),
  ]);
  const ufs = new Map<string, { a: number; mun: number; bh: number; mc: Set<string>; i: number; s: number }>();
  const get = (uf: unknown) => {
    const k = String(uf ?? "").toUpperCase();
    if (!k) return null;
    if (!ufs.has(k)) ufs.set(k, { a: 0, mun: 0, bh: 0, mc: new Set(), i: 0, s: 0 });
    return ufs.get(k)!;
  };
  for (const b of backhaul) { const g = get(b.uf); if (g) { g.mun++; if (b.tem_backhaul === "sim") g.bh++; } }
  for (const a of atores) { const g = get(a.uf); if (g) { g.a++; if (a.municipio) g.mc.add(chaveMun(a.municipio, a.uf)); } }
  for (const r of inst) { const g = get(r.uf); if (g) g.i++; }
  return [...ufs.entries()].map(([uf, g]) => ({
    uf, atores_sni: g.a, municipios: g.mun, municipios_com_ator: g.mc.size,
    pct_municipios_backhaul: g.mun ? Math.round((g.bh / g.mun) * 1000) / 10 : null,
    institutos_regionais: g.i,
  }));
}

function filtrarLocal(rows: Linha[], filters: ChartFilter[], uf?: string | null): Linha[] {
  return rows.filter((r) => {
    if (uf && "uf" in r && r.uf !== uf) return false;
    return filters.every((f) => {
      if (!f.column) return true;
      const v = r[f.column];
      switch (f.op) {
        case "notnull": return v !== null && v !== undefined && v !== "";
        case "ilike": return String(v ?? "").toLowerCase().includes(f.value.toLowerCase());
        case "eq": return String(v) === f.value;
        case "neq": return String(v) !== f.value;
        case "gte": return Number(v) >= Number(f.value);
        case "lte": return Number(v) <= Number(f.value);
      }
    });
  });
}

let registro: DatasetDef[] = [];
let inativas = new Set<string>();

/** Monta as bases do construtor a partir do catálogo (fonte da verdade). */
export function datasetsDoCatalogo(bases: CatalogoBase[]): DatasetDef[] {
  inativas = new Set();
  const out: DatasetDef[] = [];
  for (const b of bases) {
    if (!b.usos.includes("bi")) continue;
    const key = detalhesDe(b).bi?.key ?? b.chave;
    if (!b.ativa) { inativas.add(key); continue; }
    const con = CONECTORES.find((c) => c.key === key);
    const colunas = (Array.isArray(b.colunas) ? b.colunas : []) as DatasetColumn[];
    const table = con?.table || (b.caminho_consumo === "gold_tabela" && b.alvo && b.alvo !== "cruzamento" ? b.alvo : "");
    out.push({
      ...(con ?? {}),
      key, table, label: b.nome, descricao: b.uso ?? "",
      columns: colunas.length ? colunas : con?.columns ?? [],
      semConector: !con?.load && !table,
    });
  }
  registro = out;
  return out;
}

export async function carregarDatasets(): Promise<DatasetDef[]> {
  return datasetsDoCatalogo(await carregarCatalogo());
}

export function useDatasets() {
  const { bases, erro } = useCatalogo();
  return { datasets: useMemo(() => (bases ? datasetsDoCatalogo(bases) : null), [bases]), erro };
}

export const getDataset = (key: string) => registro.find((x) => x.key === key);

export type ChartType = "bar_vertical" | "bar_horizontal" | "line" | "area" | "pie";

export const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: "bar_vertical", label: "Barras verticais", icon: "bar_chart" },
  { value: "bar_horizontal", label: "Barras horizontais", icon: "align_horizontal_left" },
  { value: "line", label: "Linha", icon: "show_chart" },
  { value: "area", label: "Área", icon: "area_chart" },
  { value: "pie", label: "Pizza", icon: "pie_chart" },
];

export type MetricAgg = "count" | "sum" | "avg" | "min" | "max";

export const METRIC_AGGS: { value: MetricAgg; label: string }[] = [
  { value: "count", label: "COUNT(*)" },
  { value: "sum", label: "SUM" },
  { value: "avg", label: "AVG" },
  { value: "min", label: "MIN" },
  { value: "max", label: "MAX" },
];

export type ChartFilter = { column: string; op: "eq" | "neq" | "gte" | "lte" | "ilike" | "notnull"; value: string };

export type ChartSpec = {
  dataset_key: string;
  chart_type: ChartType;
  x_column: string;
  metric_agg: MetricAgg;
  metric_column: string | null;
  filters: ChartFilter[];
  sort_order: "asc" | "desc" | "label";
  row_limit: number;
};

export type ChartRow = { label: string; valor: number };

/** Cache por sessão das bases carregadas no cliente; falhas não ficam em cache. */
const cacheLoad = new Map<string, Promise<Record<string, unknown>[]>>();

const PAGE = 1000;
const MAX_ROWS = 12000;

/** Executa a receita do gráfico: busca as linhas necessárias e agrega no cliente. */
export async function runChartQuery(
  spec: ChartSpec,
  extra?: { uf?: string | null },
): Promise<{ rows: ChartRow[]; amostra: Record<string, unknown>[]; totalLinhas: number }> {
  await carregarDatasets();
  if (inativas.has(spec.dataset_key)) throw new Error("Base desativada no catálogo.");
  const ds = getDataset(spec.dataset_key);
  if (!ds) throw new Error(`Base fora do catálogo: ${spec.dataset_key}`);
  if (ds.semConector) throw new Error(`Base "${ds.label}" está no catálogo, mas ainda não tem conector no construtor.`);

  const cols = new Set<string>([spec.x_column]);
  if (spec.metric_column) cols.add(spec.metric_column);
  spec.filters.forEach((f) => cols.add(f.column));
  const temUf = ds.columns.some((c) => c.name === "uf");
  if (temUf) cols.add("uf");

  const all: Record<string, unknown>[] = [];
  if (ds.load) {
    if (!cacheLoad.has(ds.key)) cacheLoad.set(ds.key, ds.load().catch((e) => { cacheLoad.delete(ds.key); throw e; }));
    all.push(...filtrarLocal(await cacheLoad.get(ds.key)!, spec.filters, extra?.uf));
  }
  else for (let from = 0; from < MAX_ROWS; from += PAGE) {
    type Filtro = {
      not: (c: string, o: string, v: null) => Filtro;
      ilike: (c: string, v: string) => Filtro;
      eq: (c: string, v: string) => Filtro;
      neq: (c: string, v: string) => Filtro;
      gte: (c: string, v: string) => Filtro;
      lte: (c: string, v: string) => Filtro;
      range: (a: number, b: number) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    let q = supabase.from(ds.table as never).select([...cols].join(",")) as unknown as Filtro;
    for (const f of spec.filters) {
      if (!f.column) continue;
      if (f.op === "notnull") q = q.not(f.column, "is", null);
      else if (f.op === "ilike") q = q.ilike(f.column, `%${f.value}%`);
      else q = q[f.op](f.column, f.value);
    }
    if (extra?.uf && temUf) q = q.eq("uf", extra.uf);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...page);
    if (page.length < PAGE) break;
  }

  const buckets = new Map<string, number[]>();
  for (const row of all) {
    const raw = row[spec.x_column];
    const label = raw === null || raw === undefined || raw === "" ? "(sem valor)" : String(raw);
    const val = spec.metric_column ? Number(row[spec.metric_column]) : 1;
    if (spec.metric_agg !== "count" && !Number.isFinite(val)) continue;
    const arr = buckets.get(label) ?? [];
    arr.push(Number.isFinite(val) ? val : 0);
    buckets.set(label, arr);
  }

  let rows: ChartRow[] = [...buckets.entries()].map(([label, vals]) => {
    let valor: number;
    switch (spec.metric_agg) {
      case "count": valor = vals.length; break;
      case "sum": valor = vals.reduce((a, b) => a + b, 0); break;
      case "avg": valor = vals.reduce((a, b) => a + b, 0) / (vals.length || 1); break;
      case "min": valor = Math.min(...vals); break;
      case "max": valor = Math.max(...vals); break;
    }
    return { label, valor: Math.round(valor * 100) / 100 };
  });

  if (spec.sort_order === "label") rows.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  else if (spec.sort_order === "asc") rows.sort((a, b) => a.valor - b.valor);
  else rows.sort((a, b) => b.valor - a.valor);

  const totalLinhas = rows.length;
  if (spec.row_limit > 0) rows = rows.slice(0, spec.row_limit);

  return { rows, amostra: all.slice(0, 50), totalLinhas };
}

export const metricLabel = (spec: ChartSpec) =>
  spec.metric_agg === "count" ? "COUNT(*)" : `${spec.metric_agg.toUpperCase()}(${spec.metric_column ?? "—"})`;

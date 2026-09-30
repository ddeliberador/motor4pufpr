import { safeSupabase as supabase } from "@/lib/supabaseClient";

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
};

const d = (name: string, label: string): DatasetColumn => ({ name, label, kind: "dimension" });
const m = (name: string, label: string): DatasetColumn => ({ name, label, kind: "metric" });

export const DATASETS: DatasetDef[] = [
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
    key: "diario_construcao",
    table: "build_log",
    label: "Diário de construção",
    descricao: "Registros de desenvolvimento, achados e dificuldades.",
    columns: [
      d("categoria", "categoria"),
      d("dificuldade", "dificuldade"),
      d("fonte", "fonte"),
      d("data", "data"),
    ],
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
];

export const getDataset = (key: string) => DATASETS.find((x) => x.key === key);

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

const PAGE = 1000;
const MAX_ROWS = 12000;

/** Executa a receita do gráfico: busca as linhas necessárias e agrega no cliente. */
export async function runChartQuery(
  spec: ChartSpec,
  extra?: { uf?: string | null },
): Promise<{ rows: ChartRow[]; amostra: Record<string, unknown>[]; totalLinhas: number }> {
  const ds = getDataset(spec.dataset_key);
  if (!ds) throw new Error(`Base desconhecida: ${spec.dataset_key}`);

  const cols = new Set<string>([spec.x_column]);
  if (spec.metric_column) cols.add(spec.metric_column);
  spec.filters.forEach((f) => cols.add(f.column));
  const temUf = ds.columns.some((c) => c.name === "uf");
  if (temUf) cols.add("uf");

  const all: Record<string, unknown>[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
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

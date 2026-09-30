import { useEffect, useMemo, useState } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChartRenderer } from "./ChartRenderer";
import {
  DATASETS, CHART_TYPES, METRIC_AGGS, getDataset, runChartQuery, metricLabel,
  type ChartSpec, type ChartRow, type ChartType, type MetricAgg, type ChartFilter,
} from "@/lib/bi/datasets";

const OPS: { value: ChartFilter["op"]; label: string }[] = [
  { value: "eq", label: "igual a" },
  { value: "neq", label: "diferente de" },
  { value: "gte", label: "maior ou igual" },
  { value: "lte", label: "menor ou igual" },
  { value: "ilike", label: "contém" },
  { value: "notnull", label: "não vazio" },
];

export function ChartBuilder({ userId, onSaved }: { userId: string; onSaved?: () => void }) {
  const [datasetKey, setDatasetKey] = useState(DATASETS[0].key);
  const ds = getDataset(datasetKey)!;

  const [chartType, setChartType] = useState<ChartType>("bar_vertical");
  const [xColumn, setXColumn] = useState<string>("uf");
  const [agg, setAgg] = useState<MetricAgg>("count");
  const [metricColumn, setMetricColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "label">("desc");
  const [rowLimit, setRowLimit] = useState(30);
  const [filters, setFilters] = useState<ChartFilter[]>([]);

  const [titulo, setTitulo] = useState("");
  const [publico, setPublico] = useState(false);

  const [rows, setRows] = useState<ChartRow[]>([]);
  const [amostra, setAmostra] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Ao trocar de base, reinicia eixo e métrica para colunas válidas
  useEffect(() => {
    const dims = ds.columns.filter((c) => c.kind === "dimension");
    setXColumn(dims[0]?.name ?? ds.columns[0].name);
    setAgg("count");
    setMetricColumn(null);
    setFilters([]);
  }, [datasetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const spec: ChartSpec = useMemo(() => ({
    dataset_key: datasetKey,
    chart_type: chartType,
    x_column: xColumn,
    metric_agg: agg,
    metric_column: agg === "count" ? null : metricColumn,
    filters: filters.filter((f) => f.column && (f.op === "notnull" || f.value !== "")),
    sort_order: sortOrder,
    row_limit: rowLimit,
  }), [datasetKey, chartType, xColumn, agg, metricColumn, filters, sortOrder, rowLimit]);

  useEffect(() => {
    let ativo = true;
    if (agg !== "count" && !metricColumn) { setRows([]); setErro("Escolha a coluna numérica da métrica."); return; }
    setCarregando(true); setErro(null);
    runChartQuery(spec)
      .then((r) => { if (!ativo) return; setRows(r.rows); setAmostra(r.amostra); setTotal(r.totalLinhas); })
      .catch((e: Error) => { if (ativo) { setErro(e.message); setRows([]); } })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [spec]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    if (!titulo.trim()) return toast.error("Dê um nome ao gráfico.");
    setSalvando(true);
    const { error } = await supabase.from("custom_charts").insert({
      user_id: userId,
      title: titulo.trim(),
      dataset_key: spec.dataset_key,
      chart_type: spec.chart_type,
      x_column: spec.x_column,
      metric_agg: spec.metric_agg,
      metric_column: spec.metric_column,
      filters: spec.filters as unknown as never,
      sort_order: spec.sort_order,
      row_limit: spec.row_limit,
      is_public: publico,
    });
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Gráfico salvo na biblioteca.");
    setTitulo("");
    onSaved?.();
  };

  const dims = ds.columns.filter((c) => c.kind === "dimension");
  const mets = ds.columns.filter((c) => c.kind === "metric");

  return (
    <div className="grid lg:grid-cols-[230px_280px_1fr] gap-4">
      {/* COLUNA 1 — bases e dicionário de colunas */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Base de dados</Label>
          <Select value={datasetKey} onValueChange={setDatasetKey}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATASETS.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{ds.descricao}</p>
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Colunas</div>
          <ul className="space-y-1">
            {ds.columns.map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-xs font-mono">
                <span className={cn(
                  "w-6 shrink-0 text-center rounded text-[10px] py-0.5",
                  c.kind === "metric" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {c.kind === "metric" ? "#" : "abc"}
                </span>
                <span className="truncate">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* COLUNA 2 — consulta e customização */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-4">
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Visualização</Label>
          <div className="grid grid-cols-5 gap-1 mt-1.5">
            {CHART_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setChartType(t.value)}
                title={t.label}
                className={cn(
                  "h-9 rounded border flex items-center justify-center transition",
                  chartType === t.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Eixo X (dimensão)</Label>
          <Select value={xColumn} onValueChange={setXColumn}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ds.columns.map((c) => <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Métrica</Label>
          <div className="flex gap-1.5 mt-1.5">
            <Select value={agg} onValueChange={(v) => setAgg(v as MetricAgg)}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRIC_AGGS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {agg !== "count" && (
              <Select value={metricColumn ?? ""} onValueChange={setMetricColumn}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="coluna" /></SelectTrigger>
                <SelectContent>
                  {mets.length === 0 && <SelectItem value="__none" disabled>sem colunas numéricas</SelectItem>}
                  {mets.map((c) => <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ordenação</Label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Maior → menor</SelectItem>
                <SelectItem value="asc">Menor → maior</SelectItem>
                <SelectItem value="label">Alfabética</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Limite</Label>
            <Select value={String(rowLimit)} onValueChange={(v) => setRowLimit(Number(v))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 30, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>)}
                <SelectItem value="0">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Filtros</Label>
            <Button variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => setFilters((p) => [...p, { column: dims[0]?.name ?? "", op: "eq", value: "" }])}>
              + adicionar
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {filters.map((f, i) => (
              <div key={i} className="space-y-1 rounded border border-border p-2">
                <div className="flex gap-1.5">
                  <Select value={f.column} onValueChange={(v) => setFilters((p) => p.map((x, j) => j === i ? { ...x, column: v } : x))}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ds.columns.map((c) => <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setFilters((p) => p.filter((_, j) => j !== i))}>
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  <Select value={f.op} onValueChange={(v) => setFilters((p) => p.map((x, j) => j === i ? { ...x, op: v as ChartFilter["op"] } : x))}>
                    <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {f.op !== "notnull" && (
                    <Input className="h-8 text-xs" value={f.value} placeholder="valor"
                      onChange={(e) => setFilters((p) => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                  )}
                </div>
              </div>
            ))}
            {filters.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhum filtro aplicado.</p>}
          </div>
        </div>
      </div>

      {/* COLUNA 3 — renderização */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-3 flex-wrap">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nome do gráfico" className="h-9 max-w-xs" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={publico} onCheckedChange={setPublico} /> Público
          </label>
          <div className="flex-1" />
          <Button size="sm" onClick={salvar} disabled={salvando}>
            <span className="material-symbols-outlined text-[16px] mr-1">save</span>
            {salvando ? "Salvando…" : "Salvar gráfico"}
          </Button>
        </div>

        <div className="px-3 pt-3 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <Badge variant="outline" className="font-mono text-[10px]">{ds.cruzado ? "cruzamento" : ds.camada ? "camada do Mapa" : ds.table || "função do Mapa"}</Badge>
          <Badge variant="outline" className="font-mono text-[10px]">{spec.x_column}</Badge>
          <Badge variant="outline" className="font-mono text-[10px]">{metricLabel(spec)}</Badge>
          {total > 0 && <span>{total} categorias{rowLimit > 0 && total > rowLimit ? ` · exibindo ${rowLimit}` : ""}</span>}
        </div>

        {erro && (
          <div className="m-3 rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {erro}
          </div>
        )}

        <Tabs defaultValue="grafico" className="p-3">
          <TabsList className="h-8">
            <TabsTrigger value="grafico" className="text-xs">Gráfico</TabsTrigger>
            <TabsTrigger value="resultados" className="text-xs">Resultados</TabsTrigger>
            <TabsTrigger value="amostra" className="text-xs">Amostra da base</TabsTrigger>
          </TabsList>
          <TabsContent value="grafico" className="mt-3">
            {carregando
              ? <div className="h-[340px] flex items-center justify-center text-sm text-muted-foreground">Consultando a base…</div>
              : <ChartRenderer tipo={chartType} dados={rows} metricName={metricLabel(spec)} altura={340} />}
          </TabsContent>
          <TabsContent value="resultados" className="mt-3">
            <div className="max-h-[340px] overflow-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr><th className="text-left p-2 font-mono">{spec.x_column}</th><th className="text-right p-2 font-mono">{metricLabel(spec)}</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t border-border">
                      <td className="p-2">{r.label}</td>
                      <td className="p-2 text-right font-mono">{r.valor.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="amostra" className="mt-3">
            <div className="max-h-[340px] overflow-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>{Object.keys(amostra[0] ?? {}).map((k) => <th key={k} className="text-left p-2 font-mono">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {amostra.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {Object.keys(amostra[0] ?? {}).map((k) => <td key={k} className="p-2">{String(r[k] ?? "—")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

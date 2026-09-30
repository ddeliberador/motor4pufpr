import { useEffect, useState } from "react";
import { ChartRenderer } from "./ChartRenderer";
import { runChartQuery, metricLabel, getDataset, type ChartSpec, type ChartRow } from "@/lib/bi/datasets";

export type SavedChartRow = {
  id: string;
  title: string;
  dataset_key: string;
  chart_type: string;
  x_column: string;
  metric_agg: string;
  metric_column: string | null;
  filters: unknown;
  sort_order: string;
  row_limit: number;
  is_public: boolean;
  created_at: string;
};

export const toSpec = (c: SavedChartRow): ChartSpec => ({
  dataset_key: c.dataset_key,
  chart_type: c.chart_type as ChartSpec["chart_type"],
  x_column: c.x_column,
  metric_agg: c.metric_agg as ChartSpec["metric_agg"],
  metric_column: c.metric_column,
  filters: Array.isArray(c.filters) ? (c.filters as ChartSpec["filters"]) : [],
  sort_order: c.sort_order as ChartSpec["sort_order"],
  row_limit: c.row_limit,
});

/** Renderiza um gráfico salvo, reexecutando a consulta contra a base real. */
export function SavedChart({
  chart, ufFiltro, altura = 260,
}: { chart: SavedChartRow; ufFiltro?: string | null; altura?: number }) {
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const spec = toSpec(chart);

  useEffect(() => {
    let ativo = true;
    setCarregando(true); setErro(null);
    runChartQuery(spec, { uf: ufFiltro ?? null })
      .then((r) => { if (ativo) setRows(r.rows); })
      .catch((e: Error) => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [chart.id, ufFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const ds = getDataset(chart.dataset_key);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold truncate">{chart.title}</h3>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{ds?.label ?? chart.dataset_key}</span>
      </div>
      {erro ? (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Falha ao carregar: {erro}
        </div>
      ) : carregando ? (
        <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: altura }}>
          Carregando…
        </div>
      ) : (
        <ChartRenderer tipo={spec.chart_type} dados={rows} metricName={metricLabel(spec)} altura={altura} />
      )}
    </div>
  );
}

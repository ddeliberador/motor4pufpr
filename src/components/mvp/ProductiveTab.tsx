/**
 * Aba Produtiva — indicadores macro com variação e mini sparklines,
 * séries IPEAData com últimos valores reais
 */
import { TrendingUp, TrendingDown, DollarSign, Percent, Activity, Database, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { MacroIndicator, IPEADataSeries } from "@/hooks/useEnrichmentSearch";

interface ProductiveTabProps {
  macroIndicators: MacroIndicator[];
  ipeadataSeries: IPEADataSeries[];
  isLoading: boolean;
}

function MiniSparkline({ data, color = "text-primary" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className={`${color} opacity-60`}>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

function VariationBadge({ variation }: { variation: number | null }) {
  if (variation === null) return null;
  const isPositive = variation > 0;
  const isZero = variation === 0;
  const Icon = isZero ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const color = isZero ? "text-muted-foreground" : isPositive ? "text-emerald-600" : "text-red-500";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(variation).toFixed(1)}%
    </span>
  );
}

export default function ProductiveTab({ macroIndicators, ipeadataSeries, isLoading }: ProductiveTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Buscando indicadores produtivos...</span>
      </div>
    );
  }

  const macroIcons: Record<string, typeof TrendingUp> = {
    "Taxa Selic": Percent,
    "IPCA mensal": TrendingUp,
    "IBC-Br": Activity,
    "Câmbio USD/BRL": DollarSign,
  };

  return (
    <div className="space-y-6">
      {/* Macro indicators with sparklines */}
      {macroIndicators.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Indicadores Macroeconômicos (BCB) — últimos 12 períodos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {macroIndicators.map((ind, i) => {
              const Icon = macroIcons[ind.name] || TrendingUp;
              const historyValues = ind.history?.map(h => h.value) || [];
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">{ind.name}</span>
                    </div>
                    <VariationBadge variation={ind.variation} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold text-foreground">
                        {ind.value !== null ? ind.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{ind.unit} · {ind.date}</p>
                    </div>
                    <MiniSparkline data={historyValues} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IPEAData series with actual values */}
      {ipeadataSeries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Séries Relacionadas (IPEAData)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Série</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Tema</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Último valor</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Tendência</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Fonte</th>
                </tr>
              </thead>
              <tbody>
                {ipeadataSeries.map((series, i) => {
                  const historyValues = series.values?.map(v => v.value) || [];
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{series.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{series.code}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{series.theme}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-sm font-semibold text-foreground">
                          {series.lastValue !== null ? series.lastValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <MiniSparkline data={historyValues} />
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] text-muted-foreground">{series.source}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {macroIndicators.length === 0 && ipeadataSeries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Database className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum dado produtivo encontrado para esta busca.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Aba Produtiva — exibe indicadores macro (BCB) e séries IPEAData
 */
import { TrendingUp, DollarSign, Percent, Activity, Database } from "lucide-react";
import type { MacroIndicator, IPEADataSeries } from "@/hooks/useEnrichmentSearch";

interface ProductiveTabProps {
  macroIndicators: MacroIndicator[];
  ipeadataSeries: IPEADataSeries[];
  isLoading: boolean;
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
    "Câmbio USD": DollarSign,
  };

  return (
    <div className="space-y-6">
      {/* Macro indicators */}
      {macroIndicators.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Indicadores Macroeconômicos (BCB)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {macroIndicators.map((ind, i) => {
              const Icon = macroIcons[ind.name] || TrendingUp;
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
                  <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="text-xl font-bold text-foreground">
                    {ind.value ?? "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">{ind.name}</p>
                  {ind.date && (
                    <p className="text-[9px] text-muted-foreground/60">{ind.date}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IPEAData series */}
      {ipeadataSeries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Séries Relacionadas (IPEAData)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ipeadataSeries.map((series, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
                <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{series.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  {series.theme && (
                    <span className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{series.theme}</span>
                  )}
                  {series.source && (
                    <span className="text-[10px] text-muted-foreground">{series.source}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{series.code}</p>
              </div>
            ))}
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

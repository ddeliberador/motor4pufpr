import { AlertTriangle, TrendingUp, Link2, Gauge } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface IndexData {
  value: number;
  label: string;
  description: string;
  formula: string;
  layers_used?: string[];
  alert_level?: "normal" | "warning" | "critical";
}

interface StrategicIndicesProps {
  indices: {
    gt: IndexData;
    cd: IndexData;
    aue: IndexData;
    ei: IndexData;
  };
}

const LAYER_LABELS: Record<string, string> = {
  knowledge: "Conhecimento",
  technology: "Tecnologia",
  policy: "Política",
  international: "Internacional",
};

const indexConfig = [
  { key: "gt" as const, icon: AlertTriangle, alertThreshold: 70, alertMsg: "Gap de tradução crítico", goodLabel: "Tradução equilibrada", badLabel: "Muita ciência, pouca aplicação", colorHigh: "text-red-500", colorLow: "text-emerald-500" },
  { key: "cd" as const, icon: TrendingUp, alertThreshold: 60, alertMsg: "Alta dependência externa", goodLabel: "Produção nacional forte", badLabel: "Dependente do exterior", colorHigh: "text-amber-500", colorLow: "text-emerald-500" },
  { key: "aue" as const, icon: Link2, alertThreshold: 20, alertMsg: "Baixa articulação U-E", goodLabel: "Boa articulação", badLabel: "Universidade e empresa desconectadas", colorHigh: "text-emerald-500", colorLow: "text-red-500", invertAlert: true },
  { key: "ei" as const, icon: Gauge, alertThreshold: 40, alertMsg: "Baixa efetividade instrumental", goodLabel: "Instrumentos funcionando", badLabel: "Instrumentos com baixo impacto", colorHigh: "text-emerald-500", colorLow: "text-amber-500", invertAlert: true },
];

export default function StrategicIndices({ indices }: StrategicIndicesProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {indexConfig.map(({ key, icon: Icon, alertThreshold, goodLabel, badLabel, colorHigh, colorLow, invertAlert }) => {
        const idx = indices[key];
        if (!idx) return null;
        const isAlert = invertAlert ? idx.value < alertThreshold : idx.value > alertThreshold;
        const statusColor = invertAlert
          ? (idx.value >= alertThreshold ? colorHigh : colorLow)
          : (idx.value > alertThreshold ? colorHigh : colorLow);
        const statusLabel = invertAlert
          ? (idx.value >= alertThreshold ? goodLabel : badLabel)
          : (idx.value > alertThreshold ? badLabel : goodLabel);

        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div className={`relative bg-card border rounded-xl p-4 transition-all ${isAlert ? "border-destructive/40 shadow-sm shadow-destructive/10" : "border-border"}`}>
                {isAlert && (
                  <span className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-full font-medium uppercase tracking-wider">
                    Alerta
                  </span>
                )}
                <Icon className={`w-5 h-5 mb-2 ${statusColor}`} />
                <p className="text-3xl font-bold text-foreground">
                  {idx.value}
                  <span className="text-sm font-normal text-muted-foreground">
                    {key === "cd" || key === "aue" ? "%" : "/100"}
                  </span>
                </p>
                <p className="text-xs font-medium text-foreground mt-1">{idx.label}</p>
                <p className={`text-[10px] mt-0.5 ${statusColor}`}>{statusLabel}</p>
                {/* Layers used badge */}
                {idx.layers_used && idx.layers_used.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-2">
                    {idx.layers_used.map((layer) => (
                      <span key={layer} className="text-[8px] px-1 py-0.5 bg-muted rounded text-muted-foreground">
                        {LAYER_LABELS[layer] || layer}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs font-medium mb-1">{idx.label}</p>
              <p className="text-[11px] text-muted-foreground mb-2">{idx.description}</p>
              <p className="text-[10px] font-mono bg-muted p-1.5 rounded">{idx.formula}</p>
              {idx.layers_used && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Camadas: {idx.layers_used.map(l => LAYER_LABELS[l] || l).join(" × ")}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

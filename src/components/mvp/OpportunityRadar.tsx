import { Radar, Sparkles, AlertTriangle, TrendingUp, Link2 } from "lucide-react";
import { useSmartInsights } from "@/hooks/useSmartInsights";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/types/persona";
import { personaConfigs } from "@/config/personas";

interface OpportunityRadarProps {
  query: string;
  searchData: Record<string, unknown>;
  persona: Persona;
  selectedCnaes: Array<{ code: string; description: string }>;
}

const insightIcons = {
  opportunity: Sparkles,
  warning: AlertTriangle,
  match: Link2,
  trend: TrendingUp,
};

const insightColors = {
  opportunity: "from-emerald-500 to-teal-600",
  warning: "from-amber-500 to-orange-600",
  match: "from-blue-500 to-cyan-600",
  trend: "from-violet-500 to-purple-600",
};

const insightBg = {
  opportunity: "bg-emerald-500/10 border-emerald-500/20",
  warning: "bg-amber-500/10 border-amber-500/20",
  match: "bg-blue-500/10 border-blue-500/20",
  trend: "bg-violet-500/10 border-violet-500/20",
};

const insightLabel = {
  opportunity: "Oportunidade",
  warning: "Alerta",
  match: "Match",
  trend: "Tendência",
};

const OpportunityRadar = ({ query, searchData, persona, selectedCnaes }: OpportunityRadarProps) => {
  const { insights, isLoading, error, generateInsights } = useSmartInsights();
  const config = personaConfigs[persona];

  const handleGenerate = () => {
    generateInsights(query, searchData, persona, selectedCnaes);
  };

  // Not started
  if (insights.length === 0 && !isLoading && !error) {
    return (
      <div className="card-modern p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} shadow-lg flex items-center justify-center flex-shrink-0`}>
            <Radar className="w-6 h-6 text-white" />
          </div>
          <div className="flex-grow text-center sm:text-left">
            <h3 className="text-lg font-semibold text-foreground">Radar de Oportunidades</h3>
            <p className="text-sm text-muted-foreground">
              Match inteligente entre tema, bolsas, instrumentos e parceiros
            </p>
          </div>
          <Button onClick={handleGenerate} className={`bg-gradient-to-r ${config.color} text-white gap-2`}>
            <Radar className="w-4 h-4" />
            Ativar Radar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-modern p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} shadow-lg flex items-center justify-center`}>
            <Radar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Radar de Oportunidades</h3>
            {isLoading && <p className="text-xs text-amber-600 animate-pulse">Analisando cruzamentos...</p>}
          </div>
        </div>
        {!isLoading && (
          <Button variant="ghost" size="sm" onClick={handleGenerate}>
            Reanalisar
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, i) => {
            const Icon = insightIcons[insight.type] || Sparkles;
            const color = insightColors[insight.type] || "from-blue-500 to-cyan-600";
            const bg = insightBg[insight.type] || "bg-blue-500/10 border-blue-500/20";
            const label = insightLabel[insight.type] || "Insight";

            return (
              <div key={i} className={`p-4 rounded-xl border ${bg} transition-all hover:shadow-md`}>
                <div className="flex items-start gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                      {insight.score && (
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                          {Math.round(insight.score * 100)}%
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground text-sm leading-tight">{insight.title}</h4>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed ml-11">{insight.description}</p>
                {insight.source && (
                  <p className="text-[10px] text-muted-foreground/60 mt-2 ml-11">Fonte: {insight.source}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OpportunityRadar;

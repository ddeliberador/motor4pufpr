import { useMemo } from "react";
import { Lightbulb, TrendingUp, AlertTriangle, Globe, MapPin } from "lucide-react";

interface ScientificGroup {
  name: string;
  institution: string;
  state: string;
  area: string;
  international?: string | boolean;
}

interface ResearchGapsProps {
  groups: ScientificGroup[];
  query: string;
  totalGroups: number;
  totalPatents: number;
}

interface Gap {
  icon: typeof Lightbulb;
  title: string;
  description: string;
  type: "opportunity" | "warning" | "insight";
}

const ResearchGaps = ({ groups, query, totalGroups, totalPatents }: ResearchGapsProps) => {
  const gaps = useMemo(() => {
    const result: Gap[] = [];

    // 1. Concentração geográfica
    const stateCount: Record<string, number> = {};
    groups.forEach(g => {
      stateCount[g.state] = (stateCount[g.state] || 0) + 1;
    });
    const states = Object.keys(stateCount);
    const topState = states.sort((a, b) => stateCount[b] - stateCount[a])[0];
    if (topState && states.length > 1) {
      const pct = Math.round((stateCount[topState] / groups.length) * 100);
      if (pct > 40) {
        result.push({
          icon: MapPin,
          title: "Concentração geográfica",
          description: `${pct}% dos grupos estão em ${topState}. Regiões Norte, Nordeste e Centro-Oeste podem representar fronteiras inexploradas para "${query}".`,
          type: "opportunity",
        });
      }
    }

    // 2. Internacionalização
    const withIntl = groups.filter(g => g.international).length;
    const intlPct = groups.length > 0 ? Math.round((withIntl / groups.length) * 100) : 0;
    if (intlPct < 30) {
      result.push({
        icon: Globe,
        title: "Baixa internacionalização",
        description: `Apenas ${intlPct}% dos grupos possuem colaboração internacional. Parcerias com centros globais podem acelerar publicações de alto impacto.`,
        type: "warning",
      });
    }

    // 3. Gap ciência → tecnologia
    if (totalGroups > 0 && totalPatents > 0) {
      const ratio = totalPatents / totalGroups;
      if (ratio < 3) {
        result.push({
          icon: TrendingUp,
          title: "Gap ciência → tecnologia",
          description: `Proporção de ${ratio.toFixed(1)} patentes por grupo sugere baixa tradução tecnológica. Programas de transferência e incubação podem preencher essa lacuna.`,
          type: "warning",
        });
      } else {
        result.push({
          icon: TrendingUp,
          title: "Boa tradução tecnológica",
          description: `Proporção de ${ratio.toFixed(1)} patentes por grupo indica tradução ativa. Oportunidade para escalar via spin-offs e licenciamentos.`,
          type: "insight",
        });
      }
    }

    // 4. Diversidade de áreas
    const areas = new Set(groups.map(g => g.area));
    if (areas.size <= 2 && groups.length > 3) {
      result.push({
        icon: Lightbulb,
        title: "Baixa diversidade temática",
        description: `Pesquisa concentrada em ${areas.size} área(s). Abordagens interdisciplinares (ex: IA + ${query}, bio + ${query}) podem revelar nichos de alta originalidade.`,
        type: "opportunity",
      });
    }

    // 5. Oportunidade de formação
    if (groups.length < 10) {
      result.push({
        icon: Lightbulb,
        title: "Fronteira emergente",
        description: `Com poucos grupos ativos, "${query}" é uma fronteira emergente no Brasil. Há espaço para novos grupos se posicionarem como referência nacional.`,
        type: "opportunity",
      });
    }

    return result.slice(0, 4);
  }, [groups, query, totalGroups, totalPatents]);

  if (gaps.length === 0) return null;

  const typeStyles = {
    opportunity: "border-l-emerald-500 bg-emerald-500/5",
    warning: "border-l-amber-500 bg-amber-500/5",
    insight: "border-l-blue-500 bg-blue-500/5",
  };

  const iconStyles = {
    opportunity: "text-emerald-600",
    warning: "text-amber-600",
    insight: "text-blue-600",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Lacunas e Oportunidades de Pesquisa</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gaps.map((gap, i) => (
          <div
            key={i}
            className={`border-l-4 rounded-xl p-4 ${typeStyles[gap.type]} bg-card border border-border`}
          >
            <div className="flex items-start gap-3">
              <gap.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconStyles[gap.type]}`} />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">{gap.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{gap.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResearchGaps;

import { Zap, ExternalLink } from "lucide-react";
import { safeHttpUrl } from "@/lib/utils";

interface Opportunity {
  emoji: string;
  titulo: string;
  descricao: string;
  acao: string;
  url?: string;
  urgencia?: "alta" | "media" | "baixa";
}

interface OpportunityCardProps {
  oportunidades: Opportunity[];
  persona: "pesquisador" | "universidade" | "empresa" | "governo";
  query: string;
  cnaeLabel?: string;
}

const PERSONA_INTRO: Record<string, { titulo: string; subtitulo: string }> = {
  pesquisador: {
    titulo: "💡 Oportunidades identificadas para você",
    subtitulo: "Com base nos dados de publicações, financiamento e mercado de trabalho neste tema",
  },
  universidade: {
    titulo: "💡 Oportunidades estratégicas para sua instituição",
    subtitulo: "Baseado no posicionamento científico e no mapa de financiamento disponível",
  },
  empresa: {
    titulo: "💡 Oportunidades de negócio identificadas",
    subtitulo: "Baseado na maturidade tecnológica, incentivos fiscais e parceiros disponíveis",
  },
  governo: {
    titulo: "💡 Recomendações de política pública",
    subtitulo: "Baseado nos indicadores de efetividade dos instrumentos e lacunas identificadas",
  },
};

const URGENCIA_STYLE: Record<string, string> = {
  alta: "border-l-4 border-l-red-500 bg-red-500/5",
  media: "border-l-4 border-l-amber-500 bg-amber-500/5",
  baixa: "border-l-4 border-l-emerald-500 bg-emerald-500/5",
};

const URGENCIA_LABEL: Record<string, string> = {
  alta: "🔴 Ação urgente",
  media: "🟡 Curto prazo",
  baixa: "🟢 Médio prazo",
};

export default function OpportunityCard({ oportunidades, persona, query, cnaeLabel }: OpportunityCardProps) {
  const intro = PERSONA_INTRO[persona];
  if (!oportunidades || oportunidades.length === 0) return null;

  return (
    <div className="bg-card border-2 border-primary/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 border-b border-primary/10 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">{intro.titulo}</h3>
        </div>
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">{intro.subtitulo}</p>
          {cnaeLabel ? (
            <p className="text-sm text-foreground">
              Setor: <strong>{cnaeLabel}</strong>
              <span className="text-muted-foreground text-xs ml-2">· busca: "{query}"</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Tema: <strong>{query}</strong></p>
          )}
        </div>
      </div>

      {/* Oportunidades */}
      <div className="p-5 space-y-3">
        {oportunidades.map((op, i) => (
          <div key={i} className={`rounded-xl p-4 ${op.urgencia ? URGENCIA_STYLE[op.urgencia] : "bg-muted/30"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0 mt-0.5">{op.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-foreground">{op.titulo}</p>
                    {op.urgencia && (
                      <span className="text-[10px] font-medium text-muted-foreground">{URGENCIA_LABEL[op.urgencia]}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{op.descricao}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground bg-background/60 px-2.5 py-1 rounded-full border border-border/50">
                      → {op.acao}
                    </span>
                  </div>
                </div>
              </div>
              {op.url && (
                <a href={safeHttpUrl(op.url)} target="_blank" rel="noopener noreferrer"
                   className="flex-shrink-0 flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 pb-4">
        <p className="text-[10px] text-muted-foreground">
          ⚡ Gerado automaticamente com base nos dados coletados — verifique as fontes antes de agir
        </p>
      </div>
    </div>
  );
}

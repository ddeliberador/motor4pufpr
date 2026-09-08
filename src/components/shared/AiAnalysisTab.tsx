import ReactMarkdown from "react-markdown";
import { Brain, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MotorAnalysis } from "@/hooks/useMotorSearch";

interface AiAnalysisTabProps {
  analysis: MotorAnalysis | null;
  isAnalyzing: boolean;
  analysisError?: string | null;
  onGenerate: () => void;
  /** Fontes usadas na busca, exibidas no rodapé do resultado */
  sources?: string[];
  /** Gradiente do número da seção (identidade da persona) */
  colorClass?: string;
  /** Texto curto explicando o que a análise entrega para esta persona */
  intro?: string;
}

export const TUCANO_NOTE =
  "Gerado por Tucano 2 (modelo aberto brasileiro), rodando localmente";

export function AiAnalysisTab({
  analysis,
  isAnalyzing,
  analysisError,
  onGenerate,
  sources = [],
  colorClass = "from-primary to-primary",
  intro,
}: AiAnalysisTabProps) {
  if (isAnalyzing) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
        <Loader2 className="w-7 h-7 mx-auto animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Gerando análise…</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          O texto é escrito por um modelo aberto que roda nos nossos próprios servidores, sem
          serviço pago. Como o processamento é feito em CPU, isso pode levar de um a alguns
          minutos. Você pode continuar navegando pelas outras abas.
        </p>
      </div>
    );
  }

  if (analysis && analysis.sections?.length > 0) {
    return (
      <div className="space-y-4">
        {analysis.questions.map((question, idx) => (
          <div key={idx} className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${colorClass} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}
              >
                {idx + 1}
              </span>
              {question}
            </h3>
            <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary">
              <ReactMarkdown>{analysis.sections[idx] || ""}</ReactMarkdown>
            </div>
          </div>
        ))}
        {sources.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">
            Análise baseada em {sources.join(" · ")}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground text-center italic">{TUCANO_NOTE}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4">
      <Brain className="w-8 h-8 mx-auto text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Análise escrita sob demanda</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          {intro ||
            "Um texto que interpreta os números desta busca e sugere próximos passos concretos."}{" "}
          Ela não é gerada automaticamente: clique abaixo para pedir a análise. Pode levar de um a
          alguns minutos.
        </p>
      </div>
      <Button onClick={onGenerate} size="sm">
        <Brain className="w-4 h-4 mr-2" /> Gerar análise
      </Button>
      {analysisError && (
        <p className="text-xs text-destructive flex items-center justify-center gap-2 max-w-md mx-auto">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {analysisError}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground italic">{TUCANO_NOTE}</p>
    </div>
  );
}

export default AiAnalysisTab;

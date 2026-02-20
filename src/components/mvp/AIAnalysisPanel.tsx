import { Bot, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { useResearchAgent } from "@/hooks/useResearchAgent";
import { Button } from "@/components/ui/button";

interface AIAnalysisPanelProps {
  query: string;
  searchData: Record<string, unknown>;
  selectedCnaes: Array<{ code: string; description: string }>;
}

const AIAnalysisPanel = ({ query, searchData, selectedCnaes }: AIAnalysisPanelProps) => {
  const { analysis, isAnalyzing, error, analyze, reset } = useResearchAgent();

  const handleAnalyze = () => {
    analyze(query, searchData, selectedCnaes);
  };

  // Simple markdown renderer for headers and bold
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="text-lg font-bold text-foreground mt-6 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-primary inline-block" />
            {line.slice(3)}
          </h3>
        );
      }
      if (line.startsWith("### ")) {
        return <h4 key={i} className="text-base font-semibold text-foreground mt-4 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="text-sm text-muted-foreground ml-4 list-disc">
            {renderBold(line.slice(2))}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{renderBold(line)}</p>;
    });
  };

  const renderBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{part}</strong> : part
    );
  };

  // Not started state
  if (!analysis && !isAnalyzing && !error) {
    return (
      <div className="card-modern p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-grow text-center sm:text-left">
            <h3 className="text-lg font-semibold text-foreground">Agente Pesquisador IA</h3>
            <p className="text-sm text-muted-foreground">
              Análise inteligente com cruzamento de dados entre todas as camadas
            </p>
          </div>
          <Button
            onClick={handleAnalyze}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Analisar com IA
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-modern p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Análise do Agente IA</h3>
            {isAnalyzing && (
              <p className="text-xs text-amber-600 animate-pulse">Analisando dados...</p>
            )}
          </div>
        </div>
        {!isAnalyzing && (
          <Button variant="ghost" size="sm" onClick={() => { reset(); handleAnalyze(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Reanalisar
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {(analysis || isAnalyzing) && (
        <div className="prose-sm max-w-none">
          {analysis ? renderMarkdown(analysis) : (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          )}
          {isAnalyzing && (
            <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;

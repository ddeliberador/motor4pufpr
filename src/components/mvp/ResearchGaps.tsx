import { BookOpen, AlertCircle, RefreshCw, Search } from "lucide-react";
import { useResearchGaps } from "@/hooks/useResearchGaps";
import { Button } from "@/components/ui/button";

interface ResearchGapsProps {
  query: string;
}

const ResearchGaps = ({ query }: ResearchGapsProps) => {
  const { gaps, isLoading, error, analyze, reset } = useResearchGaps();

  const handleAnalyze = () => {
    analyze(query);
  };

  // Simple markdown renderer
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="text-base font-bold text-foreground mt-4 mb-2 flex items-center gap-2">
            {line.slice(3)}
          </h3>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h4 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1 border-l-2 border-primary pl-3">
            {line.slice(4)}
          </h4>
        );
      }
      if (line.startsWith("- **")) {
        return (
          <li key={i} className="text-xs text-muted-foreground ml-4 list-none mt-1">
            {renderBold(line.slice(2))}
          </li>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="text-xs text-muted-foreground ml-4 list-disc">
            {renderBold(line.slice(2))}
          </li>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return (
        <p key={i} className="text-xs text-muted-foreground leading-relaxed">
          {renderBold(line)}
        </p>
      );
    });
  };

  const renderBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="text-foreground font-semibold">{part}</strong>
      ) : (
        part
      )
    );
  };

  // Not started
  if (!gaps && !isLoading && !error) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex-grow text-center sm:text-left">
            <h3 className="text-sm font-semibold text-foreground">Lacunas de Pesquisa</h3>
            <p className="text-xs text-muted-foreground">
              Análise automática de abstracts do OpenAlex para identificar perguntas não respondidas, contradições e oportunidades
            </p>
          </div>
          <Button
            onClick={handleAnalyze}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white gap-1.5 flex-shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            Identificar Lacunas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Lacunas de Pesquisa</h3>
            {isLoading && (
              <p className="text-[10px] text-blue-600 animate-pulse">Analisando abstracts do OpenAlex...</p>
            )}
          </div>
        </div>
        {!isLoading && (
          <Button variant="ghost" size="sm" onClick={() => { reset(); handleAnalyze(); }} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reanalisar
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {(gaps || isLoading) && (
        <div className="prose-sm max-w-none">
          {gaps ? (
            renderMarkdown(gaps)
          ) : (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 bg-muted rounded animate-pulse" style={{ width: `${85 - i * 10}%` }} />
              ))}
            </div>
          )}
          {isLoading && (
            <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchGaps;

/**
 * ExamplesSection - Seção de Exemplos Dinâmica
 * Carrega exemplos do backend e permite busca com um clique
 */
import { useState, useEffect } from "react";
import { Search, Lightbulb, Loader2, ChevronRight } from "lucide-react";
import { api, type Example } from "@/lib/api";

interface ExamplesSectionProps {
  onExampleClick: (query: string) => void;
  disabled?: boolean;
}

export default function ExamplesSection({ onExampleClick, disabled }: ExamplesSectionProps) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    setIsLoading(true);
    try {
      const response = await api.getExamples();
      setExamples(response.examples);
    } catch (err) {
      console.error('Failed to load examples:', err);
      // Fallback para exemplos fixos
      setExamples([
        { query: "baterias de sódio", description: "Tecnologia de armazenamento alternativa ao lítio", areas: ["Energia", "Materiais"] },
        { query: "inteligência artificial industrial", description: "IA para manufatura e indústria 4.0", areas: ["Computação", "Automação"] },
        { query: "biomateriais para implantes", description: "Materiais biocompatíveis para medicina", areas: ["Materiais", "Medicina"] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const displayExamples = isExpanded ? examples : examples.slice(0, 3);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-medium text-foreground">Exemplos de pesquisa</p>
        </div>
        {examples.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {isExpanded ? 'Ver menos' : `Ver todos (${examples.length})`}
            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {displayExamples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => onExampleClick(example.query)}
              disabled={disabled}
              className="w-full text-left p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                    {example.query}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {example.description}
                  </p>
                  {example.areas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {example.areas.map((area, areaIdx) => (
                        <span key={areaIdx} className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

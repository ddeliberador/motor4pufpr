/**
 * OntologyPreview - Preview de Tradução Ontológica
 * Mostra os códigos CNPq, IPC, NCM, CNAE antes da busca completa
 */
import { useState } from "react";
import { Search, Loader2, ChevronDown, ChevronUp, Code, BookOpen, Package, Building } from "lucide-react";
import { api, type OntologyMapping } from "@/lib/api";

interface OntologyPreviewProps {
  query: string;
}

export default function OntologyPreview({ query }: OntologyPreviewProps) {
  const [ontology, setOntology] = useState<OntologyMapping | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePreview = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.getOntology(query);
      if (response.success && response.data) {
        setOntology(response.data);
        setIsExpanded(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar ontologia');
    } finally {
      setIsLoading(false);
    }
  };

  if (!query.trim()) return null;

  return (
    <div className="mt-4 border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => {
          if (!ontology && !isLoading) {
            handlePreview();
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
        className="w-full px-4 py-3 bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between text-sm font-medium"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          <span>Preview de Tradução Ontológica</span>
          {ontology && (
            <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full">
              {ontology.confidence}% confiança
            </span>
          )}
        </div>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Content */}
      {isExpanded && ontology && (
        <div className="p-4 space-y-4 bg-card">
          {/* CNPq Areas */}
          {ontology.cnpq_areas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-sm">Áreas CNPq</h4>
              </div>
              <div className="space-y-1">
                {ontology.cnpq_areas.slice(0, 3).map((area, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                      {area.code}
                    </code>
                    <span className="text-muted-foreground">{area.name}</span>
                    {area.match_type && (
                      <span className="text-xs text-muted-foreground/70">({area.match_type})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IPC Codes */}
          {ontology.ipc_codes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-sm">Códigos IPC (Patentes)</h4>
              </div>
              <div className="space-y-1">
                {ontology.ipc_codes.slice(0, 3).map((code, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <code className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-mono">
                      {code.code}
                    </code>
                    <span className="text-muted-foreground text-xs">{code.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NCM Codes */}
          {ontology.ncm_codes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold text-sm">Códigos NCM (Comércio)</h4>
              </div>
              <div className="space-y-1">
                {ontology.ncm_codes.slice(0, 3).map((code, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <code className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-mono">
                      {code.code}
                    </code>
                    <span className="text-muted-foreground text-xs">{code.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CNAE Codes */}
          {ontology.cnae_codes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-4 h-4 text-amber-600" />
                <h4 className="font-semibold text-sm">Códigos CNAE (Empresas)</h4>
              </div>
              <div className="space-y-1">
                {ontology.cnae_codes.slice(0, 3).map((code, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <code className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-mono">
                      {code.code}
                    </code>
                    <span className="text-muted-foreground text-xs">{code.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Terms */}
          {ontology.search_terms.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Termos de busca gerados:</p>
              <div className="flex flex-wrap gap-1">
                {ontology.search_terms.slice(0, 8).map((term, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Enriquecimento institucional — PNCP, Querido Diário, Dados Abertos
 * Foco em dados objetivos e links acionáveis
 */
import { Landmark, FileText, Database, ExternalLink, MapPin, Calendar } from "lucide-react";
import type { PublicContract, OfficialGazette, OpenDataset } from "@/hooks/useEnrichmentSearch";

interface InstitutionalEnrichmentProps {
  contracts: PublicContract[];
  gazettes: OfficialGazette[];
  datasets: OpenDataset[];
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}mil`;
  return `R$ ${value.toFixed(0)}`;
}

export default function InstitutionalEnrichment({ contracts, gazettes, datasets, isLoading }: InstitutionalEnrichmentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Buscando dados institucionais...</span>
      </div>
    );
  }

  const hasData = contracts.length > 0 || gazettes.length > 0 || datasets.length > 0;
  if (!hasData) return null;

  const totalContractValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);

  return (
    <div className="space-y-6 mt-6">
      {/* PNCP — Licitações como tabela */}
      {contracts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" />
              Licitações Públicas (PNCP)
              <span className="text-[10px] font-normal text-muted-foreground">— {contracts.length} resultados</span>
            </h3>
            {totalContractValue > 0 && (
              <span className="text-xs font-semibold text-primary">
                Total estimado: {formatCurrency(totalContractValue)}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Objeto</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Órgão</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">UF</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Valor</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Data</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Link</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 max-w-[250px]">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{c.object || "Sem objeto"}</p>
                      <p className="text-[10px] text-muted-foreground">{c.modality}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs text-muted-foreground line-clamp-1">{c.organ}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {c.uf && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">{c.uf}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-xs font-semibold text-foreground">
                        {c.value > 0 ? formatCurrency(c.value) : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-[10px] text-muted-foreground">{c.date?.split("T")[0] || "—"}</td>
                    <td className="py-2.5 px-3 text-center">
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Querido Diário */}
      {gazettes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Menções em Diários Oficiais
            <span className="text-[10px] font-normal text-muted-foreground">— {gazettes.length} menções</span>
          </h3>
          <div className="space-y-2">
            {gazettes.map((g, i) => (
              <a
                key={i}
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{g.territory}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">{g.state}</span>
                  </div>
                  {g.excerpts[0] && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1"
                      dangerouslySetInnerHTML={{ __html: g.excerpts[0] }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {g.date}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Dados Abertos */}
      {datasets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Datasets Relacionados (Portal Dados Abertos)
            <span className="text-[10px] font-normal text-muted-foreground">— {datasets.length} datasets</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Dataset</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Organização</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Formatos</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Link</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 max-w-[300px]">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{d.description}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs text-muted-foreground line-clamp-1">{d.organization}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {d.formats.slice(0, 3).map((f, fi) => (
                          <span key={fi} className="text-[9px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">{f}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

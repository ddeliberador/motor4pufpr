/**
 * Cards de enriquecimento institucional — PNCP, Querido Diário, Dados Abertos
 */
import { Landmark, FileText, Database, ExternalLink, MapPin } from "lucide-react";
import type { PublicContract, OfficialGazette, OpenDataset } from "@/hooks/useEnrichmentSearch";

interface InstitutionalEnrichmentProps {
  contracts: PublicContract[];
  gazettes: OfficialGazette[];
  datasets: OpenDataset[];
  isLoading: boolean;
}

export default function InstitutionalEnrichment({ contracts, gazettes, datasets, isLoading }: InstitutionalEnrichmentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Enriquecendo dados institucionais...</span>
      </div>
    );
  }

  const hasData = contracts.length > 0 || gazettes.length > 0 || datasets.length > 0;
  if (!hasData) return null;

  return (
    <div className="space-y-6 mt-6">
      {/* PNCP — Licitações */}
      {contracts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-accent" />
            Licitações Públicas (PNCP)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contracts.map((c, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
                <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{c.object || "Sem objeto"}</h4>
                <p className="text-xs text-muted-foreground mb-2">{c.organ}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    {c.uf && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <MapPin className="w-3 h-3" />{c.uf}
                      </span>
                    )}
                    <span className="text-muted-foreground">{c.modality}</span>
                  </div>
                  {c.value > 0 && (
                    <span className="font-semibold text-accent">
                      R$ {(c.value / 1_000_000).toFixed(1)}M
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Querido Diário */}
      {gazettes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Menções em Diários Oficiais
          </h3>
          <div className="space-y-2">
            {gazettes.map((g, i) => (
              <a
                key={i}
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{g.territory}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {g.state} · {g.date}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
                {g.excerpts[0] && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: g.excerpts[0] }}
                  />
                )}
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
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {datasets.map((d, i) => (
              <a
                key={i}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all block"
              >
                <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{d.title}</h4>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{d.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{d.organization}</span>
                  {d.formats.slice(0, 3).map((f, fi) => (
                    <span key={fi} className="text-[9px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">{f}</span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

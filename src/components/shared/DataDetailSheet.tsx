import { useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExternalLink, BookOpen, Users, FileText, Globe, GitBranch, Building2, Landmark } from "lucide-react";
import { track } from "@/lib/telemetry";

export interface DetailItem {
  title?: string;
  subtitle?: string;
  type: string;
  fields?: Array<{ label: string; value: string | number | null }>;
  url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface DataDetailSheetProps {
  open: boolean;
  onClose: () => void;
  item: DetailItem | null;
}

// Componente para um paper individual dentro de um detail de instituição/país
function PaperMini({ paper }: { paper: any }) {
  return (
    <a
      href={paper.oa_url || paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : "#")}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors border border-border/30"
    >
      <p className="text-xs font-medium text-foreground line-clamp-2 mb-1">{paper.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground">{paper.year}</span>
        <span className="text-[10px] font-semibold text-primary">{paper.citations} cit.</span>
        {paper.journal && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{paper.journal}</span>}
        {paper.is_open_access && (
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded font-medium">Acesso aberto</span>
        )}
      </div>
    </a>
  );
}

// Detail de PAPER — exibe tudo
function PaperDetail({ data }: { data: any }) {
  const accessUrl = data.oa_url || data.url || (data.doi ? `https://doi.org/${data.doi}` : null);

  return (
    <div className="space-y-5">
      {/* Metadados principais */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-primary">{data.citations || 0}</p>
          <p className="text-[10px] text-muted-foreground">Citações</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{data.year}</p>
          <p className="text-[10px] text-muted-foreground">Publicação</p>
        </div>
      </div>

      {/* Acesso */}
      {accessUrl && (
        <a
          href={accessUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
            data.is_open_access
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          {data.is_open_access ? "Ler artigo (acesso aberto)" : "Ver artigo"}
        </a>
      )}

      {data.doi && (
        <p className="text-[10px] text-muted-foreground text-center font-mono">
          DOI: {data.doi}
        </p>
      )}

      {/* Abstract */}
      {data.abstract && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Resumo
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.abstract}</p>
        </div>
      )}

      {/* Periódico */}
      {data.journal && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">Periódico</p>
          <p className="text-xs text-muted-foreground">{data.journal}</p>
        </div>
      )}

      {/* Autores */}
      {data.authors?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Autores ({data.authors.length})
          </p>
          <div className="space-y-1.5">
            {data.authors.map((a: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-xs font-medium text-foreground">{a.name}</p>
                  {a.institution && <p className="text-[10px] text-muted-foreground">{a.institution}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {a.country && <span className="text-[10px] text-muted-foreground">{a.country}</span>}
                  {a.orcid && (
                    <a
                      href={`https://orcid.org/${a.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                    >
                      ORCID
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conceitos e Keywords */}
      {(data.concepts?.length > 0 || data.keywords?.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Temas e palavras-chave</p>
          <div className="flex flex-wrap gap-1.5">
            {(data.concepts || []).map((c: string, i: number) => (
              <span key={`c-${i}`} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{c}</span>
            ))}
            {(data.keywords || []).map((k: string, i: number) => (
              <span key={`k-${i}`} className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* Financiadores */}
      {data.grants?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" /> Financiado por
          </p>
          <div className="space-y-1">
            {data.grants.map((g: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <p className="text-xs text-foreground">{g.funder}</p>
                {g.award && <p className="text-[10px] text-muted-foreground font-mono">{g.award}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ODS */}
      {data.sdgs?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">ODS relacionados</p>
          <div className="flex flex-wrap gap-1.5">
            {data.sdgs.map((s: string, i: number) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Detail de INSTITUIÇÃO — exibe papers reais da instituição
function InstitutionDetail({ data }: { data: any }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-primary">{data.count || 0}</p>
          <p className="text-[10px] text-muted-foreground">Papers encontrados</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{data.contracts?.length || 0}</p>
          <p className="text-[10px] text-muted-foreground">Contratos públicos</p>
        </div>
      </div>

      {data.papers?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Papers desta instituição
          </p>
          <div className="space-y-2">
            {data.papers.slice(0, 8).map((p: any, i: number) => (
              <PaperMini key={i} paper={p} />
            ))}
          </div>
        </div>
      )}

      {data.contracts?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Contratos públicos relacionados
          </p>
          <div className="space-y-1.5">
            {data.contracts.slice(0, 5).map((c: any, i: number) => (
              <div key={i} className="p-2.5 bg-muted/30 rounded-lg border border-border/30">
                <p className="text-xs text-foreground line-clamp-2">{c.object}</p>
                <div className="flex items-center gap-2 mt-1">
                  {c.value > 0 && (
                    <span className="text-[10px] font-semibold text-primary">
                      R$ {(c.value / 1000).toFixed(0)}mil
                    </span>
                  )}
                  {c.uf && <span className="text-[9px] text-muted-foreground">{c.uf}</span>}
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer"
                       className="text-[9px] text-primary hover:underline ml-auto">
                      Ver →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Detail de PAÍS — exibe papers daquele país
function CountryDetail({ data }: { data: any }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/30 rounded-lg p-4 text-center">
        <p className="text-4xl mb-2">{data.flag || "🌍"}</p>
        <p className="text-2xl font-bold text-primary">{(data.count || 0).toLocaleString("pt-BR")}</p>
        <p className="text-xs text-muted-foreground">papers com coautoria</p>
      </div>

      {data.papers?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Papers com autores deste país
          </p>
          <div className="space-y-2">
            {data.papers.slice(0, 8).map((p: any, i: number) => (
              <PaperMini key={i} paper={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Detail de REPO GitHub
function RepoDetail({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-primary">⭐ {(data.stars || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Stars</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-foreground">{data.forks || 0}</p>
          <p className="text-[10px] text-muted-foreground">Forks</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-foreground">{data.language || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Linguagem</p>
        </div>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground">{data.description}</p>
      )}
      {data.updated && (
        <p className="text-[10px] text-muted-foreground">Atualizado: {data.updated}</p>
      )}
      {data.url && (
        <a href={data.url} target="_blank" rel="noopener noreferrer"
           className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
          <GitBranch className="w-4 h-4" />
          Ver no GitHub
        </a>
      )}
    </div>
  );
}

// Detail de CONTRATO/CONVÊNIO
function ContractDetail({ data, type }: { data: any; type: string }) {
  return (
    <div className="space-y-3">
      {data.value > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            R$ {data.value >= 1e6
              ? `${(data.value / 1e6).toFixed(2)}M`
              : `${(data.value / 1e3).toFixed(0)}mil`}
          </p>
          <p className="text-[10px] text-muted-foreground">Valor {type === "contract" ? "estimado" : "do convênio"}</p>
        </div>
      )}
      {[
        { label: "Objeto", value: data.object },
        { label: "Órgão / Concedente", value: data.organ || data.grantor },
        { label: "Modalidade", value: data.modality },
        { label: "Proponente", value: data.proponent },
        { label: "UF", value: data.uf },
        { label: "Status", value: data.status || data.situation },
        { label: "Data", value: data.date || data.startDate },
        { label: "Fim vigência", value: data.endDate },
      ].filter(f => f.value).map((f, i) => (
        <div key={i} className="flex justify-between items-start gap-3 py-2 border-b border-border/50 last:border-0">
          <span className="text-xs text-muted-foreground flex-shrink-0">{f.label}</span>
          <span className="text-xs font-medium text-foreground text-right">{f.value}</span>
        </div>
      ))}
      {data.url && (
        <a href={data.url} target="_blank" rel="noopener noreferrer"
           className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
          <ExternalLink className="w-4 h-4" />
          Ver no portal original
        </a>
      )}
    </div>
  );
}

// Detail genérico para indicadores e outros
function GenericDetail({ data, fields }: { data: any; fields?: Array<{ label: string; value: any }> }) {
  const displayFields = fields || Object.entries(data || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .map(([k, v]) => ({ label: k, value: String(v) }));

  return (
    <div className="space-y-2">
      {displayFields.filter(f => f.value).map((f, i) => (
        <div key={i} className="flex justify-between items-start gap-3 py-2 border-b border-border/50 last:border-0">
          <span className="text-xs text-muted-foreground flex-shrink-0">{f.label}</span>
          <span className="text-sm font-medium text-foreground text-right">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  paper: "Artigo científico",
  institution: "Instituição",
  country: "País",
  repo: "Repositório",
  contract: "Licitação / Contrato",
  convenio: "Convênio Federal",
  indicator: "Indicador",
  dataset: "Dataset",
};

const DataDetailSheet = ({ open, onClose, item }: DataDetailSheetProps) => {
  // Telemetria: apenas o TIPO do resultado aberto, nunca o conteúdo.
  useEffect(() => {
    if (open && item?.type) {
      track("result_opened", { result_type: item.type, depth: "detail" });
    }
  }, [open, item?.type]);

  if (!item) return null;

  const title = item.title || item.data?.title || item.data?.name || item.data?.code || TYPE_LABELS[item.type] || item.type;

  const renderContent = () => {
    switch (item.type) {
      case "paper":
        return <PaperDetail data={item.data} />;
      case "institution":
        return <InstitutionDetail data={item.data} />;
      case "country":
        return <CountryDetail data={item.data} />;
      case "repo":
        return <RepoDetail data={item.data} />;
      case "contract":
        return <ContractDetail data={item.data} type="contract" />;
      case "convenio":
        return <ContractDetail data={item.data} type="convenio" />;
      default:
        return <GenericDetail data={item.data} fields={item.fields} />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium uppercase tracking-wider">
              {TYPE_LABELS[item.type] || item.type}
            </span>
          </div>
          <SheetTitle className="text-base font-semibold text-foreground pr-6 leading-snug">
            {title}
          </SheetTitle>
          {item.subtitle && (
            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
          )}
        </SheetHeader>
        <div className="mt-5">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DataDetailSheet;

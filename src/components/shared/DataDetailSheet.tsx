import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, BookOpen, Building2, Calendar, Globe, Star, GitBranch, FileText, Landmark, Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Paper, PublicContract, GitHubRepo, Convenio, MacroIndicator, IPEADataSeries } from "@/hooks/useMotorSearch";

export type DetailItem =
  | { type: "paper"; data: Paper }
  | { type: "contract"; data: PublicContract }
  | { type: "repo"; data: GitHubRepo }
  | { type: "convenio"; data: Convenio }
  | { type: "institution"; data: { name: string; count: number; papers?: Paper[]; contracts?: PublicContract[] } }
  | { type: "country"; data: { code: string; count: number; flag?: string; papers?: Paper[] } }
  | { type: "indicator"; data: MacroIndicator }
  | { type: "series"; data: IPEADataSeries };

interface DataDetailSheetProps {
  open: boolean;
  onClose: () => void;
  item: DetailItem | null;
}

const typeConfig = {
  paper: { icon: BookOpen, label: "Paper Científico", color: "bg-primary/10 text-primary" },
  contract: { icon: Landmark, label: "Licitação Pública", color: "bg-accent/10 text-accent" },
  repo: { icon: GitBranch, label: "Repositório GitHub", color: "bg-primary/10 text-primary" },
  convenio: { icon: FileText, label: "Convênio Federal", color: "bg-accent/10 text-accent" },
  institution: { icon: Building2, label: "Instituição", color: "bg-primary/10 text-primary" },
  country: { icon: Globe, label: "País", color: "bg-primary/10 text-primary" },
  indicator: { icon: FileText, label: "Indicador Macro", color: "bg-accent/10 text-accent" },
  series: { icon: FileText, label: "Série IPEAData", color: "bg-primary/10 text-primary" },
};

export default function DataDetailSheet({ open, onClose, item }: DataDetailSheetProps) {
  if (!item) return null;

  const config = typeConfig[item.type];
  const Icon = config.icon;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle className="text-left text-sm">{config.label}</SheetTitle>
              <SheetDescription className="text-left text-xs">Dados detalhados</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {item.type === "paper" && <PaperDetail data={item.data} onCopy={copyText} />}
        {item.type === "contract" && <ContractDetail data={item.data} />}
        {item.type === "repo" && <RepoDetail data={item.data} />}
        {item.type === "convenio" && <ConvenioDetail data={item.data} />}
        {item.type === "institution" && <InstitutionDetail data={item.data} />}
        {item.type === "country" && <CountryDetail data={item.data} />}
        {item.type === "indicator" && <IndicatorDetail data={item.data} />}
        {item.type === "series" && <SeriesDetail data={item.data} />}
      </SheetContent>
    </Sheet>
  );
}

function PaperDetail({ data, onCopy }: { data: Paper; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground leading-snug mb-3">{data.title}</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className="text-[10px]">{data.year}</Badge>
          <Badge variant="outline" className="text-[10px]">{data.citations} citações</Badge>
          {data.is_open_access && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Open Access</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{data.journal}</p>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Users className="w-3.5 h-3.5" /> Autores ({data.authors.length})
        </h4>
        <div className="space-y-1.5">
          {data.authors.map((a, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs font-medium text-foreground">{a.name}</p>
                {a.institution && <p className="text-[10px] text-muted-foreground">{a.institution}</p>}
              </div>
              {a.country && (
                <Badge variant="outline" className="text-[9px]">{a.country}</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.concepts?.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Conceitos</h4>
            <div className="flex flex-wrap gap-1.5">
              {data.concepts.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{c}</Badge>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />
      <div className="flex gap-2">
        {data.url && (
          <Button size="sm" variant="outline" className="text-xs gap-1.5" asChild>
            <a href={data.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> Abrir paper
            </a>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={() => onCopy(data.title)}>
          <Copy className="w-3.5 h-3.5" /> Copiar título
        </Button>
      </div>
    </div>
  );
}

function ContractDetail({ data }: { data: PublicContract }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground leading-snug mb-3">{data.object || "Sem objeto"}</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-[10px]">{data.modality}</Badge>
          <Badge variant="outline" className="text-[10px]">{data.status}</Badge>
          {data.uf && <Badge variant="outline" className="text-[10px]">{data.uf}</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Valor</p>
          <p className="text-sm font-bold text-foreground">
            {data.value > 0 ? `R$ ${(data.value / 1e3).toFixed(0)} mil` : "Não informado"}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Data</p>
          <p className="text-sm font-medium text-foreground">{data.date || "—"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5" /> Órgão
        </h4>
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">{data.organ || "Não informado"}</p>
      </div>

      {data.url && (
        <Button size="sm" variant="outline" className="text-xs gap-1.5" asChild>
          <a href={data.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" /> Ver no PNCP
          </a>
        </Button>
      )}
    </div>
  );
}

function RepoDetail({ data }: { data: GitHubRepo }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">{data.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{data.description || "Sem descrição"}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <Star className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <p className="text-lg font-bold text-foreground">{data.stars}</p>
          <p className="text-[10px] text-muted-foreground">Stars</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <GitBranch className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-foreground">{data.forks}</p>
          <p className="text-[10px] text-muted-foreground">Forks</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <FileText className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">{data.language || "—"}</p>
          <p className="text-[10px] text-muted-foreground">Linguagem</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Atualizado: {data.updated}</p>
      <Button size="sm" variant="outline" className="text-xs gap-1.5" asChild>
        <a href={data.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-3.5 h-3.5" /> Abrir no GitHub
        </a>
      </Button>
    </div>
  );
}

function ConvenioDetail({ data }: { data: Convenio }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground leading-snug mb-3">{data.object || "Sem objeto"}</h3>
        <Badge variant={data.situation === "Em execução" ? "default" : "outline"} className="text-[10px]">{data.situation}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Valor</p>
          <p className="text-sm font-bold text-accent">R$ {(data.value / 1e3).toFixed(0)} mil</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Concedente</p>
          <p className="text-xs font-medium text-foreground">{data.grantor}</p>
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Proponente</h4>
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">{data.proponent}</p>
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Início: {data.startDate}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Fim: {data.endDate}</span>
      </div>
    </div>
  );
}

function InstitutionDetail({ data }: { data: { name: string; count: number; papers?: Paper[]; contracts?: PublicContract[] } }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">{data.name}</h3>
        <p className="text-2xl font-bold text-primary">{data.count} <span className="text-xs font-normal text-muted-foreground">papers</span></p>
      </div>
      {data.papers && data.papers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Papers desta instituição</h4>
          {data.papers.slice(0, 5).map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
              className="block py-2 px-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
              <p className="text-xs font-medium text-foreground line-clamp-1">{p.title}</p>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{p.year}</span>
                <span className="text-[10px] font-semibold text-primary">{p.citations} cit.</span>
              </div>
            </a>
          ))}
        </div>
      )}
      {data.contracts && data.contracts.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Contratos relacionados</h4>
            {data.contracts.slice(0, 3).map((c, i) => (
              <div key={i} className="py-2 px-3 bg-accent/5 rounded-lg">
                <p className="text-xs font-medium text-foreground line-clamp-1">{c.object}</p>
                <span className="text-[10px] text-muted-foreground">{c.organ}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CountryDetail({ data }: { data: { code: string; count: number; flag?: string; papers?: Paper[] } }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4 text-center">
        <p className="text-4xl mb-2">{data.flag || "🌍"}</p>
        <h3 className="text-lg font-bold text-foreground">{data.code}</h3>
        <p className="text-2xl font-bold text-primary mt-1">{data.count.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">papers</span></p>
      </div>
      {data.papers && data.papers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Papers deste país</h4>
          {data.papers.slice(0, 5).map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
              className="block py-2 px-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
              <p className="text-xs font-medium text-foreground line-clamp-1">{p.title}</p>
              <span className="text-[10px] text-primary">{p.citations} citações</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function IndicatorDetail({ data }: { data: MacroIndicator }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">{data.name}</h3>
        <p className="text-3xl font-bold text-primary">
          {data.value?.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
          <span className="text-sm font-normal text-muted-foreground ml-1">{data.unit}</span>
        </p>
        {data.date && <p className="text-[10px] text-muted-foreground mt-1">Referência: {data.date}</p>}
      </div>
      {data.variation !== null && (
        <div className={`p-3 rounded-lg ${data.variation > 0 ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
          <p className="text-xs font-medium text-foreground">
            Variação: <span className={data.variation > 0 ? "text-emerald-600" : "text-red-500"}>
              {data.variation > 0 ? "+" : ""}{data.variation.toFixed(2)}%
            </span>
          </p>
        </div>
      )}
      {data.history?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Histórico recente</h4>
          <div className="space-y-1">
            {data.history.slice(-6).map((h, i) => (
              <div key={i} className="flex justify-between py-1 px-3 bg-muted/30 rounded text-xs">
                <span className="text-muted-foreground">{h.date}</span>
                <span className="font-medium text-foreground">{h.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeriesDetail({ data }: { data: IPEADataSeries }) {
  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-1">{data.name}</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary" className="text-[10px]">{data.theme}</Badge>
          <Badge variant="outline" className="text-[10px]">{data.source}</Badge>
          {data.frequency && <Badge variant="outline" className="text-[10px]">{data.frequency}</Badge>}
        </div>
        {data.lastValue !== null && (
          <p className="text-2xl font-bold text-primary mt-3">{data.lastValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground font-mono">Código: {data.code}</p>
      {data.values?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Valores recentes</h4>
          <div className="space-y-1">
            {data.values.slice(-8).map((v, i) => (
              <div key={i} className="flex justify-between py-1 px-3 bg-muted/30 rounded text-xs">
                <span className="text-muted-foreground">{v.date}</span>
                <span className="font-medium text-foreground">{v.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

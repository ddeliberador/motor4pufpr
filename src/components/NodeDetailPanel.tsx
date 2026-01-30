import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Microscope, FileText, Landmark, Factory, Globe, Building2, MapPin, Calendar, ExternalLink, Users, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface NodeDetailData {
  type: 'scientific' | 'technological' | 'institutional' | 'company' | 'international' | 'center';
  data: {
    // Scientific
    name?: string;
    institution?: string;
    state?: string;
    area?: string;
    international?: string;
    // Technological
    title?: string;
    applicant?: string;
    year?: string;
    code?: string;
    // Institutional
    type?: string;
    status?: string;
    value?: string;
    // Company
    country?: string;
    sector?: string;
    companyType?: string;
    // International
    institutions?: number;
    patents?: number;
    relevance?: string;
    // Center (query)
    query?: string;
  };
}

interface NodeDetailPanelProps {
  open: boolean;
  onClose: () => void;
  nodeData: NodeDetailData | null;
}

const typeConfig = {
  center: { icon: TrendingUp, label: "Objeto Tecnológico", color: "bg-primary text-primary-foreground" },
  scientific: { icon: Microscope, label: "Grupo de Pesquisa", color: "bg-primary/10 text-primary" },
  technological: { icon: FileText, label: "Patente", color: "bg-primary/10 text-primary" },
  institutional: { icon: Landmark, label: "Instrumento Público", color: "bg-accent/10 text-accent" },
  company: { icon: Factory, label: "Empresa", color: "bg-primary/10 text-primary" },
  international: { icon: Globe, label: "Incidência Internacional", color: "bg-primary/10 text-primary" },
};

export default function NodeDetailPanel({ open, onClose, nodeData }: NodeDetailPanelProps) {
  console.log('NodeDetailPanel renderizado:', { open, hasNodeData: !!nodeData, nodeType: nodeData?.type });
  
  if (!nodeData) {
    console.log('NodeDetailPanel: nodeData é null, retornando null');
    return null;
  }

  const config = typeConfig[nodeData.type];
  if (!config) {
    console.error('NodeDetailPanel: tipo não encontrado:', nodeData.type);
    return null;
  }
  const Icon = config.icon;

  const renderContent = () => {
    const { type, data } = nodeData;

    switch (type) {
      case 'center':
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-6">
              <p className="text-sm text-muted-foreground mb-2">Objeto de pesquisa central</p>
              <h3 className="text-2xl font-bold text-foreground font-serif">{data.query}</h3>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Sobre o Motor 4P</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O Motor 4P traduz objetos tecnológicos em redes de incidência, mapeando grupos de pesquisa, 
                patentes, instrumentos públicos, empresas e presença internacional relacionados ao tema.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Clique nos nós do grafo para explorar cada elemento da rede de tradução tecnológica.
              </p>
            </div>
          </div>
        );

      case 'scientific':
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">{data.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{data.institution}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{data.state}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Área de Atuação</h4>
              <Badge variant="secondary" className="text-xs">{data.area}</Badge>
            </div>

            {data.international && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" />
                    <h4 className="font-semibold text-foreground text-sm">Colaboração Internacional</h4>
                  </div>
                  <p className="text-sm text-muted-foreground bg-accent/5 border border-accent/20 rounded-lg p-4">
                    {data.international}
                  </p>
                </div>
              </>
            )}

            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Métricas Estimadas</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">12-18</p>
                  <p className="text-xs text-muted-foreground">Pesquisadores</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">45+</p>
                  <p className="text-xs text-muted-foreground">Publicações/ano</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">3-5</p>
                  <p className="text-xs text-muted-foreground">Patentes</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">A</p>
                  <p className="text-xs text-muted-foreground">Conceito CNPq</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a 
                href={`https://dgp.cnpq.br/dgp/faces/consulta/grupos/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Consultar no DGP/CNPq
              </a>
            </div>
          </div>
        );

      case 'technological':
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">{data.title}</h3>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Depositada em {data.year}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">{data.code}</Badge>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Titular</h4>
              <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{data.applicant}</span>
              </div>
            </div>

            {data.international && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" />
                    <h4 className="font-semibold text-foreground text-sm">Projeção Internacional</h4>
                  </div>
                  <p className="text-sm text-muted-foreground bg-accent/5 border border-accent/20 rounded-lg p-4">
                    {data.international}
                  </p>
                </div>
              </>
            )}

            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Status da Patente</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Fase</p>
                  <p className="text-sm font-medium text-foreground">Em análise</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">TRL Estimado</p>
                  <p className="text-sm font-medium text-foreground">4-6</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a 
                href={`https://busca.inpi.gov.br/pePI/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Consultar no INPI
              </a>
            </div>
          </div>
        );

      case 'institutional':
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">{data.name}</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{data.type}</Badge>
                <Badge variant={data.status === 'Aberto' || data.status === 'Ativo' || data.status === 'Contínuo' ? 'default' : 'outline'}>
                  {data.status}
                </Badge>
              </div>
            </div>

            {data.value && (
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground text-sm">Valor Disponível</h4>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{data.value}</p>
                </div>
              </div>
            )}

            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Características</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Modalidade</span>
                  <span className="text-sm font-medium text-foreground">{data.type}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Elegibilidade</span>
                  <span className="text-sm font-medium text-foreground">ICTs, Empresas</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Contrapartida</span>
                  <span className="text-sm font-medium text-foreground">Variável</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <a 
                href="https://www.finep.gov.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Portal Finep
              </a>
              <a 
                href="https://www.bndes.gov.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Portal BNDES
              </a>
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">{data.name}</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{data.companyType}</Badge>
                <Badge variant="outline">{data.country}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Setor de Atuação</h4>
              <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4">
                <Factory className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{data.sector}</span>
              </div>
            </div>

            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Perfil Estimado</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {data.companyType === 'Multinacional' ? '10k+' : data.companyType === 'Grande Empresa' ? '5k+' : '50-500'}
                  </p>
                  <p className="text-xs text-muted-foreground">Funcionários</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {data.companyType === 'Multinacional' ? 'Global' : data.country === 'Brasil' ? 'Nacional' : 'Regional'}
                  </p>
                  <p className="text-xs text-muted-foreground">Abrangência</p>
                </div>
              </div>
            </div>

            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Relevância para Tradução</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Empresa com potencial de absorção de tecnologia desenvolvida no país. 
                {data.country === 'Brasil' 
                  ? ' Como empresa nacional, representa oportunidade de transferência direta de tecnologia.'
                  : ' Como empresa internacional, pode representar canal de exportação de tecnologia ou dependência externa.'
                }
              </p>
            </div>
          </div>
        );

      case 'international':
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">{data.name || data.country}</h3>
              <Badge variant="secondary">{data.relevance}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{data.institutions}</p>
                <p className="text-xs text-muted-foreground">Instituições</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <Award className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{data.patents?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Patentes</p>
              </div>
            </div>

            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Análise de Dependência</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                País com forte presença no desenvolvimento da tecnologia. 
                {data.patents && data.patents > 1000 
                  ? ' Alto volume de patentes indica liderança tecnológica e potencial fonte de dependência.'
                  : ' Presença moderada no cenário tecnológico global.'
                }
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm">Oportunidades</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>Parcerias bilaterais de P&D</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>Licenciamento de tecnologia</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>Intercâmbio de pesquisadores</span>
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle className="text-left">{config.label}</SheetTitle>
              <SheetDescription className="text-left">Detalhes do nó selecionado</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}

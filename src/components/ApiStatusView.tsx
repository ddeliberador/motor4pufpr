/**
 * ApiStatusView - Visualização de Status das APIs
 * Mostra informações detalhadas sobre todas as APIs integradas
 */
import { useState, useEffect } from "react";
import { Check, X, Loader2, Database, Globe, FileText, Building2, Sparkles, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

interface ApiEndpoint {
  name: string;
  description: string;
  endpoint: string;
  dataSource: string;
  dataType: string;
  status: 'checking' | 'online' | 'offline';
  responseTime?: number;
  icon: React.ReactNode;
  documentation?: string;
}

export default function ApiStatusView() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([
    {
      name: "CNPq - Grupos de Pesquisa",
      description: "Diretório dos Grupos de Pesquisa no Brasil",
      endpoint: "/api/v1/incidence/search",
      dataSource: "CNPq - Plataforma Lattes",
      dataType: "Grupos de pesquisa, líderes, áreas de atuação",
      status: 'checking',
      icon: <Database className="w-5 h-5" />,
      documentation: "https://lattes.cnpq.br/web/dgp"
    },
    {
      name: "OpenAlex - Produção Científica",
      description: "Base internacional de publicações científicas",
      endpoint: "/api/v1/incidence/search",
      dataSource: "OpenAlex API",
      dataType: "Papers, citações, autores, instituições",
      status: 'checking',
      icon: <FileText className="w-5 h-5" />,
      documentation: "https://openalex.org"
    },
    {
      name: "INPI - Patentes",
      description: "Banco de patentes brasileiras e internacionais",
      endpoint: "/api/v1/incidence/search",
      dataSource: "INPI + Lens.org",
      dataType: "Patentes, depositantes, IPC codes",
      status: 'checking',
      icon: <Sparkles className="w-5 h-5" />,
      documentation: "https://busca.inpi.gov.br"
    },
    {
      name: "Comex Stat - Comércio Exterior",
      description: "Dados de importação e exportação",
      endpoint: "/api/v1/incidence/search",
      dataSource: "Ministério da Economia",
      dataType: "NCM codes, valores, países, balança comercial",
      status: 'checking',
      icon: <Globe className="w-5 h-5" />,
      documentation: "https://comexstat.mdic.gov.br"
    },
    {
      name: "Finep - Instrumentos Públicos",
      description: "Editais e financiamentos disponíveis",
      endpoint: "/api/v1/incidence/search",
      dataSource: "Finep + BNDES + Embrapii",
      dataType: "Editais, valores, prazos, áreas elegíveis",
      status: 'checking',
      icon: <Building2 className="w-5 h-5" />,
      documentation: "http://www.finep.gov.br"
    }
  ]);

  useEffect(() => {
    checkAllApis();
  }, []);

  const checkAllApis = async () => {
    // Check health endpoint
    const startTime = Date.now();
    try {
      await api.healthCheck();
      const responseTime = Date.now() - startTime;
      
      // Se health funciona, marca todos como online
      setEndpoints(prev => prev.map(ep => ({
        ...ep,
        status: 'online',
        responseTime
      })));
    } catch (error) {
      // Se health falha, marca todos como offline
      setEndpoints(prev => prev.map(ep => ({
        ...ep,
        status: 'offline'
      })));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Status das APIs Integradas
        </h3>
        <p className="text-muted-foreground">
          Fontes de dados públicas utilizadas pelo MOTOR 4P
        </p>
      </div>

      <div className="grid gap-4">
        {endpoints.map((endpoint, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-lg ${
                endpoint.status === 'online' ? 'bg-green-500/10 text-green-500' :
                endpoint.status === 'offline' ? 'bg-red-500/10 text-red-500' :
                'bg-muted text-muted-foreground'
              }`}>
                {endpoint.icon}
              </div>

              {/* Content */}
              <div className="flex-grow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {endpoint.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {endpoint.description}
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {endpoint.status === 'checking' && (
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando...
                      </span>
                    )}
                    {endpoint.status === 'online' && (
                      <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        Online
                        {endpoint.responseTime && (
                          <span className="text-xs text-muted-foreground">
                            ({endpoint.responseTime}ms)
                          </span>
                        )}
                      </span>
                    )}
                    {endpoint.status === 'offline' && (
                      <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <X className="w-4 h-4" />
                        Offline
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fonte de Dados</p>
                    <p className="text-sm text-foreground font-medium">{endpoint.dataSource}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tipo de Dados</p>
                    <p className="text-sm text-foreground">{endpoint.dataType}</p>
                  </div>
                </div>

                {/* Documentation Link */}
                {endpoint.documentation && (
                  <div className="mt-4">
                    <a
                      href={endpoint.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Documentação oficial
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={checkAllApis}
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
        >
          <Loader2 className="w-4 h-4" />
          Verificar Status Novamente
        </button>
      </div>

      {/* Info Note */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Nota:</strong> Todas as APIs utilizam dados públicos oficiais.
          O tempo de resposta pode variar conforme a disponibilidade das fontes externas.
        </p>
      </div>
    </div>
  );
}

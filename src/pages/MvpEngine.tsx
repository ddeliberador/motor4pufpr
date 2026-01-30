import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Microscope, FileText, Landmark, Globe, Factory, Download, Network, TrendingUp, AlertTriangle, Target, Link2, Info, CheckCircle, Database, Users, FlaskConical, Briefcase, ChevronRight, Cpu, Building2, Activity } from "lucide-react";
import { useIncidenceSearch } from "@/hooks/useIncidenceSearch";
import ApiStatusIndicator from "@/components/ApiStatusIndicator";
import ApiStatusView from "@/components/ApiStatusView";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UfprLogo from "@/components/UfprLogo";
import { generateNewspaperPDF } from "@/lib/generatePdf";
import NetworkGraph from "@/components/NetworkGraph";
import NodeDetailPanel, { type NodeDetailData } from "@/components/NodeDetailPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Extended mock data with companies and international incidences
// Indicator types
interface Indicators {
  c2t: { value: number; label: string; description: string };
  gt: { value: number; label: string; description: string };
  p2c: { value: number; label: string; description: string };
  cd: { value: number; label: string; description: string };
}

const MvpEngine = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeDetailData | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    scientific: false,
    technological: false,
    institutional: false,
    companies: false,
    international: false,
  });

  // Hook para busca com API real
  const {
    search: apiSearch,
    results: apiResults,
    isLoading: isSearching,
    isUsingMock,
    backendAvailable,
  } = useIncidenceSearch();
  
  // Transforma resultados da API para o formato local
  const searchResults = apiResults ? {
    query: apiResults.query,
    stats: apiResults.stats,
    scientific: apiResults.scientific.research_groups.map(g => ({
      name: g.name,
      institution: g.institution_acronym || g.institution,
      state: g.state,
      area: g.area,
      international: g.international_collaboration,
    })),
    technological: apiResults.technological.patents.slice(0, 5).map(p => ({
      title: p.title,
      applicant: p.applicants[0] || 'N/A',
      year: p.filing_date?.split('-')[0] || 'N/A',
      code: p.id,
      international: p.cited_by_count > 0 ? `Citada ${p.cited_by_count}x` : undefined,
    })),
    institutional: apiResults.institutional.instruments.map(i => ({
      name: i.name,
      type: i.type,
      status: i.status,
      value: i.total_value ? `R$ ${(i.total_value / 1000000).toFixed(0)}M` : undefined,
    })),
    companies: [] as { name: string; country: string; sector: string; type: string }[],
    international: apiResults.international.slice(0, 6).map(i => ({
      country: `${i.flag_emoji} ${i.country.replace('https://openalex.org/countries/', '')}`,
      institutions: i.institutions_count,
      patents: i.patents_count,
      relevance: i.global_relevance,
    })),
    indicators: {
      c2t: { value: apiResults.indicators.c2t.value, label: "C2T", description: apiResults.indicators.c2t.description },
      gt: { value: apiResults.indicators.gt.value, label: "GT", description: apiResults.indicators.gt.description },
      p2c: { value: apiResults.indicators.p2c.value, label: "P2C", description: apiResults.indicators.p2c.description },
      cd: { value: apiResults.indicators.cd.value, label: "CD", description: apiResults.indicators.cd.description },
    },
    // Metadata from API
    _processingTimeMs: apiResults.processing_time_ms,
    _dataSources: apiResults.data_sources,
  } : null;

  const handleNodeSelect = useCallback((nodeData: { type: string; data: Record<string, unknown> } | null) => {
    if (nodeData) {
      setSelectedNode(nodeData as NodeDetailData);
      setDetailPanelOpen(true);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setHasSearched(true);
    
    // Usa a API real através do hook
    await apiSearch(searchQuery);
  };

  const handleDownloadPDF = () => {
    if (searchResults) {
      generateNewspaperPDF(searchResults);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex-1 flex pt-16">
        {/* Sidebar */}
        <aside className="w-80 bg-card border-r border-border overflow-y-auto flex-shrink-0">
          <div className="p-6 space-y-6">
            {/* Logo and Title */}
            <div className="text-center pb-6 border-b border-border">
              <UfprLogo className="w-16 h-16 mx-auto mb-3 opacity-90" />
              <h1 className="text-2xl font-bold text-foreground mb-1">
                MVP Engine
              </h1>
              <p className="text-sm text-muted-foreground">
                Primeira Camada da Tradução
              </p>
            </div>

            {/* Back Link */}
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Conceito
            </Link>

            {/* Search Box */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  Buscar Objeto Tecnológico
                </label>
                <ApiStatusIndicator 
                  isUsingMock={isUsingMock}
                  backendAvailable={backendAvailable}
                />
              </div>
              
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite aqui..."
                    className="w-full pl-10 pr-3 py-3 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="w-full mt-3 bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? "Processando..." : "Buscar"}
                </button>
              </form>
            </div>

            {/* API Status Section */}
            <div className="space-y-3">
              <button
                onClick={() => setShowApiStatus(!showApiStatus)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Status das APIs
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showApiStatus ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* Info */}
            <div className="pt-6 border-t border-border text-xs text-muted-foreground">
              <p className="mb-2">
                <strong className="text-foreground">Protótipo auditável</strong>
              </p>
              <p>
                Baseado em dados públicos reais: CNPq, INPI, Finep, OpenAlex, Comex Stat
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {showApiStatus && (
            <div className="bg-card border-b border-border p-6">
              <div className="max-w-6xl mx-auto">
                <ApiStatusView />
              </div>
            </div>
          )}

          {/* Results Container */}
          <div className="max-w-6xl mx-auto p-6">
            {/* Search Results */}
            {hasSearched && (
              <div className="space-y-8">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative w-24 h-24 mb-8">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                      <div className="absolute inset-4 border-4 border-transparent border-t-accent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    </div>
                    <p className="text-xl font-serif text-foreground mb-2">Traduzindo objeto tecnológico...</p>
                    <p className="text-muted-foreground">Consultando CNPq, INPI, Finep e bases internacionais</p>
                  </div>
                ) : searchResults ? (
                  <div className="space-y-8 animate-fade-in">
                    {/* Results Header */}
                    <div className="bg-card border border-border rounded-xl p-6">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Resultados para</p>
                      <h2 className="text-3xl font-bold text-foreground font-serif mb-4">
                        "{searchResults.query}"
                      </h2>
                      
                      {/* Stats Overview - 5 columns now */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-muted rounded-lg p-4">
                          <Microscope className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="text-2xl font-bold mb-1 text-foreground">{searchResults.stats.groups}</p>
                          <p className="text-xs text-muted-foreground">Grupos de Pesquisa</p>
                        </div>
                    <div className="bg-card border border-border rounded-2xl p-5 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                      <FileText className="w-7 h-7 mx-auto mb-2 text-primary" />
                      <p className="text-3xl md:text-4xl font-bold mb-1 text-foreground">{searchResults.stats.patents}</p>
                      <p className="text-xs text-muted-foreground">Patentes</p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <FlaskConical className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="text-2xl font-bold mb-1 text-foreground">{searchResults.stats.patents}</p>
                          <p className="text-xs text-muted-foreground">Patentes</p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <Landmark className="w-6 h-6 mx-auto mb-2 text-accent" />
                          <p className="text-2xl font-bold mb-1 text-foreground">{searchResults.stats.instruments}</p>
                          <p className="text-xs text-muted-foreground">Instrumentos</p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <Factory className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="text-2xl font-bold mb-1 text-foreground">{searchResults.stats.companies}</p>
                          <p className="text-xs text-muted-foreground">Empresas</p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <Globe className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="text-2xl font-bold mb-1 text-foreground">{searchResults.stats.international}</p>
                          <p className="text-xs text-muted-foreground">Países</p>
                        </div>
                      </div>
                    </div>

                    {/* New Indicators Section */}
                    {searchResults.indicators && (
                      <div className="bg-card border border-border rounded-xl p-6 mb-8">
                        <div className="mb-6">
                          <h4 className="text-lg font-bold text-foreground mb-2">Indicadores de Tradução Tecnológica</h4>
                          <p className="text-sm text-muted-foreground">
                            Métricas propostas para avaliar a maturidade, gargalos e dependências na tradução de conhecimento científico em capacidade produtiva.
                          </p>
                        </div>
                        
                        {/* Conceptual Explanation */}
                        <div className="bg-accent/5 border border-accent/20 rounded-lg p-5 mb-6">
                          <h5 className="font-semibold text-foreground mb-3 text-sm">Conceituação dos Indicadores</h5>
                          <div className="grid md:grid-cols-2 gap-3 text-xs">
                            <div className="flex gap-2">
                              <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">C2T — Maturidade Ciência → Tecnologia</p>
                                <p className="text-muted-foreground mt-0.5">
                                  Mede a conversão de produção científica (artigos, grupos de pesquisa) em outputs tecnológicos (patentes, protótipos). 
                                  Valores altos indicam forte transferência de conhecimento para aplicações práticas.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">GT — Gargalo de Tradução</p>
                                <p className="text-muted-foreground mt-0.5">
                                  Identifica obstáculos na cadeia de tradução: escala produtiva, integração indústria-academia, 
                                  regulação ou financiamento. Valores altos indicam gargalos severos que impedem a tradução.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                <Target className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">P2C — Aderência Política → Capacidade</p>
                                <p className="text-muted-foreground mt-0.5">
                                  Avalia o alinhamento entre instrumentos públicos disponíveis (Finep, BNDES, Embrapii) e a 
                                  capacidade instalada no país. Valores altos indicam políticas bem direcionadas.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <Link2 className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">CD — Concentração e Dependência</p>
                                <p className="text-muted-foreground mt-0.5">
                                  Mede a dependência de insumos, tecnologia e conhecimento de fontes externas. 
                                  Valores altos indicam vulnerabilidade estratégica e necessidade de internalização.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* C2T - Maturidade Ciência → Tecnologia */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                            <div className="bg-card border border-border rounded-2xl p-5 opacity-0 animate-fade-in cursor-help hover:border-cyan-300 transition-colors" style={{ animationDelay: "0.6s" }}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                  <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-grow">
                                  <p className="text-xs text-muted-foreground">Maturidade</p>
                                  <p className="font-bold text-foreground">C2T</p>
                                </div>
                                <Info className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                              <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-3">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${searchResults.indicators.c2t.value}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-foreground">{searchResults.indicators.c2t.value}%</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  searchResults.indicators.c2t.value >= 70 ? 'bg-green-100 text-green-700' :
                                  searchResults.indicators.c2t.value >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {searchResults.indicators.c2t.value >= 70 ? 'Alto' : searchResults.indicators.c2t.value >= 50 ? 'Médio' : 'Baixo'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{searchResults.indicators.c2t.description}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs p-4">
                            <p className="font-semibold text-sm mb-2">Metodologia C2T</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Fórmula:</strong> C2T = (Patentes / Grupos de Pesquisa) × Fator de Citação
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Variáveis:</strong> Nº de patentes depositadas, Nº de grupos ativos no DGP/CNPq, 
                              citações internacionais das patentes.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Interpretação:</strong> Valores &gt;70% indicam forte conversão de ciência em tecnologia aplicada.
                            </p>
                          </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* GT - Gargalo de Tradução */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                            <div className="bg-card border border-border rounded-2xl p-5 opacity-0 animate-fade-in cursor-help hover:border-orange-300 transition-colors" style={{ animationDelay: "0.7s" }}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                                  <AlertTriangle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-grow">
                                  <p className="text-xs text-muted-foreground">Gargalo</p>
                                  <p className="font-bold text-foreground">GT</p>
                                </div>
                                <Info className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                              <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-3">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${searchResults.indicators.gt.value}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-foreground">{searchResults.indicators.gt.value}%</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  searchResults.indicators.gt.value <= 30 ? 'bg-green-100 text-green-700' :
                                  searchResults.indicators.gt.value <= 50 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {searchResults.indicators.gt.value <= 30 ? 'Baixo' : searchResults.indicators.gt.value <= 50 ? 'Médio' : 'Alto'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{searchResults.indicators.gt.description}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs p-4">
                            <p className="font-semibold text-sm mb-2">Metodologia GT</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Fórmula:</strong> GT = 100 - [(Licenças Ativas / Patentes) × (Empresas / Grupos)]
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Variáveis:</strong> Nº de licenciamentos, patentes sem exploração comercial, 
                              densidade de empresas por área de pesquisa.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Interpretação:</strong> Valores &gt;50% indicam gargalos severos na tradução tecnológica.
                            </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* P2C - Aderência Política → Capacidade */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                            <div className="bg-card border border-border rounded-2xl p-5 opacity-0 animate-fade-in cursor-help hover:border-emerald-300 transition-colors" style={{ animationDelay: "0.8s" }}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                  <Target className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-grow">
                                  <p className="text-xs text-muted-foreground">Aderência</p>
                                  <p className="font-bold text-foreground">P2C</p>
                                </div>
                                <Info className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                              <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-3">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${searchResults.indicators.p2c.value}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-foreground">{searchResults.indicators.p2c.value}%</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  searchResults.indicators.p2c.value >= 70 ? 'bg-green-100 text-green-700' :
                                  searchResults.indicators.p2c.value >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {searchResults.indicators.p2c.value >= 70 ? 'Alto' : searchResults.indicators.p2c.value >= 50 ? 'Médio' : 'Baixo'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{searchResults.indicators.p2c.description}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs p-4">
                            <p className="font-semibold text-sm mb-2">Metodologia P2C</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Fórmula:</strong> P2C = Σ(Instrumentos Aderentes × Peso) / Total de Instrumentos
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Variáveis:</strong> Nº de instrumentos (Finep, BNDES, Embrapii) com editais ativos 
                              para o objeto, compatibilidade de TRL/MRL.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Interpretação:</strong> Valores &gt;70% indicam políticas bem alinhadas com capacidades existentes.
                            </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* CD - Concentração e Dependência */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                            <div className="bg-card border border-border rounded-2xl p-5 opacity-0 animate-fade-in cursor-help hover:border-violet-300 transition-colors" style={{ animationDelay: "0.9s" }}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                  <Link2 className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-grow">
                                  <p className="text-xs text-muted-foreground">Dependência</p>
                                  <p className="font-bold text-foreground">CD</p>
                                </div>
                                <Info className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                              <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-3">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-1000"
                                  style={{ width: `${searchResults.indicators.cd.value}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-foreground">{searchResults.indicators.cd.value}%</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  searchResults.indicators.cd.value <= 40 ? 'bg-green-100 text-green-700' :
                                  searchResults.indicators.cd.value <= 60 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {searchResults.indicators.cd.value <= 40 ? 'Baixa' : searchResults.indicators.cd.value <= 60 ? 'Média' : 'Alta'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{searchResults.indicators.cd.description}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs p-4">
                            <p className="font-semibold text-sm mb-2">Metodologia CD</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Fórmula:</strong> CD = (Patentes Estrangeiras / Total) + (Importações Críticas / Consumo)
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              <strong>Variáveis:</strong> % de patentes de titulares estrangeiros, dependência de insumos 
                              importados, concentração de fornecedores por país.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Interpretação:</strong> Valores &gt;60% indicam alta vulnerabilidade e risco estratégico.
                            </p>
                          </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    )}

                {/* Network Graph Visualization */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                      <Network className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Grafo de Incidência
                      </h3>
                      <p className="text-muted-foreground">Visualização interativa das conexões</p>
                    </div>
                  </div>
                  <NetworkGraph searchResults={searchResults} onNodeSelect={handleNodeSelect} />
                </div>

                {/* Flow Visualization */}
                <div className="relative py-8">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                </div>

                {/* Scientific Incidence */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Microscope className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Científica
                      </h3>
                      <p className="text-muted-foreground">Diretório de Grupos de Pesquisa — CNPq</p>
                    </div>
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, scientific: !prev.scientific }))}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {expandedSections.scientific ? 'Recolher' : `Ver ${searchResults.stats.groups} Grupos`}
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(expandedSections.scientific ? searchResults.scientific : searchResults.scientific.slice(0, 6)).map((group, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                        onClick={() => handleNodeSelect({ type: 'scientific', data: group })}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-xs font-medium px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                            {group.state}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                          {group.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">{group.institution}</p>
                        <p className="text-xs text-muted-foreground/70 mb-2">{group.area}</p>
                        {group.international && (
                          <div className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                            <Globe className="w-3 h-3" />
                            <span>{group.international}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {!expandedSections.scientific && searchResults.scientific.length > 6 && (
                      <div className="bg-muted/50 border border-border border-dashed rounded-xl p-5 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground font-medium">
                          + {searchResults.scientific.length - 6} grupos
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                  </div>
                </div>

                {/* Technological Incidence */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Cpu className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Tecnológica
                      </h3>
                      <p className="text-muted-foreground">Base de Patentes — INPI</p>
                    </div>
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, technological: !prev.technological }))}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {expandedSections.technological ? 'Recolher' : `Ver ${searchResults.stats.patents} Patentes`}
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(expandedSections.technological ? searchResults.technological : searchResults.technological.slice(0, 5)).map((patent, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${1.2 + index * 0.1}s` }}
                        onClick={() => handleNodeSelect({ type: 'technological', data: patent })}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FlaskConical className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {patent.title}
                              </h4>
                              <span className="text-xs font-mono bg-secondary text-secondary-foreground px-2 py-1 rounded flex-shrink-0">
                                {patent.year}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{patent.applicant}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-muted-foreground/70 font-mono">{patent.code}</p>
                              {patent.international && (
                                <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                                  <Globe className="w-3 h-3" />
                                  {patent.international}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!expandedSections.technological && searchResults.technological.length > 5 && (
                      <div className="bg-muted/50 border border-border border-dashed rounded-xl p-5 text-center">
                        <p className="text-sm text-muted-foreground font-medium">
                          + {searchResults.technological.length - 5} patentes relacionadas
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                  </div>
                </div>

                {/* Companies Section - NEW */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Factory className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Empresas no Setor
                      </h3>
                      <p className="text-muted-foreground">Empresas brasileiras e internacionais</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Brazilian Companies */}
                    <div>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <span className="text-2xl">🇧🇷</span> Brasil
                      </h4>
                      <div className="space-y-3">
                        {searchResults.companies.filter(c => c.country === "Brasil").map((company, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all opacity-0 animate-fade-in cursor-pointer"
                            style={{ animationDelay: `${1.8 + index * 0.1}s` }}
                            onClick={() => handleNodeSelect({ type: 'company', data: { ...company, companyType: company.type } })}
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-grow">
                              <h5 className="font-medium text-foreground">{company.name}</h5>
                              <p className="text-xs text-muted-foreground">{company.sector} • {company.type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* International Companies */}
                    <div>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <span className="text-2xl">🌍</span> Internacional
                      </h4>
                      <div className="space-y-3">
                        {searchResults.companies.filter(c => c.country !== "Brasil").slice(0, 5).map((company, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all opacity-0 animate-fade-in cursor-pointer"
                            style={{ animationDelay: `${2.2 + index * 0.1}s` }}
                            onClick={() => handleNodeSelect({ type: 'company', data: { ...company, companyType: company.type } })}
                          >
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                              <Globe className="w-5 h-5 text-accent" />
                            </div>
                            <div className="flex-grow">
                              <h5 className="font-medium text-foreground">{company.name}</h5>
                              <p className="text-xs text-muted-foreground">{company.country} • {company.sector}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                  </div>
                </div>

                {/* International Incidence - NEW */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
                      <Globe className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Internacional
                      </h3>
                      <p className="text-muted-foreground">Mapeamento global do objeto tecnológico</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.international.map((item, index) => (
                      <div 
                        key={index}
                        className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all opacity-0 animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${2.8 + index * 0.1}s` }}
                        onClick={() => handleNodeSelect({ type: 'international', data: { ...item, name: item.country } })}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-medium">{item.country}</span>
                          <span className="text-xs font-medium px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
                            {item.relevance}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-foreground">{item.institutions}</p>
                            <p className="text-xs text-muted-foreground">Instituições</p>
                          </div>
                          <div className="text-center p-2 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-bold text-foreground">{item.patents}</p>
                            <p className="text-xs text-muted-foreground">Patentes</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                  </div>
                </div>

                {/* Institutional Incidence */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Institucional
                      </h3>
                      <p className="text-muted-foreground">Instrumentos Públicos — Finep, BNDES, Embrapii</p>
                    </div>
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, institutional: !prev.institutional }))}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {expandedSections.institutional ? 'Recolher' : `Ver ${searchResults.stats.instruments} Instrumentos`}
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    {(expandedSections.institutional ? searchResults.institutional : searchResults.institutional.slice(0, 6)).map((inst, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-6 hover:border-accent/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${3.4 + index * 0.1}s` }}
                        onClick={() => handleNodeSelect({ type: 'institutional', data: inst })}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-accent" />
                          </div>
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                            inst.status === 'Aberto' 
                              ? 'bg-accent/10 text-accent' 
                              : inst.status === 'Contínuo'
                              ? 'bg-primary/10 text-primary'
                              : inst.status === 'Ativo'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {inst.status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                          {inst.name}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{inst.type}</span>
                          {inst.value && (
                            <span className="text-sm font-semibold text-accent">{inst.value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {!expandedSections.institutional && searchResults.institutional.length > 6 && (
                      <div className="bg-muted/50 border border-border border-dashed rounded-xl p-5 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground font-medium">
                          + {searchResults.institutional.length - 6} instrumentos
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Call to Action with PDF Download */}
                <div className="bg-primary rounded-2xl p-10 text-center">
                  <h3 className="text-2xl font-bold text-primary-foreground mb-4 font-serif">
                    Rede de Incidência Construída
                  </h3>
                  <p className="text-primary-foreground/80 max-w-3xl mx-auto mb-6">
                    O MOTOR 4P traduziu o objeto tecnológico "{searchResults.query}" em uma rede verificável 
                    de {searchResults.stats.groups} grupos de pesquisa, {searchResults.stats.patents} patentes, 
                    {searchResults.stats.companies} empresas e incidência em {searchResults.stats.international} países.
                  </p>
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Baixar Relatório PDF
                  </button>
                </div>
              </div>
            ) : null}
          </div>
            )}
          </div>
        </main>
      </div>

      {/* Verificabilidade */}
      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Infraestrutura pública, explicável e auditável
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              "Cada resultado aponta a fonte pública original",
              "Cada vínculo possui critério explícito",
              "Dados reprodutíveis e transparentes"
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bases Públicas Integradas */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Bases Públicas Integradas no MVP
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-institutional text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-serif">CNPq</h3>
              <p className="text-muted-foreground text-sm">
                Diretório de Grupos de Pesquisa
              </p>
            </div>
            <div className="card-institutional text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-serif">INPI</h3>
              <p className="text-muted-foreground text-sm">
                Patentes e classificação IPC/CPC
              </p>
            </div>
            <div className="card-institutional text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Landmark className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-serif">Finep</h3>
              <p className="text-muted-foreground text-sm">
                Instrumentos e chamadas públicas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Roadmap
          </h2>
          <div className="max-w-md mx-auto">
            <div className="timeline-item">
              <div className="timeline-dot" />
              <p className="font-mono text-accent font-bold mb-1">2026</p>
              <h4 className="font-bold text-foreground mb-1">Engine do Pesquisador</h4>
              <p className="text-sm text-muted-foreground">objeto → rede</p>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <p className="font-mono text-accent font-bold mb-1">2027</p>
              <h4 className="font-bold text-foreground mb-1">Engine da Empresa</h4>
              <p className="text-sm text-muted-foreground">CNPJ → instrumentos</p>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <p className="font-mono text-accent font-bold mb-1">2028</p>
              <h4 className="font-bold text-foreground mb-1">Engine do Estado</h4>
              <p className="text-sm text-muted-foreground">lacunas e avaliação</p>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Credits */}
      <section className="py-12 border-t border-border bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Doutorado em Políticas Públicas — Universidade Federal do Paraná
          </p>
          <p className="text-base text-foreground font-medium">
            Decio Dalton Deliberador Filho <span className="text-muted-foreground font-normal">(Doutorando)</span>
          </p>
          <p className="text-base text-foreground font-medium">
            Walter Tadahiro Shima <span className="text-muted-foreground font-normal">(Orientador)</span>
          </p>
        </div>
      </section>

      <Footer />
      
      {/* Node Detail Panel */}
      <NodeDetailPanel 
        open={detailPanelOpen} 
        onClose={() => setDetailPanelOpen(false)} 
        nodeData={selectedNode} 
      />
    </div>
  );
};

export default MvpEngine;

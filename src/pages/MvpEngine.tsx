import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Microscope, FileText, Landmark, Globe, Factory, Download, Network, TrendingUp, AlertTriangle, Target, Link2, Info, CheckCircle, Database, Users, FlaskConical, Briefcase, ChevronRight, ChevronDown, Cpu, Building2, Activity, Zap, ExternalLink, GraduationCap, BookOpen, Code2 } from "lucide-react";
import { useIncidenceSearch } from "@/hooks/useIncidenceSearch";
import ApiStatusIndicator from "@/components/ApiStatusIndicator";
import ApiStatusView from "@/components/ApiStatusView";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { generateNewspaperPDF } from "@/lib/generatePdf";
import NetworkGraph from "@/components/NetworkGraph";
import NodeDetailPanel, { type NodeDetailData } from "@/components/NodeDetailPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sidebar, StatCard, IndicatorsCard } from "@/components/mvp";

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
    scholarships: false,
    education: false,
    github: false,
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
    // New API data (with safe defaults)
    scholarships: apiResults.scholarships || undefined,
    education: apiResults.education || undefined,
    github_projects: apiResults.github_projects || undefined,
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
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex flex-col md:flex-row pt-16">
        {/* Sidebar */}
        <Sidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          isSearching={isSearching}
          isUsingMock={isUsingMock}
          backendAvailable={backendAvailable}
          showApiStatus={showApiStatus}
          setShowApiStatus={setShowApiStatus}
          indicators={searchResults?.indicators}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-muted/20">
          {/* Results Container */}
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            {/* Search Results */}
            {hasSearched && (
              <div className="space-y-8">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative w-20 h-20 mb-6">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                      <div className="absolute inset-3 border-4 border-transparent border-t-accent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                      <Zap className="absolute inset-0 m-auto w-6 h-6 text-primary/60" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">Traduzindo objeto tecnológico...</p>
                    <p className="text-sm text-muted-foreground">Consultando: CNPq • INPI • OpenAlex • COMEX Stat • Finep • BNDES • Embrapii</p>
                  </div>
                ) : searchResults ? (
                  <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {/* Results Header */}
                    <div className="card-modern p-6 md:p-8">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Resultados para</p>
                          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                            "{searchResults.query}"
                          </h2>
                        </div>
                        <button
                          onClick={handleDownloadPDF}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Exportar PDF
                        </button>
                      </div>
                      
                      {/* Stats Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard icon={Microscope} value={searchResults.stats.groups} label="Grupos de Pesquisa" />
                        <StatCard icon={FlaskConical} value={searchResults.stats.patents} label="Patentes" />
                        <StatCard icon={Landmark} value={searchResults.stats.instruments} label="Instrumentos" iconClass="text-accent" />
                        <StatCard icon={Factory} value={searchResults.stats.companies} label="Empresas" />
                        <StatCard icon={Globe} value={searchResults.stats.international} label="Países" />
                      </div>
                    </div>

                    {/* Network Graph Visualization */}
                    <div className="card-modern p-6">
                      <div className="section-header">
                        <div className="section-icon bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                          <Network className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                            Grafo de Incidência
                          </h3>
                          <p className="text-sm text-muted-foreground">Visualização interativa das conexões</p>
                        </div>
                      </div>
                      <NetworkGraph searchResults={searchResults} onNodeSelect={handleNodeSelect} />
                    </div>

                    {/* Section Divider */}
                    <div className="flex items-center justify-center py-2">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>

                {/* Scientific Incidence */}
                <div className="card-modern p-6">
                  <div className="section-header">
                    <div className="section-icon bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/20">
                      <Microscope className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                        Incidência Científica
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground">Diretório de Grupos de Pesquisa — CNPq</p>
                    </div>
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, scientific: !prev.scientific }))}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs md:text-sm"
                    >
                      {expandedSections.scientific ? 'Recolher' : `Ver ${searchResults.stats.groups} Grupos`}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {(expandedSections.scientific ? searchResults.scientific : searchResults.scientific.slice(0, 6)).map((group, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-4 md:p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in cursor-pointer"
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
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Technological Incidence */}
                <div className="card-modern p-6">
                  <div className="section-header">
                    <div className="section-icon bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/20">
                      <Cpu className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                        Incidência Tecnológica
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground">Base de Patentes — INPI</p>
                    </div>
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, technological: !prev.technological }))}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs md:text-sm"
                    >
                      {expandedSections.technological ? 'Recolher' : `Ver ${searchResults.stats.patents} Patentes`}
                    </button>
                  </div>
                  
                  <div className="space-y-2 md:space-y-3">
                    {(expandedSections.technological ? searchResults.technological : searchResults.technological.slice(0, 5)).map((patent, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-4 md:p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in cursor-pointer"
                        style={{ animationDelay: `${1.2 + index * 0.1}s` }}
                        onClick={() => handleNodeSelect({ type: 'technological', data: patent })}
                      >
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FlaskConical className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-3 md:gap-4">
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
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Companies Section */}
                <div className="card-modern p-6">
                  <div className="section-header">
                    <div className="section-icon bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                      <Factory className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                        Empresas no Setor
                      </h3>
                      <p className="text-sm text-muted-foreground">Empresas brasileiras e internacionais</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Brazilian Companies */}
                    <div>
                      <h4 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                        <span className="text-xl">🇧🇷</span> Brasil
                      </h4>
                      <div className="space-y-3">
                        {searchResults.companies.filter(c => c.country === "Brasil").map((company, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-muted transition-all cursor-pointer"
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
                      <h4 className="flex items-center gap-2 text-base font-semibold text-foreground mb-4">
                        <span className="text-xl">🌍</span> Internacional
                      </h4>
                      <div className="space-y-3">
                        {searchResults.companies.filter(c => c.country !== "Brasil").slice(0, 5).map((company, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl p-4 hover:border-accent/30 hover:bg-muted transition-all cursor-pointer"
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
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* International Incidence */}
                <div className="card-modern p-6">
                  <div className="section-header">
                    <div className="section-icon bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
                      <Globe className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                        Incidência Internacional
                      </h3>
                      <p className="text-sm text-muted-foreground">Mapeamento global do objeto tecnológico</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.international.map((item, index) => (
                      <div 
                        key={index}
                        className="bg-muted/50 border border-border rounded-xl p-5 hover:border-rose-300 hover:bg-muted transition-all cursor-pointer"
                        onClick={() => handleNodeSelect({ type: 'international', data: { ...item, name: item.country } })}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-base font-medium">{item.country}</span>
                          <span className="badge badge-muted">
                            {item.relevance}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-card rounded-lg">
                            <p className="text-xl font-bold text-foreground">{item.institutions}</p>
                            <p className="text-xs text-muted-foreground">Instituições</p>
                          </div>
                          <div className="text-center p-3 bg-card rounded-lg">
                            <p className="text-xl font-bold text-foreground">{item.patents}</p>
                            <p className="text-xs text-muted-foreground">Patentes</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Institutional Incidence */}
                <div className="card-modern p-6">
                  <div className="section-header">
                    <div className="section-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                      <Landmark className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                        Incidência Institucional
                      </h3>
                      <p className="text-sm text-muted-foreground">Instrumentos Públicos — Finep, BNDES, Embrapii</p>
                    </div>
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, institutional: !prev.institutional }))}
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      {expandedSections.institutional ? 'Recolher' : `Ver ${searchResults.stats.instruments} Instrumentos`}
                    </button>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    {(expandedSections.institutional ? searchResults.institutional : searchResults.institutional.slice(0, 6)).map((inst, index) => (
                      <div 
                        key={index} 
                        className="group bg-muted/50 border border-border rounded-xl p-5 hover:border-emerald-300 hover:bg-muted transition-all cursor-pointer"
                        onClick={() => handleNodeSelect({ type: 'institutional', data: inst })}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-accent" />
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
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

                {/* Divider Arrow */}
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Scholarships Section */}
                {searchResults.scholarships && searchResults.scholarships.total > 0 && (
                  <div className="card-modern p-6">
                    <div className="section-header">
                      <div className="section-icon bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
                        <GraduationCap className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                          Bolsas de Estudo
                        </h3>
                        <p className="text-sm text-muted-foreground">Brasil e Internacional</p>
                      </div>
                      <button
                        onClick={() => setExpandedSections(prev => ({ ...prev, scholarships: !prev.scholarships }))}
                        className="btn-secondary text-sm py-2 px-4"
                      >
                        {expandedSections.scholarships ? 'Recolher' : `Ver ${searchResults.scholarships.total} Bolsas`}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(expandedSections.scholarships ? searchResults.scholarships.all : searchResults.scholarships.all.slice(0, 6)).map((scholarship, index) => (
                        <div 
                          key={index} 
                          className="group bg-muted/50 border border-border rounded-xl p-5 hover:border-green-300 hover:bg-muted transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className={`badge ${
                              scholarship.country === 'Brasil' 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {scholarship.country}
                            </span>
                            <span className="text-xs text-muted-foreground">{scholarship.type || scholarship.level}</span>
                          </div>
                          <h4 className="font-semibold text-foreground mb-2 group-hover:text-green-600 transition-colors">
                            {scholarship.institution || scholarship.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">{scholarship.program || scholarship.field}</p>
                          {scholarship.value_monthly && (
                            <p className="text-xs font-semibold text-green-600">
                              {typeof scholarship.value_monthly === 'number' 
                                ? `R$ ${scholarship.value_monthly.toLocaleString()}/mês`
                                : scholarship.value_monthly}
                            </p>
                          )}
                          {scholarship.value_yearly && (
                            <p className="text-xs font-semibold text-green-600">{scholarship.value_yearly}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Duração: {scholarship.duration_months} meses
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider Arrow */}
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* Education Institutions Section */}
                {searchResults.education && searchResults.education.total_institutions > 0 && (
                  <div className="card-modern p-6">
                    <div className="section-header">
                      <div className="section-icon bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                          Instituições de Ensino
                        </h3>
                        <p className="text-sm text-muted-foreground">INEP — Censo da Educação Superior</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.education.institutions.map((inst, index) => (
                        <div 
                          key={index} 
                          className="group bg-muted/50 border border-border rounded-xl p-5 hover:border-indigo-300 hover:bg-muted transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="badge badge-muted">
                              {inst.state}
                            </span>
                          </div>
                          <h4 className="font-semibold text-foreground mb-1 group-hover:text-indigo-600 transition-colors">
                            {inst.acronym || inst.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">{inst.name}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{inst.type}</span>
                            {inst.grade_enade && (
                              <span className="font-semibold text-indigo-600">
                                ENADE: {inst.grade_enade}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider Arrow */}
                <div className="flex justify-center py-2">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                {/* GitHub Projects Section */}
                {searchResults.github_projects && searchResults.github_projects.total > 0 && (
                  <div className="card-modern p-6">
                    <div className="section-header">
                      <div className="section-icon bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-500/20">
                        <Code2 className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                          Projetos Open Source
                        </h3>
                        <p className="text-sm text-muted-foreground">GitHub — Repositórios Relacionados</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {searchResults.github_projects.projects.slice(0, 10).map((project, index) => (
                        <div 
                          key={index} 
                          className="group bg-muted/50 border border-border rounded-xl p-5 hover:border-slate-400 hover:bg-muted transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Code2 className="w-5 h-5 text-slate-700" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="font-semibold text-foreground group-hover:text-slate-700 transition-colors">
                                    {project.full_name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                                </div>
                                <a 
                                  href={project.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  GitHub
                                </a>
                              </div>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="badge badge-muted">{project.language}</span>
                                <span>⭐ {project.stars}</span>
                                <span>🍴 {project.forks}</span>
                                {project.license && <span>📄 {project.license}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Call to Action with PDF Download */}
                <div className="card-feature bg-gradient-to-br from-primary to-primary/90 p-8 md:p-10 text-center">
                  <h3 className="text-2xl font-semibold text-primary-foreground mb-4">
                    Rede de Incidência Construída
                  </h3>
                  <p className="text-primary-foreground/80 max-w-3xl mx-auto mb-6 text-sm md:text-base">
                    O MOTOR 4P traduziu o objeto tecnológico "{searchResults.query}" em uma rede verificável 
                    de {searchResults.stats.groups} grupos de pesquisa, {searchResults.stats.patents} patentes, 
                    {searchResults.stats.companies} empresas e incidência em {searchResults.stats.international} países.
                  </p>
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-semibold hover:bg-white/90 transition-all hover:scale-105 shadow-lg"
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

        {/* Verificabilidade */}
        <section className="py-16 bg-muted/30 border-t border-border">
        <div className="container-wide">
          <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
            Infraestrutura pública, explicável e auditável
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: CheckCircle, text: "Cada resultado aponta a fonte pública original" },
              { icon: CheckCircle, text: "Cada vínculo possui critério explícito" },
              { icon: CheckCircle, text: "Dados reprodutíveis e transparentes" }
            ].map((item, index) => (
              <div key={index} className="card-modern p-5 flex items-start gap-3">
                <item.icon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bases Públicas Integradas */}
      <section className="py-16">
        <div className="container-wide">
          <h2 className="text-2xl font-semibold text-foreground mb-10 text-center">
            Bases Públicas Integradas
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-modern text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">CNPq</h3>
              <p className="text-muted-foreground text-sm">
                Diretório de Grupos de Pesquisa
              </p>
            </div>
            <div className="card-modern text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">INPI</h3>
              <p className="text-muted-foreground text-sm">
                Patentes e classificação IPC/CPC
              </p>
            </div>
            <div className="card-modern text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Landmark className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Finep</h3>
              <p className="text-muted-foreground text-sm">
                Instrumentos e chamadas públicas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="container-narrow">
          <h2 className="text-2xl font-semibold text-foreground mb-10 text-center">
            Roadmap
          </h2>
          <div className="max-w-lg mx-auto space-y-0">
            {[
              { year: "2026", title: "Engine do Pesquisador", desc: "objeto → rede", active: true },
              { year: "2027", title: "Engine da Empresa", desc: "CNPJ → instrumentos", active: false },
              { year: "2028", title: "Engine do Estado", desc: "lacunas e avaliação", active: false },
            ].map((item, index) => (
              <div key={index} className="timeline-item">
                <div className={`absolute -left-2 w-4 h-4 rounded-full border-2 ${item.active ? 'bg-accent border-accent' : 'bg-background border-border'}`} />
                <p className={`font-mono text-sm ${item.active ? 'text-accent' : 'text-muted-foreground'} font-semibold mb-1`}>{item.year}</p>
                <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Credits */}
      <section className="py-12 border-t border-border">
        <div className="container-narrow text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Doutorado em Políticas Públicas — UFPR
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8">
            <p className="text-sm text-foreground">
              <span className="font-medium">Decio Dalton Deliberador Filho</span>
              <span className="text-muted-foreground ml-1">(Doutorando)</span>
            </p>
            <p className="text-sm text-foreground">
              <span className="font-medium">Walter Tadahiro Shima</span>
              <span className="text-muted-foreground ml-1">(Orientador)</span>
            </p>
          </div>
        </div>
      </section>
        </main>
      </div>

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
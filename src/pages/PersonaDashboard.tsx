import { useState, useCallback, useEffect } from "react";
import { Microscope, Landmark, Globe, Factory, Download, Users, FlaskConical, Briefcase, Zap, ExternalLink, BookOpen, Code2, Search, ArrowLeft, MapPin, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { useIncidenceSearch } from "@/hooks/useIncidenceSearch";
import { useEnrichmentSearch } from "@/hooks/useEnrichmentSearch";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { generateNewspaperPDF } from "@/lib/generatePdf";
import NetworkGraph from "@/components/NetworkGraph";
import NodeDetailPanel, { type NodeDetailData } from "@/components/NodeDetailPanel";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";

import IndicatorsCard from "@/components/mvp/IndicatorsCard";
import ProductiveTab from "@/components/mvp/ProductiveTab";
import InstitutionalEnrichment from "@/components/mvp/InstitutionalEnrichment";
import { personaConfigs } from "@/config/personas";
import type { Persona } from "@/types/persona";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface PersonaDashboardProps {
  persona: Persona;
}

const PersonaDashboard = ({ persona }: PersonaDashboardProps) => {
  const config = personaConfigs[persona];

  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeDetailData | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [selectedCnaes, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const {
    search: apiSearch,
    results: apiResults,
    isLoading: isSearching,
    error: searchError,
  } = useIncidenceSearch();

  const {
    search: enrichmentSearch,
    data: enrichmentData,
    isLoading: isEnriching,
  } = useEnrichmentSearch();

  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();

  const searchResults = apiResults ? {
    query: apiResults.query,
    stats: apiResults.stats,
    scientific: apiResults.scientific.research_groups.map(g => ({
      name: g.name, institution: g.institution_acronym || g.institution, state: g.state, area: g.area, international: g.international_collaboration,
    })),
    technological: apiResults.technological.patents.slice(0, 5).map(p => ({
      title: p.title, applicant: p.applicants[0] || 'N/A', year: p.filing_date?.split('-')[0] || 'N/A', code: p.id, international: p.cited_by_count > 0 ? `Citada ${p.cited_by_count}x` : undefined,
    })),
    institutional: apiResults.institutional.instruments.map(i => ({
      name: i.name, type: i.type, status: i.status, value: i.total_value ? `R$ ${(i.total_value / 1000000).toFixed(0)}M` : undefined,
    })),
    companies: [] as { name: string; country: string; sector: string; type: string }[],
    international: apiResults.international.slice(0, 6).map(i => ({
      country: `${i.flag_emoji} ${i.country.replace('https://openalex.org/countries/', '')}`, institutions: i.institutions_count, patents: i.patents_count, relevance: i.global_relevance,
    })),
    indicators: {
      c2t: { value: apiResults.indicators.c2t.value, label: "C2T", description: apiResults.indicators.c2t.description },
      gt: { value: apiResults.indicators.gt.value, label: "GT", description: apiResults.indicators.gt.description },
      p2c: { value: apiResults.indicators.p2c.value, label: "P2C", description: apiResults.indicators.p2c.description },
      cd: { value: apiResults.indicators.cd.value, label: "CD", description: apiResults.indicators.cd.description },
    },
    scholarships: apiResults.scholarships || undefined,
    education: apiResults.education || undefined,
    github_projects: apiResults.github_projects || undefined,
    // Raw data for cross-references
    _raw: apiResults,
    _processingTimeMs: apiResults.processing_time_ms,
    _dataSources: apiResults.data_sources,
  } : null;

  useEffect(() => {
    if (apiResults?.query) {
      enrichmentSearch(apiResults.query);
    }
  }, [apiResults?.query, enrichmentSearch]);

  const handleNodeSelect = useCallback((nodeData: { type: string; data: Record<string, unknown> } | null) => {
    if (nodeData) {
      setSelectedNode(nodeData as NodeDetailData);
      setDetailPanelOpen(true);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setPendingSearchQuery(searchQuery);
    const cnaes = await searchCnaes(searchQuery);
    if (cnaes.length > 0) {
      setSuggestedCnaes(cnaes);
      setShowCnaeModal(true);
    } else {
      setHasSearched(true);
      await apiSearch(searchQuery);
    }
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => {
    setSelectedCnaes(selected);
    setShowCnaeModal(false);
    setHasSearched(true);
    await apiSearch(pendingSearchQuery);
  };

  const handleCnaeCancel = () => {
    setShowCnaeModal(false);
    setSuggestedCnaes([]);
    setPendingSearchQuery("");
  };

  const handleRemoveCnae = (code: string) => {
    setSelectedCnaes(prev => prev.filter(c => c.code !== code));
  };

  const handleDownloadPDF = () => {
    if (searchResults) generateNewspaperPDF(searchResults);
  };

  const handleNewSearch = () => {
    setHasSearched(false);
    setSearchQuery("");
    setSelectedCnaes([]);
    setActiveTab("overview");
  };

  const tabCounts = searchResults ? {
    scientific: searchResults.scientific.length,
    technological: searchResults.technological.length,
    institutional: searchResults.institutional.length,
    international: searchResults.international.length,
    scholarships: searchResults.scholarships?.total || 0,
    education: searchResults.education?.total_institutions || 0,
    github: searchResults.github_projects?.total || 0,
  } : {};

  const enrichmentCounts = {
    productive: (enrichmentData?.productive.macro_indicators.length || 0) + (enrichmentData?.productive.ipeadata_series.length || 0),
    contracts: enrichmentData?.institutional.public_contracts.length || 0,
    gazettes: enrichmentData?.institutional.official_gazettes.length || 0,
  };

  /* ===== EMPTY STATE ===== */
  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="w-full max-w-2xl mx-auto text-center space-y-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>

            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
              <config.icon className="w-8 h-8 text-white" />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">{config.label}</h1>
              <p className="text-muted-foreground text-sm">{config.subtitle}</p>
            </div>

            <form onSubmit={handleSearch} className="w-full space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite um objeto tecnológico — ex: grafeno, baterias de lítio..."
                  className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className={`w-full h-12 rounded-xl bg-gradient-to-r ${config.color} text-white text-base font-medium gap-2`}
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Buscar
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-wrap justify-center gap-2">
              {config.questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setSearchQuery(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </main>
        <CnaeSelectionModal isOpen={showCnaeModal} onClose={handleCnaeCancel} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
      </div>
    );
  }

  /* ===== LOADING STATE ===== */
  if (isSearching) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
              <Zap className="absolute inset-0 m-auto w-6 h-6 text-primary/60" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Consultando bases públicas...</p>
              <p className="text-sm text-muted-foreground mt-1">CNPq · INPI · OpenAlex · COMEX · BCB · IPEAData · PNCP</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ===== ERROR STATE ===== */
  if (searchError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4 max-w-md px-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Não foi possível buscar dados reais</h2>
            <p className="text-sm text-muted-foreground">{searchError}</p>
            <Button onClick={handleNewSearch} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Tentar nova busca
            </Button>
          </div>
        </main>
      </div>
    );
  }

  /* ===== RESULTS STATE ===== */
  if (!searchResults) return null;

  const raw = searchResults._raw;
  const allSources = [
    ...(searchResults._dataSources || []),
    ...(enrichmentData?.meta.sources || []),
  ];

  // Build cross-reference insights from actual data
  const crossInsights: Array<{ icon: typeof TrendingUp; text: string; type: "info" | "warning" | "positive" }> = [];
  
  const groups = searchResults.stats.groups || 0;
  const patents = searchResults.stats.patents || 0;
  const instruments = searchResults.stats.instruments || 0;
  
  // Translation gap
  if (groups > 0 && patents > 0) {
    const ratio = (patents / groups).toFixed(1);
    if (groups > patents) {
      crossInsights.push({ icon: AlertTriangle, text: `${groups} grupos de pesquisa produzem apenas ${patents} patentes (${ratio} pat/grupo) → gap de tradução ciência→tecnologia`, type: "warning" });
    } else {
      crossInsights.push({ icon: TrendingUp, text: `Boa conversão: ${patents} patentes para ${groups} grupos (${ratio} pat/grupo)`, type: "positive" });
    }
  }

  // Institutional coverage
  if (instruments > 0 && groups > 0) {
    crossInsights.push({ icon: Landmark, text: `${instruments} instrumentos de fomento disponíveis para ${groups} grupos ativos`, type: "info" });
  }

  // Trade balance
  if (raw?.productive) {
    const balance = raw.productive.trade_balance;
    if (balance < 0) {
      crossInsights.push({ icon: ArrowDownRight, text: `Déficit comercial: Brasil importa ${Math.abs(balance / 1e6).toFixed(0)}M USD a mais do que exporta neste segmento`, type: "warning" });
    } else if (balance > 0) {
      crossInsights.push({ icon: ArrowUpRight, text: `Superávit comercial de ${(balance / 1e6).toFixed(0)}M USD neste segmento`, type: "positive" });
    }
  }

  // Enrichment cross-references
  if (enrichmentCounts.contracts > 0) {
    const totalValue = enrichmentData!.institutional.public_contracts.reduce((s, c) => s + (c.value || 0), 0);
    crossInsights.push({
      icon: Landmark,
      text: `${enrichmentCounts.contracts} licitações públicas encontradas${totalValue > 0 ? ` (R$ ${(totalValue / 1e6).toFixed(1)}M estimados)` : ''}`,
      type: "positive",
    });
  }

  // Regional concentration
  if (raw?.scientific?.by_state) {
    const states = Object.entries(raw.scientific.by_state as Record<string, number>).sort((a, b) => b[1] - a[1]);
    if (states.length > 0) {
      const top = states.slice(0, 3).map(([s, n]) => `${s}(${n})`).join(", ");
      crossInsights.push({ icon: MapPin, text: `Concentração regional: ${top}`, type: "info" });
    }
  }

  const insightColors = {
    info: "border-primary/20 bg-primary/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    positive: "border-emerald-500/20 bg-emerald-500/5",
  };
  const insightIconColors = {
    info: "text-primary",
    warning: "text-amber-600",
    positive: "text-emerald-600",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Top bar */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              Nova busca
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">"{searchResults.query}"</p>
              {allSources.length > 0 && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Fontes: {allSources.join(" · ")}
                  {searchResults._processingTimeMs && ` · ${searchResults._processingTimeMs}ms`}
                </p>
              )}
            </div>
            {searchError && (
              <span className="text-[10px] px-2 py-1 bg-destructive/10 text-destructive rounded-full border border-destructive/20 flex-shrink-0">
                Erro na busca
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5 flex-shrink-0">
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-0 duration-500">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { icon: Microscope, value: searchResults.stats.groups, label: "Grupos" },
              { icon: FlaskConical, value: searchResults.stats.patents, label: "Patentes" },
              { icon: Landmark, value: searchResults.stats.instruments, label: "Instrumentos" },
              { icon: Factory, value: searchResults.stats.companies, label: "Empresas" },
              { icon: Globe, value: searchResults.stats.international, label: "Países" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
                <s.icon className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Selected CNAEs */}
          {selectedCnaes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCnaes.map(cnae => (
                <span key={cnae.code} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <span className="font-mono font-semibold">{cnae.code}</span>
                  <button onClick={() => handleRemoveCnae(cnae.code)} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 h-auto p-1 rounded-xl flex-wrap">
              <TabsTrigger value="overview" className="text-xs rounded-lg">Visão Geral</TabsTrigger>
              <TabsTrigger value="scientific" className="text-xs rounded-lg">
                Científica {tabCounts.scientific ? `(${tabCounts.scientific})` : ''}
              </TabsTrigger>
              <TabsTrigger value="technological" className="text-xs rounded-lg">
                Tecnológica {tabCounts.technological ? `(${tabCounts.technological})` : ''}
              </TabsTrigger>
              <TabsTrigger value="productive" className="text-xs rounded-lg">
                Produtiva {enrichmentCounts.productive > 0 ? `(${enrichmentCounts.productive})` : isEnriching ? '…' : ''}
              </TabsTrigger>
              <TabsTrigger value="institutional" className="text-xs rounded-lg">
                Institucional {tabCounts.institutional ? `(${tabCounts.institutional + enrichmentCounts.contracts})` : ''}
              </TabsTrigger>
              <TabsTrigger value="international" className="text-xs rounded-lg">
                Internacional {tabCounts.international ? `(${tabCounts.international})` : ''}
              </TabsTrigger>
              {(tabCounts.scholarships ?? 0) > 0 && <TabsTrigger value="scholarships" className="text-xs rounded-lg">Bolsas</TabsTrigger>}
              {(tabCounts.education ?? 0) > 0 && <TabsTrigger value="education" className="text-xs rounded-lg">Ensino</TabsTrigger>}
              {(tabCounts.github ?? 0) > 0 && <TabsTrigger value="github" className="text-xs rounded-lg">Open Source</TabsTrigger>}
              <TabsTrigger value="graph" className="text-xs rounded-lg">Grafo</TabsTrigger>
            </TabsList>

            {/* Overview — Objective cross-references */}
            <TabsContent value="overview" className="space-y-6">
              {/* Cross-reference insights */}
              {crossInsights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Cruzamentos objetivos</h3>
                  {crossInsights.map((insight, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${insightColors[insight.type]}`}>
                      <insight.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${insightIconColors[insight.type]}`} />
                      <p className="text-xs text-foreground leading-relaxed">{insight.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Indicators */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <IndicatorsCard {...searchResults.indicators} />
                </div>

                {/* Top groups ranking */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-primary" />
                    Principais Grupos de Pesquisa
                  </h3>
                  <div className="space-y-2">
                    {searchResults.scientific.slice(0, 5).map((g, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{g.name}</p>
                          <p className="text-[10px] text-muted-foreground">{g.institution}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded ml-2">{g.state}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Macro context */}
              {enrichmentData && enrichmentData.productive.macro_indicators.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Contexto Macroeconômico
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {enrichmentData.productive.macro_indicators.map((ind, i) => (
                      <div key={i} className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-lg font-bold text-foreground">
                          {ind.value !== null ? ind.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{ind.name}</p>
                        {ind.variation !== null && (
                          <span className={`text-[9px] font-medium ${ind.variation > 0 ? 'text-emerald-600' : ind.variation < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {ind.variation > 0 ? '↑' : ind.variation < 0 ? '↓' : '→'} {Math.abs(ind.variation).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade summary if available */}
              {raw?.productive && (raw.productive.total_exports_usd > 0 || raw.productive.total_imports_usd > 0) && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Balança Comercial do Segmento
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-emerald-600">
                        ${(raw.productive.total_exports_usd / 1e6).toFixed(0)}M
                      </p>
                      <p className="text-[10px] text-muted-foreground">Exportações</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">
                        ${(raw.productive.total_imports_usd / 1e6).toFixed(0)}M
                      </p>
                      <p className="text-[10px] text-muted-foreground">Importações</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${raw.productive.trade_balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        ${(Math.abs(raw.productive.trade_balance) / 1e6).toFixed(0)}M
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {raw.productive.trade_balance >= 0 ? 'Superávit' : 'Déficit'}
                      </p>
                    </div>
                  </div>
                  {raw.productive.main_import_origins?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] text-muted-foreground mb-1">Principais origens de importação:</p>
                      <div className="flex flex-wrap gap-2">
                        {raw.productive.main_import_origins.slice(0, 4).map((o: any, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
                            {o.country_name}: ${(o.total_value / 1e6).toFixed(0)}M
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Scientific */}
            <TabsContent value="scientific" className="space-y-6">
              {/* State distribution table */}
              {raw?.scientific?.by_state && Object.keys(raw.scientific.by_state).length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição por Estado</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(raw.scientific.by_state as Record<string, number>)
                      .sort((a, b) => b[1] - a[1])
                      .map(([state, count], i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg">
                          <span className="text-xs font-semibold text-foreground">{state}</span>
                          <span className="text-xs text-muted-foreground">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.scientific.map((group, index) => (
                  <div key={index} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer" onClick={() => handleNodeSelect({ type: 'scientific', data: group })}>
                    <div className="flex items-start justify-between mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{group.state}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{group.name}</h4>
                    <p className="text-xs text-muted-foreground mb-1">{group.institution}</p>
                    <p className="text-[10px] text-muted-foreground/70">{group.area}</p>
                    {group.international && (
                      <div className="flex items-center gap-1 text-[10px] text-primary mt-2">
                        <Globe className="w-3 h-3" />{group.international}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Technological */}
            <TabsContent value="technological">
              {/* Top applicants */}
              {raw?.technological?.top_applicants?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5 mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Ranking de Depositantes</h3>
                  <div className="space-y-1.5">
                    {raw.technological.top_applicants.slice(0, 5).map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                        <span className="text-xs text-foreground">{i + 1}. {a.name}</span>
                        <span className="text-xs font-semibold text-primary">{a.count} patentes</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {searchResults.technological.map((patent, index) => (
                  <div key={index} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex gap-4" onClick={() => handleNodeSelect({ type: 'technological', data: patent })}>
                    <FlaskConical className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-semibold text-foreground">{patent.title}</h4>
                        <span className="text-[10px] font-mono bg-secondary text-secondary-foreground px-2 py-0.5 rounded flex-shrink-0">{patent.year}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{patent.applicant}</p>
                      {patent.international && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary mt-1.5">
                          <Globe className="w-3 h-3" />{patent.international}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Productive */}
            <TabsContent value="productive">
              <ProductiveTab
                macroIndicators={enrichmentData?.productive.macro_indicators || []}
                ipeadataSeries={enrichmentData?.productive.ipeadata_series || []}
                isLoading={isEnriching}
              />
            </TabsContent>

            {/* Institutional */}
            <TabsContent value="institutional">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.institutional.map((inst, index) => (
                  <div key={index} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer" onClick={() => handleNodeSelect({ type: 'institutional', data: inst })}>
                    <div className="flex items-start justify-between mb-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${inst.status === 'Aberto' || inst.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-600' : inst.status === 'Contínuo' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{inst.status}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">{inst.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{inst.type}</span>
                      {inst.value && <span className="text-xs font-semibold text-primary">{inst.value}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <InstitutionalEnrichment
                contracts={enrichmentData?.institutional.public_contracts || []}
                gazettes={enrichmentData?.institutional.official_gazettes || []}
                datasets={enrichmentData?.institutional.open_datasets || []}
                isLoading={isEnriching}
              />
            </TabsContent>

            {/* International */}
            <TabsContent value="international">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.international.map((item, index) => (
                  <div key={index} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer" onClick={() => handleNodeSelect({ type: 'international', data: { ...item, name: item.country } })}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">{item.country}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{item.relevance}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-lg font-bold text-foreground">{item.institutions}</p>
                        <p className="text-[10px] text-muted-foreground">Instituições</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-lg font-bold text-foreground">{item.patents}</p>
                        <p className="text-[10px] text-muted-foreground">Patentes</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Scholarships */}
            <TabsContent value="scholarships">
              {searchResults.scholarships && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.scholarships.all.map((s: any, i: number) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.country === 'Brasil' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>{s.country}</span>
                        <span className="text-[10px] text-muted-foreground">{s.type || s.level}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{s.institution || s.name}</h4>
                      <p className="text-xs text-muted-foreground mb-1">{s.program || s.field}</p>
                      {s.value_monthly && <p className="text-xs font-semibold text-primary">{typeof s.value_monthly === 'number' ? `R$ ${s.value_monthly.toLocaleString()}/mês` : s.value_monthly}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">Duração: {s.duration_months} meses</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Education */}
            <TabsContent value="education">
              {searchResults.education && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.education.institutions.map((inst: any, i: number) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{inst.state}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{inst.acronym || inst.name}</h4>
                      <p className="text-xs text-muted-foreground">{inst.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">{inst.type}</span>
                        {inst.grade_enade && <span className="text-xs font-semibold text-primary">ENADE: {inst.grade_enade}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* GitHub */}
            <TabsContent value="github">
              {searchResults.github_projects && (
                <div className="space-y-3">
                  {searchResults.github_projects.projects.slice(0, 10).map((p: any, i: number) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all flex gap-4">
                      <Code2 className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-foreground">{p.full_name}</h4>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 flex-shrink-0">
                            <ExternalLink className="w-3 h-3" />GitHub
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          {p.language && <span className="px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">{p.language}</span>}
                          <span>⭐ {p.stars}</span>
                          <span>🍴 {p.forks}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Graph */}
            <TabsContent value="graph">
              <div className="bg-card border border-border rounded-xl p-4">
                <NetworkGraph searchResults={searchResults} onNodeSelect={handleNodeSelect} />
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      <Footer />
      <NodeDetailPanel open={detailPanelOpen} onClose={() => setDetailPanelOpen(false)} nodeData={selectedNode} />
      <CnaeSelectionModal isOpen={showCnaeModal} onClose={handleCnaeCancel} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
    </div>
  );
};

export default PersonaDashboard;

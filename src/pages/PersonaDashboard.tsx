import { useState, useCallback } from "react";
import { Landmark, Globe, Users, Zap, ExternalLink, BookOpen, Search, ArrowLeft, TrendingUp, ArrowUpRight, ArrowDownRight, AlertTriangle, FileText, Database, Activity, GitBranch, Shield } from "lucide-react";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NodeDetailPanel, { type NodeDetailData } from "@/components/NodeDetailPanel";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import ProductiveTab from "@/components/mvp/ProductiveTab";
import InstitutionalEnrichment from "@/components/mvp/InstitutionalEnrichment";
import { personaConfigs } from "@/config/personas";
import type { Persona } from "@/types/persona";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

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

  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();
  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();

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
      await search(searchQuery, persona);
    }
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => {
    setSelectedCnaes(selected);
    setShowCnaeModal(false);
    setHasSearched(true);
    await search(pendingSearchQuery, persona);
  };

  const handleCnaeCancel = () => {
    setShowCnaeModal(false);
    setSuggestedCnaes([]);
    setPendingSearchQuery("");
  };

  const handleRemoveCnae = (code: string) => {
    setSelectedCnaes(prev => prev.filter(c => c.code !== code));
  };

  const handleNewSearch = () => {
    setHasSearched(false);
    setSearchQuery("");
    setSelectedCnaes([]);
    setActiveTab("overview");
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
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite um objeto tecnológico — ex: grafeno, baterias de lítio..."
                  className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim()}
                className={`w-full h-12 rounded-xl bg-gradient-to-r ${config.color} text-white text-base font-medium gap-2`}>
                {isLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Consultando bases públicas...</>
                ) : (
                  <><Search className="w-4 h-4" />Buscar</>
                )}
              </Button>
            </form>
            <div className="flex flex-wrap justify-center gap-2">
              {config.questions.map((q, i) => (
                <button key={i} onClick={() => setSearchQuery(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
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
  if (isLoading) {
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
              <p className="text-sm text-muted-foreground mt-1">Consultando 21 bases: OpenAlex · BCB · IBGE · IPEAData · PNCP · GitHub · CAPES · ANEEL · CVM · Transparência · SICONFI · ANVISA...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ===== ERROR STATE ===== */
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4 max-w-md px-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Erro na busca</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={handleNewSearch} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />Tentar nova busca
            </Button>
          </div>
        </main>
      </div>
    );
  }

  /* ===== RESULTS STATE ===== */
  if (!data) return null;

  const totalContractValue = data.institutional.public_contracts.reduce((s, c) => s + (c.value || 0), 0);

  // Institution ranking from papers
  const institutionRanking = Object.entries(data.scientific.by_institution || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Country flag map
  const flagMap: Record<string, string> = {
    BR: "🇧🇷", US: "🇺🇸", CN: "🇨🇳", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵", KR: "🇰🇷",
    IN: "🇮🇳", CA: "🇨🇦", AU: "🇦🇺", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", CH: "🇨🇭", SE: "🇸🇪",
    PT: "🇵🇹", AR: "🇦🇷", MX: "🇲🇽", CO: "🇨🇴", CL: "🇨🇱",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Top bar */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />Nova busca
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">"{data.query}"</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {data.meta.sources.join(" · ")} · {data.meta.processing_time_ms}ms
              </p>
            </div>
            <span className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 flex-shrink-0">
              {data.meta.source_count} fontes reais
            </span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-0 duration-500">
          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {[
              { icon: BookOpen, value: data.stats.papers, label: "Papers" },
              { icon: Landmark, value: data.stats.contracts, label: "Licitações" },
              { icon: FileText, value: data.stats.gazettes, label: "Diários" },
              { icon: Database, value: data.stats.datasets, label: "Datasets" },
              { icon: Globe, value: data.stats.countries, label: "Países" },
              { icon: Activity, value: data.stats.macro_indicators, label: "Indicadores" },
              { icon: TrendingUp, value: data.stats.ipeadata_series, label: "Séries" },
              { icon: GitBranch, value: data.stats.github_repos, label: "Repos" },
              { icon: Users, value: data.stats.convenios, label: "Convênios" },
              { icon: Shield, value: data.stats.sanctions, label: "Sanções" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3 text-center">
                <s.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
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
                Científica ({data.stats.papers})
              </TabsTrigger>
              <TabsTrigger value="productive" className="text-xs rounded-lg">
                Produtiva
              </TabsTrigger>
              <TabsTrigger value="technological" className="text-xs rounded-lg">
                Tecnológica ({data.stats.github_repos})
              </TabsTrigger>
              <TabsTrigger value="institutional" className="text-xs rounded-lg">
                Institucional ({data.stats.contracts + data.stats.gazettes + data.stats.datasets})
              </TabsTrigger>
              <TabsTrigger value="international" className="text-xs rounded-lg">
                Internacional ({data.stats.countries})
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs rounded-lg">
                Análise IA {isAnalyzing && "…"}
              </TabsTrigger>
            </TabsList>

            {/* ===== OVERVIEW ===== */}
            <TabsContent value="overview" className="space-y-6">
              {/* Quick summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Top papers */}
                {data.scientific.papers.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Papers mais citados
                    </h3>
                    <div className="space-y-2">
                      {data.scientific.papers.slice(0, 4).map((p, i) => (
                        <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="block py-1.5 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors">
                          <p className="text-xs font-medium text-foreground line-clamp-1">{p.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{p.year}</span>
                            <span className="text-[10px] font-semibold text-primary">{p.citations} citações</span>
                            {p.is_open_access && <span className="text-[9px] px-1 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">OA</span>}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contracts summary */}
                {data.institutional.public_contracts.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-primary" />
                      Licitações ({data.stats.contracts})
                      {totalContractValue > 0 && (
                        <span className="text-[10px] font-normal text-primary ml-auto">
                          R$ {(totalContractValue / 1e6).toFixed(1)}M
                        </span>
                      )}
                    </h3>
                    <div className="space-y-2">
                      {data.institutional.public_contracts.slice(0, 3).map((c, i) => (
                        <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="block py-1.5 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors">
                          <p className="text-xs font-medium text-foreground line-clamp-1">{c.object || "Sem objeto"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{c.organ?.slice(0, 30)}</span>
                            {c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}mil</span>}
                            {c.uf && <span className="text-[9px] px-1 py-0.5 bg-secondary text-secondary-foreground rounded">{c.uf}</span>}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Macro context */}
                {data.productive.macro_indicators.some(m => m.value !== null) && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Contexto Macro
                    </h3>
                    <div className="space-y-2.5">
                      {data.productive.macro_indicators.filter(m => m.value !== null).map((m, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{m.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              {m.value!.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                            </span>
                            {m.variation !== null && (
                              <span className={`text-[10px] font-medium flex items-center gap-0.5 ${m.variation > 0 ? 'text-emerald-600' : m.variation < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {m.variation > 0 ? <ArrowUpRight className="w-3 h-3" /> : m.variation < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                {Math.abs(m.variation).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* GitHub repos */}
              {data.technological?.github_repos?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Repositórios Open Source (GitHub)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {data.technological.github_repos.slice(0, 6).map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg hover:bg-muted/70 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {r.language && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{r.language}</span>}
                          <span className="text-[10px] font-bold text-primary">⭐ {r.stars}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Convênios Transparência */}
              {data.institutional?.transparencia?.convenios?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Convênios Federais (Portal da Transparência)
                  </h3>
                  <div className="space-y-2">
                    {data.institutional.transparencia.convenios.slice(0, 4).map((c, i) => (
                      <div key={i} className="py-1.5 border-b border-border/50 last:border-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{c.object || "Sem objeto"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{c.proponent}</span>
                          {c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}mil</span>}
                          <span className="text-[9px] px-1 py-0.5 bg-secondary text-secondary-foreground rounded">{c.situation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Institution ranking */}
              {institutionRanking.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Ranking de Instituições (por papers)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {institutionRanking.map(([inst, count], i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                        <span className="text-xs text-foreground truncate mr-2">{inst}</span>
                        <span className="text-xs font-bold text-primary flex-shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis preview */}
              {isAnalyzing && (
                <div className="bg-card border border-primary/20 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Gerando análise estratégica para {config.label}...</span>
                  </div>
                </div>
              )}
              {analysis && (
                <div className="bg-card border border-primary/20 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Análise Estratégica — {config.label}
                  </h3>
                  <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                    <ReactMarkdown>{analysis.analysis}</ReactMarkdown>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ===== SCIENTIFIC ===== */}
            <TabsContent value="scientific" className="space-y-4">
              {data.scientific.papers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nenhum paper encontrado para "{data.query}"</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Título</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Autores</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Ano</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Citações</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">OA</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.scientific.papers.map((p, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 max-w-[300px]">
                              <p className="text-xs font-medium text-foreground line-clamp-2">{p.title}</p>
                              <p className="text-[10px] text-muted-foreground">{p.journal}</p>
                            </td>
                            <td className="py-2.5 px-3 max-w-[200px]">
                              {p.authors.slice(0, 2).map((a, ai) => (
                                <p key={ai} className="text-[10px] text-muted-foreground line-clamp-1">
                                  {a.name} {a.institution && `(${a.institution})`}
                                </p>
                              ))}
                            </td>
                            <td className="py-2.5 px-3 text-center text-xs text-foreground">{p.year}</td>
                            <td className="py-2.5 px-3 text-right text-xs font-semibold text-primary">{p.citations}</td>
                            <td className="py-2.5 px-3 text-center">
                              {p.is_open_access && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">OA</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ===== PRODUCTIVE ===== */}
            <TabsContent value="productive">
              <ProductiveTab
                macroIndicators={data.productive.macro_indicators}
                ipeadataSeries={data.productive.ipeadata_series}
                isLoading={false}
              />
            </TabsContent>

            {/* ===== TECHNOLOGICAL ===== */}
            <TabsContent value="technological" className="space-y-4">
              {data.technological?.github_repos?.length > 0 ? (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Repositórios Open Source
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Repositório</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Descrição</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Linguagem</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Stars</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Forks</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.technological.github_repos.map((r, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 text-xs font-medium text-foreground">{r.name}</td>
                            <td className="py-2.5 px-3 max-w-[250px]">
                              <p className="text-[10px] text-muted-foreground line-clamp-2">{r.description}</p>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {r.language && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{r.language}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs font-semibold text-primary">⭐ {r.stars}</td>
                            <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">{r.forks}</td>
                            <td className="py-2.5 px-3 text-center">
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <GitBranch className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nenhum repositório encontrado para "{data.query}"</p>
                </div>
              )}
            </TabsContent>

            {/* ===== INSTITUTIONAL ===== */}
            <TabsContent value="institutional">
              <InstitutionalEnrichment
                contracts={data.institutional.public_contracts}
                gazettes={data.institutional.official_gazettes}
                datasets={data.institutional.open_datasets}
                isLoading={false}
              />
            </TabsContent>

            {/* ===== INTERNATIONAL ===== */}
            <TabsContent value="international">
              {data.scientific.international.length > 0 ? (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Produção científica por país (OpenAlex)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {data.scientific.international.map((c, i) => (
                      <div key={i} className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl mb-1">{flagMap[c.country_code] || "🌍"}</p>
                        <p className="text-xs font-medium text-foreground">{c.country_code}</p>
                        <p className="text-lg font-bold text-primary">{c.count.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">papers</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sem dados internacionais disponíveis.</p>
                </div>
              )}
            </TabsContent>

            {/* ===== AI ANALYSIS ===== */}
            <TabsContent value="analysis">
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-muted-foreground">Gerando análise estratégica...</span>
                </div>
              ) : analysis ? (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary">
                    <ReactMarkdown>{analysis.analysis}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Análise de IA não disponível no momento.</p>
                </div>
              )}
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

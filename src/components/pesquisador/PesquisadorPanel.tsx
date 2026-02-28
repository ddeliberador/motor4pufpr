import { useState, useCallback } from "react";
import { Microscope, Search, ArrowLeft, AlertTriangle, Zap, Globe, BookOpen, Users, GitBranch, TrendingUp, ExternalLink, Beaker, Target, Lightbulb } from "lucide-react";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import { personaConfigs } from "@/config/personas";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import StrategicIndices from "@/components/governo/StrategicIndices";
import DataDetailSheet, { type DetailItem } from "@/components/shared/DataDetailSheet";

const PesquisadorPanel = () => {
  const config = personaConfigs.pesquisador;
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("panorama");
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();
  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();

  const openDetail = useCallback((item: DetailItem) => { setDetailItem(item); setDetailOpen(true); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setPendingSearchQuery(searchQuery);
    const cnaes = await searchCnaes(searchQuery);
    if (cnaes.length > 0) { setSuggestedCnaes(cnaes); setShowCnaeModal(true); }
    else { setHasSearched(true); await search(searchQuery, "pesquisador"); }
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => { setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true); await search(pendingSearchQuery, "pesquisador"); };
  const handleNewSearch = () => { setHasSearched(false); setSearchQuery(""); setSelectedCnaes([]); setActiveTab("panorama"); };

  // Pre-search landing page
  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="w-full max-w-2xl mx-auto text-center space-y-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" />Voltar</Link>
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}><Microscope className="w-8 h-8 text-white" /></div>
            <div><h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">Lacunas & Oportunidades de Pesquisa</h1><p className="text-muted-foreground text-sm">Onde há lacuna? Quem já publicou? Onde captar financiamento?</p></div>
            <form onSubmit={handleSearch} className="w-full space-y-3">
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Objeto tecnológico — ex: grafeno, baterias de lítio, CRISPR..." className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" autoFocus /></div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim()} className={`w-full h-12 rounded-xl bg-gradient-to-r ${config.color} text-white text-base font-medium gap-2`}>{isLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mapeando campo científico...</>) : (<><Search className="w-4 h-4" />Investigar</>)}</Button>
            </form>
            <div className="flex flex-wrap justify-center gap-2">
              {["grafeno", "inteligência artificial", "baterias de lítio", "CRISPR"].map((q) => (<button key={q} onClick={() => setSearchQuery(q)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">{q}</button>))}
            </div>
          </div>
        </main>
        <CnaeSelectionModal isOpen={showCnaeModal} onClose={() => { setShowCnaeModal(false); setSuggestedCnaes([]); setPendingSearchQuery(""); }} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
      </div>
    );
  }

  // Loading state
  if (isLoading) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-6"><div className="relative w-16 h-16 mx-auto"><div className="absolute inset-0 border-4 border-primary/20 rounded-full" /><div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" /><Microscope className="absolute inset-0 m-auto w-6 h-6 text-primary/60" /></div><p className="text-lg font-medium text-foreground">Mapeando o campo científico...</p></div></main></div>);
  // Error state
  if (error) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-4 max-w-md px-4"><AlertTriangle className="w-12 h-12 mx-auto text-destructive" /><h2 className="text-lg font-semibold text-foreground">Erro</h2><p className="text-sm text-muted-foreground">{error}</p><Button onClick={handleNewSearch} variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Nova busca</Button></div></main></div>);
  if (!data) return null;

  // Derived data
  const knowledge = data.layers.knowledge;
  const technology = data.layers.technology;
  const policy = data.layers.policy;
  const intl = data.layers.international;
  const indices = data.indices;

  const institutionRanking = Object.entries(knowledge.institutions || {}).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10);
  const topPapers = knowledge.papers.slice(0, 10);
  const flagMap: Record<string, string> = { BR: "🇧🇷", US: "🇺🇸", CN: "🇨🇳", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", CA: "🇨🇦", AU: "🇦🇺", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", CH: "🇨🇭", SE: "🇸🇪", PT: "🇵🇹" };

  const brPapers = knowledge.international.find(c => c.country_code === "BR")?.count || 0;
  const totalPapers = data.stats.papers || 0;
  const brShare = totalPapers > 0 ? (brPapers / totalPapers) * 100 : 0;

  const institutionsWithContracts = new Set(policy.contracts.map(c => c.organ?.toLowerCase().slice(0, 15)).filter(Boolean));
  const isolatedResearchGroups = institutionRanking.filter(([name]) =>
    !Array.from(institutionsWithContracts).some(o => name.toLowerCase().includes(o!) || o!.includes(name.toLowerCase().slice(0, 10)))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        {/* Sticky header with query info */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" />Nova busca</button>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">Investigação: "{data.query}"</p><p className="text-[10px] text-muted-foreground truncate">{data.meta.sources.join(" · ")} · {data.meta.processing_time_ms}ms</p></div>
            <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 flex-shrink-0">{data.meta.source_count} fontes</span>
          </div>
        </div>

        {/* Results dashboard */}
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-0 duration-500">
          {indices && <StrategicIndices indices={indices} />}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { icon: BookOpen, value: data.stats.papers, label: "Papers" },
              { icon: Users, value: data.stats.institutions, label: "Instituições" },
              { icon: Globe, value: data.stats.countries, label: "Países" },
              { icon: GitBranch, value: data.stats.github_repos, label: "Repos" },
              { icon: TrendingUp, value: data.stats.ipeadata_series, label: "Séries" },
              { icon: Beaker, value: data.stats.datasets, label: "Datasets" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3 text-center">
                <s.icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 h-auto p-1 rounded-xl">
              <TabsTrigger value="panorama" className="text-xs rounded-lg">🔬 Panorama</TabsTrigger>
              <TabsTrigger value="saturacao" className="text-xs rounded-lg">📊 Saturação</TabsTrigger>
              <TabsTrigger value="papers" className="text-xs rounded-lg">📄 Papers ({data.stats.papers})</TabsTrigger>
              <TabsTrigger value="lacunas" className="text-xs rounded-lg">🎯 Lacunas</TabsTrigger>
              <TabsTrigger value="financiamento" className="text-xs rounded-lg">💰 Financiamento</TabsTrigger>
              <TabsTrigger value="prescricao" className="text-xs rounded-lg">🧠 IA {isAnalyzing && "…"}</TabsTrigger>
            </TabsList>

            {/* PANORAMA */}
            <TabsContent value="panorama" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Papers mais citados</h3>
                <div className="space-y-1">
                  {topPapers.slice(0, 6).map((p, i) => (
                    <button key={i} onClick={() => openDetail({ type: "paper", data: p })} className="w-full text-left py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-3">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground line-clamp-1">{p.title}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{p.year}</span><span className="text-[10px] font-semibold text-primary">{p.citations} cit.</span>{p.is_open_access && <span className="text-[9px] px-1 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">OA</span>}</div></div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {institutionRanking.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Quem pesquisa isso?</h3>
                  <div className="space-y-1.5">
                    {institutionRanking.map(([inst, count], i) => {
                      const instPapers = knowledge.papers.filter(p => p.authors.some(a => a.institution?.toLowerCase().includes(inst.toLowerCase().slice(0, 10))));
                      const instContracts = policy.contracts.filter(c => c.organ?.toLowerCase().includes(inst.toLowerCase().slice(0, 10)));
                      return (
                        <button key={i} onClick={() => openDetail({ type: "institution", data: { name: inst, count: count as number, papers: instPapers, contracts: instContracts } })} className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                          <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                          <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden"><div className="h-full bg-primary/20 rounded-full" style={{ width: `${Math.min(100, ((count as number) / ((institutionRanking[0]?.[1] as number) || 1)) * 100)}%` }} /><span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground">{inst}</span></div>
                          <span className="text-xs font-bold text-primary w-8 text-right">{count as number}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {knowledge.international.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Distribuição global</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {knowledge.international.slice(0, 10).map((c, i) => {
                      const countryPapers = knowledge.papers.filter(p => p.authors.some(a => a.country === c.country_code));
                      return (
                        <button key={i} onClick={() => openDetail({ type: "country", data: { code: c.country_code, count: c.count, flag: flagMap[c.country_code], papers: countryPapers } })} className="text-center p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors">
                          <p className="text-xl mb-0.5">{flagMap[c.country_code] || "🌍"}</p><p className="text-xs font-medium text-foreground">{c.country_code}</p><p className="text-sm font-bold text-primary">{c.count.toLocaleString()}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* SATURAÇÃO */}
            <TabsContent value="saturacao" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Mapa de Saturação Temática</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-foreground">{data.stats.papers.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Papers globais</p></div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-foreground">{data.stats.countries}</p><p className="text-[10px] text-muted-foreground">Países atuantes</p></div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-foreground">{brShare.toFixed(1)}%</p><p className="text-[10px] text-muted-foreground">Share Brasil</p></div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-foreground">{data.stats.github_repos}</p><p className="text-[10px] text-muted-foreground">Repos abertos</p></div>
                </div>
                <div className="space-y-2">
                  {data.stats.papers > 5000 && data.stats.countries > 20 && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-foreground"><strong>Campo saturado:</strong> {data.stats.papers.toLocaleString()} papers em {data.stats.countries} países.</p></div>
                  )}
                  {data.stats.papers < 500 && (
                    <div className="flex items-start gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"><Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-foreground"><strong>Campo emergente:</strong> Apenas {data.stats.papers} papers. Oportunidade de pioneirismo.</p></div>
                  )}
                  {brShare < 5 && totalPapers > 100 && (
                    <div className="flex items-start gap-2 p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg"><AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" /><p className="text-xs text-foreground"><strong>Baixa participação BR ({brShare.toFixed(1)}%).</strong></p></div>
                  )}
                  {indices?.gt?.value > 70 && (
                    <div className="flex items-start gap-2 p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg"><AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" /><p className="text-xs text-foreground"><strong>Gap de Tradução (GT={indices.gt.value}):</strong> Ciência não traduzida em aplicação.</p></div>
                  )}
                </div>
                {isolatedResearchGroups.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground">Grupos sem vínculo com contratos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {isolatedResearchGroups.map(([name, count], i) => (
                        <button key={i} onClick={() => openDetail({ type: "institution", data: { name, count: count as number, papers: knowledge.papers.filter(p => p.authors.some(a => a.institution?.toLowerCase().includes(name.toLowerCase().slice(0, 10)))) } })} className="text-left flex items-center justify-between px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg hover:bg-amber-500/10 transition-colors">
                          <span className="text-xs text-foreground truncate">{name}</span>
                          <span className="text-xs font-bold text-amber-600 flex-shrink-0">{count as number} papers</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PAPERS */}
            <TabsContent value="papers" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Todos os papers ({knowledge.papers.length})</h3>
                <div className="space-y-1">
                  {knowledge.papers.map((p, i) => (
                    <button key={i} onClick={() => openDetail({ type: "paper", data: p })} className="w-full text-left py-2.5 px-3 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-0">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{p.title}</p>
                      <div className="flex items-center gap-3 mt-1"><span className="text-[10px] text-muted-foreground">{p.year}</span><span className="text-[10px] font-semibold text-primary">{p.citations} citações</span><span className="text-[10px] text-muted-foreground truncate">{p.authors[0]?.name}</span>{p.is_open_access && <span className="text-[9px] px-1 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">OA</span>}</div>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* LACUNAS */}
            <TabsContent value="lacunas" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent" /> Cruzamentos que revelam lacunas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-4"><p className="text-xs font-semibold text-foreground mb-1">Produção Científica</p><p className="text-2xl font-bold text-primary">{data.stats.papers}</p><p className="text-[10px] text-muted-foreground">papers encontrados</p></div>
                  <div className="bg-muted/30 rounded-lg p-4"><p className="text-xs font-semibold text-foreground mb-1">Aplicação Prática</p><p className="text-2xl font-bold text-accent">{data.stats.contracts + data.stats.github_repos}</p><p className="text-[10px] text-muted-foreground">contratos + repos</p></div>
                </div>
                {policy.contracts.length > 0 && data.stats.papers < 200 && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"><p className="text-xs text-foreground"><strong>Oportunidade:</strong> {data.stats.contracts} licitações mas apenas {data.stats.papers} papers — pesquisa aplicada.</p></div>
                )}
                {technology.github_repos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2"><GitBranch className="w-3.5 h-3.5" /> Código aberto disponível</h4>
                    {technology.github_repos.slice(0, 5).map((r, i) => (
                      <button key={i} onClick={() => openDetail({ type: "repo", data: r })} className="w-full text-left flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground truncate">{r.name}</p><p className="text-[10px] text-muted-foreground truncate">{r.description}</p></div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">{r.language && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{r.language}</span>}<span className="text-[10px] font-bold text-primary">⭐{r.stars}</span></div>
                      </button>
                    ))}
                  </div>
                )}
                {policy.convenios.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground">Convênios ativos (possível financiamento)</h4>
                    {policy.convenios.slice(0, 4).map((c, i) => (
                      <button key={i} onClick={() => openDetail({ type: "convenio", data: c })} className="w-full text-left py-2 px-3 bg-accent/5 border border-accent/10 rounded-lg hover:bg-accent/10 transition-colors">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{c.object || "Sem objeto"}</p>
                        <div className="flex gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{c.proponent}</span>{c.value > 0 && <span className="text-[10px] font-semibold text-accent">R$ {(c.value / 1e3).toFixed(0)}mil</span>}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* FINANCIAMENTO */}
            <TabsContent value="financiamento" className="space-y-4">
              {policy.contracts.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Licitações públicas relacionadas</h3>
                  <div className="space-y-1">
                    {policy.contracts.slice(0, 8).map((c, i) => (
                      <button key={i} onClick={() => openDetail({ type: "contract", data: c })} className="w-full text-left py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{c.object || "Sem objeto"}</p>
                        <div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{c.organ?.slice(0, 35)}</span>{c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}mil</span>}{c.uf && <span className="text-[9px] px-1 py-0.5 bg-secondary text-secondary-foreground rounded">{c.uf}</span>}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {policy.convenios.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Convênios federais</h3>
                  <div className="space-y-1">
                    {policy.convenios.slice(0, 6).map((c, i) => (
                      <button key={i} onClick={() => openDetail({ type: "convenio", data: c })} className="w-full text-left py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{c.object}</p>
                        <div className="flex gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{c.grantor}</span>{c.value > 0 && <span className="text-[10px] font-semibold text-accent">R$ {(c.value / 1e3).toFixed(0)}mil</span>}<span className="text-[9px] px-1 py-0.5 bg-secondary text-secondary-foreground rounded">{c.situation}</span></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {intl.macro_indicators.some(m => m.value !== null) && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Contexto macroeconômico</h3>
                  <div className="space-y-1">
                    {intl.macro_indicators.filter(m => m.value !== null).map((m, i) => (
                      <button key={i} onClick={() => openDetail({ type: "indicator", data: m })} className="w-full text-left flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors">
                        <span className="text-xs text-muted-foreground">{m.name}</span>
                        <div className="flex items-center gap-2"><span className="text-sm font-bold text-foreground">{m.value!.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>{m.variation !== null && <span className={`text-[10px] font-medium ${m.variation > 0 ? "text-emerald-600" : "text-red-500"}`}>{m.variation > 0 ? "+" : ""}{m.variation.toFixed(1)}%</span>}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* PRESCRIÇÃO IA */}
            <TabsContent value="prescricao" className="space-y-4">
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="ml-3 text-sm text-muted-foreground">Analisando campo científico com {data.meta.source_count} fontes...</span></div>
              ) : analysis && analysis.sections?.length > 0 ? (
                <div className="space-y-4">
                  {analysis.questions.map((question, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-3"><span className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.color} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>{idx + 1}</span>{question}</h3>
                      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary"><ReactMarkdown>{analysis.sections[idx] || ""}</ReactMarkdown></div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground text-center">Análise baseada em {data.meta.sources.join(" · ")}</p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><Zap className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">Análise IA não disponível.</p></div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      <DataDetailSheet open={detailOpen} onClose={() => setDetailOpen(false)} item={detailItem} />
      <CnaeSelectionModal isOpen={showCnaeModal} onClose={() => { setShowCnaeModal(false); setSuggestedCnaes([]); setPendingSearchQuery(""); }} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
    </div>
  );
};

export default PesquisadorPanel;

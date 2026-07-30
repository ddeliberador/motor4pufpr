import { useState, useCallback, useEffect } from "react";
import { Microscope, Search, ArrowLeft, AlertTriangle, Zap, Globe, BookOpen, Users, GitBranch, TrendingUp, ExternalLink, Beaker, Target, Lightbulb, Briefcase, FlaskConical } from "lucide-react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import { TrlScaleChart } from "@/components/shared/TrlScaleChart";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import { personaConfigs } from "@/config/personas";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import StrategicIndices from "@/components/governo/StrategicIndices";
import DataDetailSheet, { type DetailItem } from "@/components/shared/DataDetailSheet";
import EntityResolutionCard from "@/components/shared/EntityResolutionCard";
import SidraPanel from "@/components/shared/SidraPanel";

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
  const [icts, setIcts] = useState<any>(null);
  const [isLoadingIcts, setIsLoadingIcts] = useState(false);


  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();

  // Lê query pré-preenchida vinda da busca unificada
  useEffect(() => {
    const savedQuery = sessionStorage.getItem("motor4p_query");
    const savedPersona = sessionStorage.getItem("motor4p_persona");
    const savedCnaes = sessionStorage.getItem("motor4p_cnaes");
    const expectedPersona = "pesquisador";

    if (savedQuery && savedPersona === expectedPersona) {
      sessionStorage.removeItem("motor4p_query");
      sessionStorage.removeItem("motor4p_persona");
      sessionStorage.removeItem("motor4p_cnaes");

      const cnaes: CnaeCode[] = savedCnaes ? JSON.parse(savedCnaes) : [];
      setSearchQuery(savedQuery);
      setSelectedCnaes(cnaes);
      setHasSearched(true);
      search(savedQuery, expectedPersona, undefined, cnaes.map((c) => c.code));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca ICTs nacionais quando os dados chegam
  useEffect(() => {
    if (!data?.query || icts !== null || isLoadingIcts) return;
    setIsLoadingIcts(true);
    supabase.functions.invoke("ict-search", { body: { query: data.query } })
      .then(({ data: result }) => {
        if (result && !result.error) setIcts(result);
      })
      .catch(console.warn)
      .finally(() => setIsLoadingIcts(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.query]);

  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();

  const openDetail = useCallback((item: DetailItem) => { setDetailItem(item); setDetailOpen(true); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Vai direto para os resultados — CNAE é opcional e pode ser refinado depois
    setHasSearched(true);
    await search(searchQuery, "pesquisador");
    // Busca CNAEs em background para enriquecer se necessário
    searchCnaes(searchQuery).then(cnaes => {
      if (cnaes.length > 0) setSuggestedCnaes(cnaes);
    });
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => { setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true); await search(pendingSearchQuery, "pesquisador"); };
  const navigate = useNavigate();
  const handleNewSearch = () => { navigate("/"); };

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

  const _brPapers = knowledge.international.find(c => c.country_code === "BR")?.count || 0;
  const totalPapers = knowledge.total_papers || 0;
  const totalPapersGlobal = (knowledge as any).total_papers_global || totalPapers;
  const brShare = totalPapersGlobal > 0 ? (totalPapers / totalPapersGlobal) * 100 : 0;

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
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/30 rounded-xl">
              <TabsTrigger value="openalex" className="text-xs rounded-lg">📄 OpenAlex</TabsTrigger>
              <TabsTrigger value="embrapii" className="text-xs rounded-lg">🔬 P&D Industrial</TabsTrigger>
              <TabsTrigger value="empregabilidade" className="text-xs rounded-lg">💼 CAGED</TabsTrigger>
              <TabsTrigger value="icts" className="text-xs rounded-lg">🏛️ ICTs</TabsTrigger>
              <TabsTrigger value="ia" className="text-xs rounded-lg">🧠 Análise IA {isAnalyzing && "…"}</TabsTrigger>
            </TabsList>

            {/* OPENALEX — produção científica real */}
            <TabsContent value="openalex" className="space-y-4">
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

              {/* Entity Resolution */}
              {knowledge.resolved_institutions && Object.keys(knowledge.resolved_institutions).length > 0 && (
                <EntityResolutionCard resolvedInstitutions={knowledge.resolved_institutions} />
              )}

              {/* Pós-graduação SIDRA — relevante para pesquisador */}
              {(data.layers as any).sidra?.pos_graduacao?.areas?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Capacidade formativa nacional
                    </h3>
                    <a href={(data.layers as any).sidra.pos_graduacao.url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA/IBGE
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    {(data.layers as any).sidra.pos_graduacao.descricao}
                  </p>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.pos_graduacao.areas.slice(0, 6).map((a: any, i: number) => (
                      <div key={i} className="px-3 py-2 bg-muted/30 rounded-lg">
                        <p className="text-xs font-medium text-foreground">{a.area}</p>
                        <div className="flex gap-3 mt-0.5">
                          {a.series.slice(0, 2).map((s: any, j: number) => (
                            <span key={j} className="text-[10px] text-muted-foreground">{s.ano}: <strong className="text-foreground">{s.valor}</strong> pessoas</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Todos os papers */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Todos os papers ({knowledge.papers.length})</h3>
                <div className="space-y-1">
                  {knowledge.papers.map((p, i) => (
                    <button key={i} onClick={() => openDetail({ type: "paper", data: p })} className="w-full text-left py-2.5 px-3 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-0">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{p.title}</p>
                      <div className="flex items-center gap-3 mt-1"><span className="text-[10px] text-muted-foreground">{p.year}</span><span className="text-[10px] font-semibold text-primary">{p.citations} citações</span><span className="text-[10px] text-muted-foreground truncate">{p.authors[0]?.name}</span>{p.is_open_access && <span className="text-[9px] px-1 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">OA</span>}</div>
                      {p.abstract && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.abstract}</p>}
                      {p.doi && <p className="text-[9px] font-mono text-primary mt-0.5">{p.doi}</p>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conceitos e financiadores identificados no OpenAlex */}
              {knowledge.concepts?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Conceitos predominantes</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {knowledge.concepts.slice(0, 15).map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 bg-muted rounded-full text-foreground">{c.name} <strong className="text-primary">{c.count}</strong></span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* P&D INDUSTRIAL — EMBRAPII + PINTEC */}
            <TabsContent value="embrapii" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    P&D Industrial — EMBRAPII + PINTEC/IBGE
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Projetos de P&D industrial identificados nas bases EMBRAPII e PINTEC. A fase do projeto indica o TRL real: Fase 1 = TRL 4–5, Fase 2 = TRL 5–6, Fase 3 = TRL 6–7.
                </p>

                {/* TRL real via EPO — se disponível */}
                {(data.layers as any).patents?.trl_from_patents && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-1">TRL via EPO OPS — dado real</p>
                    <p className="text-2xl font-bold text-foreground font-mono">
                      {(data.layers as any).patents.trl_from_patents.estimate}
                      <span className="text-sm font-normal text-muted-foreground ml-2">/ 9</span>
                    </p>
                    <p className="text-xs text-foreground mt-1">{(data.layers as any).patents.trl_from_patents.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{(data.layers as any).patents.trl_from_patents.rationale}</p>
                    <div className="mt-3">
                      <TrlScaleChart
                        level={(data.layers as any).patents.trl_from_patents.estimate}
                        label={(data.layers as any).patents.trl_from_patents.label}
                      />
                    </div>
                  </div>
                )}

                {/* Projetos EMBRAPII / inovação */}
                {technology.innovation_datasets && technology.innovation_datasets.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projetos identificados</p>
                    {technology.innovation_datasets.slice(0, 6).map((d: any, i: number) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                         className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{d.title}</p>
                          {d.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{d.description}</p>}
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FlaskConical className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhum projeto P&D identificado nas bases abertas para este tema.</p>
                    <a href="https://embrapii.org.br/dados-abertos" target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Consultar EMBRAPII diretamente
                    </a>
                  </div>
                )}

                {/* PINTEC/SIDRA se disponível */}
                {(data.layers as any).sidra?.pintec?.setores?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Inovação setorial — PINTEC/IBGE</p>
                    <div className="space-y-1.5">
                      {(data.layers as any).sidra.pintec.setores.slice(0, 5).map((s: any, i: number) => (
                        <div key={i} className="flex justify-between px-3 py-2 bg-muted/30 rounded-lg">
                          <span className="text-xs text-foreground truncate flex-1">{s.atividade}</span>
                          <span className="text-xs font-bold text-primary ml-2">{s.valor}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2">Fonte: PINTEC {(data.layers as any).sidra.pintec.periodo} — IBGE</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* EMPREGABILIDADE */}
            <TabsContent value="empregabilidade" className="space-y-4">
              {/* Card principal — TRL como âncora de mercado */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Mercado de trabalho neste campo
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Maturidade tecnológica</p>
                    <p className="text-3xl font-bold text-foreground font-mono">{(technology as any).trl_estimate || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(technology as any).trl_label || "Sem dados"}</p>
                    {(technology as any).trl_confidence && (
                      <p className={`text-[9px] mt-1 ${
                        (technology as any).trl_confidence === "high" ? "text-emerald-600"
                        : (technology as any).trl_confidence === "medium" ? "text-muted-foreground"
                        : "text-amber-500"
                      }`}>
                        {(technology as any).trl_confidence === "high" ? "confiança alta"
                         : (technology as any).trl_confidence === "medium" ? "estimado"
                         : "dados insuficientes"}
                      </p>
                    )}
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Repos de código aberto</p>
                    <p className="text-3xl font-bold text-foreground font-mono">{data.stats.github_repos}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {technology.total_stars > 0 ? `${technology.total_stars.toLocaleString()} stars no total` : "GitHub"}
                    </p>
                  </div>
                </div>

                {(technology as any).trl_rationale && (
                  <div className="bg-muted/20 rounded-lg px-4 py-3 border-l-2 border-primary/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Base da classificação</p>
                    <p className="text-xs text-foreground">{(technology as any).trl_rationale}</p>
                  </div>
                )}

                {(() => {
                  const trl = (technology as any).trl_estimate || 0;
                  const faixa = (technology as any).trl_faixa || 1;
                  if (faixa === 3) return (
                    <div className="flex items-start gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <Briefcase className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">Campo com mercado de trabalho ativo</p>
                        <p className="text-xs text-muted-foreground mt-0.5">TRL {trl} indica tecnologia em estágio de demonstração ou mercado. Há demanda por engenheiros, pesquisadores aplicados e especialistas em produto.</p>
                      </div>
                    </div>
                  );
                  if (faixa === 2) return (
                    <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <Briefcase className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">Campo em desenvolvimento — oportunidade para pioneiros</p>
                        <p className="text-xs text-muted-foreground mt-0.5">TRL {trl} indica prototipagem e validação laboratorial. Mercado de trabalho emergente, concentrado em P&D aplicado e startups deep tech.</p>
                      </div>
                    </div>
                  );
                  return (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">Campo em pesquisa básica — mercado ainda acadêmico</p>
                        <p className="text-xs text-muted-foreground mt-0.5">TRL {trl} indica que a tecnologia ainda está em fase fundamental. Empregabilidade concentrada em grupos de pesquisa e pós-graduação.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Financiadores identificados nos papers */}
              {(() => {
                const grants = (knowledge.papers || []).flatMap((p: any) => p.grants || []).filter((g: any) => g.funder);
                const funders = [...new Map(grants.map((g: any) => [g.funder, g])).values()].slice(0, 8);
                if (funders.length === 0) return null;
                return (
                  <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Quem financia pesquisa neste campo
                    </h3>
                    <p className="text-[10px] text-muted-foreground">Identificado nos metadados dos papers via OpenAlex — indica onde há bolsas e contratos de pesquisa ativos.</p>
                    <div className="space-y-1.5">
                      {funders.map((g: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                          <span className="text-[10px] font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                          <p className="text-xs text-foreground flex-1">{g.funder}</p>
                          {g.award && <span className="text-[9px] font-mono text-muted-foreground">{g.award}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Novo CAGED — mercado formal (série nacional MTE/IPEAData) */}
              {(() => {
                const caged = (technology as any).caged_data;
                const nac = caged?.nacional;
                if (!nac) return null;
                const tendenciaIcon = nac.tendencia_geral === "crescimento" ? "↑" : nac.tendencia_geral === "retração" ? "↓" : "→";
                const serie: any[] = nac.serie_saldo || [];
                const maxAbs = Math.max(1, ...serie.map((s) => Math.abs(s.valor)));
                return (
                  <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          Emprego formal — Novo CAGED/MTE
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{nac.periodo} · série nacional (12 meses)</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                        nac.tendencia_geral === "crescimento" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : nac.tendencia_geral === "retração" ? "bg-red-500/10 border-red-500/20 text-red-500"
                        : "bg-muted border-border text-muted-foreground"
                      }`}>
                        {tendenciaIcon} {nac.tendencia_geral}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-emerald-500 font-mono">+{nac.total_admissoes.toLocaleString("pt-BR")}</p>
                        <p className="text-[10px] text-muted-foreground">Admissões</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-red-400 font-mono">-{nac.total_demissoes.toLocaleString("pt-BR")}</p>
                        <p className="text-[10px] text-muted-foreground">Desligamentos</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className={`text-xl font-bold font-mono ${nac.total_saldo >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                          {nac.total_saldo >= 0 ? "+" : ""}{nac.total_saldo.toLocaleString("pt-BR")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Saldo líquido</p>
                      </div>
                    </div>

                    {/* Série mensal do saldo */}
                    {serie.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Saldo mensal</p>
                        <div className="flex items-end gap-1 h-20">
                          {serie.map((s, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${s.data}: ${s.valor.toLocaleString("pt-BR")}`}>
                              <div
                                className={`w-full rounded-sm ${s.valor >= 0 ? "bg-emerald-500/60" : "bg-red-400/60"}`}
                                style={{ height: `${Math.max(3, (Math.abs(s.valor) / maxAbs) * 100)}%` }}
                              />
                              <span className="text-[8px] text-muted-foreground mt-1 font-mono">{s.data.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ocupações mapeadas para o tema */}
                    {caged.ocupacoes?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Ocupações (CBO) associadas ao tema</p>
                        <div className="flex flex-wrap gap-2">
                          {caged.ocupacoes.map((o: any, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded border border-border bg-muted/30 text-muted-foreground">
                              <span className="font-mono">{o.code}</span> · {o.description}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {caged.escopo && (
                      <p className="text-[9px] text-amber-500/90 leading-relaxed">{caged.escopo}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground">Fonte: {caged.source}</p>
                  </div>
                );
              })()}


              {/* Repos como evidência de mercado */}
              {technology.github_repos && technology.github_repos.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Tecnologias e linguagens em uso ({technology.github_repos.length} repos)
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Repositórios open source são proxy de skills técnicas demandadas pelo mercado.</p>

                  {technology.language_distribution && Object.keys(technology.language_distribution).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(technology.language_distribution as Record<string, number>)
                        .sort(([, a], [, b]) => b - a)
                        .map(([lang, count]) => (
                          <span key={lang} className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded font-mono">
                            {lang} ({count})
                          </span>
                        ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    {technology.github_repos.slice(0, 5).map((r: any, i: number) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                         className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {r.language && <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">{r.language}</span>}
                          <span className="text-[10px] font-bold text-primary">⭐ {r.stars}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lacunas" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent" /> Cruzamentos que revelam lacunas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-4"><p className="text-xs font-semibold text-foreground mb-1">Produção Científica</p><p className="text-2xl font-bold text-primary">{data.stats.papers}</p><p className="text-[10px] text-muted-foreground">papers encontrados</p></div>
                  <div className="bg-muted/30 rounded-lg p-4"><p className="text-xs font-semibold text-foreground mb-1">Aplicação Prática</p><p className="text-2xl font-bold text-accent">{data.stats.contracts + data.stats.github_repos}</p><p className="text-[10px] text-muted-foreground">contratos + repos</p></div>
                </div>
                {/* Interpretação automática do gap */}
                {(() => {
                  const papers = data.stats.papers;
                  const aplicacao = data.stats.contracts + data.stats.github_repos;
                  const ratio = aplicacao > 0 ? papers / aplicacao : papers > 0 ? 999 : 0;

                  if (papers === 0 && aplicacao === 0) return (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Nenhum dado encontrado para este tema. Tente um termo mais amplo.</p>
                    </div>
                  );

                  if (ratio > 20) return (
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-foreground">🚨 Gap crítico de tradução</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>{papers.toLocaleString()} papers</strong> e apenas <strong>{aplicacao} aplicações</strong> — ratio {ratio > 100 ? ">100" : ratio.toFixed(0)}:1.
                        O conhecimento existe mas não está sendo traduzido em produtos, contratos ou código.
                      </p>
                      <p className="text-xs text-primary font-medium">→ Oportunidade: pesquisa aplicada ou transferência tecnológica têm demanda reprimida.</p>
                    </div>
                  );

                  if (ratio > 5) return (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-foreground">⚠️ Gap de tradução moderado</p>
                      <p className="text-xs text-muted-foreground">
                        Ratio {ratio.toFixed(1)}:1 (papers/aplicações). Campo com produção científica ativa mas absorção ainda limitada.
                      </p>
                      <p className="text-xs text-primary font-medium">→ Posicione pesquisa na interface ciência-mercado para maior impacto.</p>
                    </div>
                  );

                  if (ratio < 1 && aplicacao > papers && papers > 0) return (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-foreground">✅ Campo com demanda prática maior que produção</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>{aplicacao} aplicações</strong> para <strong>{papers} papers</strong>.
                        Mercado absorve mais do que a academia produz — campo com alta empregabilidade.
                      </p>
                      <p className="text-xs text-primary font-medium">→ Pesquisa aplicada tem mercado garantido neste tema.</p>
                    </div>
                  );

                  return (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <p className="text-xs text-foreground">
                        <strong>Campo equilibrado:</strong> ratio {ratio.toFixed(1)}:1. Boa relação entre produção científica e absorção prática.
                      </p>
                    </div>
                  );
                })()}
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
              {/* Estado vazio — sem instrumentos federais para o termo */}
              {policy.contracts.length === 0 && policy.convenios.length === 0 && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Nenhum contrato ou convênio federal encontrado para este termo</p>
                  <p className="text-xs text-muted-foreground">
                    A busca cobre PNCP e Portal da Transparência (convênios, contratos MCTI/MEC e emendas parlamentares).
                    Termos muito específicos podem não aparecer no objeto dos instrumentos — tente uma formulação mais ampla.
                  </p>
                  {policy.funding_datasets && policy.funding_datasets.length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-foreground mb-2">Datasets de fomento disponíveis (BNDES/Finep/FNDCT)</p>
                      <div className="space-y-1">
                        {policy.funding_datasets.slice(0, 5).map((d: any, i: number) => (
                          <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                             className="block px-3 py-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                            <p className="text-xs font-medium text-foreground line-clamp-1">{d.title}</p>
                            <span className="text-[9px] text-primary">↗ Acessar dataset</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
              {(policy as any).emendas?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Emendas parlamentares</h3>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Portal da Transparência · {(policy as any).emendas[0]?.contextual ? "funções orçamentárias correlatas" : "aderentes ao tema"}
                  </p>
                  <div className="space-y-1">
                    {(policy as any).emendas.slice(0, 6).map((e: any, i: number) => (
                      <div key={i} className="py-2 px-3 border-b border-border/30 last:border-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{e.author} — {e.subfunction || e.function}</p>
                        <div className="flex gap-2 mt-0.5 items-center">
                          <span className="text-[10px] text-muted-foreground">{e.locality} · {e.year}</span>
                          {e.paid > 0 && <span className="text-[10px] font-semibold text-accent">R$ {(e.paid / 1e3).toFixed(0)}mil pagos</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(policy as any).budget_execution?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Execução orçamentária federal em CT&amp;I</h3>
                  <p className="text-[10px] text-muted-foreground mb-3">Portal da Transparência · MCTI e MEC</p>
                  <div className="space-y-1">
                    {(policy as any).budget_execution.slice(0, 8).map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-2 px-3 border-b border-border/30 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs text-foreground truncate">{b.organ}</p>
                          <p className="text-[10px] text-muted-foreground">{b.superior} · {b.year}</p>
                        </div>
                        <span className="text-xs font-semibold text-primary whitespace-nowrap">R$ {(b.paid / 1e9).toFixed(2)} bi</span>
                      </div>
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

              {/* SIDRA — dados estruturais IBGE */}
              {(data.layers as any).sidra?.pintec?.setores?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Inovação no setor — PINTEC/IBGE
                    </h3>
                    <a href={(data.layers as any).sidra.pintec.url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    {(data.layers as any).sidra.pintec.descricao} · {(data.layers as any).sidra.pintec.periodo}
                  </p>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.pintec.setores.slice(0, 6).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-foreground truncate flex-1">{s.atividade}</span>
                        <span className="text-xs font-bold text-primary ml-2 flex-shrink-0">{s.valor}{s.unidade === "%" ? "%" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.layers as any).sidra?.cempre?.setores?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Empresas no setor — CEMPRE/IBGE</h3>
                    <a href={(data.layers as any).sidra.cempre.url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    {(data.layers as any).sidra.cempre.descricao} · {(data.layers as any).sidra.cempre.periodo}
                  </p>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.cempre.setores.slice(0, 5).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-foreground truncate flex-1">{s.atividade}</span>
                        <div className="flex gap-3 flex-shrink-0 ml-2">
                          {s.empresas && <span className="text-[10px] text-muted-foreground">{s.empresas} emp.</span>}
                          {s.pessoal && <span className="text-[10px] font-semibold text-primary">{s.pessoal} pessoas</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ESTRUTURA IBGE / SIDRA */}
            <TabsContent value="sidra" className="space-y-4">
              <SidraPanel sidra={(data.layers as any).sidra} />
            </TabsContent>




            {/* ICTs NACIONAIS */}
            <TabsContent value="icts" className="space-y-4">
              {isLoadingIcts ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Identificando ICTs nacionais em {data.query}...</span>
                </div>
              ) : icts ? (
                <div className="space-y-4">
                  {icts.overview && (
                    <div className="bg-card border border-border rounded-xl p-5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ecossistema brasileiro</p>
                      <p className="text-sm text-foreground leading-relaxed">{icts.overview}</p>
                    </div>
                  )}

                  {icts.icts?.length > 0 ? (
                    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-primary" />
                        Centros e Institutos de P&D ({icts.icts.length})
                      </h3>
                      <div className="space-y-3">
                        {icts.icts.map((ict: any, i: number) => (
                          <div key={i} className="border border-border/50 rounded-lg p-4 hover:border-border transition-colors">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="text-sm font-semibold text-foreground">{ict.name}</p>
                                  {ict.acronym && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono">{ict.acronym}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                  {ict.city && ict.state && <span>📍 {ict.city}/{ict.state}</span>}
                                  {ict.type && <span className="px-1.5 py-0.5 bg-muted rounded">{ict.type}</span>}
                                  {ict.ministerio && <span className="text-muted-foreground/60">{ict.ministerio}</span>}
                                </div>
                              </div>
                              {ict.url && (
                                <a
                                  href={ict.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 flex items-center gap-1 text-[10px] text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  site
                                </a>
                              )}
                            </div>
                            {ict.focus && (
                              <p className="text-xs text-muted-foreground border-t border-border/30 pt-2 mt-2">{ict.focus}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-xl p-8 text-center">
                      <FlaskConical className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Nenhum ICT nacional identificado para este tema específico.</p>
                      <p className="text-xs text-muted-foreground mt-1">Tente um termo mais amplo ou verifique a aba Panorama.</p>
                    </div>
                  )}

                  {icts.networks?.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Redes e Programas Nacionais</h3>
                      <div className="space-y-2">
                        {icts.networks.map((net: any, i: number) => (
                          <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-border/30 last:border-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground">{net.name}</p>
                              {net.description && <p className="text-[10px] text-muted-foreground mt-0.5">{net.description}</p>}
                            </div>
                            {net.url && (
                              <a href={net.url} target="_blank" rel="noopener noreferrer"
                                 className="flex-shrink-0 flex items-center gap-1 text-[10px] text-primary hover:underline">
                                <ExternalLink className="w-3 h-3" />
                                acessar
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground text-center">
                    Dados gerados por IA com base em fontes públicas — verifique os links antes de usar
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">Clique na aba para carregar os ICTs nacionais.</p>
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
                <div className="text-center py-12 space-y-3">
                  <Zap className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Prescrição IA não disponível.</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Configure <code className="bg-muted px-1 rounded">LOVABLE_API_KEY</code> ou{" "}
                    <code className="bg-muted px-1 rounded">ANTHROPIC_API_KEY</code> nos Secrets do Supabase para ativar análises prescritivas.
                  </p>
                </div>
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

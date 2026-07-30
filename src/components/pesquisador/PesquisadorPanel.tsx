import CagedSaldoChart from "@/components/shared/CagedSaldoChart";
import TrlScaleBar from "@/components/shared/TrlScaleBar";
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
import { NovaIndustriaTab, PbiaTab, FomentoTab } from "@/components/shared/ProgramsTabs";
import PoliciesTab from "@/components/shared/PoliciesTab";

const PesquisadorPanel = () => {
  const config = personaConfigs.pesquisador;
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("openalex");
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [icts, setIcts] = useState<any>(null);
  const [isLoadingIcts, setIsLoadingIcts] = useState(false);
  const [cnpqData, setCnpqData] = useState<any>(null);


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
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/30 rounded-xl mb-4">
              <TabsTrigger value="openalex" className="text-xs rounded-lg">📄 OpenAlex</TabsTrigger>
              <TabsTrigger value="embrapii" className="text-xs rounded-lg">🔬 P&D Industrial</TabsTrigger>
              <TabsTrigger value="empregabilidade" className="text-xs rounded-lg">💼 CAGED</TabsTrigger>
              <TabsTrigger value="icts" className="text-xs rounded-lg">🏛️ ICTs Nacionais</TabsTrigger>
              <TabsTrigger value="cnpq" className="text-xs rounded-lg">🎓 Bolsas CNPq</TabsTrigger>
              {(data.layers as any).programs?.context?.industrial && (
                <TabsTrigger value="nova-industria" className="text-xs rounded-lg">🏭 Nova Indústria BR</TabsTrigger>
              )}
              {(data.layers as any).programs?.context?.ia && (
                <TabsTrigger value="pbia" className="text-xs rounded-lg">🤖 PBIA</TabsTrigger>
              )}
              <TabsTrigger value="fomento" className="text-xs rounded-lg">💡 Fomento</TabsTrigger>
              <TabsTrigger value="politicas" className="text-xs rounded-lg">📋 Políticas</TabsTrigger>
              <TabsTrigger value="ia" className="text-xs rounded-lg">🧠 Análise IA {isAnalyzing && "…"}</TabsTrigger>
            </TabsList>

            <TabsContent value="openalex" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Papers BR", value: data.stats.papers.toLocaleString("pt-BR"), sub: "produção nacional" },
                  { label: "Instituições", value: data.stats.institutions, sub: "ativas no campo" },
                  { label: "Países parceiros", value: data.stats.countries, sub: "coautorias" },
                  { label: "Share BR/global", value: (knowledge as any).total_papers_global > 0 ? `${(((knowledge as any).total_papers / (knowledge as any).total_papers_global) * 100).toFixed(1)}%` : "—", sub: "da produção mundial" },
                ].map((m, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-2xl font-bold font-mono text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{m.sub}</p>
                  </div>
                ))}
              </div>

              {knowledge.institutions && Object.keys(knowledge.institutions).length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Instituições líderes no campo</h3>
                    <a href="https://openalex.org" target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> OpenAlex
                    </a>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(knowledge.institutions as Record<string, number>)
                      .sort(([, a], [, b]) => b - a).slice(0, 8)
                      .map(([inst, count], i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                          <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                          <span className="text-xs text-foreground flex-1 truncate">{inst}</span>
                          <span className="text-xs font-bold text-primary flex-shrink-0">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {knowledge.international && knowledge.international.filter((c: any) => c.country_code !== "BR").length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Países com coautoria</h3>
                  <div className="space-y-1">
                    {knowledge.international.filter((c: any) => c.country_code !== "BR").slice(0, 8).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-1.5 bg-muted/20 rounded">
                        <span className="text-xs font-mono text-muted-foreground w-6">{c.country_code}</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (c.count / Math.max(...knowledge.international.map((x: any) => x.count))) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-foreground w-8 text-right">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const grants = (knowledge.papers || []).flatMap((p: any) => p.grants || []).filter((g: any) => g.funder);
                const funders = [...new Map(grants.map((g: any) => [g.funder, g])).values()].slice(0, 8) as any[];
                if (!funders.length) return null;
                return (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Financiadores identificados nos papers</h3>
                    <div className="space-y-1.5">
                      {funders.map((g: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                          <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                          <span className="text-xs text-foreground flex-1">{g.funder}</span>
                          {g.award && <span className="text-[9px] font-mono text-muted-foreground">{g.award}</span>}
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2">Extraído dos metadados dos papers via OpenAlex</p>
                  </div>
                );
              })()}

              {knowledge.papers && knowledge.papers.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Papers recentes ({(knowledge as any).total_papers?.toLocaleString("pt-BR")} no total)</h3>
                  <div className="space-y-3">
                    {knowledge.papers.slice(0, 8).map((p: any, i: number) => (
                      <div key={i} className="p-3 border border-border/50 rounded-lg">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <a href={p.doi ? `https://doi.org/${p.doi}` : p.url || "#"} target="_blank" rel="noopener noreferrer"
                             className="text-xs font-medium text-primary hover:underline flex-1 leading-snug line-clamp-2">
                            {p.title || "Sem título"}
                          </a>
                          {p.year && <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{p.year}</span>}
                        </div>
                        {p.abstract && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{p.abstract}</p>}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {(p.citations ?? p.cited_by_count) > 0 && <span className="text-[9px] text-muted-foreground">{p.citations ?? p.cited_by_count} citações</span>}
                          {p.is_open_access && <span className="text-[9px] px-1 bg-emerald-500/10 text-emerald-600 rounded">open access</span>}
                          {(p.grants || []).length > 0 && <span className="text-[9px] px-1 bg-blue-500/10 text-blue-600 rounded">financiado</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.layers as any).sidra?.pos_graduacao?.areas?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Capacidade formativa — INEP/IBGE</h3>
                    <a href={(data.layers as any).sidra.pos_graduacao.url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA
                    </a>
                  </div>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.pos_graduacao.areas.slice(0, 6).map((a: any, i: number) => (
                      <div key={i} className="px-3 py-2 bg-muted/30 rounded-lg">
                        <p className="text-xs font-medium text-foreground">{a.area}</p>
                        <div className="flex gap-3 mt-0.5">
                          {a.series.slice(0, 2).map((s: any, j: number) => (
                            <span key={j} className="text-[10px] text-muted-foreground">
                              {s.ano}: <strong className="text-foreground">{s.valor}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="embrapii" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    P&D Industrial — EMBRAPII + PINTEC/IBGE
                  </h3>
                  <a href="https://embrapii.org.br/dados-abertos" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> EMBRAPII
                  </a>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Projetos P&D industriais identificados. A fase do projeto indica TRL real: Fase 1 = TRL 4–5, Fase 2 = TRL 5–6, Fase 3 = TRL 6–7.
                </p>

                <TrlScaleBar
                  trlData={(data.layers as any).patents?.trl_from_patents}
                  fallback={(technology as any).trl_estimate}
                />

                {(technology as any).innovation_datasets && (technology as any).innovation_datasets.length > 0 ? (
                  <div className="space-y-2">
                    {(technology as any).innovation_datasets.slice(0, 6).map((d: any, i: number) => (
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
                      <ExternalLink className="w-3 h-3" /> Consultar EMBRAPII
                    </a>
                  </div>
                )}

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
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="empregabilidade" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Mercado de trabalho — Novo CAGED / MTE
                  </h3>
                  <a href="https://www.gov.br/trabalho-e-emprego" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> MTE
                  </a>
                </div>
                {(technology as any).caged_data ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold font-mono text-emerald-500">+{(technology as any).caged_data.nacional?.total_admissoes?.toLocaleString("pt-BR") || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">admissões (12m)</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold font-mono text-red-500">-{(technology as any).caged_data.nacional?.total_demissoes?.toLocaleString("pt-BR") || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">demissões (12m)</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className={`text-xl font-bold font-mono ${(technology as any).caged_data.nacional?.total_saldo >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {(technology as any).caged_data.nacional?.total_saldo >= 0 ? "+" : ""}{(technology as any).caged_data.nacional?.total_saldo?.toLocaleString("pt-BR") || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">saldo líquido</p>
                      </div>
                    </div>
                    {(technology as any).caged_data.ocupacoes?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Ocupações mapeadas (CBO)</p>
                        <div className="flex flex-wrap gap-2">
                          {(technology as any).caged_data.ocupacoes.map((o: any, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-1 bg-muted rounded">
                              {o.description} <span className="font-mono text-muted-foreground/60">{o.code}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <CagedSaldoChart serie={(technology as any).caged_data.nacional?.serie_saldo} gradientId="cagedGradPesq" />
                    <p className="text-[9px] text-muted-foreground">{(technology as any).caged_data.escopo}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Dados do CAGED não disponíveis para este tema.</p>
                )}
              </div>
              {technology.github_repos && technology.github_repos.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Habilidades técnicas em demanda — GitHub</h3>
                  {technology.language_distribution && Object.keys(technology.language_distribution).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
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
                         className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors">
                        <p className="text-xs text-foreground truncate flex-1">{r.name}</p>
                        <span className="text-[10px] font-bold text-primary flex-shrink-0 ml-2">⭐ {r.stars}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
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

            {/* BOLSAS CNPQ */}
            <TabsContent value="cnpq" className="space-y-4">
              {(() => {
                const cnpq = (data.layers as any).cnpq;
                if (!cnpq) return (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Carregando dados CNPq...</p>
                  </div>
                );

                return (
                  <div className="space-y-4">

                    {/* Modalidades de bolsa */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          Modalidades de bolsa CNPq
                        </h3>
                        <a href="https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/programas-de-bolsas"
                           target="_blank" rel="noopener noreferrer"
                           className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> CNPq
                        </a>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cnpq.modalidades?.map((m: any, i: number) => (
                          <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                             className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors">
                            <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-1 rounded flex-shrink-0">{m.sigla}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground">{m.nome}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{m.descricao}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {m.niveis.map((n: string, j: number) => (
                                  <span key={j} className="text-[9px] px-1 bg-muted rounded font-mono">{n}</span>
                                ))}
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Convênios CNPq por universidade (Transparência) */}
                    {cnpq.convenios && cnpq.convenios.total > 0 && (
                      <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Convênios CNPq/MCTI por instituição — Portal da Transparência
                          </h3>
                          <div className="text-right">
                            <p className="text-xs font-bold text-primary">R$ {(cnpq.convenios.total_valor / 1e6).toFixed(1)}M</p>
                            <p className="text-[9px] text-muted-foreground">{cnpq.convenios.total} convênios</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-3">
                          Convênios do MCTI (órgão 24000) relacionados ao tema "{data.query}" — dados reais do Portal da Transparência.
                        </p>
                        <div className="space-y-2">
                          {cnpq.convenios.ranking_ies.slice(0, 10).map((ies: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                              <span className="text-[10px] font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{ies.convenente}</p>
                                <p className="text-[10px] text-muted-foreground">{ies.count} convênio{ies.count > 1 ? "s" : ""}{ies.uf ? ` · ${ies.uf}` : ""}</p>
                              </div>
                              <span className="text-xs font-bold text-primary flex-shrink-0">
                                R$ {(ies.valor / 1e6).toFixed(2)}M
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CNPq identificado nos papers (OpenAlex grants) */}
                    {(() => {
                      const papers = (data.layers.knowledge as any).papers || [];
                      const cnpqPapers = papers.filter((p: any) =>
                        (p.grants || []).some((g: any) =>
                          g.funder?.toLowerCase().includes("cnpq") ||
                          g.funder?.toLowerCase().includes("conselho nacional") ||
                          g.funder?.toLowerCase().includes("capes") ||
                          g.funder?.toLowerCase().includes("fapesp") ||
                          g.funder?.toLowerCase().includes("fapemig") ||
                          g.funder?.toLowerCase().includes("faperj")
                        )
                      );
                      if (!cnpqPapers.length) return null;

                      const byFunder: Record<string, number> = {};
                      for (const p of cnpqPapers) {
                        for (const g of (p.grants || [])) {
                          if (g.funder) byFunder[g.funder] = (byFunder[g.funder] || 0) + 1;
                        }
                      }

                      return (
                        <div className="bg-card border border-border rounded-xl p-5">
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Agências financiadoras identificadas nos papers — OpenAlex
                          </h3>
                          <p className="text-[10px] text-muted-foreground mb-3">
                            {cnpqPapers.length} de {papers.length} papers têm agência de fomento declarada nos metadados.
                          </p>
                          <div className="space-y-1.5">
                            {Object.entries(byFunder)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .slice(0, 8)
                              .map(([funder, count], i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                                  <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                                  <span className="text-xs text-foreground flex-1 truncate">{funder}</span>
                                  <span className="text-xs font-bold text-primary flex-shrink-0">{count as number} paper{(count as number) > 1 ? "s" : ""}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Datasets CNPq */}
                    {cnpq.datasets?.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-foreground mb-3">Bases de dados CNPq — dados.gov.br</h3>
                        <div className="space-y-2">
                          {cnpq.datasets.slice(0, 5).map((d: any, i: number) => (
                            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                               className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground line-clamp-1">{d.title}</p>
                                {d.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{d.description}</p>}
                                {d.resources?.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {d.resources.map((r: any, j: number) => (
                                      <span key={j} className="text-[9px] px-1 bg-muted rounded font-mono">{r.format || "CSV"}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links úteis */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Links diretos — acesso ao fomento</h3>
                      <div className="space-y-2">
                        {cnpq.links_uteis?.map((l: any, i: number) => (
                          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                             className="flex items-center justify-between px-3 py-2.5 border border-border/50 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors">
                            <span className="text-xs text-foreground">{l.label}</span>
                            <ExternalLink className="w-3 h-3 text-primary flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-3 text-center">
                        Fonte: Portal da Transparência (convênios MCTI) · dados.gov.br (CNPq) · OpenAlex (grants em papers)
                      </p>
                    </div>

                  </div>
                );
              })()}
            </TabsContent>

            {/* PRESCRIÇÃO IA */}
            <TabsContent value="politicas" className="space-y-4">
              <PoliciesTab
                policies={(data.layers as any).policies}
                persona="pesquisador"
                query={data.query}
              />
            </TabsContent>
            <TabsContent value="ia" className="space-y-4">
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

            {(data.layers as any).programs?.context?.industrial && (
              <TabsContent value="nova-industria" className="space-y-4">
                <NovaIndustriaTab ni={(data.layers as any).programs?.nova_industria} />
              </TabsContent>
            )}

            {(data.layers as any).programs?.context?.ia && (
              <TabsContent value="pbia" className="space-y-4">
                <PbiaTab pbia={(data.layers as any).programs?.pbia} />
              </TabsContent>
            )}

            <TabsContent value="fomento" className="space-y-4">
              <FomentoTab fom={(data.layers as any).programs?.fomento} />
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

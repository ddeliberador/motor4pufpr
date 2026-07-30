import { useState, useEffect } from "react";
import { Building2, Search, ArrowLeft, AlertTriangle, Zap, MapPin, Globe, BookOpen, Landmark, Shield, FileText, Activity, GitBranch, Target } from "lucide-react";
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
import StrategicIndices from "./StrategicIndices";
import RelationalGraph from "./RelationalGraph";
import EntityResolutionCard from "@/components/shared/EntityResolutionCard";
import MarketAnalysisPanel from "@/components/shared/MarketAnalysisPanel";

const GovernoPanel = () => {
  const config = personaConfigs.governo;
  const [searchQuery, setSearchQuery] = useState("");
  const [govLevel, setGovLevel] = useState<"federal" | "estadual" | "municipal">("federal");
  const [govLocation, setGovLocation] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [selectedCnaes, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("diagnostico");

  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();

  // Lê query pré-preenchida vinda da busca unificada
  useEffect(() => {
    const savedQuery = sessionStorage.getItem("motor4p_query");
    const savedPersona = sessionStorage.getItem("motor4p_persona");
    const savedCnaes = sessionStorage.getItem("motor4p_cnaes");
    const expectedPersona = "governo";

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
  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    await search(searchQuery, "governo", { entityName: govLocation, govLevel, location: govLocation });
    searchCnaes(searchQuery).then(cnaes => {
      if (cnaes.length > 0) setSuggestedCnaes(cnaes);
    });
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => { setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true); await search(pendingSearchQuery, "governo", { entityName: govLocation, govLevel, location: govLocation }); };
  const navigate = useNavigate();
  const handleNewSearch = () => { navigate("/"); };

  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="w-full max-w-2xl mx-auto text-center space-y-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" />Voltar</Link>
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}><Building2 className="w-8 h-8 text-white" /></div>
            <div><h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">Diagnóstico de Política Pública</h1><p className="text-muted-foreground text-sm">Onde investir? Qual região está atrasada? Os instrumentos funcionam?</p></div>
            <form onSubmit={handleSearch} className="w-full space-y-3">
              <div className="flex gap-2">
                <select value={govLevel} onChange={(e) => setGovLevel(e.target.value as "federal" | "estadual" | "municipal")} className="h-12 rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm">
                  <option value="federal">Federal</option>
                  <option value="estadual">Estadual</option>
                  <option value="municipal">Municipal</option>
                </select>
                <input type="text" value={govLocation} onChange={(e) => setGovLocation(e.target.value)} placeholder={govLevel === "federal" ? "Brasil" : govLevel === "estadual" ? "Estado — ex: Paraná, São Paulo..." : "Cidade — ex: Curitiba, Recife..."} className="flex-1 h-12 rounded-2xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" />
              </div>
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Objeto tecnológico — ex: grafeno, baterias de lítio, semicondutores..." className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" autoFocus /></div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim()} className={`w-full h-12 rounded-xl bg-gradient-to-r ${config.color} text-white text-base font-medium gap-2`}>{isLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Consultando bases...</>) : (<><Search className="w-4 h-4" />Diagnosticar</>)}</Button>
            </form>
            <div className="flex flex-wrap justify-center gap-2">
              {["semicondutores", "baterias de lítio", "grafeno", "hidrogênio verde"].map((q) => (<button key={q} onClick={() => setSearchQuery(q)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">{q}</button>))}
            </div>
          </div>
        </main>
        <CnaeSelectionModal isOpen={showCnaeModal} onClose={() => { setShowCnaeModal(false); setSuggestedCnaes([]); setPendingSearchQuery(""); }} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
      </div>
    );
  }

  if (isLoading) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-6"><div className="relative w-16 h-16 mx-auto"><div className="absolute inset-0 border-4 border-primary/20 rounded-full" /><div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" /><Zap className="absolute inset-0 m-auto w-6 h-6 text-primary/60" /></div><p className="text-lg font-medium text-foreground">Consultando 4 camadas analíticas...</p></div></main></div>);
  if (error) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-4 max-w-md px-4"><AlertTriangle className="w-12 h-12 mx-auto text-destructive" /><h2 className="text-lg font-semibold text-foreground">Erro</h2><p className="text-sm text-muted-foreground">{error}</p><Button onClick={handleNewSearch} variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Nova busca</Button></div></main></div>);
  if (!data) return null;

   const knowledge = data.layers.knowledge;
  const technology = data.layers.technology;
  const policy = data.layers.policy;
  const indices = data.indices;
  const totalContractValue = policy.total_contract_value || 0;
  const totalConvenioValue = policy.total_convenio_value || 0;
  const trlEstimate = technology.trl_estimate || 2;
  const trlLabel = technology.trl_label || "Sem dados";
  const repos = technology.github_repos || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" />Nova busca</button>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{govLocation ? `Gov. ${govLevel} — ${govLocation} ×` : "Diagnóstico:"} "{data.query}"</p><p className="text-[10px] text-muted-foreground truncate">{data.meta.sources.join(" · ")} · {data.meta.processing_time_ms}ms</p></div>
            <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 flex-shrink-0">{data.meta.source_count} fontes</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-0 duration-500">
          {indices && <StrategicIndices indices={indices} />}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { icon: BookOpen, value: data.stats.papers, label: "Papers" },
              { icon: Landmark, value: data.stats.contracts, label: "Licitações" },
              { icon: Shield, value: data.stats.convenios, label: "Convênios" },
              { icon: Globe, value: data.stats.countries, label: "Países" },
              { icon: FileText, value: data.stats.datasets, label: "Datasets" },
              { icon: Activity, value: data.stats.macro_indicators, label: "Indicadores" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3 text-center"><s.icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" /><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 h-auto p-1 rounded-xl">
              <TabsTrigger value="diagnostico" className="text-xs rounded-lg">🎯 Diagnóstico</TabsTrigger>
              <TabsTrigger value="maturidade" className="text-xs rounded-lg">⚙️ Maturidade (TRL)</TabsTrigger>
              <TabsTrigger value="relacional" className="text-xs rounded-lg">🔗 Mapa Relacional</TabsTrigger>
              <TabsTrigger value="mercado" className="text-xs rounded-lg">🏭 Análise de Mercado</TabsTrigger>
              <TabsTrigger value="patentes" className="text-xs rounded-lg">🔏 Patentes EPO</TabsTrigger>
              <TabsTrigger value="territorial" className="text-xs rounded-lg">📍 Territorial</TabsTrigger>
              <TabsTrigger value="instrumentos" className="text-xs rounded-lg">🏛️ Instrumentos</TabsTrigger>
              <TabsTrigger value="prescricao" className="text-xs rounded-lg">🧠 Prescrição IA {isAnalyzing && "…"}</TabsTrigger>
            </TabsList>

            <TabsContent value="diagnostico" className="space-y-4">
              {isAnalyzing && (<div className="bg-card border border-primary/20 rounded-xl p-5 flex items-center gap-3"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-sm text-muted-foreground">Cruzando 4 camadas para gerar diagnóstico...</span></div>)}
              {analysis && analysis.sections?.length > 0 && (
                <div className="space-y-4">
                  {analysis.questions.map((question, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><span className={`w-6 h-6 rounded-full bg-gradient-to-br ${config.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>{idx + 1}</span>{question}</h3>
                      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary"><ReactMarkdown>{analysis.sections[idx] || ""}</ReactMarkdown></div>
                    </div>
                  ))}
                </div>
              )}
              {indices && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Cruzamentos Automáticos</h3>
                  <div className="space-y-2">
                    {indices.gt?.value > 70 && (<div className="flex items-start gap-2 p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg"><AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" /><p className="text-xs text-foreground"><strong>Gap Crítico (GT={indices.gt.value}):</strong> {data.stats.papers} papers vs {data.stats.contracts} licitações e {data.stats.convenios} convênios.</p></div>)}
                    {indices.cd?.value > 60 && (<div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"><Globe className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-foreground"><strong>Dependência (CD={indices.cd.value}%):</strong> Produção científica estrangeira dominante.</p></div>)}
                    {indices.aue?.value < 20 && (<div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"><Landmark className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-foreground"><strong>Desarticulação (AUE={indices.aue.value}%):</strong> Universidade e governo desconectados.</p></div>)}
                    {indices.gt?.value <= 70 && indices.cd?.value <= 60 && indices.aue?.value >= 20 && (<p className="text-xs text-muted-foreground">Nenhum alerta crítico.</p>)}
                  </div>
                </div>
              )}
              {/* Painel de cobertura de fontes */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fontes consultadas</h3>
                <div className="flex flex-wrap gap-2">
                  {data.meta.sources.map((src, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                      ✓ {src}
                    </span>
                  ))}
                  {!data.meta.sources.includes("Transparência") && (
                    <span className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded-full border border-border">
                      ○ Transparência (requer API key)
                    </span>
                  )}
                  {!data.meta.sources.includes("SICONFI") && (
                    <span className="text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded-full border border-border">
                      ○ SICONFI
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" />Volume Instrumental</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Licitações PNCP</span><span className="text-xs font-bold text-foreground">{data.stats.contracts} ({totalContractValue > 0 ? `R$ ${(totalContractValue / 1e6).toFixed(1)}M` : "sem valor"})</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Convênios Federais</span><span className="text-xs font-bold text-foreground">{data.stats.convenios} ({totalConvenioValue > 0 ? `R$ ${(totalConvenioValue / 1e6).toFixed(1)}M` : "sem valor"})</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Diários Oficiais</span><span className="text-xs font-bold text-foreground">{data.stats.gazettes} menções</span></div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />Produção Científica</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Papers totais</span><span className="text-xs font-bold text-foreground">{data.stats.papers.toLocaleString("pt-BR")}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Países atuantes</span><span className="text-xs font-bold text-foreground">{data.stats.countries}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground">Instituições BR</span><span className="text-xs font-bold text-foreground">{data.stats.institutions}</span></div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* MATURIDADE TECNOLÓGICA (TRL) */}
            <TabsContent value="maturidade" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Maturidade Tecnológica — TRL Estimado</h3>
                <p className="text-[10px] text-muted-foreground">Avaliação automática baseada em sinais de ciência, tecnologia, contratos e mercado para apoiar decisões de alocação de recursos.</p>
                <TrlScaleChart level={trlEstimate} label={trlLabel} />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { label: "Papers científicos", ok: technology.trl_signals?.has_papers },
                    { label: "Código aberto", ok: technology.trl_signals?.has_repos },
                    { label: "Patentes/dados", ok: technology.trl_signals?.has_patents },
                    { label: "Emprego formal", ok: technology.trl_signals?.has_employment },
                    { label: "Alta visibilidade", ok: technology.trl_signals?.high_stars },
                  ].map((s, i) => (
                    <div key={i} className={`text-center p-2 rounded-lg ${s.ok ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/30 border border-border"}`}>
                      <span className="text-lg">{s.ok ? "✓" : "—"}</span>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                {trlEstimate <= 3 && (
                  <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground"><strong>TRL baixo ({trlEstimate}):</strong> Campo ainda em pesquisa básica. Investimento deve priorizar P&D, não produção.</p>
                  </div>
                )}
                {trlEstimate >= 7 && (
                  <div className="flex items-start gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <Target className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground"><strong>TRL alto ({trlEstimate}):</strong> Tecnologia madura. Priorizar incentivos à produção e escala industrial.</p>
                  </div>
                )}
              </div>
              {repos.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><GitBranch className="w-4 h-4 text-primary" /> Projetos open source ({repos.length})</h3>
                  <div className="space-y-1">
                    {repos.slice(0, 6).map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {r.language && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{r.language}</span>}
                          <span className="text-[10px] font-bold text-primary">⭐{r.stars}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {knowledge.resolved_institutions && Object.keys(knowledge.resolved_institutions).length > 0 && (
                <EntityResolutionCard resolvedInstitutions={knowledge.resolved_institutions} />
              )}
            </TabsContent>

            <TabsContent value="relacional"><RelationalGraph data={data} /></TabsContent>

            <TabsContent value="mercado" className="space-y-4">
              <MarketAnalysisPanel
                data={(data?.layers as any)?.market}
                cempre={(data?.layers as any)?.sidra?.cempre}
                perfil="governo"
              />
            </TabsContent>

            <TabsContent value="patentes" className="space-y-4">
              <PatentsPanel patents={(data?.layers as any)?.patents} />
            </TabsContent>



            <TabsContent value="territorial" className="space-y-4">
              {(!policy.uf_distribution || Object.keys(policy.uf_distribution).length === 0) ? (
                <div className="bg-card border border-amber-500/20 rounded-xl p-5 space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    Mapa territorial indisponível
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A distribuição por UF é calculada a partir dos contratos do PNCP, convênios e emendas
                    parlamentares do Portal da Transparência. Não foram encontrados instrumentos com
                    localização identificada para este termo.
                  </p>
                  <a href="https://portaldatransparencia.gov.br/convenios"
                     target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    Consultar no Portal da Transparência →
                  </a>

                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Distribuição por estado
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(policy.uf_distribution)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([uf, count]) => (
                        <div key={uf} className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground w-8">{uf}</span>
                          <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                            <div
                              className="h-full bg-primary/20 rounded-full"
                              style={{ width: `${Math.min(100, ((count as number) / Math.max(...Object.values(policy.uf_distribution) as number[])) * 100)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground">
                              {count as number} contrato{(count as number) !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                  {Object.keys(policy.uf_distribution).length < 5 && (
                    <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Concentração territorial alta
                    </p>
                  )}
                </div>
              )}
              {Object.keys(knowledge.institutions || {}).length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Capacidades Instaladas</h3>
                  <div className="space-y-1.5">
                    {Object.entries(knowledge.institutions).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10).map(([inst, count], i) => (
                      <div key={i} className="flex items-center gap-3"><span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span><div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden"><div className="h-full bg-primary/20 rounded-full" style={{ width: `${Math.min(100, ((count as number) / (Object.values(knowledge.institutions)[0] as number || 1)) * 100)}%` }} /><span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground">{inst}</span></div><span className="text-xs font-bold text-primary w-8 text-right">{count as number}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="instrumentos" className="space-y-4">
              {policy.contracts.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Licitações (PNCP)</h3>
                  <div className="space-y-2">
                    {policy.contracts.slice(0, 8).map((c, i) => (
                      <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="block py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"><p className="text-xs font-medium text-foreground line-clamp-1">{c.object || "Sem objeto"}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{c.organ?.slice(0, 40)}</span>{c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}mil</span>}{c.uf && <span className="text-[9px] px-1 py-0.5 bg-secondary text-secondary-foreground rounded">{c.uf}</span>}</div></a>
                    ))}
                  </div>
                </div>
              )}
              {policy.convenios.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Convênios Federais</h3>
                  <div className="space-y-2">
                    {policy.convenios.slice(0, 6).map((c, i) => (
                      <div key={i} className="py-2 border-b border-border/50 last:border-0"><p className="text-xs font-medium text-foreground line-clamp-1">{c.object}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{c.proponent}</span>{c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}mil</span>}<span className="text-[9px] px-1 py-0.5 bg-secondary text-secondary-foreground rounded">{c.situation}</span></div></div>
                    ))}
                  </div>
                </div>
              )}
              {policy.sanctions.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-destructive" />Sancionadas (CEIS)</h3>
                  <div className="space-y-2">
                    {policy.sanctions.slice(0, 5).map((s, i) => (<div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"><span className="text-xs text-foreground">{s.company}</span><span className="text-[10px] text-destructive">{s.type}</span></div>))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="prescricao" className="space-y-4">
              {isAnalyzing ? (<div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="ml-3 text-sm text-muted-foreground">Gerando prescrição baseada em 4 camadas...</span></div>
              ) : analysis && analysis.sections?.length > 0 ? (
                <div className="space-y-4">
                  {analysis.questions.map((question, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-3"><span className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.color} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>{idx + 1}</span>{question}</h3>
                      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary"><ReactMarkdown>{analysis.sections[idx] || ""}</ReactMarkdown></div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground text-center">Prescrição: {data.meta.sources.join(" · ")} · GT={indices?.gt?.value} CD={indices?.cd?.value} AUE={indices?.aue?.value} EI={indices?.ei?.value}</p>
                </div>
              ) : (<div className="text-center py-12 text-muted-foreground"><Zap className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">Prescrição IA não disponível.</p></div>)}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      <CnaeSelectionModal isOpen={showCnaeModal} onClose={() => { setShowCnaeModal(false); setSuggestedCnaes([]); setPendingSearchQuery(""); }} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
    </div>
  );
};

export default GovernoPanel;

import { useState, useCallback } from "react";
import { Factory, Search, ArrowLeft, AlertTriangle, Zap, Globe, GitBranch, Building2, Landmark, TrendingUp, Target, Handshake, ShieldCheck } from "lucide-react";
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

const EmpresaPanel = () => {
  const config = personaConfigs.empresa;
  const [searchQuery, setSearchQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("oportunidade");
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
    else { setHasSearched(true); await search(searchQuery, "empresa"); }
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => { setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true); await search(pendingSearchQuery, "empresa"); };
  const handleNewSearch = () => { setHasSearched(false); setSearchQuery(""); setSelectedCnaes([]); setActiveTab("oportunidade"); };

  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="w-full max-w-2xl mx-auto text-center space-y-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" />Voltar</Link>
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}><Factory className="w-8 h-8 text-white" /></div>
            <div><h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">Inteligência Competitiva</h1><p className="text-muted-foreground text-sm">Quem resolve meu problema? Onde tem tecnologia? Quem é parceiro?</p></div>
            <form onSubmit={handleSearch} className="w-full space-y-3">
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Sua empresa — ex: WEG, Embraer, sua startup..." className="w-full h-12 rounded-2xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" />
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tecnologia ou problema — ex: grafeno, automação industrial..." className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" autoFocus /></div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim()} className={`w-full h-12 rounded-xl bg-gradient-to-r ${config.color} text-white text-base font-medium gap-2`}>{isLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mapeando mercado...</>) : (<><Search className="w-4 h-4" />Analisar Oportunidade</>)}</Button>
            </form>
            <div className="flex flex-wrap justify-center gap-2">
              {["IoT industrial", "baterias de lítio", "semicondutores", "hidrogênio verde"].map((q) => (<button key={q} onClick={() => setSearchQuery(q)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">{q}</button>))}
            </div>
          </div>
        </main>
        <CnaeSelectionModal isOpen={showCnaeModal} onClose={() => { setShowCnaeModal(false); setSuggestedCnaes([]); setPendingSearchQuery(""); }} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
      </div>
    );
  }

  if (isLoading) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-6"><div className="relative w-16 h-16 mx-auto"><div className="absolute inset-0 border-4 border-primary/20 rounded-full" /><div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" /><Factory className="absolute inset-0 m-auto w-6 h-6 text-primary/60" /></div><p className="text-lg font-medium text-foreground">Mapeando oportunidades...</p></div></main></div>);
  if (error) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-4 max-w-md px-4"><AlertTriangle className="w-12 h-12 mx-auto text-destructive" /><h2 className="text-lg font-semibold text-foreground">Erro</h2><p className="text-sm text-muted-foreground">{error}</p><Button onClick={handleNewSearch} variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Nova busca</Button></div></main></div>);
  if (!data) return null;

  const knowledge = data.layers.knowledge;
  const technology = data.layers.technology;
  const policy = data.layers.policy;
  const intl = data.layers.international;
  const indices = data.indices;

  const institutionRanking = Object.entries(knowledge.institutions || {}).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10);
  const totalContractValue = policy.total_contract_value || 0;
  const totalConvenioValue = policy.total_convenio_value || 0;
  const repos = technology.github_repos || [];
  const sanctions = policy.sanctions || [];

  const trlEstimate = technology.trl_estimate || 2;
  const trlLabel = technology.trl_label || "Sem dados";
  const trlSignals = technology.trl_signals || {};

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" />Nova busca</button>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">Oportunidade: "{data.query}"</p><p className="text-[10px] text-muted-foreground truncate">{data.meta.sources.join(" · ")}</p></div>
            <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 flex-shrink-0">{data.meta.source_count} fontes</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-0 duration-500">
          {indices && <StrategicIndices indices={indices} />}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">TRL Estimado</p><p className="text-3xl font-bold text-foreground">{trlEstimate}</p><p className="text-[10px] text-muted-foreground">{trlLabel}</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Grupos de P&D</p><p className="text-3xl font-bold text-foreground">{institutionRanking.length}</p><p className="text-[10px] text-muted-foreground">possíveis parceiros</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Mercado público</p><p className="text-3xl font-bold text-accent">R$ {((totalContractValue + totalConvenioValue) / 1e6).toFixed(1)}M</p><p className="text-[10px] text-muted-foreground">em instrumentos</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Concorrência global</p><p className="text-3xl font-bold text-foreground">{data.stats.countries}</p><p className="text-[10px] text-muted-foreground">países atuantes</p></div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 h-auto p-1 rounded-xl">
              <TabsTrigger value="oportunidade" className="text-xs rounded-lg">🎯 Oportunidade</TabsTrigger>
              <TabsTrigger value="matching" className="text-xs rounded-lg">🤝 Matching</TabsTrigger>
              <TabsTrigger value="financiamento" className="text-xs rounded-lg">💰 Financiamento</TabsTrigger>
              <TabsTrigger value="tecnologia" className="text-xs rounded-lg">⚙️ Tecnologia ({repos.length})</TabsTrigger>
              <TabsTrigger value="riscos" className="text-xs rounded-lg">🛡️ Riscos</TabsTrigger>
              <TabsTrigger value="prescricao" className="text-xs rounded-lg">🧠 IA {isAnalyzing && "…"}</TabsTrigger>
            </TabsList>

            <TabsContent value="oportunidade" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Maturidade Tecnológica (TRL)</h3>
                <div className="flex items-center gap-3"><div className="flex-1 bg-muted rounded-full h-4 relative overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all" style={{ width: `${(trlEstimate / 9) * 100}%` }} /></div><span className="text-lg font-bold text-foreground">{trlEstimate}/9</span></div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { label: "Papers científicos", ok: trlSignals.has_papers },
                    { label: "Código aberto", ok: trlSignals.has_repos },
                    { label: "Contratos públicos", ok: trlSignals.has_patents },
                    { label: "Emprego formal", ok: trlSignals.has_employment },
                    { label: "Alta visibilidade", ok: trlSignals.high_stars },
                  ].map((s, i) => (
                    <div key={i} className={`text-center p-2 rounded-lg ${s.ok ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/30 border border-border"}`}><span className="text-lg">{s.ok ? "✓" : "—"}</span><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
                  ))}
                </div>
              </div>
              {intl.macro_indicators.some(m => m.value !== null) && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Sinais de mercado</h3>
                  <div className="space-y-1">
                    {intl.macro_indicators.filter(m => m.value !== null).map((m, i) => (
                      <button key={i} onClick={() => openDetail({ type: "indicator", data: m })} className="w-full text-left flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors"><span className="text-xs text-muted-foreground">{m.name}</span><span className="text-sm font-bold text-foreground">{m.value!.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span></button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="matching" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Handshake className="w-4 h-4 text-primary" /> Matching: Grupos de P&D</h3>
                <p className="text-xs text-muted-foreground mb-4">Instituições com produção científica ativa — potenciais parceiros.</p>
                <div className="space-y-1.5">
                  {institutionRanking.map(([inst, count], i) => {
                    const instPapers = knowledge.papers.filter(p => p.authors.some(a => a.institution?.toLowerCase().includes(inst.toLowerCase().slice(0, 10))));
                    const instContracts = policy.contracts.filter(c => c.organ?.toLowerCase().includes(inst.toLowerCase().slice(0, 10)));
                    const hasContractHistory = instContracts.length > 0;
                    return (
                      <button key={i} onClick={() => openDetail({ type: "institution", data: { name: inst, count: count as number, papers: instPapers, contracts: instContracts } })} className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-0">
                        <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground truncate">{inst}</p><div className="flex gap-2 mt-0.5"><span className="text-[10px] text-primary font-semibold">{count as number} papers</span>{hasContractHistory && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">cooperação</span>}</div></div>
                        <div className="flex-shrink-0">{hasContractHistory ? <span className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-medium">Recomendado</span> : <span className="text-[9px] px-2 py-1 bg-muted text-muted-foreground rounded-full">Acadêmico</span>}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {knowledge.international.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Líderes globais</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {knowledge.international.slice(0, 10).map((c, i) => {
                      const flagMap: Record<string, string> = { BR: "🇧🇷", US: "🇺🇸", CN: "🇨🇳", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵", KR: "🇰🇷" };
                      return (
                        <button key={i} onClick={() => openDetail({ type: "country", data: { code: c.country_code, count: c.count, flag: flagMap[c.country_code] } })} className="text-center p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors"><p className="text-xl mb-0.5">{flagMap[c.country_code] || "🌍"}</p><p className="text-xs font-medium text-foreground">{c.country_code}</p><p className="text-sm font-bold text-primary">{c.count.toLocaleString()}</p></button>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="financiamento" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2"><Landmark className="w-4 h-4 text-primary inline mr-1" />Licitações</h3>
                  <p className="text-2xl font-bold text-primary mb-3">{data.stats.contracts}{totalContractValue > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">R$ {(totalContractValue / 1e6).toFixed(1)}M</span>}</p>
                  <div className="space-y-1">
                    {policy.contracts.slice(0, 6).map((c, i) => (
                      <button key={i} onClick={() => openDetail({ type: "contract", data: c })} className="w-full text-left py-1.5 px-2 hover:bg-muted/50 rounded transition-colors"><p className="text-xs text-foreground line-clamp-1">{c.object}</p><div className="flex gap-2">{c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}mil</span>}</div></button>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2"><Building2 className="w-4 h-4 text-accent inline mr-1" />Convênios</h3>
                  <p className="text-2xl font-bold text-accent mb-3">{policy.convenios.length}{totalConvenioValue > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">R$ {(totalConvenioValue / 1e6).toFixed(1)}M</span>}</p>
                  <div className="space-y-1">
                    {policy.convenios.slice(0, 6).map((c, i) => (
                      <button key={i} onClick={() => openDetail({ type: "convenio", data: c })} className="w-full text-left py-1.5 px-2 hover:bg-muted/50 rounded transition-colors"><p className="text-xs text-foreground line-clamp-1">{c.object}</p><div className="flex gap-2">{c.value > 0 && <span className="text-[10px] font-semibold text-accent">R$ {(c.value / 1e3).toFixed(0)}mil</span>}</div></button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tecnologia" className="space-y-4">
              {repos.length > 0 ? (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3"><GitBranch className="w-4 h-4 text-primary inline mr-1" />Tecnologia disponível</h3>
                  <div className="space-y-1.5">
                    {repos.map((r, i) => (
                      <button key={i} onClick={() => openDetail({ type: "repo", data: r })} className="w-full text-left flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/30 last:border-0"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground">{r.name}</p><p className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</p></div><div className="flex items-center gap-2 flex-shrink-0 ml-3">{r.language && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{r.language}</span>}<span className="text-[10px] font-bold text-primary">⭐{r.stars}</span></div></button>
                    ))}
                  </div>
                </div>
              ) : (<div className="text-center py-12 text-muted-foreground"><GitBranch className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">Nenhum repositório.</p></div>)}
              {intl.ipeadata_series?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Séries econômicas</h3>
                  <div className="space-y-1">
                    {intl.ipeadata_series.slice(0, 5).map((s, i) => (
                      <button key={i} onClick={() => openDetail({ type: "series", data: s })} className="w-full text-left flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors"><span className="text-xs text-muted-foreground truncate">{s.name}</span>{s.lastValue !== null && <span className="text-xs font-bold text-foreground">{s.lastValue.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</span>}</button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="riscos" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Análise de Riscos</h3>
                {indices?.cd?.value > 50 && (<div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"><p className="text-xs font-semibold text-foreground mb-1">⚠ Dependência Externa ({indices.cd.value}%)</p><p className="text-[10px] text-muted-foreground">Riscos de supply chain e IP.</p></div>)}
                {trlEstimate <= 4 && (<div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"><p className="text-xs font-semibold text-foreground mb-1">⚠ Baixa maturidade (TRL {trlEstimate})</p><p className="text-[10px] text-muted-foreground">Alto risco para investimento direto.</p></div>)}
                {sanctions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Sancionadas ({sanctions.length})</h4>
                    {sanctions.slice(0, 5).map((s, i) => (<div key={i} className="flex items-center justify-between py-1.5 px-3 bg-destructive/5 border border-destructive/10 rounded-lg"><span className="text-xs text-foreground">{s.company}</span><span className="text-[10px] text-destructive">{s.type}</span></div>))}
                  </div>
                )}
                {(!indices || indices.cd?.value <= 50) && trlEstimate > 4 && sanctions.length === 0 && (<div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"><p className="text-xs text-foreground">✓ Nenhum risco crítico.</p></div>)}
              </div>
            </TabsContent>

            <TabsContent value="prescricao" className="space-y-4">
              {isAnalyzing ? (<div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="ml-3 text-sm text-muted-foreground">Gerando inteligência competitiva...</span></div>
              ) : analysis && analysis.sections?.length > 0 ? (
                <div className="space-y-4">
                  {analysis.questions.map((question, idx) => (<div key={idx} className="bg-card border border-border rounded-xl p-6"><h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-3"><span className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.color} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>{idx + 1}</span>{question}</h3><div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary"><ReactMarkdown>{analysis.sections[idx] || ""}</ReactMarkdown></div></div>))}
                </div>
              ) : (<div className="text-center py-12 text-muted-foreground"><Zap className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">IA não disponível.</p></div>)}
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

export default EmpresaPanel;

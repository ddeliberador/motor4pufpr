import { useState } from "react";
import { Building2, Search, ArrowLeft, AlertTriangle, Zap, MapPin, Globe, BookOpen, Landmark, Shield, FileText, Activity } from "lucide-react";
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
import StrategicIndices from "./StrategicIndices";
import RelationalGraph from "./RelationalGraph";

const GovernoPanel = () => {
  const config = personaConfigs.governo;
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [selectedCnaes, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("diagnostico");

  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();
  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setPendingSearchQuery(searchQuery);
    const cnaes = await searchCnaes(searchQuery);
    if (cnaes.length > 0) { setSuggestedCnaes(cnaes); setShowCnaeModal(true); }
    else { setHasSearched(true); await search(searchQuery, "governo"); }
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => { setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true); await search(pendingSearchQuery, "governo"); };
  const handleNewSearch = () => { setHasSearched(false); setSearchQuery(""); setSelectedCnaes([]); setActiveTab("diagnostico"); };

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
  const policy = data.layers.policy;
  const indices = data.indices;
  const totalContractValue = policy.total_contract_value || 0;
  const totalConvenioValue = policy.total_convenio_value || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" />Nova busca</button>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">Diagnóstico: "{data.query}"</p><p className="text-[10px] text-muted-foreground truncate">{data.meta.sources.join(" · ")} · {data.meta.processing_time_ms}ms</p></div>
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
              <TabsTrigger value="relacional" className="text-xs rounded-lg">🔗 Mapa Relacional</TabsTrigger>
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

            <TabsContent value="relacional"><RelationalGraph data={data} /></TabsContent>

            <TabsContent value="territorial" className="space-y-4">
              {policy.uf_distribution && Object.keys(policy.uf_distribution).length > 0 ? (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Distribuição por UF</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {Object.entries(policy.uf_distribution).sort(([, a], [, b]) => (b as number) - (a as number)).map(([uf, count]) => (
                      <div key={uf} className="text-center p-3 bg-muted rounded-lg"><p className="text-lg font-bold text-foreground">{uf}</p><p className="text-sm font-semibold text-primary">{count as number}</p><p className="text-[10px] text-muted-foreground">licitações</p></div>
                    ))}
                  </div>
                  {Object.keys(policy.uf_distribution).length < 5 && (<p className="text-xs text-amber-500 mt-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Concentração territorial alta</p>)}
                </div>
              ) : (<div className="text-center py-12 text-muted-foreground"><MapPin className="w-8 h-8 mx-auto mb-3 opacity-40" /><p className="text-sm">Sem dados territoriais.</p></div>)}
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

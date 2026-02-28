import { useState, useCallback } from "react";
import { Landmark, Search, ArrowLeft, AlertTriangle, Zap, Globe, BookOpen, Building2, Award, Link2 } from "lucide-react";
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
import RelationalGraph from "@/components/governo/RelationalGraph";
import DataDetailSheet, { type DetailItem } from "@/components/shared/DataDetailSheet";

const UniversidadePanel = () => {
  const config = personaConfigs.universidade;
  const [searchQuery, setSearchQuery] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("posicionamento");
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
    else { setHasSearched(true); await search(searchQuery, "universidade"); }
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => { setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true); await search(pendingSearchQuery, "universidade"); };
  const handleNewSearch = () => { setHasSearched(false); setSearchQuery(""); setSelectedCnaes([]); setActiveTab("posicionamento"); };

  if (!hasSearched) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="w-full max-w-2xl mx-auto text-center space-y-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" />Voltar</Link>
            <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}><Landmark className="w-8 h-8 text-white" /></div>
            <div><h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">Posicionamento Institucional</h1><p className="text-muted-foreground text-sm">Onde estamos? Quem são os parceiros? Estamos captando?</p></div>
            <form onSubmit={handleSearch} className="w-full space-y-3">
              <input type="text" value={universityName} onChange={(e) => setUniversityName(e.target.value)} placeholder="Sua universidade — ex: UFPR, USP, UNICAMP..." className="w-full h-12 rounded-2xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" />
              <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Objeto tecnológico — ex: grafeno, baterias de lítio..." className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm" autoFocus /></div>
              <Button type="submit" disabled={isLoading || !searchQuery.trim()} className={`w-full h-12 rounded-xl bg-gradient-to-r ${config.color} text-white text-base font-medium gap-2`}>{isLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mapeando posicionamento...</>) : (<><Search className="w-4 h-4" />Analisar Posição</>)}</Button>
            </form>
            <div className="flex flex-wrap justify-center gap-2">
              {["nanotecnologia", "energia renovável", "bioeconomia", "indústria 4.0"].map((q) => (<button key={q} onClick={() => setSearchQuery(q)} className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">{q}</button>))}
            </div>
          </div>
        </main>
        <CnaeSelectionModal isOpen={showCnaeModal} onClose={() => { setShowCnaeModal(false); setSuggestedCnaes([]); setPendingSearchQuery(""); }} onConfirm={handleCnaeConfirm} suggestedCnaes={suggestedCnaes} searchQuery={pendingSearchQuery} isLoading={isLoadingCnaes} />
      </div>
    );
  }

  if (isLoading) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-6"><div className="relative w-16 h-16 mx-auto"><div className="absolute inset-0 border-4 border-primary/20 rounded-full" /><div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" /><Landmark className="absolute inset-0 m-auto w-6 h-6 text-primary/60" /></div><p className="text-lg font-medium text-foreground">Mapeando posicionamento...</p></div></main></div>);
  if (error) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-4 max-w-md px-4"><AlertTriangle className="w-12 h-12 mx-auto text-destructive" /><h2 className="text-lg font-semibold text-foreground">Erro</h2><p className="text-sm text-muted-foreground">{error}</p><Button onClick={handleNewSearch} variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Nova busca</Button></div></main></div>);
  if (!data) return null;

  const knowledge = data.layers.knowledge;
  const technology = data.layers.technology;
  const policy = data.layers.policy;
  const indices = data.indices;
  const flagMap: Record<string, string> = { BR: "🇧🇷", US: "🇺🇸", CN: "🇨🇳", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", CA: "🇨🇦", AU: "🇦🇺" };

  const institutionRanking = Object.entries(knowledge.institutions || {}).sort((a, b) => (b[1] as number) - (a[1] as number));
  const totalInstitutions = institutionRanking.length;
  const topInst = institutionRanking.slice(0, 12);
  const totalContractValue = policy.total_contract_value || 0;
  const totalConvenioValue = policy.total_convenio_value || 0;

  const contractOrgans = new Set(policy.contracts.map(c => c.organ?.toLowerCase().slice(0, 15)).filter(Boolean));
  const instWithContracts = institutionRanking.filter(([name]) => Array.from(contractOrgans).some(o => name.toLowerCase().includes(o!) || o!.includes(name.toLowerCase().slice(0, 10))));
  const conversionRate = totalInstitutions > 0 ? ((instWithContracts.length / totalInstitutions) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" />Nova busca</button>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">Posicionamento: "{data.query}"</p><p className="text-[10px] text-muted-foreground truncate">{data.meta.sources.join(" · ")}</p></div>
            <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 flex-shrink-0">{data.meta.source_count} fontes</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-0 duration-500">
          {indices && <StrategicIndices indices={indices} />}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-foreground">{totalInstitutions}</p><p className="text-[10px] text-muted-foreground">Instituições atuantes</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-foreground">{conversionRate}%</p><p className="text-[10px] text-muted-foreground">Conversão P&D→Contrato</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-accent">R$ {((totalContractValue + totalConvenioValue) / 1e6).toFixed(1)}M</p><p className="text-[10px] text-muted-foreground">Volume instrumental</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-foreground">{data.stats.countries}</p><p className="text-[10px] text-muted-foreground">Países cooperantes</p></div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 h-auto p-1 rounded-xl">
              <TabsTrigger value="posicionamento" className="text-xs rounded-lg">🏫 Posicionamento</TabsTrigger>
              <TabsTrigger value="relacional" className="text-xs rounded-lg">🔗 Rede</TabsTrigger>
              <TabsTrigger value="captacao" className="text-xs rounded-lg">💰 Captação</TabsTrigger>
              <TabsTrigger value="internacional" className="text-xs rounded-lg">🌍 Internacional</TabsTrigger>
              <TabsTrigger value="conversao" className="text-xs rounded-lg">🔄 Conversão</TabsTrigger>
              <TabsTrigger value="prescricao" className="text-xs rounded-lg">🧠 IA {isAnalyzing && "…"}</TabsTrigger>
            </TabsList>

            <TabsContent value="posicionamento" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Ranking de instituições</h3>
                <div className="space-y-1.5">
                  {topInst.map(([inst, count], i) => {
                    const instPapers = knowledge.papers.filter(p => p.authors.some(a => a.institution?.toLowerCase().includes(inst.toLowerCase().slice(0, 10))));
                    const instContracts = policy.contracts.filter(c => c.organ?.toLowerCase().includes(inst.toLowerCase().slice(0, 10)));
                    return (
                      <button key={i} onClick={() => openDetail({ type: "institution", data: { name: inst, count: count as number, papers: instPapers, contracts: instContracts } })} className="w-full flex items-center gap-3 hover:bg-muted/50 rounded-lg px-2 py-2 transition-colors">
                        <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                        <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden"><div className="h-full bg-primary/20 rounded-full transition-all" style={{ width: `${Math.min(100, ((count as number) / ((topInst[0]?.[1] as number) || 1)) * 100)}%` }} /><span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-foreground">{inst}</span></div>
                        <div className="flex items-center gap-2 flex-shrink-0"><span className="text-xs font-bold text-primary">{count as number}</span>{instContracts.length > 0 && <span className="text-[9px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">{instContracts.length} contratos</span>}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Papers mais relevantes</h3>
                <div className="space-y-1">
                  {knowledge.papers.slice(0, 6).map((p, i) => (
                    <button key={i} onClick={() => openDetail({ type: "paper", data: p })} className="w-full text-left py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors"><p className="text-xs font-medium text-foreground line-clamp-1">{p.title}</p><div className="flex gap-2 mt-0.5"><span className="text-[10px] text-muted-foreground">{p.year}</span><span className="text-[10px] font-semibold text-primary">{p.citations} cit.</span></div></button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="relacional"><RelationalGraph data={data} /></TabsContent>

            <TabsContent value="captacao" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /> Licitações</h3>
                  <p className="text-2xl font-bold text-primary mb-3">{data.stats.contracts}{totalContractValue > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">R$ {(totalContractValue / 1e6).toFixed(1)}M</span>}</p>
                  <div className="space-y-1">
                    {policy.contracts.slice(0, 5).map((c, i) => (
                      <button key={i} onClick={() => openDetail({ type: "contract", data: c })} className="w-full text-left py-1.5 px-2 hover:bg-muted/50 rounded transition-colors"><p className="text-xs text-foreground line-clamp-1">{c.object}</p><div className="flex gap-2 mt-0.5">{c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}mil</span>}{c.uf && <span className="text-[9px] text-muted-foreground">{c.uf}</span>}</div></button>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Building2 className="w-4 h-4 text-accent" /> Convênios Federais</h3>
                  <p className="text-2xl font-bold text-accent mb-3">{policy.convenios.length}{totalConvenioValue > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">R$ {(totalConvenioValue / 1e6).toFixed(1)}M</span>}</p>
                  <div className="space-y-1">
                    {policy.convenios.slice(0, 5).map((c, i) => (
                      <button key={i} onClick={() => openDetail({ type: "convenio", data: c })} className="w-full text-left py-1.5 px-2 hover:bg-muted/50 rounded transition-colors"><p className="text-xs text-foreground line-clamp-1">{c.object}</p><div className="flex gap-2 mt-0.5">{c.value > 0 && <span className="text-[10px] font-semibold text-accent">R$ {(c.value / 1e3).toFixed(0)}mil</span>}<span className="text-[9px] text-muted-foreground">{c.situation}</span></div></button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="internacional" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Cooperação internacional</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {knowledge.international.slice(0, 15).map((c, i) => {
                    const countryPapers = knowledge.papers.filter(p => p.authors.some(a => a.country === c.country_code));
                    return (
                      <button key={i} onClick={() => openDetail({ type: "country", data: { code: c.country_code, count: c.count, flag: flagMap[c.country_code], papers: countryPapers } })} className="text-center p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors"><p className="text-xl mb-0.5">{flagMap[c.country_code] || "🌍"}</p><p className="text-xs font-medium text-foreground">{c.country_code}</p><p className="text-sm font-bold text-primary">{c.count.toLocaleString()}</p></button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="conversao" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Conversão Pesquisa → Inovação</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-lg p-4 text-center"><p className="text-3xl font-bold text-foreground">{totalInstitutions}</p><p className="text-[10px] text-muted-foreground">Pesquisando</p></div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center"><p className="text-3xl font-bold text-accent">{instWithContracts.length}</p><p className="text-[10px] text-muted-foreground">Com contratos</p></div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center"><p className="text-3xl font-bold text-primary">{conversionRate}%</p><p className="text-[10px] text-muted-foreground">Conversão</p></div>
                </div>
                {instWithContracts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-emerald-600">✓ Com articulação P&D ↔ contratos</h4>
                    {instWithContracts.slice(0, 5).map(([name, count], i) => (
                      <button key={i} onClick={() => openDetail({ type: "institution", data: { name, count: count as number, papers: knowledge.papers.filter(p => p.authors.some(a => a.institution?.toLowerCase().includes(name.toLowerCase().slice(0, 10)))), contracts: policy.contracts.filter(c => c.organ?.toLowerCase().includes(name.toLowerCase().slice(0, 10))) } })} className="w-full text-left flex items-center justify-between px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg hover:bg-emerald-500/10 transition-colors"><span className="text-xs text-foreground truncate">{name}</span><span className="text-xs font-bold text-emerald-600">{count as number} papers</span></button>
                    ))}
                  </div>
                )}
                {institutionRanking.length > instWithContracts.length && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-amber-600">⚠ Sem vínculo com contratos</h4>
                    {institutionRanking.filter(([name]) => !instWithContracts.some(([n]) => n === name)).slice(0, 5).map(([name, count], i) => (
                      <button key={i} onClick={() => openDetail({ type: "institution", data: { name, count: count as number, papers: knowledge.papers.filter(p => p.authors.some(a => a.institution?.toLowerCase().includes(name.toLowerCase().slice(0, 10)))) } })} className="w-full text-left flex items-center justify-between px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg hover:bg-amber-500/10 transition-colors"><span className="text-xs text-foreground truncate">{name}</span><span className="text-xs font-bold text-amber-600">{count as number} papers</span></button>
                    ))}
                  </div>
                )}
                {technology.github_repos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground">Repositórios open source</h4>
                    {technology.github_repos.slice(0, 4).map((r, i) => (
                      <button key={i} onClick={() => openDetail({ type: "repo", data: r })} className="w-full text-left flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"><p className="text-xs font-medium text-foreground truncate">{r.name}</p><span className="text-[10px] font-bold text-primary">⭐{r.stars}</span></button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="prescricao" className="space-y-4">
              {isAnalyzing ? (<div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="ml-3 text-sm text-muted-foreground">Analisando posicionamento...</span></div>
              ) : analysis && analysis.sections?.length > 0 ? (
                <div className="space-y-4">
                  {analysis.questions.map((question, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-3"><span className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.color} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>{idx + 1}</span>{question}</h3>
                      <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary"><ReactMarkdown>{analysis.sections[idx] || ""}</ReactMarkdown></div>
                    </div>
                  ))}
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

export default UniversidadePanel;

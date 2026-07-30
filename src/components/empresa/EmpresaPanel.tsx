import CagedSaldoChart from "@/components/shared/CagedSaldoChart";
import TrlScaleBar from "@/components/shared/TrlScaleBar";
import { useState, useCallback, useEffect } from "react";
import { Factory, Search, ArrowLeft, AlertTriangle, Zap, Globe, GitBranch, Building2, Landmark, TrendingUp, Target, Handshake, ShieldCheck, Users, Building, ExternalLink } from "lucide-react";
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
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import StrategicIndices from "@/components/governo/StrategicIndices";
import DataDetailSheet, { type DetailItem } from "@/components/shared/DataDetailSheet";
import EntityResolutionCard from "@/components/shared/EntityResolutionCard";
import MarketAnalysisPanel from "@/components/shared/MarketAnalysisPanel";
import PatentsTab from "@/components/shared/PatentsTab";

interface Competitor {
  name: string;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnae_descricao?: string;
  porte?: string;
  uf?: string;
  municipio?: string;
  capital_social?: number;
  qsa?: Array<{ nome: string; qualificacao: string; cnpj_cpf: string; data_entrada: string }>;
  total_socios?: number;
  contracts?: number;
  total_value?: number;
  source?: string;
  signal?: string;
  country?: string;
  type?: string;
  publications?: number;
  github_stars?: number;
  github_repos?: number;
  github_url?: string;
}

interface CompetitorData {
  competitors_br: Competitor[];
  competitors_intl: Competitor[];
  cnpj_details: any[];
  sector_datasets: any[];
  summary: { total_br: number; total_intl: number; sources: string[] };
}

const EmpresaPanel = () => {
  const config = personaConfigs.empresa;
  const [searchQuery, setSearchQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("mercado");
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [competitors, setCompetitors] = useState<CompetitorData | null>(null);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();

  // Lê query pré-preenchida vinda da busca unificada
  useEffect(() => {
    const savedQuery = sessionStorage.getItem("motor4p_query");
    const savedPersona = sessionStorage.getItem("motor4p_persona");
    const savedCnaes = sessionStorage.getItem("motor4p_cnaes");
    const expectedPersona = "empresa";

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

  const openDetail = useCallback((item: DetailItem) => { setDetailItem(item); setDetailOpen(true); }, []);

  const searchCompetitors = useCallback(async (query: string) => {
    setIsLoadingCompetitors(true);
    try {
      const { data: result, error: err } = await supabase.functions.invoke("competitor-search", { body: { query } });
      if (!err && result && !result.error) {
        setCompetitors(result as CompetitorData);
      }
    } catch (e) {
      console.warn("Competitor search error:", e);
    } finally {
      setIsLoadingCompetitors(false);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    await search(searchQuery, "empresa", { entityName: companyName });
    searchCompetitors(searchQuery);
    searchCnaes(searchQuery).then(cnaes => {
      if (cnaes.length > 0) setSuggestedCnaes(cnaes);
    });
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => {
    setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true);
    await search(pendingSearchQuery, "empresa", { entityName: companyName });
    searchCompetitors(pendingSearchQuery);
  };
  const navigate = useNavigate();
  const handleNewSearch = () => { navigate("/"); };

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

  const flagMap: Record<string, string> = { BR: "🇧🇷", US: "🇺🇸", CN: "🇨🇳", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷", JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", CA: "🇨🇦", AU: "🇦🇺", IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", SE: "🇸🇪", CH: "🇨🇭" };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" />Nova busca</button>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{companyName ? `${companyName} ×` : "Oportunidade:"} "{data.query}"</p><p className="text-[10px] text-muted-foreground truncate">{data.meta.sources.join(" · ")}</p></div>
            <span className="text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 flex-shrink-0">{data.meta.source_count} fontes</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in-0 duration-500">
          {indices && <StrategicIndices indices={indices} />}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">TRL Estimado</p><p className="text-3xl font-bold text-foreground">{trlEstimate}</p><p className="text-[10px] text-muted-foreground">{trlLabel}</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Grupos de P&D</p><p className="text-3xl font-bold text-foreground">{institutionRanking.length}</p><p className="text-[10px] text-muted-foreground">possíveis parceiros</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Mercado público</p><p className="text-3xl font-bold text-accent">R$ {((totalContractValue + totalConvenioValue) / 1e6).toFixed(1)}M</p><p className="text-[10px] text-muted-foreground">em instrumentos</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Concorrentes mapeados</p><p className="text-3xl font-bold text-foreground">{(competitors?.summary?.total_br || 0) + (competitors?.summary?.total_intl || 0)}</p><p className="text-[10px] text-muted-foreground">{isLoadingCompetitors ? "buscando..." : "BR + global"}</p></div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/30 rounded-xl mb-4">
              <TabsTrigger value="mercado" className="text-xs rounded-lg">🏢 CEMPRE/Mercado</TabsTrigger>
              <TabsTrigger value="caged" className="text-xs rounded-lg">👷 CAGED</TabsTrigger>
              <TabsTrigger value="comex" className="text-xs rounded-lg">🌐 Comércio Exterior</TabsTrigger>
              <TabsTrigger value="patentes" className="text-xs rounded-lg">🔏 Patentes EPO</TabsTrigger>
              <TabsTrigger value="ia" className="text-xs rounded-lg">🧠 Análise IA {isAnalyzing && "…"}</TabsTrigger>
            </TabsList>

            <TabsContent value="mercado" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Estrutura setorial — CEMPRE/IBGE
                  </h3>
                  <a href="https://sidra.ibge.gov.br/tabela/1685" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> SIDRA
                  </a>
                </div>
                {(data.layers as any).sidra?.cempre?.setores?.length > 0 ? (
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.cempre.setores.slice(0, 8).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-foreground truncate flex-1">{s.atividade}</span>
                        <div className="flex gap-3 flex-shrink-0 ml-2">
                          {s.empresas && <span className="text-[10px] text-muted-foreground">{s.empresas} emp.</span>}
                          {s.pessoal && <span className="text-[10px] font-semibold text-primary">{s.pessoal} pessoas</span>}
                        </div>
                      </div>
                    ))}
                    <p className="text-[9px] text-muted-foreground mt-2">Fonte: CEMPRE {(data.layers as any).sidra.cempre.periodo} — IBGE</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Dados CEMPRE não disponíveis para o setor deste tema.</p>
                )}
              </div>
              {/* GitHub como proxy de players tech */}
              {technology.github_repos && technology.github_repos.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Repositórios open source no campo — GitHub
                  </h3>
                  <div className="space-y-1.5">
                    {technology.github_repos.slice(0, 6).map((r: any, i: number) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                         className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                          {r.description && <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>}
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

            <TabsContent value="caged" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Disponibilidade de mão de obra — Novo CAGED / MTE
                  </h3>
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
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Perfis profissionais mapeados (CBO)</p>
                        <div className="flex flex-wrap gap-2">
                          {(technology as any).caged_data.ocupacoes.map((o: any, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-1 bg-muted rounded">
                              {o.description} <span className="font-mono text-muted-foreground/60">{o.area}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <CagedSaldoChart serie={(technology as any).caged_data.nacional?.serie_saldo} gradientId="cagedGradEmp" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Dados do CAGED não disponíveis para este tema.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comex" className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Comércio exterior — COMEX Stat / BCB
                  </h3>
                  <a href="https://comexstat.mdic.gov.br" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> COMEX Stat
                  </a>
                </div>
                {intl.macro_indicators && intl.macro_indicators.filter((m: any) => m.value !== null).length > 0 ? (
                  <div className="space-y-2">
                    {intl.macro_indicators.filter((m: any) => m.value !== null).slice(0, 6).map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-foreground flex-1">{m.label || m.series_id}</span>
                        <span className="text-xs font-bold text-primary ml-2">{m.value} {m.unit || ""}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Dados de comércio exterior não disponíveis para este tema.</p>
                )}
                {intl.country_distribution && Object.keys(intl.country_distribution).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Principais mercados parceiros</p>
                    <div className="space-y-1">
                      {Object.entries(intl.country_distribution as Record<string, number>)
                        .sort(([, a], [, b]) => b - a).slice(0, 6)
                        .map(([country, count], i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-1.5 bg-muted/20 rounded">
                            <span className="text-xs font-mono text-muted-foreground w-6">{country}</span>
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(intl.country_distribution as Record<string, number>))) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-foreground w-8 text-right">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="patentes" className="space-y-4">
              <TrlScaleBar
                trlData={(data.layers as any).patents?.trl_from_patents}
                fallback={(technology as any).trl_estimate}
              />
              <PatentsTab patents={(data.layers as any).patents} persona="empresa" />
            </TabsContent>

            <TabsContent value="ia" className="space-y-4">
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

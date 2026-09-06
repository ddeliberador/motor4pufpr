import RegionalTab from "@/components/shared/RegionalTab";
import { useState, useCallback, useEffect } from "react";
import { GraduationCap, Search, ArrowLeft, AlertTriangle, Zap, Globe, BookOpen, Building2, Award, Link2, ExternalLink } from "lucide-react";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import LocalContextBadge from "@/components/shared/LocalContextBadge";
import PerspectiveSwitcher from "@/components/shared/PerspectiveSwitcher";
import { useMotorLocation } from "@/hooks/useLocation";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import { personaConfigs } from "@/config/personas";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import StrategicIndices from "@/components/governo/StrategicIndices";
import OpportunityCard from "@/components/shared/OpportunityCard";
import ParceriaICTModal from "@/components/shared/ParceriaICTModal";
import RelationalGraph from "@/components/governo/RelationalGraph";
import DataDetailSheet, { type DetailItem } from "@/components/shared/DataDetailSheet";
import EntityResolutionCard from "@/components/shared/EntityResolutionCard";
import ProgramsTab from "@/components/shared/ProgramsTab";
import PoliciesTab from "@/components/shared/PoliciesTab";
import CnaeNcmCard from "@/components/shared/CnaeNcmCard";


const UniversidadePanel = () => {
  const config = personaConfigs.universidade;
  const [searchQuery, setSearchQuery] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [hasSearched, setHasSearched] = useState(() =>
    sessionStorage.getItem("motor4p_query") !== null &&
    sessionStorage.getItem("motor4p_persona") === "universidade"
  );
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("openalex");
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();
  const { uf, ufNome, municipioNome, label: locationLabel, hasLocation } = useMotorLocation();

  // Lê query pré-preenchida vinda da busca unificada
  useEffect(() => {
    const savedQuery = sessionStorage.getItem("motor4p_query");
    const savedPersona = sessionStorage.getItem("motor4p_persona");
    const savedCnaes = sessionStorage.getItem("motor4p_cnaes");
    const expectedPersona = "universidade";

    if (savedQuery && savedPersona === expectedPersona) {
      sessionStorage.removeItem("motor4p_query");
      sessionStorage.removeItem("motor4p_persona");
      sessionStorage.removeItem("motor4p_cnaes");

      const cnaes: CnaeCode[] = savedCnaes ? JSON.parse(savedCnaes) : [];
      setSearchQuery(savedQuery);
      setSelectedCnaes(cnaes);
      setHasSearched(true);
      search(savedQuery, expectedPersona, { location: locationLabel || undefined }, cnaes.map((c) => c.code));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();

  const openDetail = useCallback((item: DetailItem) => { setDetailItem(item); setDetailOpen(true); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    await search(searchQuery, "universidade", { entityName: universityName });
    searchCnaes(searchQuery).then(cnaes => {
      if (cnaes.length > 0) setSuggestedCnaes(cnaes);
    });
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => { setSelectedCnaes(selected); setShowCnaeModal(false); setHasSearched(true); await search(pendingSearchQuery, "universidade", { entityName: universityName }); };
  const navigate = useNavigate();
  const handleNewSearch = () => { navigate("/"); };

  if (!hasSearched) return <Navigate to="/" replace />;

  if (isLoading) return (<div className="min-h-screen bg-background"><Header /><main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="text-center space-y-6"><div className="relative w-16 h-16 mx-auto"><div className="absolute inset-0 border-4 border-primary/20 rounded-full" /><div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" /><GraduationCap className="absolute inset-0 m-auto w-6 h-6 text-primary/60" /></div><p className="text-lg font-medium text-foreground">Mapeando posicionamento...</p></div></main></div>);
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
          <div className="panel-container py-3 flex items-center gap-3 sm:gap-4">
            <button onClick={handleNewSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" />Nova busca</button>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{universityName ? `${universityName} ×` : "Posicionamento:"} "{data.query}"</p><p className="text-[10px] text-muted-foreground truncate">{data.meta.sources.join(" · ")}</p></div>
            <PerspectiveSwitcher current="universidade" query={data.query} />
            <span className="hidden sm:inline text-[9px] px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 flex-shrink-0">{data.meta.source_count} fontes</span>
          </div>
        </div>

        <div className="panel-container py-6 space-y-6 animate-in fade-in-0 duration-500">
          <LocalContextBadge persona="universidade" />
          {indices && <StrategicIndices indices={indices} />}

          {(data as any).oportunidades?.length > 0 && (
            <OpportunityCard
              oportunidades={(data as any).oportunidades}
              persona="universidade"
              query={data.query}
              cnaeLabel={
                (data.layers as any).technology?.cnae_result?.subclasses?.[0]?.descricao ||
                (data.layers as any).technology?.cnae_result?.divisoes?.[0]?.descricao
              }
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-foreground">{totalInstitutions}</p><p className="text-[10px] text-muted-foreground">Instituições atuantes</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-foreground">{conversionRate}%</p><p className="text-[10px] text-muted-foreground">Conversão P&D→Contrato</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-accent">R$ {((totalContractValue + totalConvenioValue) / 1e6).toFixed(1)}M</p><p className="text-[10px] text-muted-foreground">Volume instrumental</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-foreground">{data.stats.countries}</p><p className="text-[10px] text-muted-foreground">Países cooperantes</p></div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/30 rounded-xl mb-4">
              <TabsTrigger value="openalex" className="text-xs rounded-lg">📄 Produção Científica</TabsTrigger>
              <TabsTrigger value="sidra" className="text-xs rounded-lg">🎓 Formação Acadêmica</TabsTrigger>
              <TabsTrigger value="transparencia" className="text-xs rounded-lg">💰 Captação de Recursos</TabsTrigger>
              <TabsTrigger value="regional" className="text-xs rounded-lg">📍 Visão Regional</TabsTrigger>
              <TabsTrigger value="politicas" className="text-xs rounded-lg">📋 Políticas e Incentivos</TabsTrigger>
              <TabsTrigger value="ia" className="text-xs rounded-lg">🧠 Análise IA {isAnalyzing && "…"}</TabsTrigger>
              {(data.layers as any).programs?.context?.industrial && (
                <TabsTrigger value="nova-industria" className="text-xs rounded-lg">🏭 Nova Indústria BR</TabsTrigger>
              )}
              {(data.layers as any).programs?.context?.ia && (
                <TabsTrigger value="pbia" className="text-xs rounded-lg">🤖 PBIA</TabsTrigger>
              )}
              <TabsTrigger value="fomento" className="text-xs rounded-lg">💡 Fomento</TabsTrigger>
            </TabsList>


            <TabsContent value="openalex" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">📄 Como sua universidade se posiciona neste campo?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Dados do <strong>OpenAlex</strong> mostram o volume de publicações científicas por instituição. Quanto mais artigos em um tema, maior a expertise e a credibilidade para captar recursos, formar parcerias e atrair estudantes de pós-graduação.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Papers no campo", value: data.stats.papers.toLocaleString("pt-BR"), sub: "produção nacional" },
                  { label: "Instituições ativas", value: data.stats.institutions, sub: "no campo" },
                  { label: "Países parceiros", value: data.stats.countries, sub: "coautorias" },
                ].map((m, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-2xl font-bold font-mono text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{m.sub}</p>
                  </div>
                ))}
              </div>
              <CnaeNcmCard technology={technology} />
              {knowledge.institutions && Object.keys(knowledge.institutions).length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Ranking de instituições no campo</h3>
                    <a href="https://openalex.org" target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> OpenAlex
                    </a>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(knowledge.institutions as Record<string, number>)
                      .sort(([, a], [, b]) => b - a).slice(0, 10)
                      .map(([inst, count], i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                          <span className="text-[10px] font-mono font-bold text-primary w-4">{i + 1}º</span>
                          <span className="text-xs text-foreground flex-1 truncate">{inst}</span>
                          <span className="text-xs font-bold text-primary flex-shrink-0">{count} papers</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {knowledge.papers && knowledge.papers.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Papers recentes</h3>
                  <div className="space-y-2">
                    {knowledge.papers.slice(0, 6).map((p: any, i: number) => (
                      <a key={i} href={p.doi ? `https://doi.org/${p.doi}` : "#"} target="_blank" rel="noopener noreferrer"
                         className="flex items-start gap-2 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{p.title}</p>
                          <div className="flex gap-2 mt-1">
                            {p.year && <span className="text-[10px] text-muted-foreground">{p.year}</span>}
                            {(p.citations ?? p.cited_by_count) > 0 && <span className="text-[10px] text-muted-foreground">{p.citations ?? p.cited_by_count} citações</span>}
                            {p.is_open_access && <span className="text-[9px] px-1 bg-emerald-500/10 text-emerald-600 rounded">OA</span>}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sidra" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">🎓 Quantos alunos e professores existem na área?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Dados do <strong>IBGE</strong> e do <strong>INEP</strong> sobre docentes, matrículas e cursos de pós-graduação. Essas informações revelam a capacidade formativa do Brasil no tema e onde estão as lacunas de formação que sua instituição pode preencher.
                </p>
              </div>
              {(data.layers as any).sidra?.pos_graduacao?.areas?.length > 0 ? (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Docentes e pós-graduação — INEP/IBGE</h3>
                    <a href={(data.layers as any).sidra.pos_graduacao.url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">{(data.layers as any).sidra.pos_graduacao.descricao}</p>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.pos_graduacao.areas.slice(0, 8).map((a: any, i: number) => (
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
              ) : (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">Dados de formação não disponíveis para este campo.</p>
                  <a href="https://sidra.ibge.gov.br" target="_blank" rel="noopener noreferrer"
                     className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Consultar SIDRA
                  </a>
                </div>
              )}
              {(data.layers as any).sidra?.graduacao?.areas?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Matrículas por área — Censo Ed. Superior</h3>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.graduacao.areas.slice(0, 6).map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-foreground truncate flex-1">{a.area}</span>
                        <div className="flex gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-muted-foreground">{a.periodo}</span>
                          <span className="text-xs font-bold text-primary">{a.valor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transparencia" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">💰 Como captar recursos para pesquisa neste tema?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Convênios federais e contratos públicos são a principal fonte de financiamento externo para pesquisa universitária. Esses dados mostram quais instituições já estão captando recursos, os valores envolvidos e as agências que financiam — um mapa de onde buscar oportunidades.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Convênios com CT&I — Portal da Transparência</h3>
                  <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> transparencia.gov.br
                  </a>
                </div>
                {policy.convenios && policy.convenios.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold font-mono text-foreground">{policy.convenios.length}</p>
                        <p className="text-[10px] text-muted-foreground">convênios identificados</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold font-mono text-primary">
                          R$ {totalConvenioValue > 0 ? (totalConvenioValue / 1e6).toFixed(1) + "M" : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">valor total</p>
                      </div>
                    </div>
                    {policy.convenios.slice(0, 8).map((c: any, i: number) => (
                      <div key={i} className="p-3 border border-border/50 rounded-lg">
                        <p className="text-xs font-medium text-foreground line-clamp-2">{c.object}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {c.proponent && <span className="text-[10px] text-muted-foreground">{c.proponent}</span>}
                          {c.uf && <span className="text-[10px] font-mono bg-muted px-1 rounded">{c.uf}</span>}
                          {c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e6).toFixed(2)}M</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum convênio identificado para este tema.</p>
                )}
              </div>
              {policy.contracts && policy.contracts.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Contratos federais de P&D — PNCP</h3>
                  <div className="space-y-2">
                    {policy.contracts.slice(0, 6).map((c: any, i: number) => (
                      <a key={i} href={c.url || "#"} target="_blank" rel="noopener noreferrer"
                         className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{c.object}</p>
                          <div className="flex gap-2 mt-1">
                            {c.organ && <span className="text-[10px] text-muted-foreground truncate">{c.organ}</span>}
                            {c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}k</span>}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <ParceriaICTModal />
            </TabsContent>

            <TabsContent value="regional" className="space-y-4">
              <RegionalTab persona="universidade" data={data} />
            </TabsContent>
            <TabsContent value="politicas" className="space-y-4">
              <PoliciesTab
                policies={(data.layers as any).policies}
                persona="universidade"
                query={data.query}
              />
            </TabsContent>
            <TabsContent value="ia" className="space-y-4">
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

            {(data.layers as any).programs?.context?.industrial && (
              <TabsContent value="nova-industria" className="space-y-4">
                <ProgramsTab programs={(data.layers as any).programs} which="nova-industria" />
              </TabsContent>
            )}
            {(data.layers as any).programs?.context?.ia && (
              <TabsContent value="pbia" className="space-y-4">
                <ProgramsTab programs={(data.layers as any).programs} which="pbia" />
              </TabsContent>
            )}
            <TabsContent value="fomento" className="space-y-4">
              <ProgramsTab programs={(data.layers as any).programs} which="fomento" />
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

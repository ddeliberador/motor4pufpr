import CagedSaldoChart from "@/components/shared/CagedSaldoChart";
import TrlScaleBar from "@/components/shared/TrlScaleBar";
import { useState, useEffect } from "react";
import { Building2, Search, ArrowLeft, AlertTriangle, Zap, MapPin, Globe, BookOpen, Shield, FileText, Activity, GitBranch, Target, ExternalLink, Users } from "lucide-react";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import { TrlScaleChart } from "@/components/shared/TrlScaleChart";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import { personaConfigs } from "@/config/personas";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import StrategicIndices from "./StrategicIndices";
import RelationalGraph from "./RelationalGraph";
import EntityResolutionCard from "@/components/shared/EntityResolutionCard";
import MarketAnalysisPanel from "@/components/shared/MarketAnalysisPanel";
import PatentsTab from "@/components/shared/PatentsTab";
import { NovaIndustriaTab, PbiaTab, FomentoTab } from "@/components/shared/ProgramsTabs";
import PoliciesTab from "@/components/shared/PoliciesTab";
import CnaeNcmCard from "@/components/shared/CnaeNcmCard";

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
  const [activeTab, setActiveTab] = useState("pncp");

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

  if (!hasSearched) return <Navigate to="/" replace />;

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
              { icon: FileText, value: data.stats.contracts, label: "Licitações" },
              { icon: Shield, value: data.stats.convenios, label: "Convênios" },
              { icon: Globe, value: data.stats.countries, label: "Países" },
              { icon: FileText, value: data.stats.datasets, label: "Datasets" },
              { icon: Activity, value: data.stats.macro_indicators, label: "Indicadores" },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3 text-center"><s.icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" /><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/30 rounded-xl mb-4">
              <TabsTrigger value="pncp" className="text-xs rounded-lg">📋 Compras Públicas</TabsTrigger>
              <TabsTrigger value="transparencia" className="text-xs rounded-lg">💰 Investimentos</TabsTrigger>
              <TabsTrigger value="caged" className="text-xs rounded-lg">👷 Empregos</TabsTrigger>
              <TabsTrigger value="sidra" className="text-xs rounded-lg">📊 Dados do Setor</TabsTrigger>
              <TabsTrigger value="patentes" className="text-xs rounded-lg">🔏 Patentes</TabsTrigger>
              <TabsTrigger value="politicas" className="text-xs rounded-lg">📋 Políticas</TabsTrigger>
              <TabsTrigger value="ia" className="text-xs rounded-lg">🧠 Análise IA {isAnalyzing && "…"}</TabsTrigger>
              {(data.layers as any).programs?.context?.industrial && (
                <TabsTrigger value="nova-industria" className="text-xs rounded-lg">🏭 Nova Indústria BR</TabsTrigger>
              )}
              {(data.layers as any).programs?.context?.ia && (
                <TabsTrigger value="pbia" className="text-xs rounded-lg">🤖 PBIA</TabsTrigger>
              )}
              <TabsTrigger value="fomento" className="text-xs rounded-lg">💡 Fomento</TabsTrigger>
            </TabsList>

            <TabsContent value="pncp" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">📋 O governo está comprando neste tema?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O <strong>PNCP</strong> (Portal Nacional de Contratações Públicas) reúne todas as licitações e contratos do governo federal. Cada item abaixo é uma compra pública real — indica que o governo já identificou este tema como prioridade e está pagando por soluções.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Compras públicas — PNCP
                  </h3>
                  <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> pncp.gov.br
                  </a>
                </div>
                {policy.contracts && policy.contracts.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold font-mono text-foreground">{(policy as any).total_contracts}</p>
                        <p className="text-[10px] text-muted-foreground">contratos</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold font-mono text-foreground">{(policy as any).total_convenios}</p>
                        <p className="text-[10px] text-muted-foreground">convênios</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold font-mono text-primary">
                          R$ {(policy as any).total_instrumental_value > 0 ? ((policy as any).total_instrumental_value / 1e6).toFixed(1) + "M" : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">valor total</p>
                      </div>
                    </div>
                    {policy.contracts.slice(0, 8).map((c: any, i: number) => (
                      <a key={i} href={c.url || "#"} target="_blank" rel="noopener noreferrer"
                         className="flex items-start gap-3 p-3 border border-border/50 rounded-lg hover:border-border transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-2">{c.object}</p>
                          <div className="flex gap-2 mt-1">
                            {c.organ && <span className="text-[10px] text-muted-foreground truncate">{c.organ}</span>}
                            {c.uf && <span className="text-[10px] font-mono bg-muted px-1 rounded">{c.uf}</span>}
                            {c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e3).toFixed(0)}k</span>}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nenhum contrato público identificado para este tema no PNCP.</p>
                    <a href={`https://pncp.gov.br/app/editais?q=${encodeURIComponent(data.query)}`} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Buscar no PNCP
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="transparencia" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">💰 Como o governo investe neste tema?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Convênios são acordos em que o governo federal repassa dinheiro para estados, municípios ou organizações realizarem projetos. As emendas são verbas indicadas por parlamentares. Ambos revelam onde o dinheiro público está sendo direcionado.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Convênios federais — Portal da Transparência</h3>
                  <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> transparencia.gov.br
                  </a>
                </div>
                {policy.convenios && policy.convenios.length > 0 ? (
                  <div className="space-y-2">
                    {policy.convenios.slice(0, 8).map((c: any, i: number) => (
                      <div key={i} className="p-3 border border-border/50 rounded-lg">
                        <p className="text-xs font-medium text-foreground line-clamp-2">{c.object}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {c.proponent && <span className="text-[10px] text-muted-foreground">{c.proponent}</span>}
                          {c.uf && <span className="text-[10px] font-mono bg-muted px-1 rounded">{c.uf}</span>}
                          {c.value > 0 && <span className="text-[10px] font-semibold text-primary">R$ {(c.value / 1e6).toFixed(2)}M</span>}
                          {c.situation && <span className="text-[10px] text-muted-foreground/60">{c.situation}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum convênio identificado para este tema.</p>
                )}
              </div>
              {(policy as any).emendas && (policy as any).emendas.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Emendas parlamentares no campo</h3>
                  <div className="space-y-2">
                    {(policy as any).emendas.slice(0, 6).map((e: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{e.author}</p>
                          <p className="text-[10px] text-muted-foreground">{e.function} · {e.locality}</p>
                        </div>
                        <span className="text-xs font-bold text-primary flex-shrink-0 ml-2">
                          R$ {(e.paid / 1e6).toFixed(2)}M
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="caged" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">👷 Como está o emprego formal neste setor?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O <strong>Novo CAGED</strong> registra todas as contratações e demissões com carteira assinada no Brasil. Para gestores públicos, esses dados indicam se o mercado de trabalho do setor está crescendo ou retraindo — essencial para planejar políticas de qualificação profissional.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Emprego formal — Novo CAGED / MTE
                  </h3>
                  <a href="https://www.gov.br/trabalho-e-emprego" target="_blank" rel="noopener noreferrer"
                     className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> MTE
                  </a>
                </div>
                {(technology as any).caged_data ? (
                  <div className="space-y-4">
                    {/* Label do setor foco */}
                    {(technology as any).caged_data.setor_foco?.disponivel && (
                      <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg mb-2">
                        <p className="text-[10px] text-primary font-medium">
                          📊 Setor foco: {(technology as any).caged_data.setor_foco.label}
                        </p>
                      </div>
                    )}

                    {/* Métricas — prioriza setorial, cai em nacional */}
                    {(() => {
                      const sf = (technology as any).caged_data.setor_foco;
                      const nac = (technology as any).caged_data.nacional;
                      const useSetor = sf?.disponivel && sf?.total_saldo != null;
                      const adm = (useSetor ? sf.total_admissoes : null) ?? nac?.total_admissoes;
                      const dem = (useSetor ? sf.total_demissoes : null) ?? nac?.total_demissoes;
                      const saldo = useSetor ? sf.total_saldo : nac?.total_saldo;
                      const contexto = useSetor
                        ? sf.detalhes?.map((d: any) => d.nome).join(" + ") || sf.label
                        : "agregado nacional";
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold font-mono text-emerald-500">
                                {adm != null ? `+${adm.toLocaleString("pt-BR")}` : "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">admissões (12m)</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold font-mono text-red-500">
                                {dem != null ? `-${dem.toLocaleString("pt-BR")}` : "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">demissões (12m)</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                              <p className={`text-xl font-bold font-mono ${(saldo ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {saldo != null ? `${saldo >= 0 ? "+" : ""}${saldo.toLocaleString("pt-BR")}` : "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">saldo líquido</p>
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground px-1">
                            {useSetor
                              ? `Setor: ${contexto}${sf.ano_referencia ? ` · ${sf.ano_referencia}` : ""} — saldo = ${sf.metrica || "variação anual de ocupados"}. Admissões/desligamentos: Novo CAGED nacional (12m).`
                              : "⚠ Dado setorial indisponível — exibindo série nacional agregada"}
                          </p>

                          {/* Detalhamento por subseção CNAE quando disponível */}
                          {useSetor && sf.detalhes?.length > 1 && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Por seção CNAE</p>
                              {sf.detalhes.map((d: any, i: number) => (
                                <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-muted/20 rounded">
                                  <span className="text-[10px] text-foreground">{d.nome}</span>
                                  <div className="flex gap-3">
                                    {d.ocupados_mil != null && (
                                      <span className="text-[9px] text-muted-foreground">
                                        {(d.ocupados_mil * 1000).toLocaleString("pt-BR")} ocupados
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-bold ${d.saldo >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                      {d.saldo >= 0 ? "+" : ""}{d.saldo.toLocaleString("pt-BR")}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {(technology as any).caged_data.ocupacoes?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Ocupações monitoradas (CBO)</p>
                        <div className="flex flex-wrap gap-2">
                          {(technology as any).caged_data.ocupacoes.slice(0, 6).map((o: any, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-1 bg-muted rounded font-mono">
                              {o.code} · {o.description}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <CagedSaldoChart serie={(technology as any).caged_data.setor_foco?.disponivel
                        ? (technology as any).caged_data.setor_foco.serie_saldo
                        : (technology as any).caged_data.nacional?.serie_saldo} gradientId="cagedGradGov" />
                    <p className="text-[9px] text-muted-foreground">{(technology as any).caged_data.escopo}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Dados do CAGED não disponíveis para este tema.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sidra" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">📊 O que os dados do IBGE dizem sobre este setor?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O <strong>SIDRA</strong> é o sistema de dados do IBGE — o instituto que produz as estatísticas oficiais do Brasil. A <strong>PINTEC</strong> mostra quanto as empresas inovam. O <strong>PIB setorial</strong> mostra o peso econômico do setor. Esses dados ajudam a fundamentar políticas públicas com evidência.
                </p>
              </div>
              <CnaeNcmCard technology={technology} />
              {(data.layers as any).sidra?.pintec?.setores?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Inovação setorial — PINTEC/IBGE</h3>
                    <a href={(data.layers as any).sidra.pintec.url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA
                    </a>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">{(data.layers as any).sidra.pintec.descricao} · {(data.layers as any).sidra.pintec.periodo}</p>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.pintec.setores.slice(0, 8).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-foreground truncate flex-1">{s.atividade}</span>
                        <span className="text-xs font-bold text-primary ml-2">{s.valor}{s.unidade === "%" ? "%" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(data.layers as any).sidra?.pib_setorial?.series?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">PIB por atividade — SCN/IBGE</h3>
                    <a href={(data.layers as any).sidra.pib_setorial.url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA
                    </a>
                  </div>
                  <div className="space-y-1.5">
                    {(data.layers as any).sidra.pib_setorial.series.slice(0, 6).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                        <span className="text-xs text-foreground truncate flex-1">{s.componente}</span>
                        <div className="flex gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-muted-foreground">{s.periodo}</span>
                          <span className="text-xs font-bold text-primary">{s.valor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!(data.layers as any).sidra?.pintec?.setores?.length && !(data.layers as any).sidra?.pib_setorial?.series?.length && (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">Dados SIDRA/IBGE não disponíveis para o setor deste tema.</p>
                  <a href="https://sidra.ibge.gov.br" target="_blank" rel="noopener noreferrer"
                     className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Consultar SIDRA diretamente
                  </a>
                </div>
              )}
            </TabsContent>

            <TabsContent value="patentes" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">🔏 Quem detém a propriedade intelectual neste campo?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Uma patente dá ao seu dono o direito exclusivo de usar uma tecnologia por até 20 anos. Quando a maioria das patentes de um campo é de empresas estrangeiras, o Brasil corre risco de <strong>dependência tecnológica</strong> — precisando pagar para usar tecnologias que outros criaram. Esses dados orientam políticas de soberania tecnológica.
                </p>
              </div>
              <TrlScaleBar
                trlData={(data.layers as any).patents?.trl_from_patents}
                fallback={(technology as any).trl_estimate}
              />
              <PatentsTab patents={(data.layers as any).patents} persona="governo" />
            </TabsContent>

            <TabsContent value="politicas" className="space-y-4">
              <PoliciesTab
                policies={(data.layers as any).policies}
                persona="governo"
                query={data.query}
              />
            </TabsContent>
            <TabsContent value="ia" className="space-y-4">
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

            {(data.layers as any).programs?.context?.industrial && (
              <TabsContent value="nova-industria" className="space-y-4">
                <NovaIndustriaTab ni={(data.layers as any).programs?.nova_industria} emphasizeExecution />
              </TabsContent>
            )}

            {(data.layers as any).programs?.context?.ia && (
              <TabsContent value="pbia" className="space-y-4">
                <PbiaTab pbia={(data.layers as any).programs?.pbia} emphasizeExecution />
              </TabsContent>
            )}

            <TabsContent value="fomento" className="space-y-4">
              <FomentoTab fom={(data.layers as any).programs?.fomento} />
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

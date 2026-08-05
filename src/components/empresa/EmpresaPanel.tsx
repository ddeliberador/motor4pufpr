import CagedSaldoChart from "@/components/shared/CagedSaldoChart";
import TrlScaleBar from "@/components/shared/TrlScaleBar";
import { useState, useCallback, useEffect } from "react";
import { Factory, Search, ArrowLeft, AlertTriangle, Zap, Globe, GitBranch, Building2, TrendingUp, Target, Handshake, ShieldCheck, Users, Building, ExternalLink, MapPin } from "lucide-react";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import LocalContextBadge from "@/components/shared/LocalContextBadge";
import { useMotorLocation } from "@/hooks/useLocation";
import { TrlScaleChart } from "@/components/shared/TrlScaleChart";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import { personaConfigs } from "@/config/personas";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import StrategicIndices from "@/components/governo/StrategicIndices";
import OpportunityCard from "@/components/shared/OpportunityCard";
import LeiBemCalculadora from "@/components/shared/LeiBemCalculadora";
import ParceriaICTModal from "@/components/shared/ParceriaICTModal";
import DataDetailSheet, { type DetailItem } from "@/components/shared/DataDetailSheet";
import EntityResolutionCard from "@/components/shared/EntityResolutionCard";
import MarketAnalysisPanel from "@/components/shared/MarketAnalysisPanel";
import PatentsTab from "@/components/shared/PatentsTab";
import ProgramsTab from "@/components/shared/ProgramsTab";
import PoliciesTab from "@/components/shared/PoliciesTab";
import CnaeNcmCard from "@/components/shared/CnaeNcmCard";


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
  const [hasSearched, setHasSearched] = useState(() =>
    sessionStorage.getItem("motor4p_query") !== null &&
    sessionStorage.getItem("motor4p_persona") === "empresa"
  );
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
  const { uf, ufNome, municipioNome, label: locationLabel, hasLocation } = useMotorLocation();

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
      search(savedQuery, expectedPersona, { location: locationLabel || undefined }, cnaes.map((c) => c.code));
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

  if (!hasSearched) return <Navigate to="/" replace />;

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
          <LocalContextBadge persona="empresa" />
          {indices && <StrategicIndices indices={indices} />}

          {(data as any).oportunidades?.length > 0 && (
            <OpportunityCard
              oportunidades={(data as any).oportunidades}
              persona="empresa"
              query={data.query}
              cnaeLabel={
                (data.layers as any).technology?.cnae_result?.subclasses?.[0]?.descricao ||
                (data.layers as any).technology?.cnae_result?.divisoes?.[0]?.descricao
              }
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">TRL Estimado</p><p className="text-3xl font-bold text-foreground">{trlEstimate}</p><p className="text-[10px] text-muted-foreground">{trlLabel}</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Grupos de P&D</p><p className="text-3xl font-bold text-foreground">{institutionRanking.length}</p><p className="text-[10px] text-muted-foreground">possíveis parceiros</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Mercado público</p><p className="text-3xl font-bold text-accent">R$ {((totalContractValue + totalConvenioValue) / 1e6).toFixed(1)}M</p><p className="text-[10px] text-muted-foreground">em instrumentos</p></div>
            <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Concorrentes mapeados</p><p className="text-3xl font-bold text-foreground">{(competitors?.summary?.total_br || 0) + (competitors?.summary?.total_intl || 0)}</p><p className="text-[10px] text-muted-foreground">{isLoadingCompetitors ? "buscando..." : "BR + global"}</p></div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/30 rounded-xl mb-4">
              <TabsTrigger value="mercado" className="text-xs rounded-lg">🏢 Empresas do Setor</TabsTrigger>
              <TabsTrigger value="caged" className="text-xs rounded-lg">👷 Mão de Obra</TabsTrigger>
              <TabsTrigger value="comex" className="text-xs rounded-lg">🌐 Importação/Exportação</TabsTrigger>
              <TabsTrigger value="patentes" className="text-xs rounded-lg">🔏 Concorrência em PI</TabsTrigger>
              <TabsTrigger value="politicas" className="text-xs rounded-lg">📋 Incentivos Fiscais</TabsTrigger>
              <TabsTrigger value="ia" className="text-xs rounded-lg">🧠 Análise IA {isAnalyzing && "…"}</TabsTrigger>
              {(data.layers as any).programs?.context?.industrial && (
                <TabsTrigger value="nova-industria" className="text-xs rounded-lg">🏭 Nova Indústria BR</TabsTrigger>
              )}
              {(data.layers as any).programs?.context?.ia && (
                <TabsTrigger value="pbia" className="text-xs rounded-lg">🤖 PBIA</TabsTrigger>
              )}
              <TabsTrigger value="fomento" className="text-xs rounded-lg">💡 Fomento</TabsTrigger>
            </TabsList>


            <TabsContent value="mercado" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">🏢 Como é o mercado deste setor no Brasil?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O <strong>CEMPRE</strong> (Cadastro Central de Empresas) do IBGE mostra quantas empresas existem em cada setor e quantas pessoas empregam. Esses dados ajudam a entender o tamanho do mercado, a concorrência e as oportunidades de posicionamento.
                </p>
              </div>

              {/* Dados locais quando há localização configurada */}
              {hasLocation && (data.layers as any).policy?.location_filter?.applied && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                  <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    Contratos públicos em {locationLabel}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Compras do governo estadual e municipal relacionadas a <strong>{data.query}</strong> no seu estado.
                    Esses contratos representam oportunidades de receita direta para sua empresa.
                  </p>
                  {(() => {
                    const localContracts = (data.layers.policy.contracts || []).filter((c: any) =>
                      c.uf === uf || c.organ?.toLowerCase().includes(uf.toLowerCase())
                    );
                    return localContracts.length > 0 ? (
                      <div className="space-y-2">
                        {localContracts.slice(0, 5).map((c: any, i: number) => (
                          <a key={i} href={c.url || "#"} target="_blank" rel="noopener noreferrer"
                             className="flex items-start gap-3 p-3 border border-border/50 rounded-xl hover:border-emerald-500/30 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-2">{c.object}</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">{c.organ}</span>
                                {c.value > 0 && <span className="text-xs font-bold text-emerald-500">R$ {(c.value / 1e3).toFixed(0)}k</span>}
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum contrato estadual/municipal identificado para este tema em {locationLabel}.
                        <a href={`https://pncp.gov.br/app/editais?q=${encodeURIComponent(data.query)}&uf=${uf}`}
                           target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                          Buscar no PNCP →
                        </a>
                      </p>
                    );
                  })()}
                </div>
              )}
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
              <CnaeNcmCard technology={technology} />
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
              <ParceriaICTModal />
            </TabsContent>

            <TabsContent value="caged" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">👷 Existe mão de obra disponível?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Saber se há profissionais qualificados disponíveis é crucial antes de expandir ou entrar em um novo mercado. Os dados do <strong>Novo CAGED</strong> mostram o movimento de contratações e demissões — um saldo positivo significa que o setor está aquecido e disputando talentos.
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Disponibilidade de mão de obra — Novo CAGED / MTE
                  </h3>
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
                    <CagedSaldoChart serie={(technology as any).caged_data.setor_foco?.disponivel
                        ? (technology as any).caged_data.setor_foco.serie_saldo
                        : (technology as any).caged_data.nacional?.serie_saldo} gradientId="cagedGradEmp" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Dados do CAGED não disponíveis para este tema.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comex" className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">🌐 O Brasil importa ou exporta este produto?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Se o Brasil importa muito e exporta pouco, pode haver uma oportunidade de substituição de importações — produzir aqui o que vem de fora. Se exporta muito, o produto tem competitividade internacional. Dados do <strong>COMEX Stat</strong> (Ministério do Desenvolvimento) e do <strong>Banco Central</strong>.
                </p>
              </div>
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
              <div className="bg-card border border-border rounded-2xl p-5 mb-4">
                <h3 className="text-base font-semibold text-foreground mb-2">🔏 Quem são os concorrentes em propriedade intelectual?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Antes de investir em P&D ou lançar um produto, é essencial saber se outras empresas já patentearam tecnologias similares. Patentes de concorrentes podem bloquear sua entrada no mercado. Esses dados vêm do <strong>EPO OPS</strong> (Escritório Europeu de Patentes), que cobre patentes globais.
                </p>
              </div>
              <TrlScaleBar
                trlData={(data.layers as any).patents?.trl_from_patents}
                fallback={(technology as any).trl_estimate}
              />
              <PatentsTab patents={(data.layers as any).patents} persona="empresa" />
            </TabsContent>

            <TabsContent value="politicas" className="space-y-4">
              <LeiBemCalculadora />
              <PoliciesTab
                policies={(data.layers as any).policies}
                persona="empresa"
                query={data.query}
              />
            </TabsContent>
            <TabsContent value="ia" className="space-y-4">
              {isAnalyzing ? (<div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="ml-3 text-sm text-muted-foreground">Gerando inteligência competitiva...</span></div>
              ) : analysis && analysis.sections?.length > 0 ? (
                <div className="space-y-4">
                  {analysis.questions.map((question, idx) => (<div key={idx} className="bg-card border border-border rounded-xl p-6"><h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-3"><span className={`w-7 h-7 rounded-full bg-gradient-to-br ${config.color} text-white text-sm font-bold flex items-center justify-center flex-shrink-0`}>{idx + 1}</span>{question}</h3><div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary"><ReactMarkdown>{analysis.sections[idx] || ""}</ReactMarkdown></div></div>))}
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

export default EmpresaPanel;

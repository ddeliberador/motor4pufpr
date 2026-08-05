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
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import StrategicIndices from "@/components/governo/StrategicIndices";
import OpportunityCard from "@/components/shared/OpportunityCard";
import DataDetailSheet, { type DetailItem } from "@/components/shared/DataDetailSheet";
import EntityResolutionCard from "@/components/shared/EntityResolutionCard";
import { NovaIndustriaTab, PbiaTab, FomentoTab } from "@/components/shared/ProgramsTabs";
import PoliciesTab from "@/components/shared/PoliciesTab";
import CnaeNcmCard from "@/components/shared/CnaeNcmCard";

const PesquisadorPanel = () => {
  const config = personaConfigs.pesquisador;
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(() =>
    sessionStorage.getItem("motor4p_query") !== null &&
    sessionStorage.getItem("motor4p_persona") === "pesquisador"
  );
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
  if (!hasSearched) return <Navigate to="/" replace />;

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

          {(data as any).oportunidades?.length > 0 && (
            <OpportunityCard
              oportunidades={(data as any).oportunidades}
              persona="pesquisador"
              query={data.query}
              cnaeLabel={
                (data.layers as any).technology?.cnae_result?.subclasses?.[0]?.descricao ||
                (data.layers as any).technology?.cnae_result?.divisoes?.[0]?.descricao
              }
            />
          )}


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

            <TabsContent value="openalex" className="space-y-5">

              {/* Resumo em linguagem simples */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-base font-semibold text-foreground mb-2">
                  📚 O que o Brasil já sabe sobre <span className="text-primary">"{data.query}"</span>?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Dados extraídos do <strong>OpenAlex</strong>, o maior repositório global de artigos científicos gratuito.
                  Cada "paper" é um artigo publicado em revista científica por pesquisadores.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      valor: data.stats.papers.toLocaleString("pt-BR"),
                      titulo: "Artigos publicados",
                      explica: "Total de artigos científicos brasileiros sobre o tema encontrados no OpenAlex",
                      cor: "text-primary",
                    },
                    {
                      valor: data.stats.institutions,
                      titulo: "Universidades e institutos",
                      explica: "Quantas instituições brasileiras têm pesquisadores que publicam sobre o tema",
                      cor: "text-foreground",
                    },
                    {
                      valor: data.stats.countries,
                      titulo: "Países parceiros",
                      explica: "Países que publicaram artigos em conjunto com pesquisadores brasileiros",
                      cor: "text-foreground",
                    },
                    {
                      valor: (knowledge as any).total_papers_global > 0
                        ? `${(((knowledge as any).total_papers / (knowledge as any).total_papers_global) * 100).toFixed(1)}%`
                        : "—",
                      titulo: "Participação mundial",
                      explica: "De cada 100 artigos publicados no mundo sobre este tema, quantos são brasileiros",
                      cor: "text-foreground",
                    },
                  ].map((m, i) => (
                    <div key={i} className="bg-muted/30 rounded-xl p-4 text-center" title={m.explica}>
                      <p className={`text-3xl font-bold ${m.cor} mb-1`}>{m.valor}</p>
                      <p className="text-sm font-medium text-foreground">{m.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-tight">{m.explica}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quem pesquisa — grupos de pesquisa com pesquisadores nominados */}
              {institutionRanking.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-foreground">
                      🔬 Quem pesquisa este tema no Brasil?
                    </h3>
                    <a href={`https://openalex.org/works?filter=institutions.country_code:br,display_name.search:${encodeURIComponent(data.query)}`}
                       target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Ver no OpenAlex
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Instituições com mais artigos publicados sobre <strong>"{data.query}"</strong>.
                    O número indica quantos artigos foram publicados por pesquisadores daquele local.
                    Clique no nome de um pesquisador para ver seu perfil completo.
                  </p>

                  <div className="space-y-3">
                    {institutionRanking.slice(0, 8).map(([inst, count], i) => {
                      const pesquisadores = knowledge.papers
                        .flatMap((p: any) =>
                          (p.authorships || [])
                            .filter((a: any) =>
                              (a.institution || a.institutions?.[0]?.display_name || "")
                                .toLowerCase().includes(inst.toLowerCase().slice(0, 15))
                            )
                            .map((a: any) => a.author?.display_name || a.name || "")
                        )
                        .filter(Boolean);
                      const pesqUnicos = [...new Set(pesquisadores)].slice(0, 5) as string[];

                      return (
                        <div key={i} className={`rounded-xl border p-4 ${i === 0 ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-border transition-colors"}`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className={`text-lg font-bold flex-shrink-0 w-7 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                                {i + 1}º
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground leading-snug">{inst}</p>
                                {i === 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full mt-1 inline-block">Líder nacional no tema</span>}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-xl font-bold text-primary">{count as number}</p>
                              <p className="text-xs text-muted-foreground">{(count as number) === 1 ? "artigo" : "artigos"} publicados</p>
                            </div>
                          </div>

                          {pesqUnicos.length > 0 ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                👤 Pesquisadores identificados nesta instituição:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {pesqUnicos.map((nome, j) => (
                                  <a key={j}
                                     href={`https://openalex.org/authors?filter=display_name.search:${encodeURIComponent(nome)}`}
                                     target="_blank" rel="noopener noreferrer"
                                     className="text-sm px-3 py-1 bg-muted rounded-full hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20">
                                    {nome}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 italic">
                              Nomes dos pesquisadores não disponíveis nos metadados públicos
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Países parceiros com barras e nomes completos */}
              {knowledge.international && knowledge.international.filter((c: any) => c.country_code !== "BR").length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    🌍 Com quais países o Brasil colabora?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Países cujos pesquisadores assinaram artigos <strong>em conjunto</strong> com brasileiros sobre este tema.
                    Mais colaborações = mais integração científica internacional.
                  </p>
                  <div className="space-y-2">
                    {(() => {
                      const PAISES: Record<string, string> = {
                        US: "Estados Unidos", CN: "China", DE: "Alemanha", GB: "Reino Unido",
                        FR: "França", JP: "Japão", KR: "Coreia do Sul", IN: "Índia",
                        CA: "Canadá", AU: "Austrália", IT: "Itália", ES: "Espanha",
                        NL: "Holanda", CH: "Suíça", SE: "Suécia", PT: "Portugal",
                        AR: "Argentina", MX: "México", CO: "Colômbia", CL: "Chile",
                        PE: "Peru", EC: "Equador", UY: "Uruguai", BO: "Bolívia",
                        ZA: "África do Sul", NG: "Nigéria", EG: "Egito", MA: "Marrocos",
                      };
                      const FLAGS: Record<string, string> = {
                        US: "🇺🇸", CN: "🇨🇳", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷",
                        JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", CA: "🇨🇦", AU: "🇦🇺",
                        IT: "🇮🇹", ES: "🇪🇸", NL: "🇳🇱", CH: "🇨🇭", SE: "🇸🇪",
                        PT: "🇵🇹", AR: "🇦🇷", MX: "🇲🇽", CO: "🇨🇴", CL: "🇨🇱",
                        PE: "🇵🇪", EC: "🇪🇨", UY: "🇺🇾", BO: "🇧🇴",
                      };
                      const lista = knowledge.international.filter((c: any) => c.country_code !== "BR").slice(0, 8);
                      const max = Math.max(...lista.map((c: any) => c.count));
                      return lista.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xl flex-shrink-0">{FLAGS[c.country_code] || "🏳️"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {PAISES[c.country_code] || c.country_code}
                              </span>
                              <span className="text-sm font-bold text-foreground ml-2">
                                {c.count} {c.count === 1 ? "artigo" : "artigos"}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (c.count / max) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
                    📌 Fonte: OpenAlex · Coautorias identificadas nos artigos brasileiros sobre o tema
                  </p>
                </div>
              )}

              {/* Financiadores */}
              {(() => {
                const grants = (knowledge.papers || []).flatMap((p: any) => p.grants || []).filter((g: any) => g.funder);
                const byFunder: Record<string, number> = {};
                for (const g of grants) {
                  if (g.funder) byFunder[g.funder] = (byFunder[g.funder] || 0) + 1;
                }
                const funders = Object.entries(byFunder).sort(([, a], [, b]) => b - a).slice(0, 8);
                if (!funders.length) return null;
                return (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      💰 Quem está pagando a pesquisa?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Agências e organizações que financiaram os artigos publicados — identificadas nos próprios metadados dos papers.
                      O número indica em quantos artigos cada financiador aparece.
                    </p>
                    <div className="space-y-2">
                      {funders.map(([funder, count], i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground font-mono w-5">{i + 1}</span>
                            <span className="text-sm text-foreground font-medium">{funder}</span>
                          </div>
                          <span className="text-sm font-bold text-primary flex-shrink-0">
                            {count} {count === 1 ? "artigo" : "artigos"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      📌 Extraído dos metadados de financiamento dos artigos via OpenAlex
                    </p>
                  </div>
                );
              })()}

              {/* Artigos recentes */}
              {knowledge.papers && knowledge.papers.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-foreground">
                      📄 Artigos mais recentes
                    </h3>
                    <a href={`https://openalex.org/works?filter=institutions.country_code:br,display_name.search:${encodeURIComponent(data.query)}&sort=publication_date:desc`}
                       target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Ver todos
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {(knowledge as any).total_papers?.toLocaleString("pt-BR")} artigos encontrados no total.
                    Clique no título para acessar o artigo completo (quando disponível gratuitamente).
                  </p>
                  <div className="space-y-3">
                    {knowledge.papers.slice(0, 8).map((p: any, i: number) => (
                      <div key={i} className="p-4 border border-border/50 rounded-xl hover:border-border transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <a href={p.doi ? `https://doi.org/${p.doi}` : p.url || "#"}
                             target="_blank" rel="noopener noreferrer"
                             className="text-sm font-medium text-primary hover:underline flex-1 leading-snug">
                            {p.title || "Sem título"}
                          </a>
                          {p.year && (
                            <span className="text-sm text-muted-foreground flex-shrink-0 bg-muted px-2 py-0.5 rounded">
                              {p.year}
                            </span>
                          )}
                        </div>
                        {p.abstract && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{p.abstract}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {(p.citations ?? p.cited_by_count) > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                              📊 {(p.citations ?? p.cited_by_count)} citações
                            </span>
                          )}
                          {p.is_open_access && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded">
                              🔓 Acesso gratuito
                            </span>
                          )}
                          {(p.grants || []).length > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded">
                              💰 Financiado
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pós-graduação SIDRA */}
              {(data.layers as any).sidra?.pos_graduacao?.areas?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-foreground">
                      🎓 Cursos de pós-graduação na área
                    </h3>
                    <a href={(data.layers as any).sidra.pos_graduacao.url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> SIDRA/IBGE
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Dados do IBGE sobre formação acadêmica nas áreas relacionadas ao tema — quantos docentes e alunos existem no Brasil.
                  </p>
                  <div className="space-y-2">
                    {(data.layers as any).sidra.pos_graduacao.areas.slice(0, 6).map((a: any, i: number) => (
                      <div key={i} className="px-4 py-3 bg-muted/30 rounded-xl">
                        <p className="text-sm font-medium text-foreground mb-1">{a.area}</p>
                        <div className="flex gap-4">
                          {a.series.slice(0, 2).map((s: any, j: number) => (
                            <span key={j} className="text-xs text-muted-foreground">
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

            <TabsContent value="embrapii" className="space-y-5">

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-base font-semibold text-foreground mb-2">
                  🏭 Projetos de pesquisa aplicada à indústria
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  A <strong>EMBRAPII</strong> (Empresa Brasileira de Pesquisa e Inovação Industrial) financia projetos em que empresas e institutos de pesquisa desenvolvem tecnologia juntos. O <strong>TRL</strong> (Technology Readiness Level) indica o quanto uma tecnologia está pronta para o mercado — vai de 1 (ideia inicial) a 9 (produto disponível).
                </p>

                <TrlScaleBar
                  trlData={(data.layers as any).patents?.trl_from_patents}
                  fallback={(technology as any).trl_estimate}
                />
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-base font-semibold text-foreground mb-2">
                  🏷️ Classificação oficial do setor
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  O <strong>CNAE</strong> é o código que o governo usa para identificar o setor de uma empresa. O <strong>NCM</strong> é o código aduaneiro do produto — usado em notas fiscais e exportações. Esses códigos conectam a pesquisa com os dados econômicos do setor.
                </p>
                <CnaeNcmCard technology={technology} />
              </div>

              {(technology as any).innovation_datasets && (technology as any).innovation_datasets.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-foreground">📂 Bases de dados disponíveis</h3>
                    <a href="https://embrapii.org.br/dados-abertos" target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> EMBRAPII
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conjuntos de dados públicos sobre projetos de pesquisa e inovação industrial relacionados ao tema.
                  </p>
                  <div className="space-y-2">
                    {(technology as any).innovation_datasets.slice(0, 6).map((d: any, i: number) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                         className="flex items-start gap-3 p-4 border border-border/50 rounded-xl hover:border-border transition-colors">
                        <span className="text-xl">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{d.title}</p>
                          {d.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{d.description}</p>}
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(technology as any).innovation_datasets?.length === 0 && (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <p className="text-3xl mb-3">🔍</p>
                  <p className="text-base font-medium text-foreground mb-1">Nenhum projeto identificado nas bases abertas</p>
                  <p className="text-sm text-muted-foreground mb-4">Isso pode indicar que a pesquisa neste tema ainda é pouco industrializada, ou os dados ainda não foram publicados abertamente.</p>
                  <a href="https://embrapii.org.br/dados-abertos" target="_blank" rel="noopener noreferrer"
                     className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Consultar diretamente na EMBRAPII
                  </a>
                </div>
              )}

              {(data.layers as any).sidra?.pintec?.setores?.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-foreground">📊 Inovação por setor da indústria</h3>
                    <a href="https://sidra.ibge.gov.br/tabela/7494" target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> PINTEC/IBGE
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    A <strong>PINTEC</strong> (Pesquisa de Inovação) do IBGE mostra qual percentual das empresas de cada setor implementou inovações. Quanto maior o número, mais o setor inova.
                  </p>
                  <div className="space-y-2">
                    {(data.layers as any).sidra.pintec.setores.slice(0, 5).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl">
                        <span className="text-sm text-foreground">{s.atividade}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-primary">{s.valor}%</span>
                          <span className="text-xs text-muted-foreground">das empresas inovam</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </TabsContent>

            <TabsContent value="empregabilidade" className="space-y-5">

              {(technology as any).caged_data ? (() => {
                const nac = (technology as any).caged_data.nacional;
                const adm = nac?.total_admissoes;
                const dem = nac?.total_demissoes;
                const saldo = nac?.total_saldo ?? 0;
                const tendencia = nac?.tendencia_geral;
                const periodo = nac?.periodo || "últimos 12 meses";
                const ocupacoes = (technology as any).caged_data.ocupacoes || [];

                const trendIcon = tendencia === "crescimento" ? "📈" : tendencia === "retração" ? "📉" : "➡️";
                const trendLabel = tendencia === "crescimento" ? "Mercado em expansão" : tendencia === "retração" ? "Mercado retraindo" : "Mercado estável";

                return (
                  <>
                    {/* Contexto explicativo */}
                    <div className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-2xl">{trendIcon}</span>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{trendLabel}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Profissionais com carteira assinada no Brasil — {periodo}
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-xl p-4 mb-5">
                        <p className="text-sm text-foreground leading-relaxed">
                          Esses números mostram <strong>quantas pessoas foram contratadas e demitidas com carteira assinada</strong> no Brasil
                          em áreas relacionadas a <strong>{data.query}</strong>.
                          O saldo é a diferença: se positivo, mais empregos foram criados do que encerrados.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
                          <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider mb-2">✅ Contratações</p>
                          <p className="text-3xl font-bold text-emerald-500 font-mono leading-none">
                            {adm != null ? `+${adm.toLocaleString("pt-BR")}` : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">pessoas contratadas com carteira</p>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
                          <p className="text-[11px] text-red-500 font-semibold uppercase tracking-wider mb-2">❌ Demissões</p>
                          <p className="text-3xl font-bold text-red-500 font-mono leading-none">
                            {dem != null ? `-${dem.toLocaleString("pt-BR")}` : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">pessoas que saíram do mercado formal</p>
                        </div>

                        <div className={`rounded-xl p-5 text-center border ${saldo >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${saldo >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {saldo >= 0 ? "📊 Saldo positivo" : "📊 Saldo negativo"}
                          </p>
                          <p className={`text-3xl font-bold font-mono leading-none ${saldo >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {saldo != null ? `${saldo >= 0 ? "+" : ""}${saldo.toLocaleString("pt-BR")}` : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">empregos criados no saldo final</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Evolução mês a mês</p>
                          <a href="https://www.gov.br/trabalho-e-emprego" target="_blank" rel="noopener noreferrer"
                             className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Fonte: MTE
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground">Saldo de empregos por mês — pontos acima da linha = mais contratações; abaixo = mais demissões</p>
                        <CagedSaldoChart
                          serie={(technology as any).caged_data.setor_foco?.disponivel
                            ? (technology as any).caged_data.setor_foco.serie_saldo
                            : (technology as any).caged_data.nacional?.serie_saldo}
                          gradientId="cagedGradPesq"
                        />
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/30">
                        📌 Dados do Novo CAGED (Cadastro Geral de Empregados e Desempregados) — Ministério do Trabalho e Emprego.
                        Cobre apenas empregos formais com carteira assinada. Autônomos e informais não estão incluídos.
                      </p>
                    </div>

                    {/* Perfis profissionais */}
                    {ocupacoes.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-foreground mb-1">👤 Perfis profissionais relacionados</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          Ocupações que mais aparecem em empresas que atuam nesse campo, segundo a Classificação Brasileira de Ocupações (CBO).
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {ocupacoes.map((o: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 rounded-lg">
                              <span className="text-lg">💼</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{o.description}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{o.code}{o.area ? ` · ${o.area}` : ""}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GitHub como sinal de demanda técnica */}
                    {technology.github_repos && technology.github_repos.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-primary" />
                          Habilidades técnicas mais buscadas
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          Projetos de código aberto no GitHub relacionados ao tema — indica quais tecnologias e linguagens estão sendo mais usadas no mercado.
                        </p>
                        {technology.language_distribution && Object.keys(technology.language_distribution).length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-2">Linguagens de programação mais comuns:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(technology.language_distribution as Record<string, number>)
                                .sort(([, a], [, b]) => b - a)
                                .map(([lang, count]) => (
                                  <span key={lang} className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                                    {lang} <span className="opacity-60 text-xs">({count})</span>
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {technology.github_repos.slice(0, 5).map((r: any, i: number) => (
                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                               className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground truncate font-medium">{r.name}</p>
                                {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                              </div>
                              <span className="text-sm font-bold text-amber-500 flex-shrink-0 ml-3">⭐ {r.stars?.toLocaleString("pt-BR")}</span>
                            </a>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3">
                          Projetos com mais estrelas no GitHub = maior adoção pela comunidade técnica
                        </p>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <p className="text-2xl mb-3">📊</p>
                  <p className="text-base font-medium text-foreground mb-1">Dados do mercado de trabalho indisponíveis</p>
                  <p className="text-sm text-muted-foreground">Não encontramos dados de emprego formal para este tema no Novo CAGED.</p>
                </div>
              )}

            </TabsContent>




            {/* ICTs NACIONAIS */}
            <TabsContent value="icts" className="space-y-5">

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-base font-semibold text-foreground mb-2">
                  🏛️ Institutos e centros de pesquisa no Brasil
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong>ICTs</strong> são Instituições Científicas, Tecnológicas e de Inovação — universidades, institutos federais, centros de pesquisa e laboratórios credenciados pelo governo. São os lugares onde a pesquisa acontece e onde você pode buscar parcerias, acesso a equipamentos e publicações.
                </p>
              </div>

              {isLoadingIcts ? (
                <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Identificando institutos de pesquisa em <strong>{data.query}</strong>...</p>
                </div>
              ) : icts ? (
                <div className="space-y-4">
                  {icts.overview && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                      <p className="text-sm font-medium text-foreground mb-1">🗺️ Panorama do ecossistema</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{icts.overview}</p>
                    </div>
                  )}

                  {icts.icts?.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">{icts.icts.length} instituição{icts.icts.length > 1 ? "s" : ""} identificada{icts.icts.length > 1 ? "s" : ""}:</p>
                      {icts.icts.map((ict: any, i: number) => (
                        <div key={i} className="bg-card border border-border/60 rounded-2xl p-5 hover:border-border transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-sm font-semibold text-foreground">{ict.name}</p>
                                {ict.acronym && (
                                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">{ict.acronym}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {ict.city && ict.state && <span>📍 {ict.city}/{ict.state}</span>}
                                {ict.type && <span className="px-2 py-0.5 bg-muted rounded-full">{ict.type}</span>}
                              </div>
                            </div>
                            {ict.url && (
                              <a href={ict.url} target="_blank" rel="noopener noreferrer"
                                 className="flex-shrink-0 flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                                <ExternalLink className="w-3.5 h-3.5" /> Visitar
                              </a>
                            )}
                          </div>
                          {ict.focus && (
                            <div className="border-t border-border/30 pt-3">
                              <p className="text-xs text-muted-foreground font-medium mb-1">Áreas de atuação:</p>
                              <p className="text-sm text-foreground leading-relaxed">{ict.focus}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center">
                      <p className="text-3xl mb-3">🔍</p>
                      <p className="text-base font-medium text-foreground mb-1">Nenhum instituto identificado para este tema</p>
                      <p className="text-sm text-muted-foreground">Tente buscar por um termo mais amplo, ou consulte o diretório completo de ICTs no MCTI.</p>
                      <a href="https://www.gov.br/mcti/pt-br/acesso-a-informacao/institucional/icts" target="_blank" rel="noopener noreferrer"
                         className="text-sm text-primary hover:underline mt-3 inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Diretório de ICTs — MCTI
                      </a>
                    </div>
                  )}

                  {icts.networks?.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <h3 className="text-base font-semibold text-foreground mb-2">🔗 Redes e programas nacionais</h3>
                      <p className="text-sm text-muted-foreground mb-4">Iniciativas que conectam institutos, empresas e governo em torno do tema.</p>
                      <div className="space-y-3">
                        {icts.networks.map((net: any, i: number) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-3 border border-border/40 rounded-xl hover:border-border transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{net.name}</p>
                              {net.description && <p className="text-xs text-muted-foreground mt-1">{net.description}</p>}
                            </div>
                            {net.url && (
                              <a href={net.url} target="_blank" rel="noopener noreferrer"
                                 className="flex-shrink-0 flex items-center gap-1 text-sm text-primary hover:underline">
                                <ExternalLink className="w-3 h-3" /> Acessar
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    ⚠️ Dados gerados por inteligência artificial com base em fontes públicas — verifique os links antes de entrar em contato
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <p className="text-3xl mb-3">🏛️</p>
                  <p className="text-sm text-muted-foreground">Clique na aba para carregar os institutos de pesquisa.</p>
                </div>
              )}

            </TabsContent>

            {/* BOLSAS CNPQ */}
            <TabsContent value="cnpq" className="space-y-5">
              {(() => {
                const cnpq = (data.layers as any).cnpq;
                if (!cnpq) return (
                  <div className="bg-card border border-border rounded-2xl p-8 text-center">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Carregando dados de bolsas...</p>
                  </div>
                );

                return (
                  <div className="space-y-5">

                    <div className="bg-card border border-border rounded-2xl p-5">
                      <h3 className="text-base font-semibold text-foreground mb-2">
                        🎓 Bolsas de pesquisa disponíveis
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        O <strong>CNPq</strong> (Conselho Nacional de Desenvolvimento Científico e Tecnológico) oferece bolsas para pesquisadores em diferentes estágios de carreira. Clique em cada modalidade para ver os critérios e se inscrever.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cnpq.modalidades?.map((m: any, i: number) => (
                        <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                           className="flex items-start gap-4 p-4 bg-card border border-border/60 rounded-2xl hover:border-primary/30 hover:bg-primary/5 transition-colors">
                          <span className="text-2xl font-bold text-primary bg-primary/10 px-3 py-2 rounded-xl flex-shrink-0">{m.sigla}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.descricao}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {m.niveis.map((n: string, j: number) => (
                                <span key={j} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{n}</span>
                              ))}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        </a>
                      ))}
                    </div>

                    {cnpq.convenios && cnpq.convenios.total > 0 && (
                      <div className="bg-card border border-border rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-base font-semibold text-foreground">
                            🏫 Qual universidade recebe mais verba do MCTI?
                          </h3>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-primary">R$ {(cnpq.convenios.total_valor / 1e6).toFixed(1)}M</p>
                            <p className="text-xs text-muted-foreground">total investido</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                          Convênios do Ministério de Ciência, Tecnologia e Inovação relacionados ao tema <strong>"{data.query}"</strong> — dados reais do Portal da Transparência. O valor indica quanto cada instituição recebeu.
                        </p>
                        <div className="space-y-2">
                          {cnpq.convenios.ranking_ies.slice(0, 10).map((ies: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-xl">
                              <span className={`text-base font-bold flex-shrink-0 w-6 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}º</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{ies.convenente}</p>
                                <p className="text-xs text-muted-foreground">{ies.count} convênio{ies.count > 1 ? "s" : ""}{ies.uf ? ` · ${ies.uf}` : ""}</p>
                              </div>
                              <span className="text-sm font-bold text-primary flex-shrink-0">
                                R$ {(ies.valor / 1e6).toFixed(2)}M
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
                          📌 Fonte: Portal da Transparência · Convênios MCTI (órgão 24000)
                        </p>
                      </div>
                    )}

                    {(() => {
                      const papers = (data.layers.knowledge as any).papers || [];
                      const byFunder: Record<string, number> = {};
                      papers.forEach((p: any) => {
                        (p.grants || []).forEach((g: any) => {
                          if (g.funder && (
                            g.funder.toLowerCase().includes("cnpq") ||
                            g.funder.toLowerCase().includes("conselho nacional") ||
                            g.funder.toLowerCase().includes("capes") ||
                            g.funder.toLowerCase().includes("fapesp") ||
                            g.funder.toLowerCase().includes("fapemig") ||
                            g.funder.toLowerCase().includes("faperj")
                          )) {
                            byFunder[g.funder] = (byFunder[g.funder] || 0) + 1;
                          }
                        });
                      });
                      const funders = Object.entries(byFunder).sort(([,a],[,b]) => b-a).slice(0, 8);
                      if (!funders.length) return null;
                      return (
                        <div className="bg-card border border-border rounded-2xl p-5">
                          <h3 className="text-base font-semibold text-foreground mb-2">
                            💰 Quem financiou a pesquisa publicada?
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Agências identificadas nos artigos científicos sobre o tema — o número indica em quantos artigos cada agência aparece como financiadora.
                          </p>
                          <div className="space-y-2">
                            {funders.map(([funder, count], i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground w-5">{i + 1}</span>
                                  <span className="text-sm text-foreground font-medium">{funder}</span>
                                </div>
                                <span className="text-sm font-bold text-primary">{count} artigo{count > 1 ? "s" : ""}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="bg-card border border-border rounded-2xl p-5">
                      <h3 className="text-base font-semibold text-foreground mb-2">🔗 Acesso direto ao fomento</h3>
                      <p className="text-sm text-muted-foreground mb-4">Links para os principais portais de bolsas e financiamento à pesquisa no Brasil.</p>
                      <div className="space-y-2">
                        {cnpq.links_uteis?.map((l: any, i: number) => (
                          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                             className="flex items-center justify-between px-4 py-3 border border-border/50 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors">
                            <span className="text-sm text-foreground font-medium">{l.label}</span>
                            <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                          </a>
                        ))}
                      </div>
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

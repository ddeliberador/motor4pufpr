import RegionalTab from "@/components/shared/RegionalTab";
import { useState, useEffect } from "react";
import { Factory, ArrowLeft, AlertTriangle, MapPin, TrendingUp, TrendingDown, Minus, ExternalLink, ChevronDown, ChevronUp, Zap, Shield, Package, Users, BookOpen } from "lucide-react";
import { useMotorSearch } from "@/hooks/useMotorSearch";
import { useMotorLocation } from "@/hooks/useLocation";
import LocalContextBadge from "@/components/shared/LocalContextBadge";
import DiagnosticHeader from "@/components/shared/DiagnosticHeader";
import MuralOportunidades from "@/components/empresa/MuralOportunidades";
import LeiBemCalculadora from "@/components/shared/LeiBemCalculadora";
import ParceriaICTModal from "@/components/shared/ParceriaICTModal";
import OpportunityCard from "@/components/shared/OpportunityCard";
import PublicCompaniesCvm from "@/components/shared/PublicCompaniesCvm";
import PatentsTab from "@/components/shared/PatentsTab";
import IndicesHistoryChart from "@/components/shared/IndicesHistoryChart";
import CagedSaldoChart from "@/components/shared/CagedSaldoChart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";
import { CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";

// --- Seção colapsável genérica ---
function Section({ id, emoji, title, subtitle, children, defaultOpen = true }: {
  id: string; emoji: string; title: string; subtitle: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="border-t border-border/50 p-5 space-y-4">{children}</div>}
    </div>
  );
}

// --- Métrica grande ---
function BigMetric({ label, value, sub, color = "text-foreground", highlight = false }: {
  label: string; value: string; sub?: string; color?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 text-center ${highlight ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const EmpresaPanel = () => {
  const [hasSearched] = useState(() =>
    sessionStorage.getItem("motor4p_query") !== null &&
    sessionStorage.getItem("motor4p_persona") === "empresa"
  );
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [competitors, setCompetitors] = useState<any>(null);
  const [showAI, setShowAI] = useState(false);

  const { search, data, analysis, isLoading, isAnalyzing, error } = useMotorSearch();
  const { uf, ufNome, label: locationLabel, hasLocation } = useMotorLocation();
  const { searchCnaes, isLoading: isLoadingCnaes } = useCnaeSearch();
  const navigate = useNavigate();

  useEffect(() => {
    const savedQuery = sessionStorage.getItem("motor4p_query");
    const savedPersona = sessionStorage.getItem("motor4p_persona");
    const savedCnaes = sessionStorage.getItem("motor4p_cnaes");
    if (savedQuery && savedPersona === "empresa") {
      sessionStorage.removeItem("motor4p_query");
      sessionStorage.removeItem("motor4p_persona");
      sessionStorage.removeItem("motor4p_cnaes");
      const cnaes: CnaeCode[] = savedCnaes ? JSON.parse(savedCnaes) : [];
      search(savedQuery, "empresa", { location: locationLabel || undefined }, cnaes.map(c => c.code));
      supabase.functions.invoke("competitor-search", { body: { query: savedQuery } })
        .then(({ data: r }) => { if (r && !r.error) setCompetitors(r); });
      searchCnaes(savedQuery).then(c => { if (c.length) setSuggestedCnaes(c); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasSearched) return <Navigate to="/" replace />;

  if (isLoading) return (
    <div className="min-h-screen bg-background"><Header />
      <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            <Factory className="absolute inset-0 m-auto w-6 h-6 text-primary/60" />
          </div>
          <p className="text-lg font-medium text-foreground">Mapeando oportunidades de mercado...</p>
          <p className="text-sm text-muted-foreground">{locationLabel ? `Região: ${locationLabel}` : "Análise nacional"}</p>
        </div>
      </main>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background"><Header />
      <main className="pt-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Nova busca</Button>
        </div>
      </main>
    </div>
  );

  if (!data) return null;

  const technology = data.layers.technology as any;
  const policy = data.layers.policy as any;
  const intl = data.layers.international as any;
  const knowledge = data.layers.knowledge as any;
  const patents = (data.layers as any).patents;
  const sidra = (data.layers as any).sidra;

  const trl = technology.trl_estimate || 2;
  const trlLabel = technology.trl_label || "Sem dados";
  const caged = technology.caged_data;
  const saldoCaged = caged?.nacional?.total_saldo ?? 0;
  const cnaeResult = technology.cnae_result;
  const cnaeLabel = cnaeResult?.subclasses?.[0]?.descricao || cnaeResult?.divisoes?.[0]?.descricao || data.query;

  // TRL → decisão make-or-buy
  const makeOrBuy = trl >= 7
    ? { label: "✅ Tecnologia madura — comprar ou licenciar", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", desc: "A tecnologia já existe no mercado. Priorize fornecedores, licenciamento ou aquisição de startup. Risco baixo." }
    : trl >= 4
    ? { label: "🤝 Em desenvolvimento — co-desenvolver com ICT", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", desc: "A tecnologia ainda está sendo desenvolvida. Parceria com ICT via Marco Legal CT&I é a rota mais eficiente e barata." }
    : { label: "🔬 Estágio básico — investir em P&D próprio", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", desc: "Campo ainda em pesquisa fundamental. Alto risco para adoção imediata. Avalie se o timing estratégico justifica entrar agora." };

  // Gap de importação
  const importItems = (intl?.comex_datasets || []).filter((d: any) => d.title?.toLowerCase().includes("import"));
  const exportItems = (intl?.comex_datasets || []).filter((d: any) => d.title?.toLowerCase().includes("export"));

  // Contratos públicos locais
  const localContracts = hasLocation
    ? (policy.contracts || []).filter((c: any) => c.uf === uf || c.organ?.toLowerCase().includes(uf.toLowerCase()))
    : policy.contracts || [];
  const totalContractValue = policy.total_contract_value || 0;
  const totalConvenioValue = policy.total_convenio_value || 0;
  const mercadoPublico = totalContractValue + totalConvenioValue;

  // ICTs parceiras — instituições com pesquisa no tema
  const institutionRanking = Object.entries(knowledge.institutions || {})
    .sort((a: any, b: any) => b[1] - a[1]).slice(0, 6);

  // CAGED
  const cagedAdm = caged?.nacional?.total_admissoes;
  const cagedDem = caged?.nacional?.total_demissoes;
  const cagedSaldo = caged?.nacional?.total_saldo;
  const cagedSerie = caged?.setor_foco?.disponivel ? caged.setor_foco.serie_saldo : caged?.nacional?.serie_saldo;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <DiagnosticHeader
          query={data.query}
          current="empresa"
          onNewSearch={() => navigate("/")}
          sourceCount={data.meta.source_count}
          processingTimeMs={data.meta.processing_time_ms}
          context={locationLabel ? `📍 ${locationLabel}` : cnaeLabel || undefined}
        />

        <div className="panel-container py-6 space-y-4">
          <LocalContextBadge persona="empresa" />

          <MuralOportunidades
            query={data.query}
            uf={uf}
            ufNome={ufNome}
            searchTerms={(data as any).ontology?.search_terms}
          />



          {/* ── SEÇÃO 1: Vale entrar? ── */}
          <Section id="mercado" emoji="📊" title="Vale entrar nesse mercado?"
            subtitle="Maturidade da tecnologia, tamanho do mercado e onde o governo está comprando">

            {/* Make-or-buy */}
            <div className={`rounded-xl border p-4 ${makeOrBuy.bg}`}>
              <p className={`text-sm font-bold ${makeOrBuy.color} mb-1`}>{makeOrBuy.label}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{makeOrBuy.desc}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(trl / 9) * 100}%` }} />
                </div>
                <span className="text-xs font-mono font-bold text-foreground flex-shrink-0">TRL {trl}/9</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">1 = ideia · 9 = produto no mercado · {trlLabel}</p>
            </div>

            {/* Métricas de mercado */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <BigMetric label="Grupos de P&D" value={String(institutionRanking.length)} sub="possíveis parceiros ICT" />
              <BigMetric label="Mercado público"
                value={mercadoPublico > 0 ? `R$ ${(mercadoPublico / 1e6).toFixed(1)}M` : "—"}
                sub="contratos + convênios" color="text-primary" highlight={mercadoPublico > 0} />
              <BigMetric label="Saldo de empregos"
                value={cagedSaldo != null ? `${cagedSaldo >= 0 ? "+" : ""}${(cagedSaldo / 1000).toFixed(0)}k` : "—"}
                sub="12 meses · Novo CAGED"
                color={cagedSaldo >= 0 ? "text-emerald-500" : "text-red-500"} />
              <BigMetric label="Concorrentes mapeados"
                value={String((competitors?.summary?.total_br || 0) + (competitors?.summary?.total_intl || 0))}
                sub="BR + global" />
            </div>

            <div className="panel-grid">
            {/* Contratos públicos */}
            <div className="space-y-2 rounded-xl border border-border/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {hasLocation ? <><MapPin className="w-4 h-4 text-emerald-500" />Contratos públicos em {locationLabel}</> : "📋 Contratos públicos federais"}
                </p>
                <a href={`https://pncp.gov.br/app/editais?q=${encodeURIComponent(data.query)}${uf ? `&uf=${uf}` : ""}`}
                   target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> PNCP
                </a>
              </div>
              {(hasLocation ? localContracts : policy.contracts || []).slice(0, 5).map((c: any, i: number) => (
                <a key={i} href={c.url || "#"} target="_blank" rel="noopener noreferrer"
                   className="flex items-start gap-3 p-3 border border-border/50 rounded-xl hover:border-primary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{c.object}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground truncate">{c.organ}</span>
                      {c.uf && <span className="text-[10px] font-mono bg-muted px-1.5 rounded">{c.uf}</span>}
                      {c.value > 0 && <span className="text-xs font-bold text-primary">R$ {(c.value / 1e3).toFixed(0)}k</span>}
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />
                </a>
              ))}
              {(hasLocation ? localContracts : policy.contracts || []).length === 0 && (
                <p className="text-sm text-muted-foreground py-3 text-center">
                  Nenhum contrato identificado{hasLocation ? ` em ${locationLabel}` : ""}.
                  <a href={`https://pncp.gov.br/app/editais?q=${encodeURIComponent(data.query)}`}
                     target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Buscar no PNCP →</a>
                </p>
              )}
            </div>

            {/* Importação × Exportação — gap de mercado */}
            {(intl?.macro_indicators || []).filter((m: any) => m.value !== null).length > 0 && (
              <div className="space-y-2 rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">🌐 Importação × Exportação — oportunidade de substituição</p>
                <p className="text-xs text-muted-foreground">Se o Brasil importa mais do que exporta neste produto, há espaço para produção nacional. Dados: COMEX Stat / BCB.</p>
                <div className="space-y-1.5">
                  {(intl.macro_indicators as any[]).filter((m: any) => m.value !== null).slice(0, 5).map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                      <span className="text-xs text-foreground flex-1">{m.label || m.series_id}</span>
                      <span className="text-xs font-bold text-primary">{m.value} {m.unit || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mercado de trabalho */}
            {caged && (() => {
              const ufData = caged.uf_data;
              const useUf = ufData?.disponivel && uf;
              const displayAdm = useUf ? ufData.total_admissoes : cagedAdm;
              const displayDem = useUf ? ufData.total_demissoes : cagedDem;
              const displaySaldo = useUf ? ufData.total_saldo : cagedSaldo;
              const displaySerie = useUf ? ufData.serie_saldo : cagedSerie;
              const periodoLabel = useUf ? ufData.periodo : caged.nacional?.periodo;

              return (
                <div className="space-y-3 rounded-xl border border-border/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      👷 Mão de obra disponível?{useUf ? ` — ${uf}` : ""}
                    </p>
                    {useUf && (
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
                        📍 {uf}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-emerald-500">
                        {displayAdm != null ? `+${displayAdm.toLocaleString("pt-BR")}` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">contratações</p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-red-500">
                        {displayDem != null ? `-${displayDem.toLocaleString("pt-BR")}` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">demissões</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center border ${(displaySaldo ?? 0) >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                      <p className={`text-lg font-bold ${(displaySaldo ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {displaySaldo != null ? `${displaySaldo >= 0 ? "+" : ""}${displaySaldo.toLocaleString("pt-BR")}` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">saldo 12m</p>
                    </div>
                  </div>

                  {displaySerie?.length > 0 && (
                    <CagedSaldoChart serie={displaySerie} gradientId="cagedEmpNew" />
                  )}

                  {/* Nota de limitação honesta */}
                  <div className="bg-muted/20 rounded-lg px-3 py-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      📌 {useUf
                        ? `Dados de emprego formal do estado ${uf} — toda a economia, não filtrado por setor específico.`
                        : "Dados de emprego formal agregados — toda a economia nacional, não filtrado por setor específico."}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      ⚠️ Dado por CNAE específico ("fabricação de computadores", "horticultura" etc.) não está disponível em API pública aberta — requer acesso especial aos microdados RAIS/MTE.
                    </p>
                    {periodoLabel && <p className="text-[10px] text-muted-foreground/60">Período: {periodoLabel} · Fonte: Novo CAGED / MTE via IPEAData</p>}
                  </div>
                </div>
              );
            })()}


            {/* Risco de patentes */}
            {patents?.patents?.length > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-orange-500" />⚠️ Risco de propriedade intelectual
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {patents.patents.length} patente{patents.patents.length > 1 ? "s" : ""} identificada{patents.patents.length > 1 ? "s" : ""} neste campo. Verifique antes de investir — patentes de concorrentes podem restringir seu produto ou processo.
                </p>
                <div className="space-y-1.5">
                  {patents.patents.slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="text-xs bg-muted/30 rounded-lg px-3 py-2">
                      <span className="font-mono text-orange-500 mr-2">{p.id || p.number || `PAT-${i + 1}`}</span>
                      <span className="text-foreground">{(p.title || p.description || "").slice(0, 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </Section>

          <IndicesHistoryChart historico={data.historico} />

          {/* ── SEÇÃO 2: Quanto custa inovar? ── */}
          <Section id="custo" emoji="💰" title="Quanto custa inovar neste campo?"
            subtitle="Calcule o benefício real da Lei do Bem e outros incentivos disponíveis">
            <div className="bg-muted/20 rounded-xl p-4 mb-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A maioria dos empresários não sabe que <strong className="text-foreground">o governo paga até 80% dos seus custos de P&D</strong> via incentivo fiscal da Lei do Bem. Informe o faturamento da sua empresa e veja quanto você recupera.
              </p>
            </div>
            <div className="panel-grid">
              <LeiBemCalculadora />

            {/* Outros incentivos disponíveis */}
            <div className="space-y-2 rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Outros incentivos aplicáveis a este campo:</p>
              {[
                { sigla: "BNDES Inovação", desc: "Financiamento a partir de 6% a.a. para P&D e inovação", url: "https://www.bndes.gov.br" },
                { sigla: "Finep Subvenção", desc: "Recursos a fundo perdido para inovação empresarial", url: "https://www.finep.gov.br" },
                { sigla: "EMBRAPII", desc: "Cofinancia projetos de P&D entre empresa e ICT (até 1/3 do valor)", url: "https://embrapii.org.br" },
              ].map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center justify-between p-3 border border-border/50 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.sigla}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                </a>
              ))}
              </div>
            </div>
          </Section>

          {/* ── SEÇÃO 3: Quem pode ajudar? ── */}
          <Section id="parceiros" emoji="🤝" title="Quem pode te ajudar a desenvolver?"
            subtitle="Universidades e centros de pesquisa com expertise neste tema — potenciais parceiros ICT">

            <div className="bg-muted/20 rounded-xl p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Estas instituições têm pesquisadores ativos no tema <strong className="text-foreground">"{data.query}"</strong>. 
                Pelo Marco Legal de CT&I, você pode firmar um <strong className="text-foreground">contrato de parceria P&D</strong> com qualquer uma delas — e deduzir 60–80% do valor pela Lei do Bem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
              {institutionRanking.map(([name, count], i) => {
                const papers = knowledge.papers || [];
                const pesqs = [...new Set(
                  papers.flatMap((p: any) => (p.authorships || [])
                    .filter((a: any) => (a.institution || a.institutions?.[0]?.display_name || "").toLowerCase().includes(name.toLowerCase().slice(0, 15)))
                    .map((a: any) => a.author?.display_name || "")
                  ).filter(Boolean)
                )].slice(0, 4) as string[];

                return (
                  <div key={i} className={`rounded-xl border p-4 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border/60"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-bold flex-shrink-0 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}º</span>
                        <p className="text-sm font-semibold text-foreground">{name}</p>
                        {i === 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Líder no tema</span>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-primary">{count as number}</p>
                        <p className="text-[10px] text-muted-foreground">artigos</p>
                      </div>
                    </div>
                    {pesqs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {pesqs.map((nome, j) => (
                          <a key={j}
                             href={`https://openalex.org/authors?filter=display_name.search:${encodeURIComponent(nome)}`}
                             target="_blank" rel="noopener noreferrer"
                             className="text-xs px-2 py-1 bg-muted rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                            {nome}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {institutionRanking.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma instituição de pesquisa identificada para este tema.</p>
            )}

            {/* CTA parceria */}
            <ParceriaICTModal />

            {/* ICTs locais quando há localização */}
            {hasLocation && (data.layers as any).knowledge?.local_institutions?.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-emerald-500" /> Instituições em {locationLabel}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(data.layers as any).knowledge.local_institutions.slice(0, 5).map((inst: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                      <p className="text-sm text-foreground">{inst.name}</p>
                      <span className="text-xs text-muted-foreground">{inst.works_count?.toLocaleString("pt-BR")} publicações</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <PublicCompaniesCvm cnaeCodes={(data.ontology?.cnae_codes || []).map((c) => c.code)} />
            </div>
          </Section>

          {/* ── SEÇÃO 4: Visão Regional ── */}
          <Section id="regional" emoji="📍" title="Visão Regional" subtitle={hasLocation ? `Empresas, PIB e investimento público em ${locationLabel}` : "Selecione um município para ver dados locais"} defaultOpen={hasLocation}>
            <RegionalTab
              persona="empresa"
              data={data}
              competitors={competitors}
              cagedNote={<p className="text-sm text-muted-foreground">O saldo de admissões e demissões (Novo CAGED) já está na seção <strong>"Vale entrar?"</strong> acima — dados estaduais quando disponíveis, nacionais como referência. Fonte: IPEAData/Ministério do Trabalho.</p>}
            />
          </Section>

          {/* ── ANÁLISE IA (colapsável, ao final) ── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button onClick={() => setShowAI(o => !o)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors">
              <span className="text-2xl">🧠</span>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground">Análise estratégica completa</h2>
                <p className="text-xs text-muted-foreground">Gerada por IA com base nos dados coletados{isAnalyzing ? " · gerando..." : ""}</p>
              </div>
              {showAI ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showAI && (
              <div className="border-t border-border/50 p-5">
                {isAnalyzing ? (
                  <div className="flex items-center gap-3 py-4">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">Gerando análise estratégica...</p>
                  </div>
                ) : analysis?.sections?.length ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analysis.questions.map((q, i) => (
                      <div key={i}>
                        <h3 className="text-sm font-semibold text-foreground mb-3">{q}</h3>
                        <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
                          <ReactMarkdown>{analysis.sections[i] || ""}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Análise IA não disponível.</p>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
      <CnaeSelectionModal
        isOpen={showCnaeModal}
        onClose={() => { setShowCnaeModal(false); setSuggestedCnaes([]); setPendingSearchQuery(""); }}
        onConfirm={(selected) => { setShowCnaeModal(false); }}
        suggestedCnaes={suggestedCnaes}
        searchQuery={pendingSearchQuery}
        isLoading={isLoadingCnaes}
      />
    </div>
  );
};

export default EmpresaPanel;

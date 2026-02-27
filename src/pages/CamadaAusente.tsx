import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Database, Network, BarChart3, Lightbulb, Target, TrendingUp, AlertTriangle } from "lucide-react";
import IntegratedBasesPanel from "@/components/IntegratedBasesPanel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UfprLogo from "@/components/UfprLogo";
import Motor4PDiagram from "@/components/Motor4PDiagram";
import ChallengeCards from "@/components/ChallengeCards";
import SystemViews from "@/components/SystemViews";
import infografico from "@/assets/infografico-motor4p.png";
import { Sidebar, CnaeSelectionModal, type CnaeCode } from "@/components/mvp";
import { useIncidenceSearch } from "@/hooks/useIncidenceSearch";
import { useCnaeSearch } from "@/hooks/useCnaeSearch";

const CamadaAusente = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [showCnaeModal, setShowCnaeModal] = useState(false);
  const [suggestedCnaes, setSuggestedCnaes] = useState<CnaeCode[]>([]);
  const [selectedCnaes, setSelectedCnaes] = useState<CnaeCode[]>([]);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");

  const {
    search: apiSearch,
    isLoading: isSearching,
    error: searchError,
  } = useIncidenceSearch();

  const { searchCnaes } = useCnaeSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setPendingSearchQuery(searchQuery);
    const cnaes = await searchCnaes(searchQuery);

    if (cnaes.length > 0) {
      setSuggestedCnaes(cnaes);
      setShowCnaeModal(true);
    } else {
      // Navega para o MVP Engine com a query
      navigate(`/mvp?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCnaeConfirm = async (selected: CnaeCode[]) => {
    setSelectedCnaes(selected);
    setShowCnaeModal(false);
    // Navega para o MVP Engine com query e CNAEs selecionados
    const cnaeParams = selected.map(c => c.code).join(",");
    navigate(`/mvp?q=${encodeURIComponent(pendingSearchQuery)}&cnaes=${cnaeParams}`);
  };

  const handleCnaeCancel = () => {
    setShowCnaeModal(false);
    setSuggestedCnaes([]);
    setPendingSearchQuery("");
  };

  const handleRemoveCnae = (code: string) => {
    setSelectedCnaes(prev => prev.filter(c => c.code !== code));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex flex-col md:flex-row pt-16">
        {/* Sidebar - Twitter style */}
        <Sidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          isSearching={isSearching}
          showApiStatus={showApiStatus}
          setShowApiStatus={setShowApiStatus}
          selectedCnaes={selectedCnaes}
          onRemoveCnae={handleRemoveCnae}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* Hero Section */}
          <section className="hero-section pt-16 pb-16 md:pt-24 md:pb-24">
            <div className="container-narrow text-center">
              <div className="flex justify-center mb-6">
                <UfprLogo className="w-24 h-24 opacity-90" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
                MOTOR 4P UFPR
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/90 font-serif mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                A Camada Ausente da Política Industrial Brasileira
              </p>
              <p className="text-lg text-primary-foreground/75 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
                O Brasil possui ciência, instrumentos públicos, empresas e dados.
                Mas não possui uma infraestrutura computacional capaz de traduzir objetos tecnológicos em redes verificáveis de inovação e política industrial.
              </p>
              <Link
                to="/mvp"
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition-colors animate-fade-in"
                style={{ animationDelay: "0.3s" }}
              >
                Ver MVP da Engine
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          {/* O Desafio Estrutural - com cards interativos */}
          <section className="section-spacing">
            <div className="container-wide">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
                O Desafio Estrutural do Brasil
              </h2>
              <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                O Brasil tem dados. Mas não tem coordenação.
              </p>
              <ChallengeCards />
              <div className="highlight-box max-w-3xl mx-auto mt-12">
                <p className="text-lg text-foreground font-medium text-center">
                  O problema central não é ausência de política.<br />
                  <span className="text-accent">É ausência de uma infraestrutura de tradução e coordenação.</span>
                </p>
              </div>
            </div>
          </section>

          {/* O Que Não Existe Hoje */}
          <section className="section-spacing section-alt">
            <div className="container-wide">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
                O vazio da malha do Sistema Nacional de Inovação
              </h2>
              <p className="text-lg text-muted-foreground text-center max-w-3xl mx-auto mb-12">
                Existem observatórios separados: ciência (CNPq), patentes (INPI), indústria (IBGE), 
                comércio (COMEX), fomento (Finep, BNDES). Mas não existe um motor público que conecte 
                essas camadas a partir de um objeto tecnológico.
              </p>
              <div className="diagram-flow py-8 bg-card rounded-xl border border-border px-6">
                <span className="diagram-node">Objeto tecnológico</span>
                <span className="diagram-arrow">→</span>
                <span className="diagram-node">Tradução</span>
                <span className="diagram-arrow">→</span>
                <span className="diagram-node">Rede de incidência</span>
                <span className="diagram-arrow">→</span>
                <span className="diagram-node">Gargalos</span>
                <span className="diagram-arrow">→</span>
                <span className="diagram-node">Instrumentos</span>
              </div>
            </div>
          </section>

          {/* A Proposta - com diagrama 4P interativo */}
          <section className="section-spacing">
            <div className="container-wide">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
                A Proposta: MOTOR 4P UFPR
              </h2>
              <p className="text-xl md:text-2xl text-accent font-serif text-center mb-12">
                Conectando Pesquisa, Produção, Política e Patentes
              </p>
              
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Diagrama interativo */}
                <Motor4PDiagram />
                
                {/* Descrição */}
                <div className="space-y-6">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    O MOTOR 4P UFPR é uma infraestrutura computacional que, dado um objeto científico 
                    ou tecnológico, constrói automaticamente sua trajetória no sistema de inovação.
                  </p>
                  <div className="diagram-flow py-6 bg-primary/5 rounded-xl border border-primary/20 px-4">
                    <span className="diagram-node bg-primary text-primary-foreground text-sm">Ciência</span>
                    <span className="diagram-arrow text-primary">→</span>
                    <span className="diagram-node bg-primary text-primary-foreground text-sm">Tecnologia</span>
                    <span className="diagram-arrow text-primary">→</span>
                    <span className="diagram-node bg-primary text-primary-foreground text-sm">Produção</span>
                    <span className="diagram-arrow text-primary">→</span>
                    <span className="diagram-node bg-primary text-primary-foreground text-sm">Política</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bases Públicas Integradas - dinâmico */}
          <IntegratedBasesPanel />

          {/* As 3 Funções Revolucionárias */}
          <section className="section-spacing section-alt">
            <div className="container-wide">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
                As 3 Funções Inovadoras
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="card-institutional">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Database className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 font-serif">
                    Objeto → Ontologia Tecnocientífica
                  </h3>
                  <p className="text-muted-foreground">
                    O motor transforma texto em estrutura científica e tecnológica: 
                    áreas CNPq, classes de patente, setores produtivos.
                  </p>
                </div>
                <div className="card-institutional">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Network className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 font-serif">
                    Grafo de Incidência Verificável
                  </h3>
                  <p className="text-muted-foreground">
                    O motor constrói redes auditáveis: grupos de pesquisa, patentes, 
                    empresas, projetos e instrumentos.
                  </p>
                </div>
                <div className="card-institutional">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 font-serif">
                    Índices Estruturais Inéditos
                  </h3>
                  <p className="text-muted-foreground">
                    O motor mede gargalos e lacunas que políticas não conseguem enxergar.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* As 3 Views do Sistema */}
          <section className="section-spacing">
            <div className="container-wide">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
                As 3 Views do Sistema
              </h2>
              <SystemViews />
            </div>
          </section>

          {/* Indicadores Novos */}
          <section className="section-spacing">
            <div className="container-wide">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
                Indicadores Novos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                {[
                  { code: "C2T", label: "Maturidade Ciência → Tecnologia", icon: Lightbulb },
                  { code: "GT", label: "Gargalo de Tradução", icon: AlertTriangle },
                  { code: "P2C", label: "Aderência Política → Capacidade", icon: Target },
                  { code: "CD", label: "Concentração e Dependência Tecnológica", icon: TrendingUp },
                ].map((item, index) => (
                  <div key={index} className="card-institutional text-center">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-mono text-lg font-bold text-primary mb-2">{item.code}</p>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-muted-foreground text-lg">
                Esses índices permitem uma leitura computacional da política industrial.
              </p>
            </div>
          </section>

          {/* Originalidade Acadêmica */}
          <section className="section-spacing section-alt">
            <div className="container-narrow">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center font-serif italic">
                Computational Industrial Policy
              </h2>
              <div className="grid md:grid-cols-2 gap-4 mb-10">
                {[
                  "Sistemas Nacionais de Inovação (Lundvall)",
                  "Trajetórias tecnológicas (Nelson & Winter)",
                  "Capacidade estatal e coordenação (Evans)",
                  "Missões e Estado empreendedor (Mazzucato)"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                    <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <p className="text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-lg text-foreground font-medium">
                O MOTOR 4P operacionaliza teoria econômica como infraestrutura pública.
              </p>
            </div>
          </section>

          {/* Infográfico Completo */}
          <section className="section-spacing">
            <div className="container-wide">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
                Visão Geral da Infraestrutura
              </h2>
              <div className="flex justify-center">
                <img 
                  src={infografico} 
                  alt="Infográfico MOTOR 4P UFPR - Infraestrutura Computacional para Política Industrial" 
                  className="max-w-full md:max-w-4xl rounded-xl shadow-lg border border-border"
                />
              </div>
            </div>
          </section>

          {/* Pergunta Central */}
          <section className="section-spacing">
            <div className="container-narrow">
              <div className="bg-primary rounded-2xl p-10 md:p-16 text-center">
                <p className="text-xl md:text-2xl text-primary-foreground leading-relaxed font-serif italic">
                  "Como infraestruturas computacionais públicas podem ampliar a capacidade do Brasil 
                  de coordenar ciência, tecnologia e política industrial?"
                </p>
              </div>
            </div>
          </section>

          <Footer />
        </main>
      </div>

      {/* CNAE Selection Modal */}
      <CnaeSelectionModal
        isOpen={showCnaeModal}
        onClose={handleCnaeCancel}
        suggestedCnaes={suggestedCnaes}
        onConfirm={handleCnaeConfirm}
        searchQuery={pendingSearchQuery}
      />
    </div>
  );
};

export default CamadaAusente;

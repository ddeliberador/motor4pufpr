import { Link } from "react-router-dom";
import { ArrowRight, Database, Network, BarChart3, Lightbulb, Target, TrendingUp, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CamadaAusente = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="hero-section pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container-narrow text-center">
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

      {/* O Problema Estrutural */}
      <section className="section-spacing">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
            O Brasil tem dados. Mas não tem coordenação.
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              "Universidades produzem conhecimento, mas não enxergam demandas produtivas claras",
              "Empresas não acessam instrumentos públicos por falha informacional",
              "Políticas industriais operam sem memória computacional do sistema",
              "Ciência, patentes, indústria e fomento permanecem fragmentados"
            ].map((item, index) => (
              <div key={index} className="card-institutional flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <p className="text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
          <div className="highlight-box max-w-3xl mx-auto">
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

      {/* A Proposta */}
      <section className="section-spacing">
        <div className="container-narrow text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Uma Engine Pública de Tradução Tecnológica
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            O MOTOR 4P UFPR é uma infraestrutura computacional que, dado um objeto científico 
            ou tecnológico, constrói automaticamente sua trajetória no sistema de inovação:
          </p>
          <div className="diagram-flow py-8 bg-primary/5 rounded-xl border border-primary/20 px-6">
            <span className="diagram-node bg-primary text-primary-foreground">Ciência</span>
            <span className="diagram-arrow text-primary">→</span>
            <span className="diagram-node bg-primary text-primary-foreground">Tecnologia</span>
            <span className="diagram-arrow text-primary">→</span>
            <span className="diagram-node bg-primary text-primary-foreground">Produção</span>
            <span className="diagram-arrow text-primary">→</span>
            <span className="diagram-node bg-primary text-primary-foreground">Política</span>
          </div>
        </div>
      </section>

      {/* As 3 Funções Revolucionárias */}
      <section className="section-spacing section-alt">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
            As 3 Funções Revolucionárias
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

      {/* Pergunta Central */}
      <section className="section-spacing">
        <div className="container-narrow">
          <div className="bg-primary rounded-2xl p-10 md:p-16 text-center">
            <p className="text-xl md:text-2xl text-primary-foreground leading-relaxed font-serif">
              "Como infraestruturas computacionais públicas podem ampliar a capacidade do Brasil 
              de coordenar ciência, tecnologia e política industrial?"
            </p>
          </div>
          <p className="text-center text-muted-foreground mt-8">
            Doutorado em Políticas Públicas — UFPR
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CamadaAusente;

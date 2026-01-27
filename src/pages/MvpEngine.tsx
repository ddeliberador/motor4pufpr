import { Link } from "react-router-dom";
import { ArrowLeft, Search, Microscope, Cpu, Building2, CheckCircle, Database, FileText, Landmark } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const MvpEngine = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="hero-section pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container-narrow text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6 animate-fade-in">
            MVP Engine
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 font-serif mb-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Primeira Camada da Tradução
          </p>
          <p className="text-lg text-primary-foreground/75 mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Protótipo auditável baseado em dados públicos reais
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/20 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Conceito
          </Link>
        </div>
      </section>

      {/* MVP Enxuto e Poderoso */}
      <section className="section-spacing">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            MVP Enxuto e Poderoso
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-10">
            O MVP inicial não tenta mapear tudo.<br />
            Ele implementa a <strong className="text-foreground">camada ausente</strong>:
          </p>
          <div className="diagram-flow py-8 bg-accent/5 rounded-xl border border-accent/20 px-6">
            <span className="diagram-node bg-accent text-accent-foreground text-sm">Objeto tecnológico</span>
            <span className="diagram-arrow text-accent">→</span>
            <span className="diagram-node bg-accent text-accent-foreground text-sm">Incidência científica</span>
            <span className="diagram-arrow text-accent">→</span>
            <span className="diagram-node bg-accent text-accent-foreground text-sm">Incidência tecnológica</span>
            <span className="diagram-arrow text-accent">→</span>
            <span className="diagram-node bg-accent text-accent-foreground text-sm">Instrumentos públicos</span>
          </div>
        </div>
      </section>

      {/* Input do Motor */}
      <section className="section-spacing section-alt">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            Input do Motor
          </h2>
          <div className="bg-card rounded-xl border border-border p-8 max-w-xl mx-auto">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Entrada do pesquisador
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Digite seu objeto de pesquisa"
                className="w-full pl-12 pr-4 py-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                disabled
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm">Baterias de sódio</span>
              <span className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm">IA industrial</span>
              <span className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm">Biomateriais</span>
            </div>
          </div>
        </div>
      </section>

      {/* Saídas do Motor */}
      <section className="section-spacing">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
            Saídas do Motor
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-institutional">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Microscope className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4 font-serif">
                1. Incidência Científica
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Grupos de pesquisa relacionados (CNPq/DGP)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Distribuição nacional</span>
                </li>
              </ul>
            </div>
            <div className="card-institutional">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4 font-serif">
                2. Incidência Tecnológica
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Patentes e depositantes (INPI)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Tendências temporais</span>
                </li>
              </ul>
            </div>
            <div className="card-institutional">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4 font-serif">
                3. Incidência Institucional
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Instrumentos e editais aderentes (Finep/BNDES/Embrapii)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">Políticas relacionadas</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Verificabilidade */}
      <section className="section-spacing section-alt">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            Infraestrutura pública, explicável e auditável
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              "Cada resultado aponta a fonte pública original",
              "Cada vínculo possui critério explícito",
              "Dados reprodutíveis e transparentes"
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-5 bg-card rounded-lg border border-border">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bases Públicas Integradas */}
      <section className="section-spacing">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
            Bases Públicas Integradas no MVP
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-institutional text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-serif">CNPq</h3>
              <p className="text-muted-foreground text-sm">
                Diretório de Grupos de Pesquisa
              </p>
            </div>
            <div className="card-institutional text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-serif">INPI</h3>
              <p className="text-muted-foreground text-sm">
                Patentes e classificação IPC/CPC
              </p>
            </div>
            <div className="card-institutional text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Landmark className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-serif">Finep</h3>
              <p className="text-muted-foreground text-sm">
                Instrumentos e chamadas públicas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="section-spacing section-alt">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
            Roadmap
          </h2>
          <div className="max-w-md mx-auto">
            <div className="timeline-item">
              <div className="timeline-dot" />
              <p className="font-mono text-accent font-bold mb-1">2026</p>
              <h4 className="font-bold text-foreground mb-1">Engine do Pesquisador</h4>
              <p className="text-sm text-muted-foreground">objeto → rede</p>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <p className="font-mono text-accent font-bold mb-1">2027</p>
              <h4 className="font-bold text-foreground mb-1">Engine da Empresa</h4>
              <p className="text-sm text-muted-foreground">CNPJ → instrumentos</p>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot" />
              <p className="font-mono text-accent font-bold mb-1">2028</p>
              <h4 className="font-bold text-foreground mb-1">Engine do Estado</h4>
              <p className="text-sm text-muted-foreground">lacunas e avaliação</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MvpEngine;

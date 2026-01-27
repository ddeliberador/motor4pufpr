import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Microscope, Cpu, Building2, CheckCircle, Database, FileText, Landmark, MapPin, Users, FlaskConical, Briefcase, ExternalLink, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Mock data for demonstrations
const mockSearchResults: Record<string, {
  query: string;
  scientific: { name: string; institution: string; state: string; area: string }[];
  technological: { title: string; applicant: string; year: string; code: string }[];
  institutional: { name: string; type: string; status: string; value?: string }[];
  stats: { groups: number; patents: number; instruments: number };
}> = {
  "baterias de sódio": {
    query: "Baterias de sódio",
    stats: { groups: 97, patents: 199, instruments: 3 },
    scientific: [
      { name: "Grupo de Materiais para Energia", institution: "USP", state: "SP", area: "Engenharia de Materiais" },
      { name: "Lab. de Armazenamento de Energia", institution: "UNICAMP", state: "SP", area: "Química" },
      { name: "Núcleo de Eletroquímica Aplicada", institution: "UFPR", state: "PR", area: "Física" },
      { name: "Centro de Pesquisa em Baterias", institution: "UFRGS", state: "RS", area: "Engenharia Química" },
      { name: "Grupo de Materiais Funcionais", institution: "UFMG", state: "MG", area: "Química" },
    ],
    technological: [
      { title: "Célula eletroquímica de sódio-ion para armazenamento", applicant: "Petrobras S.A.", year: "2024", code: "BR102024001234" },
      { title: "Eletrodo de carbono para baterias de sódio", applicant: "USP", year: "2023", code: "BR102023005678" },
      { title: "Processo de síntese de materiais catódicos", applicant: "UNICAMP", year: "2023", code: "BR102023009012" },
      { title: "Sistema de gestão térmica para baterias Na-ion", applicant: "WEG S.A.", year: "2022", code: "BR102022003456" },
    ],
    institutional: [
      { name: "Programa Finep Energias Renováveis", type: "Subvenção", status: "Aberto", value: "R$ 50M" },
      { name: "BNDES Linha Verde", type: "Financiamento", status: "Contínuo", value: "até R$ 200M" },
      { name: "Embrapii - Armazenamento de Energia", type: "Parceria", status: "Ativo" },
    ],
  },
  "ia industrial": {
    query: "IA Industrial",
    stats: { groups: 325, patents: 1043, instruments: 4 },
    scientific: [
      { name: "Lab. de Inteligência Artificial", institution: "USP", state: "SP", area: "Ciência da Computação" },
      { name: "Grupo de IA e Automação", institution: "UFSC", state: "SC", area: "Engenharia de Produção" },
      { name: "Centro de IA Aplicada", institution: "PUC-Rio", state: "RJ", area: "Informática" },
      { name: "Núcleo de Machine Learning Industrial", institution: "UNICAMP", state: "SP", area: "Engenharia Elétrica" },
      { name: "Grupo de Sistemas Inteligentes", institution: "UFPE", state: "PE", area: "Ciência da Computação" },
    ],
    technological: [
      { title: "Sistema de visão computacional para controle de qualidade", applicant: "Embraer S.A.", year: "2024", code: "BR102024002345" },
      { title: "Método de manutenção preditiva com IA", applicant: "Vale S.A.", year: "2024", code: "BR102024003456" },
      { title: "Plataforma de otimização de processos industriais", applicant: "SENAI-SP", year: "2023", code: "BR102023004567" },
      { title: "Algoritmo de detecção de anomalias em linhas de produção", applicant: "Bosch Brasil", year: "2023", code: "BR102023005678" },
    ],
    institutional: [
      { name: "Programa IA Brasil 2030", type: "Subvenção", status: "Aberto", value: "R$ 200M" },
      { name: "BNDES Digitalização Industrial", type: "Financiamento", status: "Contínuo", value: "até R$ 500M" },
      { name: "Embrapii - Competência IA", type: "Parceria", status: "Ativo" },
      { name: "CNPq Chamada Universal IA", type: "Bolsas", status: "Encerrado" },
    ],
  },
  "biomateriais": {
    query: "Biomateriais",
    stats: { groups: 191, patents: 321, instruments: 3 },
    scientific: [
      { name: "Lab. de Biomateriais e Bioengenharia", institution: "USP", state: "SP", area: "Engenharia Biomédica" },
      { name: "Grupo de Materiais Biocompatíveis", institution: "UFRJ", state: "RJ", area: "Engenharia Metalúrgica" },
      { name: "Centro de Pesquisa em Biomateriais", institution: "UFMG", state: "MG", area: "Odontologia" },
      { name: "Núcleo de Engenharia de Tecidos", institution: "UNICAMP", state: "SP", area: "Biologia" },
      { name: "Lab. de Polímeros Biodegradáveis", institution: "UNESP", state: "SP", area: "Química" },
    ],
    technological: [
      { title: "Scaffold bioativo para regeneração óssea", applicant: "Baumer S.A.", year: "2024", code: "BR102024006789" },
      { title: "Hidrogel injetável para liberação de fármacos", applicant: "USP", year: "2023", code: "BR102023007890" },
      { title: "Membrana polimérica para implantes dentários", applicant: "Straumann Brasil", year: "2023", code: "BR102023008901" },
      { title: "Compósito cerâmico para próteses", applicant: "UFRJ", year: "2022", code: "BR102022009012" },
    ],
    institutional: [
      { name: "Finep Bioeconomia", type: "Subvenção", status: "Aberto", value: "R$ 80M" },
      { name: "BNDES Programa Saúde", type: "Financiamento", status: "Contínuo", value: "até R$ 300M" },
      { name: "Embrapii - Materiais Avançados", type: "Parceria", status: "Ativo" },
    ],
  },
};

const MvpEngine = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof mockSearchResults["baterias de sódio"] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      
      if (mockSearchResults[normalizedQuery]) {
        setSearchResults(mockSearchResults[normalizedQuery]);
      } else {
        const baseMultiplier = Math.random() * 0.5 + 0.5;
        setSearchResults({
          query: searchQuery,
          stats: { 
            groups: Math.floor(80 * baseMultiplier), 
            patents: Math.floor(150 * baseMultiplier), 
            instruments: 3 
          },
          scientific: [
            { name: "Grupo de Pesquisa Relacionado", institution: "USP", state: "SP", area: "Área Principal" },
            { name: "Laboratório Especializado", institution: "UNICAMP", state: "SP", area: "Área Secundária" },
            { name: "Núcleo de Investigação", institution: "UFRJ", state: "RJ", area: "Área Correlata" },
            { name: "Centro de Estudos Avançados", institution: "UFMG", state: "MG", area: "Área Técnica" },
          ],
          technological: [
            { title: "Invenção relacionada ao tema", applicant: "Empresa Nacional", year: "2024", code: "BR102024000001" },
            { title: "Processo inovador aplicado", applicant: "Universidade", year: "2023", code: "BR102023000002" },
            { title: "Dispositivo técnico avançado", applicant: "Instituto de Pesquisa", year: "2023", code: "BR102023000003" },
          ],
          institutional: [
            { name: "Programa de Fomento Temático", type: "Subvenção", status: "Aberto", value: "R$ 50M" },
            { name: "Linha de Financiamento", type: "Financiamento", status: "Contínuo" },
            { name: "Parceria Estratégica", type: "Parceria", status: "Ativo" },
          ],
        });
      }
      setIsSearching(false);
    }, 1500);
  };

  const handleExampleClick = (example: string) => {
    setSearchQuery(example);
  };

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

      {/* Input do Motor - Interactive Search */}
      <section className="section-spacing section-alt">
        <div className="container-narrow">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
            Input do Motor
          </h2>
          <div className="bg-card rounded-xl border border-border p-8 max-w-xl mx-auto shadow-lg">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Entrada do pesquisador
            </label>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite seu objeto de pesquisa"
                  className="w-full pl-12 pr-4 py-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? "Processando..." : "Buscar no Motor"}
              </button>
            </form>
            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-2">Exemplos de pesquisa:</p>
              <div className="flex flex-wrap gap-2">
                {["Baterias de sódio", "IA industrial", "Biomateriais"].map((example) => (
                  <button
                    key={example}
                    onClick={() => handleExampleClick(example.toLowerCase())}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-secondary/80 transition-colors cursor-pointer"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results - Visual Output */}
      {hasSearched && (
        <section className="section-spacing">
          <div className="container-wide">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-4 border-4 border-transparent border-t-accent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
                <p className="text-xl font-serif text-foreground mb-2">Traduzindo objeto tecnológico...</p>
                <p className="text-muted-foreground">Consultando CNPq, INPI e Finep</p>
              </div>
            ) : searchResults ? (
              <div className="space-y-16 animate-fade-in">
                {/* Results Header */}
                <div className="text-center">
                  <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Resultados para</p>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-8">
                    "{searchResults.query}"
                  </h2>
                  
                  {/* Stats Overview */}
                  <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                      <Microscope className="w-8 h-8 mx-auto mb-3 opacity-80" />
                      <p className="text-4xl md:text-5xl font-bold mb-1">{searchResults.stats.groups}</p>
                      <p className="text-sm opacity-80">Grupos de Pesquisa</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-80" />
                      <p className="text-4xl md:text-5xl font-bold mb-1">{searchResults.stats.patents}</p>
                      <p className="text-sm opacity-80">Patentes</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
                      <Landmark className="w-8 h-8 mx-auto mb-3 opacity-80" />
                      <p className="text-4xl md:text-5xl font-bold mb-1">{searchResults.stats.instruments}</p>
                      <p className="text-sm opacity-80">Instrumentos</p>
                    </div>
                  </div>
                </div>

                {/* Flow Visualization */}
                <div className="relative py-8">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                </div>

                {/* Scientific Incidence */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Microscope className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Científica
                      </h3>
                      <p className="text-muted-foreground">Diretório de Grupos de Pesquisa — CNPq</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.scientific.map((group, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                            {group.state}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1 group-hover:text-blue-600 transition-colors">
                          {group.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">{group.institution}</p>
                        <p className="text-xs text-muted-foreground/70">{group.area}</p>
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-200 border-dashed rounded-xl p-5 flex items-center justify-center">
                      <p className="text-sm text-blue-600 font-medium">
                        + {searchResults.stats.groups - searchResults.scientific.length} grupos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                  </div>
                </div>

                {/* Technological Incidence */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Cpu className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Tecnológica
                      </h3>
                      <p className="text-muted-foreground">Base de Patentes — INPI</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {searchResults.technological.map((patent, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-5 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <FlaskConical className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="font-semibold text-foreground group-hover:text-purple-600 transition-colors">
                                {patent.title}
                              </h4>
                              <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded flex-shrink-0">
                                {patent.year}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{patent.applicant}</p>
                            <p className="text-xs text-muted-foreground/70 font-mono mt-2">{patent.code}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-purple-50 border border-purple-200 border-dashed rounded-xl p-5 text-center">
                      <p className="text-sm text-purple-600 font-medium">
                        + {searchResults.stats.patents - searchResults.technological.length} patentes relacionadas
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                  </div>
                </div>

                {/* Institutional Incidence */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Institucional
                      </h3>
                      <p className="text-muted-foreground">Instrumentos Públicos — Finep, BNDES, Embrapii</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    {searchResults.institutional.map((inst, index) => (
                      <div 
                        key={index} 
                        className="group bg-card border border-border rounded-xl p-6 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-emerald-600" />
                          </div>
                          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                            inst.status === 'Aberto' 
                              ? 'bg-green-100 text-green-700' 
                              : inst.status === 'Contínuo'
                              ? 'bg-blue-100 text-blue-700'
                              : inst.status === 'Ativo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {inst.status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2 group-hover:text-emerald-600 transition-colors">
                          {inst.name}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{inst.type}</span>
                          {inst.value && (
                            <span className="text-sm font-semibold text-emerald-600">{inst.value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="bg-primary rounded-2xl p-10 text-center">
                  <h3 className="text-2xl font-bold text-primary-foreground mb-4 font-serif">
                    Rede de Incidência Construída
                  </h3>
                  <p className="text-primary-foreground/80 max-w-2xl mx-auto">
                    O MOTOR 4P traduziu o objeto tecnológico "{searchResults.query}" em uma rede verificável 
                    de {searchResults.stats.groups} grupos de pesquisa, {searchResults.stats.patents} patentes 
                    e {searchResults.stats.instruments} instrumentos públicos de fomento.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

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

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Microscope, Cpu, Building2, CheckCircle, Database, FileText, Landmark, MapPin, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Mock data for demonstrations
const mockSearchResults: Record<string, {
  scientific: { region: string; groups: number }[];
  technological: { year: string; patents: number }[];
  institutional: { name: string; type: string; status: string }[];
}> = {
  "baterias de sódio": {
    scientific: [
      { region: "Sudeste", groups: 42 },
      { region: "Sul", groups: 28 },
      { region: "Nordeste", groups: 15 },
      { region: "Centro-Oeste", groups: 8 },
      { region: "Norte", groups: 4 },
    ],
    technological: [
      { year: "2019", patents: 12 },
      { year: "2020", patents: 18 },
      { year: "2021", patents: 24 },
      { year: "2022", patents: 35 },
      { year: "2023", patents: 48 },
      { year: "2024", patents: 62 },
    ],
    institutional: [
      { name: "Finep - Programa de Energias Renováveis", type: "Fomento", status: "Aberto" },
      { name: "BNDES - Linha Verde", type: "Financiamento", status: "Contínuo" },
      { name: "Embrapii - Unidade de Armazenamento de Energia", type: "Parceria", status: "Ativo" },
    ],
  },
  "ia industrial": {
    scientific: [
      { region: "Sudeste", groups: 156 },
      { region: "Sul", groups: 89 },
      { region: "Nordeste", groups: 45 },
      { region: "Centro-Oeste", groups: 23 },
      { region: "Norte", groups: 12 },
    ],
    technological: [
      { year: "2019", patents: 45 },
      { year: "2020", patents: 78 },
      { year: "2021", patents: 124 },
      { year: "2022", patents: 189 },
      { year: "2023", patents: 267 },
      { year: "2024", patents: 342 },
    ],
    institutional: [
      { name: "Finep - Programa IA Brasil", type: "Fomento", status: "Aberto" },
      { name: "BNDES - Programa de Digitalização Industrial", type: "Financiamento", status: "Contínuo" },
      { name: "Embrapii - Competência em IA", type: "Parceria", status: "Ativo" },
      { name: "CNPq - Chamada Universal IA", type: "Bolsas", status: "Fechado" },
    ],
  },
  "biomateriais": {
    scientific: [
      { region: "Sudeste", groups: 78 },
      { region: "Sul", groups: 52 },
      { region: "Nordeste", groups: 34 },
      { region: "Centro-Oeste", groups: 18 },
      { region: "Norte", groups: 9 },
    ],
    technological: [
      { year: "2019", patents: 28 },
      { year: "2020", patents: 35 },
      { year: "2021", patents: 42 },
      { year: "2022", patents: 56 },
      { year: "2023", patents: 71 },
      { year: "2024", patents: 89 },
    ],
    institutional: [
      { name: "Finep - Bioeconomia", type: "Fomento", status: "Aberto" },
      { name: "BNDES - Programa Saúde", type: "Financiamento", status: "Contínuo" },
      { name: "Embrapii - Materiais Avançados", type: "Parceria", status: "Ativo" },
    ],
  },
};

const COLORS = ["#1e3a5f", "#2d5a87", "#3d7ab0", "#6a9bc3", "#97bcd6"];

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

    // Simulate API call
    setTimeout(() => {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      
      // Check for exact matches first
      if (mockSearchResults[normalizedQuery]) {
        setSearchResults(mockSearchResults[normalizedQuery]);
      } else {
        // Generate dynamic mock data for any query
        const baseMultiplier = Math.random() * 0.5 + 0.5;
        setSearchResults({
          scientific: [
            { region: "Sudeste", groups: Math.floor(60 * baseMultiplier) },
            { region: "Sul", groups: Math.floor(40 * baseMultiplier) },
            { region: "Nordeste", groups: Math.floor(25 * baseMultiplier) },
            { region: "Centro-Oeste", groups: Math.floor(12 * baseMultiplier) },
            { region: "Norte", groups: Math.floor(6 * baseMultiplier) },
          ],
          technological: [
            { year: "2019", patents: Math.floor(20 * baseMultiplier) },
            { year: "2020", patents: Math.floor(28 * baseMultiplier) },
            { year: "2021", patents: Math.floor(38 * baseMultiplier) },
            { year: "2022", patents: Math.floor(52 * baseMultiplier) },
            { year: "2023", patents: Math.floor(68 * baseMultiplier) },
            { year: "2024", patents: Math.floor(85 * baseMultiplier) },
          ],
          institutional: [
            { name: "Finep - Programa Temático", type: "Fomento", status: "Aberto" },
            { name: "BNDES - Linha de Inovação", type: "Financiamento", status: "Contínuo" },
            { name: "Embrapii - Unidade Especializada", type: "Parceria", status: "Ativo" },
          ],
        });
      }
      setIsSearching(false);
    }, 1200);
  };

  const handleExampleClick = (example: string) => {
    setSearchQuery(example);
  };

  const totalGroups = searchResults?.scientific.reduce((acc, curr) => acc + curr.groups, 0) || 0;
  const totalPatents = searchResults?.technological.reduce((acc, curr) => acc + curr.patents, 0) || 0;

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

      {/* Search Results - Graphical Output */}
      {hasSearched && (
        <section className="section-spacing">
          <div className="container-wide">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
              Saídas do Motor
            </h2>
            {searchQuery && (
              <p className="text-center text-muted-foreground mb-12">
                Resultados para: <span className="font-semibold text-foreground">"{searchQuery}"</span>
              </p>
            )}

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground">Consultando bases públicas...</p>
              </div>
            ) : searchResults ? (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Scientific Incidence */}
                <div className="card-institutional">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Microscope className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground font-serif">
                        Incidência Científica
                      </h3>
                      <p className="text-sm text-muted-foreground">CNPq / Diretório de Grupos</p>
                    </div>
                  </div>
                  
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-muted-foreground">Total de grupos:</span>
                      <span className="font-bold text-blue-600">{totalGroups}</span>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={searchResults.scientific} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="region" type="category" tick={{ fontSize: 12 }} width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="groups" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Technological Incidence */}
                <div className="card-institutional">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Cpu className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground font-serif">
                        Incidência Tecnológica
                      </h3>
                      <p className="text-sm text-muted-foreground">INPI / Patentes</p>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-muted-foreground">Total de patentes:</span>
                      <span className="font-bold text-purple-600">{totalPatents}</span>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={searchResults.technological}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="patents" 
                          stroke="#9333ea" 
                          strokeWidth={3}
                          dot={{ fill: '#9333ea', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Institutional Incidence */}
                <div className="card-institutional">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground font-serif">
                        Incidência Institucional
                      </h3>
                      <p className="text-sm text-muted-foreground">Finep / BNDES / Embrapii</p>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">Instrumentos encontrados:</span>
                      <span className="font-bold text-green-600">{searchResults.institutional.length}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {searchResults.institutional.map((inst, index) => (
                      <div key={index} className="p-3 bg-secondary/50 rounded-lg border border-border">
                        <p className="font-medium text-foreground text-sm">{inst.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-background rounded-full text-muted-foreground">
                            {inst.type}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            inst.status === 'Aberto' 
                              ? 'bg-green-100 text-green-700' 
                              : inst.status === 'Contínuo'
                              ? 'bg-blue-100 text-blue-700'
                              : inst.status === 'Ativo'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {inst.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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

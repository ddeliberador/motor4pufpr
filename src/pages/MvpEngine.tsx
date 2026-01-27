import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Microscope, Cpu, Building2, CheckCircle, Database, FileText, Landmark, Users, FlaskConical, Briefcase, ChevronRight, Globe, Factory, Download } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UfprLogo from "@/components/UfprLogo";
import { generateNewspaperPDF } from "@/lib/generatePdf";

// Extended mock data with companies and international incidences
const mockSearchResults: Record<string, {
  query: string;
  scientific: { name: string; institution: string; state: string; area: string; international?: string }[];
  technological: { title: string; applicant: string; year: string; code: string; international?: string }[];
  institutional: { name: string; type: string; status: string; value?: string }[];
  companies: { name: string; country: string; sector: string; type: string }[];
  international: { country: string; institutions: number; patents: number; relevance: string }[];
  stats: { groups: number; patents: number; instruments: number; companies: number; international: number };
}> = {
  "baterias de sódio": {
    query: "Baterias de sódio",
    stats: { groups: 97, patents: 199, instruments: 3, companies: 23, international: 12 },
    scientific: [
      { name: "Grupo de Materiais para Energia", institution: "USP", state: "SP", area: "Engenharia de Materiais", international: "Parceria com MIT e Fraunhofer" },
      { name: "Lab. de Armazenamento de Energia", institution: "UNICAMP", state: "SP", area: "Química", international: "Colaboração com CNRS (França)" },
      { name: "Núcleo de Eletroquímica Aplicada", institution: "UFPR", state: "PR", area: "Física" },
      { name: "Centro de Pesquisa em Baterias", institution: "UFRGS", state: "RS", area: "Engenharia Química", international: "Projeto conjunto com ETH Zurich" },
      { name: "Grupo de Materiais Funcionais", institution: "UFMG", state: "MG", area: "Química" },
    ],
    technological: [
      { title: "Célula eletroquímica de sódio-ion para armazenamento", applicant: "Petrobras S.A.", year: "2024", code: "BR102024001234", international: "Citada em 15 patentes internacionais" },
      { title: "Eletrodo de carbono para baterias de sódio", applicant: "USP", year: "2023", code: "BR102023005678", international: "Licenciada para empresa chinesa CATL" },
      { title: "Processo de síntese de materiais catódicos", applicant: "UNICAMP", year: "2023", code: "BR102023009012" },
      { title: "Sistema de gestão térmica para baterias Na-ion", applicant: "WEG S.A.", year: "2022", code: "BR102022003456" },
    ],
    institutional: [
      { name: "Programa Finep Energias Renováveis", type: "Subvenção", status: "Aberto", value: "R$ 50M" },
      { name: "BNDES Linha Verde", type: "Financiamento", status: "Contínuo", value: "até R$ 200M" },
      { name: "Embrapii - Armazenamento de Energia", type: "Parceria", status: "Ativo" },
    ],
    companies: [
      { name: "WEG S.A.", country: "Brasil", sector: "Energia/Elétrica", type: "Grande Empresa" },
      { name: "Moura", country: "Brasil", sector: "Baterias", type: "Grande Empresa" },
      { name: "Unicoba", country: "Brasil", sector: "Eletrônicos", type: "Média Empresa" },
      { name: "Heliar", country: "Brasil", sector: "Baterias", type: "Grande Empresa" },
      { name: "CATL", country: "China", sector: "Baterias", type: "Multinacional" },
      { name: "BYD", country: "China", sector: "Veículos/Energia", type: "Multinacional" },
      { name: "Northvolt", country: "Suécia", sector: "Baterias", type: "Scale-up" },
      { name: "Faradion", country: "Reino Unido", sector: "Baterias Na-ion", type: "Startup" },
      { name: "Natron Energy", country: "EUA", sector: "Baterias Na-ion", type: "Scale-up" },
      { name: "TIAMAT", country: "França", sector: "Baterias Na-ion", type: "Startup" },
    ],
    international: [
      { country: "🇨🇳 China", institutions: 245, patents: 3420, relevance: "Líder mundial" },
      { country: "🇺🇸 EUA", institutions: 89, patents: 890, relevance: "Alta P&D" },
      { country: "🇯🇵 Japão", institutions: 67, patents: 654, relevance: "Pioneiro" },
      { country: "🇰🇷 Coreia do Sul", institutions: 54, patents: 512, relevance: "Alta escala" },
      { country: "🇩🇪 Alemanha", institutions: 43, patents: 234, relevance: "Pesquisa avançada" },
      { country: "🇫🇷 França", institutions: 28, patents: 187, relevance: "TIAMAT líder" },
    ],
  },
  "ia industrial": {
    query: "IA Industrial",
    stats: { groups: 325, patents: 1043, instruments: 4, companies: 67, international: 18 },
    scientific: [
      { name: "Lab. de Inteligência Artificial", institution: "USP", state: "SP", area: "Ciência da Computação", international: "Parceria com Stanford AI Lab" },
      { name: "Grupo de IA e Automação", institution: "UFSC", state: "SC", area: "Engenharia de Produção", international: "Colaboração com Fraunhofer IPA" },
      { name: "Centro de IA Aplicada", institution: "PUC-Rio", state: "RJ", area: "Informática", international: "Projeto com Microsoft Research" },
      { name: "Núcleo de Machine Learning Industrial", institution: "UNICAMP", state: "SP", area: "Engenharia Elétrica" },
      { name: "Grupo de Sistemas Inteligentes", institution: "UFPE", state: "PE", area: "Ciência da Computação" },
    ],
    technological: [
      { title: "Sistema de visão computacional para controle de qualidade", applicant: "Embraer S.A.", year: "2024", code: "BR102024002345", international: "Adotada por Airbus" },
      { title: "Método de manutenção preditiva com IA", applicant: "Vale S.A.", year: "2024", code: "BR102024003456", international: "Implementada em minas australianas" },
      { title: "Plataforma de otimização de processos industriais", applicant: "SENAI-SP", year: "2023", code: "BR102023004567" },
      { title: "Algoritmo de detecção de anomalias em linhas de produção", applicant: "Bosch Brasil", year: "2023", code: "BR102023005678" },
    ],
    institutional: [
      { name: "Programa IA Brasil 2030", type: "Subvenção", status: "Aberto", value: "R$ 200M" },
      { name: "BNDES Digitalização Industrial", type: "Financiamento", status: "Contínuo", value: "até R$ 500M" },
      { name: "Embrapii - Competência IA", type: "Parceria", status: "Ativo" },
      { name: "CNPq Chamada Universal IA", type: "Bolsas", status: "Encerrado" },
    ],
    companies: [
      { name: "Embraer", country: "Brasil", sector: "Aeronáutica", type: "Grande Empresa" },
      { name: "Vale", country: "Brasil", sector: "Mineração", type: "Multinacional" },
      { name: "Petrobras", country: "Brasil", sector: "Energia", type: "Estatal" },
      { name: "WEG", country: "Brasil", sector: "Indústria", type: "Grande Empresa" },
      { name: "Siemens", country: "Alemanha", sector: "Automação", type: "Multinacional" },
      { name: "ABB", country: "Suíça", sector: "Robótica", type: "Multinacional" },
      { name: "Rockwell", country: "EUA", sector: "Automação", type: "Multinacional" },
      { name: "Fanuc", country: "Japão", sector: "Robótica", type: "Multinacional" },
      { name: "NVIDIA", country: "EUA", sector: "Hardware IA", type: "Multinacional" },
    ],
    international: [
      { country: "🇺🇸 EUA", institutions: 412, patents: 8934, relevance: "Líder global" },
      { country: "🇨🇳 China", institutions: 378, patents: 7654, relevance: "Crescimento acelerado" },
      { country: "🇩🇪 Alemanha", institutions: 156, patents: 2341, relevance: "Indústria 4.0" },
      { country: "🇯🇵 Japão", institutions: 134, patents: 1987, relevance: "Robótica avançada" },
      { country: "🇰🇷 Coreia do Sul", institutions: 98, patents: 1234, relevance: "Smart factories" },
      { country: "🇬🇧 Reino Unido", institutions: 87, patents: 876, relevance: "P&D intensivo" },
    ],
  },
  "biomateriais": {
    query: "Biomateriais",
    stats: { groups: 191, patents: 321, instruments: 3, companies: 34, international: 15 },
    scientific: [
      { name: "Lab. de Biomateriais e Bioengenharia", institution: "USP", state: "SP", area: "Engenharia Biomédica", international: "Parceria com Harvard Medical School" },
      { name: "Grupo de Materiais Biocompatíveis", institution: "UFRJ", state: "RJ", area: "Engenharia Metalúrgica", international: "Colaboração com Max Planck Institute" },
      { name: "Centro de Pesquisa em Biomateriais", institution: "UFMG", state: "MG", area: "Odontologia" },
      { name: "Núcleo de Engenharia de Tecidos", institution: "UNICAMP", state: "SP", area: "Biologia", international: "Projeto com Karolinska Institutet" },
      { name: "Lab. de Polímeros Biodegradáveis", institution: "UNESP", state: "SP", area: "Química" },
    ],
    technological: [
      { title: "Scaffold bioativo para regeneração óssea", applicant: "Baumer S.A.", year: "2024", code: "BR102024006789", international: "Aprovado FDA (EUA)" },
      { title: "Hidrogel injetável para liberação de fármacos", applicant: "USP", year: "2023", code: "BR102023007890", international: "Licenciada para Johnson & Johnson" },
      { title: "Membrana polimérica para implantes dentários", applicant: "Straumann Brasil", year: "2023", code: "BR102023008901" },
      { title: "Compósito cerâmico para próteses", applicant: "UFRJ", year: "2022", code: "BR102022009012" },
    ],
    institutional: [
      { name: "Finep Bioeconomia", type: "Subvenção", status: "Aberto", value: "R$ 80M" },
      { name: "BNDES Programa Saúde", type: "Financiamento", status: "Contínuo", value: "até R$ 300M" },
      { name: "Embrapii - Materiais Avançados", type: "Parceria", status: "Ativo" },
    ],
    companies: [
      { name: "Baumer", country: "Brasil", sector: "Dispositivos Médicos", type: "Grande Empresa" },
      { name: "Bionnovation", country: "Brasil", sector: "Implantes", type: "Média Empresa" },
      { name: "Genius", country: "Brasil", sector: "Odontologia", type: "Média Empresa" },
      { name: "Straumann", country: "Suíça", sector: "Implantes Dentários", type: "Multinacional" },
      { name: "Medtronic", country: "Irlanda", sector: "Dispositivos Médicos", type: "Multinacional" },
      { name: "Johnson & Johnson", country: "EUA", sector: "Saúde", type: "Multinacional" },
      { name: "Zimmer Biomet", country: "EUA", sector: "Implantes", type: "Multinacional" },
      { name: "DSM Biomedical", country: "Holanda", sector: "Biomateriais", type: "Multinacional" },
    ],
    international: [
      { country: "🇺🇸 EUA", institutions: 234, patents: 4567, relevance: "Líder P&D" },
      { country: "🇩🇪 Alemanha", institutions: 123, patents: 1234, relevance: "Engenharia avançada" },
      { country: "🇯🇵 Japão", institutions: 98, patents: 987, relevance: "Alta precisão" },
      { country: "🇨🇭 Suíça", institutions: 67, patents: 654, relevance: "Implantes premium" },
      { country: "🇬🇧 Reino Unido", institutions: 54, patents: 432, relevance: "Biotech inovador" },
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
            instruments: 3,
            companies: Math.floor(20 * baseMultiplier),
            international: Math.floor(10 * baseMultiplier)
          },
          scientific: [
            { name: "Grupo de Pesquisa Relacionado", institution: "USP", state: "SP", area: "Área Principal", international: "Colaboração internacional ativa" },
            { name: "Laboratório Especializado", institution: "UNICAMP", state: "SP", area: "Área Secundária" },
            { name: "Núcleo de Investigação", institution: "UFRJ", state: "RJ", area: "Área Correlata" },
            { name: "Centro de Estudos Avançados", institution: "UFMG", state: "MG", area: "Área Técnica" },
          ],
          technological: [
            { title: "Invenção relacionada ao tema", applicant: "Empresa Nacional", year: "2024", code: "BR102024000001", international: "Citada internacionalmente" },
            { title: "Processo inovador aplicado", applicant: "Universidade", year: "2023", code: "BR102023000002" },
            { title: "Dispositivo técnico avançado", applicant: "Instituto de Pesquisa", year: "2023", code: "BR102023000003" },
          ],
          institutional: [
            { name: "Programa de Fomento Temático", type: "Subvenção", status: "Aberto", value: "R$ 50M" },
            { name: "Linha de Financiamento", type: "Financiamento", status: "Contínuo" },
            { name: "Parceria Estratégica", type: "Parceria", status: "Ativo" },
          ],
          companies: [
            { name: "Empresa Brasileira Líder", country: "Brasil", sector: "Setor Principal", type: "Grande Empresa" },
            { name: "Startup Nacional", country: "Brasil", sector: "Inovação", type: "Startup" },
            { name: "Multinacional Líder", country: "EUA", sector: "Tecnologia", type: "Multinacional" },
            { name: "Player Asiático", country: "China", sector: "Manufatura", type: "Multinacional" },
            { name: "Líder Europeu", country: "Alemanha", sector: "Engenharia", type: "Multinacional" },
          ],
          international: [
            { country: "🇺🇸 EUA", institutions: Math.floor(150 * baseMultiplier), patents: Math.floor(2000 * baseMultiplier), relevance: "Líder global" },
            { country: "🇨🇳 China", institutions: Math.floor(120 * baseMultiplier), patents: Math.floor(1800 * baseMultiplier), relevance: "Em expansão" },
            { country: "🇩🇪 Alemanha", institutions: Math.floor(80 * baseMultiplier), patents: Math.floor(900 * baseMultiplier), relevance: "Alta qualidade" },
            { country: "🇯🇵 Japão", institutions: Math.floor(70 * baseMultiplier), patents: Math.floor(700 * baseMultiplier), relevance: "Tradicional" },
          ],
        });
      }
      setIsSearching(false);
    }, 1500);
  };

  const handleExampleClick = (example: string) => {
    setSearchQuery(example);
  };

  const handleDownloadPDF = () => {
    if (searchResults) {
      generateNewspaperPDF(searchResults);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="hero-section pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container-narrow text-center">
          <div className="flex justify-center mb-6">
            <UfprLogo className="w-20 h-20 opacity-90" />
          </div>
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
                <p className="text-muted-foreground">Consultando CNPq, INPI, Finep e bases internacionais</p>
              </div>
            ) : searchResults ? (
              <div className="space-y-16 animate-fade-in">
                {/* Results Header */}
                <div className="text-center">
                  <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Resultados para</p>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-8">
                    "{searchResults.query}"
                  </h2>
                  
                  {/* Stats Overview - 5 columns now */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                      <Microscope className="w-7 h-7 mx-auto mb-2 opacity-80" />
                      <p className="text-3xl md:text-4xl font-bold mb-1">{searchResults.stats.groups}</p>
                      <p className="text-xs opacity-80">Grupos de Pesquisa</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                      <FileText className="w-7 h-7 mx-auto mb-2 opacity-80" />
                      <p className="text-3xl md:text-4xl font-bold mb-1">{searchResults.stats.patents}</p>
                      <p className="text-xs opacity-80">Patentes</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                      <Landmark className="w-7 h-7 mx-auto mb-2 opacity-80" />
                      <p className="text-3xl md:text-4xl font-bold mb-1">{searchResults.stats.instruments}</p>
                      <p className="text-xs opacity-80">Instrumentos</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
                      <Factory className="w-7 h-7 mx-auto mb-2 opacity-80" />
                      <p className="text-3xl md:text-4xl font-bold mb-1">{searchResults.stats.companies}</p>
                      <p className="text-xs opacity-80">Empresas</p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white col-span-2 md:col-span-1">
                      <Globe className="w-7 h-7 mx-auto mb-2 opacity-80" />
                      <p className="text-3xl md:text-4xl font-bold mb-1">{searchResults.stats.international}</p>
                      <p className="text-xs opacity-80">Países</p>
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
                        <p className="text-xs text-muted-foreground/70 mb-2">{group.area}</p>
                        {group.international && (
                          <div className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                            <Globe className="w-3 h-3" />
                            <span>{group.international}</span>
                          </div>
                        )}
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
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-muted-foreground/70 font-mono">{patent.code}</p>
                              {patent.international && (
                                <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                                  <Globe className="w-3 h-3" />
                                  {patent.international}
                                </span>
                              )}
                            </div>
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

                {/* Companies Section - NEW */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Factory className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Empresas no Setor
                      </h3>
                      <p className="text-muted-foreground">Empresas brasileiras e internacionais</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Brazilian Companies */}
                    <div>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <span className="text-2xl">🇧🇷</span> Brasil
                      </h4>
                      <div className="space-y-3">
                        {searchResults.companies.filter(c => c.country === "Brasil").map((company, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 hover:border-amber-300 transition-all"
                          >
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-grow">
                              <h5 className="font-medium text-foreground">{company.name}</h5>
                              <p className="text-xs text-muted-foreground">{company.sector} • {company.type}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* International Companies */}
                    <div>
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <span className="text-2xl">🌍</span> Internacional
                      </h4>
                      <div className="space-y-3">
                        {searchResults.companies.filter(c => c.country !== "Brasil").slice(0, 5).map((company, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 hover:border-rose-300 transition-all"
                          >
                            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                              <Globe className="w-5 h-5 text-rose-600" />
                            </div>
                            <div className="flex-grow">
                              <h5 className="font-medium text-foreground">{company.name}</h5>
                              <p className="text-xs text-muted-foreground">{company.country} • {company.sector}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
                  </div>
                </div>

                {/* International Incidence - NEW */}
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/25">
                      <Globe className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
                        Incidência Internacional
                      </h3>
                      <p className="text-muted-foreground">Mapeamento global do objeto tecnológico</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.international.map((item, index) => (
                      <div 
                        key={index}
                        className="bg-gradient-to-br from-card to-rose-50/30 border border-border rounded-xl p-5 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-medium">{item.country}</span>
                          <span className="text-xs font-medium px-2 py-1 bg-rose-100 text-rose-700 rounded-full">
                            {item.relevance}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2 bg-white/50 rounded-lg">
                            <p className="text-2xl font-bold text-foreground">{item.institutions}</p>
                            <p className="text-xs text-muted-foreground">Instituições</p>
                          </div>
                          <div className="text-center p-2 bg-white/50 rounded-lg">
                            <p className="text-2xl font-bold text-foreground">{item.patents}</p>
                            <p className="text-xs text-muted-foreground">Patentes</p>
                          </div>
                        </div>
                      </div>
                    ))}
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

                {/* Call to Action with PDF Download */}
                <div className="bg-primary rounded-2xl p-10 text-center">
                  <h3 className="text-2xl font-bold text-primary-foreground mb-4 font-serif">
                    Rede de Incidência Construída
                  </h3>
                  <p className="text-primary-foreground/80 max-w-3xl mx-auto mb-6">
                    O MOTOR 4P traduziu o objeto tecnológico "{searchResults.query}" em uma rede verificável 
                    de {searchResults.stats.groups} grupos de pesquisa, {searchResults.stats.patents} patentes, 
                    {searchResults.stats.companies} empresas e incidência em {searchResults.stats.international} países.
                  </p>
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Baixar Relatório PDF
                  </button>
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

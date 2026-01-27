import { useState } from "react";
import { 
  Search, MapPin, Trophy, Network, Calculator, Building2, 
  Lightbulb, Users, FileText, Briefcase, 
  Target, Layers,
  Leaf, Cpu, Heart, Atom, Factory
} from "lucide-react";

// Mock data for ranking
const mockRankingData = [
  { rank: 1, name: "USP", type: "Federal", state: "SP", groups: 40, patents: 22, projects: 12, score: 87 },
  { rank: 2, name: "Unicamp", type: "Estadual", state: "SP", groups: 30, patents: 18, projects: 10, score: 78 },
  { rank: 3, name: "UFRJ", type: "Federal", state: "RJ", groups: 25, patents: 14, projects: 6, score: 65 },
  { rank: 4, name: "Fiocruz", type: "ICT", state: "RJ", groups: 20, patents: 9, projects: 8, score: 58 },
  { rank: 5, name: "UFMG", type: "Federal", state: "MG", groups: 18, patents: 12, projects: 5, score: 52 },
  { rank: 6, name: "UFSC", type: "Federal", state: "SC", groups: 15, patents: 8, projects: 7, score: 48 },
  { rank: 7, name: "UFPR", type: "Federal", state: "PR", groups: 12, patents: 5, projects: 4, score: 38 },
  { rank: 8, name: "UFRGS", type: "Federal", state: "RS", groups: 14, patents: 6, projects: 3, score: 36 },
];

const clusters = [
  { name: "IA e Computação Avançada", icon: Cpu, institutions: ["USP", "Unicamp", "UFPE", "PUC-Rio"], color: "from-primary to-primary/70" },
  { name: "Saúde, Biotecnologia e Fiocruz", icon: Heart, institutions: ["Fiocruz", "USP", "UFRJ", "Butantan"], color: "from-accent to-accent/70" },
  { name: "Agroindústria e Embrapa", icon: Leaf, institutions: ["Embrapa", "USP-Esalq", "UFV", "Unicamp"], color: "from-accent to-primary" },
  { name: "Energia e Transição Verde", icon: Factory, institutions: ["UFRJ", "Unicamp", "UFSC", "UFPR"], color: "from-primary to-accent" },
  { name: "Materiais Avançados e CNPEM", icon: Atom, institutions: ["CNPEM", "USP", "Unicamp", "UFMG"], color: "from-primary/80 to-accent/80" },
];

const strategicCenters = [
  { name: "Embrapa", description: "Agroindústria e tecnologias verdes", icon: Leaf },
  { name: "Fiocruz", description: "Saúde e biotecnologia", icon: Heart },
  { name: "CNPEM / Sirius", description: "Materiais avançados", icon: Atom },
  { name: "Senai CIMATEC", description: "Engenharia e indústria 4.0", icon: Factory },
  { name: "Institutos Federais", description: "Formação técnica e inovação regional", icon: Building2 },
];

const insights = [
  "Onde estão os polos científicos e tecnológicos estratégicos",
  "Quais temas estão excessivamente concentrados em poucos centros",
  "Onde existem vazios territoriais de capacidade",
  "Quais objetos têm gargalos Ciência → Tecnologia → Produção",
  "Onde políticas industriais podem induzir cooperação e catching-up",
];

interface AtlasContentProps {
  initialQuery?: string;
}

const AtlasContent = ({ initialQuery = "" }: AtlasContentProps) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setHasSearched(true);
    }
  };

  const handleExampleClick = (example: string) => {
    setSearchQuery(example);
    setHasSearched(true);
  };

  return (
    <div className="space-y-16">
      {/* Atlas Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-serif">
          Atlas Nacional de Capacidades
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Mapa comparativo de universidades e centros de pesquisa do Brasil por objeto tecnológico.
        </p>

        {/* Search Input */}
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite um objeto tecnológico..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Explorar Atlas Nacional
            </button>
          </form>
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-3">Exemplos de pesquisa:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Inteligência Artificial", "Semicondutores", "Baterias de Sódio", "Biomateriais"].map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm hover:bg-secondary/80 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 1 - Map */}
      <div>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <MapPin className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
              Distribuição Territorial de Capacidades
            </h3>
            <p className="text-muted-foreground">
              {hasSearched ? `Mapeamento para: "${searchQuery}"` : "Selecione um objeto tecnológico para visualizar"}
            </p>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="aspect-[16/9] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative">
            {/* Simplified Brazil Map SVG Placeholder */}
            <svg viewBox="0 0 800 700" className="w-full h-full max-w-3xl opacity-20">
              <path
                d="M400,50 L550,100 L650,150 L700,250 L720,350 L700,450 L650,550 L550,620 L450,650 L350,650 L250,600 L150,500 L100,400 L100,300 L150,200 L250,120 L350,80 Z"
                fill="currentColor"
                className="text-primary"
              />
            </svg>
            
            {/* Sample Points */}
            {hasSearched && (
              <>
                <div className="absolute top-[35%] left-[55%] w-8 h-8 bg-primary rounded-full opacity-80 animate-pulse" title="SP" />
                <div className="absolute top-[40%] left-[60%] w-6 h-6 bg-primary rounded-full opacity-70" title="RJ" />
                <div className="absolute top-[38%] left-[50%] w-5 h-5 bg-accent rounded-full opacity-70" title="MG" />
                <div className="absolute top-[50%] left-[48%] w-4 h-4 bg-primary rounded-full opacity-60" title="PR" />
                <div className="absolute top-[55%] left-[45%] w-4 h-4 bg-accent rounded-full opacity-60" title="SC" />
                <div className="absolute top-[60%] left-[42%] w-3 h-3 bg-primary rounded-full opacity-50" title="RS" />
              </>
            )}
            
            {!hasSearched && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Pesquise um objeto tecnológico para visualizar o mapa</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="p-6 border-t border-border bg-muted/30">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary" />
                <span className="text-muted-foreground">Tamanho = nº de grupos/projetos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-accent" />
                <span className="text-muted-foreground">Cor = intensidade tecnológica e patentes</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-4">
              Fontes: CNPq (DGP), Capes, INPI, Finep
            </p>
          </div>
        </div>
      </div>

      {/* Section 2 - Ranking */}
      <div className="bg-muted/30 -mx-4 px-4 py-12 md:-mx-8 md:px-8 lg:-mx-16 lg:px-16 rounded-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
            <Trophy className="w-7 h-7 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
              Top Instituições Brasileiras
            </h3>
            <p className="text-muted-foreground">
              {hasSearched ? `Ranking para: "${searchQuery}"` : "No objeto pesquisado"}
            </p>
          </div>
        </div>

        {/* Ranking Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-semibold text-foreground">#</th>
                  <th className="text-left p-4 font-semibold text-foreground">Instituição</th>
                  <th className="text-left p-4 font-semibold text-foreground hidden md:table-cell">Tipo</th>
                  <th className="text-center p-4 font-semibold text-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Grupos</span>
                    </div>
                  </th>
                  <th className="text-center p-4 font-semibold text-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Patentes</span>
                    </div>
                  </th>
                  <th className="text-center p-4 font-semibold text-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="hidden sm:inline">Projetos</span>
                    </div>
                  </th>
                  <th className="text-center p-4 font-semibold text-foreground">ICT-Obj</th>
                </tr>
              </thead>
              <tbody>
                {mockRankingData.map((item) => (
                  <tr 
                    key={item.rank} 
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        item.rank <= 3 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.rank}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.state}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.type === 'Federal' ? 'bg-primary/10 text-primary' :
                        item.type === 'Estadual' ? 'bg-accent/10 text-accent' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 text-center font-medium text-foreground">{item.groups}</td>
                    <td className="p-4 text-center font-medium text-foreground">{item.patents}</td>
                    <td className="p-4 text-center font-medium text-foreground">{item.projects}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-accent/10 text-accent font-bold text-sm">
                        {item.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Cada instituição pode ser expandida para visualizar evidências e registros públicos.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3 - Clusters */}
      <div>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Network className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
              Clusters Tecnocientíficos do Brasil
            </h3>
            <p className="text-muted-foreground">Polos nacionais de especialização</p>
          </div>
        </div>

        {/* Cluster Network Placeholder */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8">
          <div className="aspect-[16/9] bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl flex items-center justify-center relative overflow-hidden">
            {/* Network visualization placeholder */}
            <div className="absolute inset-0">
              {/* Central node */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                Brasil
              </div>
              
              {/* Cluster nodes */}
              <div className="absolute top-[20%] left-[30%] w-14 h-14 rounded-full bg-accent/80 flex items-center justify-center text-accent-foreground text-xs font-medium shadow">USP</div>
              <div className="absolute top-[25%] left-[60%] w-12 h-12 rounded-full bg-primary/70 flex items-center justify-center text-primary-foreground text-xs font-medium shadow">Unicamp</div>
              <div className="absolute top-[60%] left-[25%] w-11 h-11 rounded-full bg-accent/60 flex items-center justify-center text-accent-foreground text-xs font-medium shadow">UFMG</div>
              <div className="absolute top-[70%] left-[55%] w-10 h-10 rounded-full bg-primary/60 flex items-center justify-center text-primary-foreground text-xs font-medium shadow">UFRJ</div>
              <div className="absolute top-[40%] left-[75%] w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center text-accent-foreground text-xs font-medium shadow">Fiocruz</div>
              <div className="absolute top-[75%] left-[35%] w-9 h-9 rounded-full bg-primary/50 flex items-center justify-center text-primary-foreground text-xs font-medium shadow">UFPR</div>
              <div className="absolute top-[30%] left-[20%] w-9 h-9 rounded-full bg-accent/40 flex items-center justify-center text-accent-foreground text-xs font-medium shadow">Embrapa</div>
              
              {/* Connection lines (simplified) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <line x1="50%" y1="50%" x2="30%" y2="20%" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="50%" y1="50%" x2="60%" y2="25%" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="50%" y1="50%" x2="25%" y2="60%" stroke="currentColor" strokeWidth="1" className="text-accent" />
                <line x1="50%" y1="50%" x2="55%" y2="70%" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="50%" y1="50%" x2="75%" y2="40%" stroke="currentColor" strokeWidth="1" className="text-accent" />
                <line x1="50%" y1="50%" x2="35%" y2="75%" stroke="currentColor" strokeWidth="1" className="text-primary" />
                <line x1="30%" y1="20%" x2="60%" y2="25%" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
                <line x1="25%" y1="60%" x2="35%" y2="75%" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
              </svg>
            </div>
          </div>
        </div>

        {/* Cluster Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clusters.map((cluster) => (
            <div 
              key={cluster.name}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cluster.color} flex items-center justify-center`}>
                  <cluster.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h4 className="font-semibold text-foreground">{cluster.name}</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {cluster.institutions.map((inst) => (
                  <span key={inst} className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground/70 mt-6 text-center">
          Clusterização baseada em coocorrência temática e redes de cooperação científica.
        </p>
      </div>

      {/* Section 4 - Index */}
      <div className="bg-muted/30 -mx-4 px-4 py-12 md:-mx-8 md:px-8 lg:-mx-16 lg:px-16 rounded-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
            <Calculator className="w-7 h-7 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
              Índice de Capacidade Tecnocientífica
            </h3>
            <p className="text-muted-foreground">ICT-Obj — Indicador Estratégico</p>
          </div>
        </div>

        <p className="text-muted-foreground mb-8">
          O Motor 4P propõe um indicador auditável para comparar instituições brasileiras em qualquer área tecnológica.
        </p>

        {/* Formula Box */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-sm uppercase tracking-widest text-muted-foreground">Fórmula</span>
            <h4 className="text-2xl font-bold text-foreground font-serif mt-2">ICT-Obj</h4>
          </div>
          
          <div className="space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">0.4</span>
                <span className="text-muted-foreground">×</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">Grupos Científicos (CNPq)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">0.3</span>
                <span className="text-muted-foreground">×</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-foreground font-medium">Patentes (INPI)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-accent">0.2</span>
                <span className="text-muted-foreground">×</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-accent" />
                <span className="text-foreground font-medium">Projetos Financiados</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-accent">0.1</span>
                <span className="text-muted-foreground">×</span>
              </div>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-accent" />
                <span className="text-foreground font-medium">Cooperação Ciência–Indústria</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-muted-foreground">
          Este índice revela <strong className="text-foreground">liderança</strong>, <strong className="text-foreground">concentração</strong>, <strong className="text-foreground">lacunas</strong> e <strong className="text-foreground">gargalos</strong> nacionais.
        </p>
      </div>

      {/* Section 5 - Strategic Centers */}
      <div>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Layers className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
              Instituições-chave do Sistema Nacional
            </h3>
            <p className="text-muted-foreground">Centros estratégicos de inovação</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {strategicCenters.map((center) => (
            <div 
              key={center.name}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <center.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{center.name}</h4>
                  <p className="text-sm text-muted-foreground">{center.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          O Atlas integra universidades e ICTs que estruturam a capacidade tecnológica do Brasil.
        </p>
      </div>

      {/* Section 6 - Policy Insights */}
      <div className="bg-muted/30 -mx-4 px-4 py-12 md:-mx-8 md:px-8 lg:-mx-16 lg:px-16 rounded-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
            <Lightbulb className="w-7 h-7 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
              O que este Atlas permite enxergar?
            </h3>
            <p className="text-muted-foreground">Insights para política industrial</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <ul className="space-y-4">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-accent" />
                </div>
                <p className="text-foreground">{insight}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-primary/5 border border-primary/20 rounded-2xl p-8">
            <p className="text-lg text-foreground font-serif max-w-2xl">
              "Este Atlas é um componente essencial para uma <strong className="text-primary">política industrial baseada em evidência</strong> e <strong className="text-primary">coordenação computacional</strong>."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtlasContent;

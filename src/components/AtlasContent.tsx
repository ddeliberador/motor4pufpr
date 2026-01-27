import { useState } from "react";
import { 
  Search, MapPin, Trophy, Network, Calculator, Building2, 
  Lightbulb, Users, FileText, Briefcase, 
  Target, Layers,
  Leaf, Cpu, Heart, Atom, Factory, ChevronDown, ExternalLink, Globe, GraduationCap, Award, TrendingUp, BookOpen
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Extended mock data for ranking with details
const mockRankingData = [
  { 
    rank: 1, name: "USP", fullName: "Universidade de São Paulo", type: "Federal", state: "SP", groups: 40, patents: 22, projects: 12, score: 87,
    details: {
      researchers: 156,
      doctorates: 89,
      masters: 234,
      partnerships: ["MIT", "Stanford", "Fraunhofer"],
      topAreas: ["Materiais Avançados", "IA Aplicada", "Biotecnologia"],
      fundingMM: 45.2,
      publications: 342,
      trl: { low: 15, medium: 18, high: 7 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
  { 
    rank: 2, name: "Unicamp", fullName: "Universidade Estadual de Campinas", type: "Estadual", state: "SP", groups: 30, patents: 18, projects: 10, score: 78,
    details: {
      researchers: 112,
      doctorates: 67,
      masters: 189,
      partnerships: ["CNRS", "Max Planck", "ETH Zurich"],
      topAreas: ["Química Avançada", "Engenharia de Materiais", "Fotônica"],
      fundingMM: 32.8,
      publications: 278,
      trl: { low: 12, medium: 14, high: 4 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
  { 
    rank: 3, name: "UFRJ", fullName: "Universidade Federal do Rio de Janeiro", type: "Federal", state: "RJ", groups: 25, patents: 14, projects: 6, score: 65,
    details: {
      researchers: 98,
      doctorates: 54,
      masters: 156,
      partnerships: ["Harvard", "Oxford", "Sorbonne"],
      topAreas: ["Energia", "Petroquímica", "Nanotecnologia"],
      fundingMM: 28.4,
      publications: 198,
      trl: { low: 10, medium: 11, high: 4 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
  { 
    rank: 4, name: "Fiocruz", fullName: "Fundação Oswaldo Cruz", type: "ICT", state: "RJ", groups: 20, patents: 9, projects: 8, score: 58,
    details: {
      researchers: 145,
      doctorates: 78,
      masters: 112,
      partnerships: ["WHO", "CDC", "Pasteur Institute"],
      topAreas: ["Vacinas", "Biotecnologia", "Saúde Pública"],
      fundingMM: 56.7,
      publications: 456,
      trl: { low: 8, medium: 9, high: 3 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
  { 
    rank: 5, name: "UFMG", fullName: "Universidade Federal de Minas Gerais", type: "Federal", state: "MG", groups: 18, patents: 12, projects: 5, score: 52,
    details: {
      researchers: 76,
      doctorates: 42,
      masters: 98,
      partnerships: ["TU Munich", "Politecnico di Milano"],
      topAreas: ["Metalurgia", "Engenharia Química", "Mineração"],
      fundingMM: 21.3,
      publications: 167,
      trl: { low: 8, medium: 8, high: 2 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
  { 
    rank: 6, name: "UFSC", fullName: "Universidade Federal de Santa Catarina", type: "Federal", state: "SC", groups: 15, patents: 8, projects: 7, score: 48,
    details: {
      researchers: 62,
      doctorates: 35,
      masters: 87,
      partnerships: ["TU Delft", "KTH Stockholm"],
      topAreas: ["Automação", "Sistemas Embarcados", "Refrigeração"],
      fundingMM: 18.9,
      publications: 134,
      trl: { low: 6, medium: 7, high: 2 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
  { 
    rank: 7, name: "UFPR", fullName: "Universidade Federal do Paraná", type: "Federal", state: "PR", groups: 12, patents: 5, projects: 4, score: 38,
    details: {
      researchers: 48,
      doctorates: 28,
      masters: 67,
      partnerships: ["University of Waterloo", "INRIA"],
      topAreas: ["Bioprocessos", "Engenharia Florestal", "Polímeros"],
      fundingMM: 12.4,
      publications: 98,
      trl: { low: 5, medium: 5, high: 2 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
  { 
    rank: 8, name: "UFRGS", fullName: "Universidade Federal do Rio Grande do Sul", type: "Federal", state: "RS", groups: 14, patents: 6, projects: 3, score: 36,
    details: {
      researchers: 54,
      doctorates: 31,
      masters: 78,
      partnerships: ["Université de Lyon", "University of Melbourne"],
      topAreas: ["Microeletrônica", "Agronegócio", "IA"],
      fundingMM: 14.7,
      publications: 112,
      trl: { low: 6, medium: 6, high: 2 },
      links: { lattes: "http://dgp.cnpq.br", patents: "https://busca.inpi.gov.br" }
    }
  },
];

type InstitutionData = typeof mockRankingData[0];

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
  const [expandedInstitutions, setExpandedInstitutions] = useState<number[]>([]);

  const toggleInstitution = (rank: number) => {
    setExpandedInstitutions(prev => 
      prev.includes(rank) 
        ? prev.filter(r => r !== rank)
        : [...prev, rank]
    );
  };

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

        {/* Ranking Cards with Expansion */}
        <div className="space-y-3">
          {mockRankingData.map((item) => (
            <Collapsible
              key={item.rank}
              open={expandedInstitutions.includes(item.rank)}
              onOpenChange={() => toggleInstitution(item.rank)}
            >
              <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    {/* Rank */}
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold flex-shrink-0 ${
                      item.rank <= 3 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                    }`}>
                      {item.rank}
                    </span>
                    
                    {/* Institution Info */}
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.fullName}</p>
                      </div>
                    </div>

                    {/* Stats - Hidden on mobile */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{item.groups}</p>
                        <p className="text-xs text-muted-foreground">Grupos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{item.patents}</p>
                        <p className="text-xs text-muted-foreground">Patentes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{item.projects}</p>
                        <p className="text-xs text-muted-foreground">Projetos</p>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-accent/10 text-accent font-bold">
                        {item.score}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                        expandedInstitutions.includes(item.rank) ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border bg-muted/20 p-6 animate-accordion-down">
                    {/* Mobile Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6 md:hidden">
                      <div className="text-center p-3 bg-card rounded-lg border border-border">
                        <p className="text-xl font-bold text-foreground">{item.groups}</p>
                        <p className="text-xs text-muted-foreground">Grupos</p>
                      </div>
                      <div className="text-center p-3 bg-card rounded-lg border border-border">
                        <p className="text-xl font-bold text-foreground">{item.patents}</p>
                        <p className="text-xs text-muted-foreground">Patentes</p>
                      </div>
                      <div className="text-center p-3 bg-card rounded-lg border border-border">
                        <p className="text-xl font-bold text-foreground">{item.projects}</p>
                        <p className="text-xs text-muted-foreground">Projetos</p>
                      </div>
                    </div>

                    {/* Detailed Info Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Researchers */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Users className="w-4 h-4 text-primary" />
                          Pesquisadores
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-card rounded-lg border border-border">
                            <span className="text-sm text-muted-foreground">Total</span>
                            <span className="font-bold text-foreground">{item.details.researchers}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-card rounded-lg border border-border">
                            <span className="text-sm text-muted-foreground">Doutores</span>
                            <span className="font-bold text-foreground">{item.details.doctorates}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-card rounded-lg border border-border">
                            <span className="text-sm text-muted-foreground">Mestres</span>
                            <span className="font-bold text-foreground">{item.details.masters}</span>
                          </div>
                        </div>
                      </div>

                      {/* Production */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <BookOpen className="w-4 h-4 text-primary" />
                          Produção
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-card rounded-lg border border-border">
                            <span className="text-sm text-muted-foreground">Publicações</span>
                            <span className="font-bold text-foreground">{item.details.publications}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-card rounded-lg border border-border">
                            <span className="text-sm text-muted-foreground">Financiamento</span>
                            <span className="font-bold text-accent">R$ {item.details.fundingMM}M</span>
                          </div>
                        </div>
                      </div>

                      {/* TRL Distribution */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          Maturidade (TRL)
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-grow">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Básica (1-3)</span>
                                <span className="text-foreground">{item.details.trl.low}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary/60 rounded-full transition-all"
                                  style={{ width: `${(item.details.trl.low / item.groups) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-grow">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Aplicada (4-6)</span>
                                <span className="text-foreground">{item.details.trl.medium}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary/80 rounded-full transition-all"
                                  style={{ width: `${(item.details.trl.medium / item.groups) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-grow">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Madura (7-9)</span>
                                <span className="text-foreground">{item.details.trl.high}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-accent rounded-full transition-all"
                                  style={{ width: `${(item.details.trl.high / item.groups) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Partnerships & Areas */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Globe className="w-4 h-4 text-primary" />
                          Parcerias Internacionais
                        </div>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {item.details.partnerships.map((partner) => (
                            <span key={partner} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                              {partner}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Award className="w-4 h-4 text-accent" />
                          Áreas de Destaque
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.details.topAreas.map((area) => (
                            <span key={area} className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
                      <a 
                        href={item.details.links.lattes}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <GraduationCap className="w-4 h-4" />
                        Ver Grupos no CNPq
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href={item.details.links.patents}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Patentes no INPI
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mt-6 text-center">
          Clique em qualquer instituição para visualizar evidências e registros públicos.
        </p>
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

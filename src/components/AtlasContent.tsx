import { useState } from "react";
import { 
  Search, MapPin, Trophy, Network, Calculator, Building2, 
  Lightbulb, Users, FileText, Briefcase, 
  Target, Layers,
  Leaf, Cpu, Heart, Atom, Factory, ChevronDown, ExternalLink, Globe, GraduationCap, Award, TrendingUp, BookOpen,
  BarChart3
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CollaborationNetwork from "./CollaborationNetwork";

// ICT-Obj calculation function
const calculateICTObj = (groups: number, patents: number, projects: number, cooperation: number): number => {
  // Normalize values (max values for reference)
  const maxGroups = 50;
  const maxPatents = 30;
  const maxProjects = 15;
  const maxCoop = 10;
  
  const normalizedGroups = Math.min(groups / maxGroups, 1);
  const normalizedPatents = Math.min(patents / maxPatents, 1);
  const normalizedProjects = Math.min(projects / maxProjects, 1);
  const normalizedCoop = Math.min(cooperation / maxCoop, 1);
  
  // Apply ICT-Obj formula
  const score = (
    0.4 * normalizedGroups +
    0.3 * normalizedPatents +
    0.2 * normalizedProjects +
    0.1 * normalizedCoop
  ) * 100;
  
  return Math.round(score * 10) / 10;
};

// Extended mock data for ranking with details
const mockRankingData = [
  { 
    rank: 1, name: "USP", fullName: "Universidade de São Paulo", type: "Federal", state: "SP", 
    groups: 40, patents: 22, projects: 12, cooperation: 8,
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
    rank: 2, name: "Unicamp", fullName: "Universidade Estadual de Campinas", type: "Estadual", state: "SP", 
    groups: 30, patents: 18, projects: 10, cooperation: 7,
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
    rank: 3, name: "UFRJ", fullName: "Universidade Federal do Rio de Janeiro", type: "Federal", state: "RJ", 
    groups: 25, patents: 14, projects: 6, cooperation: 5,
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
    rank: 4, name: "Fiocruz", fullName: "Fundação Oswaldo Cruz", type: "ICT", state: "RJ", 
    groups: 20, patents: 9, projects: 8, cooperation: 6,
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
    rank: 5, name: "UFMG", fullName: "Universidade Federal de Minas Gerais", type: "Federal", state: "MG", 
    groups: 18, patents: 12, projects: 5, cooperation: 4,
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
    rank: 6, name: "UFSC", fullName: "Universidade Federal de Santa Catarina", type: "Federal", state: "SC", 
    groups: 15, patents: 8, projects: 7, cooperation: 5,
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
    rank: 7, name: "UFPR", fullName: "Universidade Federal do Paraná", type: "Federal", state: "PR", 
    groups: 12, patents: 5, projects: 4, cooperation: 3,
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
    rank: 8, name: "UFRGS", fullName: "Universidade Federal do Rio Grande do Sul", type: "Federal", state: "RS", 
    groups: 14, patents: 6, projects: 3, cooperation: 4,
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

// Regional data with universities
const regionalData = [
  { 
    region: 'Sudeste', 
    states: 'SP, RJ, MG, ES', 
    groups: 156, 
    patents: 89, 
    percentage: 58,
    universities: [
      { name: 'USP', state: 'SP', type: 'Federal', groups: 40, patents: 22, ictObj: 78.5 },
      { name: 'Unicamp', state: 'SP', type: 'Estadual', groups: 30, patents: 18, ictObj: 68.7 },
      { name: 'UFRJ', state: 'RJ', type: 'Federal', groups: 25, patents: 14, ictObj: 53.0 },
      { name: 'UFMG', state: 'MG', type: 'Federal', groups: 18, patents: 12, ictObj: 44.1 },
      { name: 'UNESP', state: 'SP', type: 'Estadual', groups: 15, patents: 8, ictObj: 35.3 },
      { name: 'UFSCar', state: 'SP', type: 'Federal', groups: 12, patents: 7, ictObj: 29.6 },
      { name: 'UFES', state: 'ES', type: 'Federal', groups: 8, patents: 4, ictObj: 18.9 },
      { name: 'UERJ', state: 'RJ', type: 'Estadual', groups: 8, patents: 4, ictObj: 18.5 },
    ]
  },
  { 
    region: 'Sul', 
    states: 'PR, SC, RS', 
    groups: 52, 
    patents: 28, 
    percentage: 19,
    universities: [
      { name: 'UFRGS', state: 'RS', type: 'Federal', groups: 14, patents: 6, ictObj: 31.5 },
      { name: 'UFSC', state: 'SC', type: 'Federal', groups: 15, patents: 8, ictObj: 35.7 },
      { name: 'UFPR', state: 'PR', type: 'Federal', groups: 12, patents: 5, ictObj: 26.3 },
      { name: 'UEM', state: 'PR', type: 'Estadual', groups: 6, patents: 4, ictObj: 16.8 },
      { name: 'UEL', state: 'PR', type: 'Estadual', groups: 5, patents: 5, ictObj: 17.2 },
    ]
  },
  { 
    region: 'Nordeste', 
    states: 'BA, PE, CE, outros', 
    groups: 34, 
    patents: 12, 
    percentage: 13,
    universities: [
      { name: 'UFPE', state: 'PE', type: 'Federal', groups: 10, patents: 4, ictObj: 21.3 },
      { name: 'UFBA', state: 'BA', type: 'Federal', groups: 8, patents: 3, ictObj: 16.7 },
      { name: 'UFC', state: 'CE', type: 'Federal', groups: 9, patents: 3, ictObj: 18.0 },
      { name: 'UFRN', state: 'RN', type: 'Federal', groups: 4, patents: 1, ictObj: 8.2 },
      { name: 'UFPB', state: 'PB', type: 'Federal', groups: 3, patents: 1, ictObj: 6.5 },
    ]
  },
  { 
    region: 'Centro-Oeste', 
    states: 'DF, GO, MT, MS', 
    groups: 18, 
    patents: 8, 
    percentage: 7,
    universities: [
      { name: 'UnB', state: 'DF', type: 'Federal', groups: 8, patents: 4, ictObj: 18.9 },
      { name: 'UFG', state: 'GO', type: 'Federal', groups: 5, patents: 2, ictObj: 11.0 },
      { name: 'UFMT', state: 'MT', type: 'Federal', groups: 3, patents: 1, ictObj: 6.3 },
      { name: 'UFMS', state: 'MS', type: 'Federal', groups: 2, patents: 1, ictObj: 5.0 },
    ]
  },
  { 
    region: 'Norte', 
    states: 'AM, PA, outros', 
    groups: 8, 
    patents: 3, 
    percentage: 3,
    universities: [
      { name: 'UFAM', state: 'AM', type: 'Federal', groups: 3, patents: 1, ictObj: 6.5 },
      { name: 'UFPA', state: 'PA', type: 'Federal', groups: 4, patents: 2, ictObj: 9.8 },
      { name: 'UFT', state: 'TO', type: 'Federal', groups: 1, patents: 0, ictObj: 1.6 },
    ]
  },
];

interface AtlasContentProps {
  initialQuery?: string;
}

const AtlasContent = ({ initialQuery = "" }: AtlasContentProps) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [expandedInstitutions, setExpandedInstitutions] = useState<number[]>([]);
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);

  const toggleInstitution = (rank: number) => {
    setExpandedInstitutions(prev => 
      prev.includes(rank) 
        ? prev.filter(r => r !== rank)
        : [...prev, rank]
    );
  };

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
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

      {/* Section 1 - Regional Distribution */}
      <div>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-primary-foreground" />
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

        {/* Regional Distribution Cards */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {hasSearched ? (
            <div className="p-6 space-y-4">
              {/* Region bars with expansion */}
              {regionalData.map((item, index) => (
                <Collapsible
                  key={item.region}
                  open={expandedRegions.includes(item.region)}
                  onOpenChange={() => toggleRegion(item.region)}
                >
                  <div className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                    <CollapsibleTrigger className="w-full">
                      <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                              expandedRegions.includes(item.region) ? 'rotate-180' : ''
                            }`} />
                            <span className="font-semibold text-foreground">{item.region}</span>
                            <span className="text-xs text-muted-foreground">({item.states})</span>
                            <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                              {item.universities.length} instituições
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground hidden sm:inline">
                              <strong className="text-foreground">{item.groups}</strong> grupos
                            </span>
                            <span className="text-muted-foreground hidden sm:inline">
                              <strong className="text-foreground">{item.patents}</strong> patentes
                            </span>
                            <span className="font-bold text-primary">{item.percentage}%</span>
                          </div>
                        </div>
                        <div className="h-6 bg-muted rounded-lg overflow-hidden">
                          <div 
                            className={`h-full rounded-lg transition-all duration-700 ease-out ${
                              expandedRegions.includes(item.region) 
                                ? 'bg-gradient-to-r from-accent to-accent/70' 
                                : 'bg-gradient-to-r from-primary to-primary/70'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-border bg-muted/20 p-4 animate-accordion-down">
                        {/* Universities table */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 pb-2 border-b border-border">
                            <div className="col-span-4">Instituição</div>
                            <div className="col-span-2 text-center">Estado</div>
                            <div className="col-span-2 text-center">Grupos</div>
                            <div className="col-span-2 text-center">Patentes</div>
                            <div className="col-span-2 text-center">ICT-Obj</div>
                          </div>
                          {item.universities.map((uni, uniIndex) => (
                            <div 
                              key={uni.name}
                              className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg hover:bg-card transition-colors"
                            >
                              <div className="col-span-4 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  uni.type === 'Federal' ? 'bg-primary' : 'bg-accent'
                                }`} />
                                <span className="font-medium text-foreground text-sm">{uni.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                  {uni.type}
                                </span>
                              </div>
                              <div className="col-span-2 text-center text-sm text-muted-foreground">{uni.state}</div>
                              <div className="col-span-2 text-center">
                                <span className="text-sm font-medium text-foreground">{uni.groups}</span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="text-sm font-medium text-foreground">{uni.patents}</span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                                  uni.ictObj >= 50 
                                    ? 'bg-accent/10 text-accent' 
                                    : uni.ictObj >= 25 
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-muted text-muted-foreground'
                                }`}>
                                  {uni.ictObj}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Regional summary */}
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Total da região: <strong className="text-foreground">{item.groups}</strong> grupos, <strong className="text-foreground">{item.patents}</strong> patentes
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Média ICT-Obj: <strong className="text-primary">
                              {(item.universities.reduce((acc, u) => acc + u.ictObj, 0) / item.universities.length).toFixed(1)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border mt-6">
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-3xl font-bold text-primary">268</p>
                  <p className="text-sm text-muted-foreground">Grupos Ativos</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-3xl font-bold text-primary">140</p>
                  <p className="text-sm text-muted-foreground">Patentes</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-3xl font-bold text-accent">27</p>
                  <p className="text-sm text-muted-foreground">Estados</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-3xl font-bold text-accent">89</p>
                  <p className="text-sm text-muted-foreground">Instituições</p>
                </div>
              </div>

              {/* Concentration alert */}
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Alta concentração detectada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    58% das capacidades concentradas no Sudeste. Oportunidade para políticas de descentralização e fortalecimento de polos regionais.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[16/9] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Pesquise um objeto tecnológico para visualizar a distribuição</p>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Fontes: CNPq (Diretório de Grupos de Pesquisa), Capes, INPI, Finep
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
                    <div className="hidden md:flex items-center gap-4">
                      <div className="text-center px-2">
                        <p className="text-sm font-bold text-foreground">{item.groups}</p>
                        <p className="text-[10px] text-muted-foreground">Grupos</p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-sm font-bold text-foreground">{item.patents}</p>
                        <p className="text-[10px] text-muted-foreground">Patentes</p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-sm font-bold text-foreground">{item.projects}</p>
                        <p className="text-[10px] text-muted-foreground">Projetos</p>
                      </div>
                      <div className="text-center px-2">
                        <p className="text-sm font-bold text-foreground">{item.cooperation}</p>
                        <p className="text-[10px] text-muted-foreground">Coop.</p>
                      </div>
                    </div>

                    {/* ICT-Obj Score */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden lg:block">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ICT-Obj</p>
                      </div>
                      <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg min-w-[70px]">
                        {calculateICTObj(item.groups, item.patents, item.projects, item.cooperation)}
                      </span>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                        expandedInstitutions.includes(item.rank) ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border bg-muted/20 p-6 animate-accordion-down">
                    {/* ICT-Obj Formula Breakdown */}
                    <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Calculator className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Cálculo do ICT-Obj</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Grupos</span>
                            <span className="text-xs font-bold text-primary">×0.4</span>
                          </div>
                          <p className="text-lg font-bold text-foreground">{item.groups}</p>
                          <p className="text-xs text-muted-foreground">= {(item.groups / 50 * 0.4 * 100).toFixed(1)} pts</p>
                        </div>
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Patentes</span>
                            <span className="text-xs font-bold text-primary">×0.3</span>
                          </div>
                          <p className="text-lg font-bold text-foreground">{item.patents}</p>
                          <p className="text-xs text-muted-foreground">= {(item.patents / 30 * 0.3 * 100).toFixed(1)} pts</p>
                        </div>
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Projetos</span>
                            <span className="text-xs font-bold text-accent">×0.2</span>
                          </div>
                          <p className="text-lg font-bold text-foreground">{item.projects}</p>
                          <p className="text-xs text-muted-foreground">= {(item.projects / 15 * 0.2 * 100).toFixed(1)} pts</p>
                        </div>
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Cooperação</span>
                            <span className="text-xs font-bold text-accent">×0.1</span>
                          </div>
                          <p className="text-lg font-bold text-foreground">{item.cooperation}</p>
                          <p className="text-xs text-muted-foreground">= {(item.cooperation / 10 * 0.1 * 100).toFixed(1)} pts</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Índice Total ICT-Obj</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {calculateICTObj(item.groups, item.patents, item.projects, item.cooperation)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Stats */}
                    <div className="grid grid-cols-4 gap-3 mb-6 md:hidden">
                      <div className="text-center p-2 bg-card rounded-lg border border-border">
                        <p className="text-lg font-bold text-foreground">{item.groups}</p>
                        <p className="text-[10px] text-muted-foreground">Grupos</p>
                      </div>
                      <div className="text-center p-2 bg-card rounded-lg border border-border">
                        <p className="text-lg font-bold text-foreground">{item.patents}</p>
                        <p className="text-[10px] text-muted-foreground">Patentes</p>
                      </div>
                      <div className="text-center p-2 bg-card rounded-lg border border-border">
                        <p className="text-lg font-bold text-foreground">{item.projects}</p>
                        <p className="text-[10px] text-muted-foreground">Projetos</p>
                      </div>
                      <div className="text-center p-2 bg-card rounded-lg border border-border">
                        <p className="text-lg font-bold text-foreground">{item.cooperation}</p>
                        <p className="text-[10px] text-muted-foreground">Coop.</p>
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

      {/* Section 3 - Collaboration Network */}
      <div>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Network className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-serif">
              Rede de Colaboração Interinstitucional
            </h3>
            <p className="text-muted-foreground">
              {hasSearched ? `Colaborações para: "${searchQuery}"` : "Relações entre universidades em projetos de pesquisa"}
            </p>
          </div>
        </div>

        {/* Interactive Collaboration Network */}
        <CollaborationNetwork hasSearched={hasSearched} />

        {/* Cluster Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
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
          Rede baseada em coautorias, projetos conjuntos e cooperações formais entre instituições.
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

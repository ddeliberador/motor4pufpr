import { Database, FileText, Landmark, BarChart3, GraduationCap, Building2, Zap, Globe } from "lucide-react";

const ICONS: Record<string, any> = {
  database: Database,
  file: FileText,
  government: Landmark,
  chart: BarChart3,
  scholarship: GraduationCap,
  building: Building2,
  energy: Zap,
  globe: Globe,
};

const DIMENSION_COLORS: Record<string, string> = {
  "científica": "bg-blue-500/10 text-blue-600",
  "tecnológica": "bg-purple-500/10 text-purple-600",
  "produtiva": "bg-emerald-500/10 text-emerald-600",
  "institucional": "bg-amber-500/10 text-amber-600",
};

const BASES = [
  // === CIENTÍFICA ===
  { id: "cnpq", name: "CNPq", description: "Diretório de Grupos de Pesquisa", icon: "database", url: "http://dgp.cnpq.br/", dimension: "científica" },
  { id: "capes", name: "CAPES", description: "Bolsas e programas de pós-graduação", icon: "scholarship", url: "https://dadosabertos.capes.gov.br/", dimension: "científica" },
  { id: "openalex", name: "OpenAlex", description: "Artigos científicos, autores e instituições globais", icon: "globe", url: "https://openalex.org/", dimension: "científica" },
  { id: "inep", name: "INEP", description: "Censo Escolar, ENEM, ENADE — instituições e cursos", icon: "scholarship", url: "http://portal.inep.gov.br/", dimension: "científica" },
  { id: "fnde", name: "FNDE", description: "Repasses educacionais por programa e região", icon: "scholarship", url: "https://www.fnde.gov.br/", dimension: "científica" },

  // === TECNOLÓGICA ===
  { id: "inpi", name: "INPI", description: "Patentes e classificação IPC/CPC", icon: "file", url: "https://busca.inpi.gov.br/", dimension: "tecnológica" },
  { id: "github", name: "GitHub", description: "Projetos open source e repositórios de código", icon: "database", url: "https://github.com/", dimension: "tecnológica" },

  // === PRODUTIVA ===
  { id: "ibge", name: "IBGE/SIDRA", description: "PIB, IPCA, PIM-PF, PMC, PNAD, Censo, POF, Geociências", icon: "chart", url: "https://sidra.ibge.gov.br/", dimension: "produtiva" },
  { id: "comexstat", name: "ComexStat", description: "Exportações e importações por NCM", icon: "chart", url: "https://comexstat.mdic.gov.br/", dimension: "produtiva" },
  { id: "ipeadata", name: "IPEAData", description: "Séries históricas de indicadores socioeconômicos", icon: "chart", url: "http://www.ipeadata.gov.br/", dimension: "produtiva" },
  { id: "brasilapi_cnpj", name: "CNPJ/Receita", description: "Empresas por CNAE, porte e região", icon: "building", url: "https://brasilapi.com.br/", dimension: "produtiva" },
  { id: "rais_caged", name: "RAIS/CAGED", description: "Emprego formal por setor, ocupação e salário", icon: "chart", url: "https://pdet.mte.gov.br/", dimension: "produtiva" },
  { id: "aneel", name: "ANEEL", description: "Geração distribuída, P&D regulado no setor elétrico", icon: "energy", url: "https://dadosabertos.aneel.gov.br/", dimension: "produtiva" },
  { id: "anp", name: "ANP", description: "Petróleo, gás, biocombustíveis e P&D obrigatório", icon: "energy", url: "https://dados.gov.br/", dimension: "produtiva" },
  { id: "bcb", name: "Banco Central", description: "Selic, câmbio, PTAX, crédito, reservas, IBC-Br", icon: "chart", url: "https://dadosabertos.bcb.gov.br/", dimension: "produtiva" },
  { id: "cvm", name: "CVM", description: "Companhias abertas, formulário referência, fundos", icon: "chart", url: "https://dados.cvm.gov.br/", dimension: "produtiva" },
  { id: "anatel", name: "ANATEL", description: "Telecomunicações, banda larga, infraestrutura digital", icon: "energy", url: "https://informacoes.anatel.gov.br/", dimension: "produtiva" },
  { id: "anvisa", name: "ANVISA", description: "Registro de medicamentos e produtos para saúde", icon: "file", url: "https://dados.gov.br/", dimension: "produtiva" },

  // === INSTITUCIONAL ===
  { id: "finep", name: "Finep", description: "Instrumentos e chamadas públicas de fomento", icon: "government", url: "https://www.finep.gov.br/", dimension: "institucional" },
  { id: "pncp", name: "ComprasNet/PNCP", description: "Licitações e contratações públicas federais", icon: "government", url: "https://pncp.gov.br/", dimension: "institucional" },
  { id: "transparencia", name: "Portal da Transparência", description: "Convênios, despesas, sanções (CEIS/CNEP/CEPIM)", icon: "government", url: "https://portaldatransparencia.gov.br/", dimension: "institucional" },
  { id: "siconfi", name: "Tesouro/SICONFI", description: "Finanças públicas de estados e municípios", icon: "chart", url: "https://siconfi.tesouro.gov.br/", dimension: "institucional" },
  { id: "dou", name: "DOU", description: "Diário Oficial da União — portarias, editais, chamadas", icon: "file", url: "https://www.in.gov.br/", dimension: "institucional" },
  { id: "querido_diario", name: "Querido Diário", description: "Diários oficiais municipais — editais locais", icon: "file", url: "https://queridodiario.ok.org.br/", dimension: "institucional" },
  { id: "dados_gov", name: "Portal Dados Abertos", description: "Catálogo central de datasets do governo federal", icon: "database", url: "https://dados.gov.br/", dimension: "institucional" },
  { id: "tcu", name: "TCU", description: "Auditorias e avaliação de políticas públicas de CT&I", icon: "government", url: "https://portal.tcu.gov.br/", dimension: "institucional" },
  { id: "ibama", name: "IBAMA", description: "Embargos ambientais, licenciamento, SINAFLOR", icon: "file", url: "https://dados.gov.br/", dimension: "institucional" },
  { id: "inpe_deter", name: "INPE DETER/PRODES", description: "Alertas de desmatamento e monitoramento ambiental", icon: "chart", url: "http://terrabrasilis.dpi.inpe.br/", dimension: "institucional" },
];

const DIMENSIONS = ["científica", "tecnológica", "produtiva", "institucional"];

export default function IntegratedBasesPanel() {
  return (
    <section className="section-spacing section-alt">
      <div className="container-wide">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
          Bases Públicas Integradas
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          {BASES.length} bases de dados públicas conectadas ao Motor 4P, organizadas pelas 4 dimensões de incidência.
        </p>

        {DIMENSIONS.map((dim) => {
          const dimBases = BASES.filter((b) => b.dimension === dim);
          return (
            <div key={dim} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${DIMENSION_COLORS[dim]}`}>
                  {dim}
                </span>
                <span className="text-xs text-muted-foreground">{dimBases.length} bases</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dimBases.map((base) => {
                  const Icon = ICONS[base.icon] || Database;
                  return (
                    <a
                      key={base.id}
                      href={base.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-institutional hover:shadow-lg transition-shadow p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground font-serif truncate">{base.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{base.description}</p>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

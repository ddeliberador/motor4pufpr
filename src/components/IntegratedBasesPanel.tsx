import { Database, FileText, Landmark, BarChart3, GraduationCap } from "lucide-react";

const ICONS: Record<string, any> = {
  database: Database,
  file: FileText,
  government: Landmark,
  chart: BarChart3,
  scholarship: GraduationCap,
};

const BASES = [
  {
    id: "cnpq",
    name: "CNPq",
    description: "Diretório de Grupos de Pesquisa",
    icon: "database",
    url: "http://dgp.cnpq.br/"
  },
  {
    id: "inpi",
    name: "INPI",
    description: "Patentes e classificação IPC/CPC",
    icon: "file",
    url: "https://busca.inpi.gov.br/"
  },
  {
    id: "finep",
    name: "Finep",
    description: "Instrumentos e chamadas públicas",
    icon: "government",
    url: "https://www.finep.gov.br/"
  },
  {
    id: "ibge",
    name: "IBGE/SIDRA",
    description: "Produção industrial, mercado de trabalho, indicadores econômicos",
    icon: "chart",
    url: "https://sidra.ibge.gov.br/"
  },
  {
    id: "capes",
    name: "CAPES",
    description: "Bolsas e programas de pós-graduação",
    icon: "scholarship",
    url: "https://dadosabertos.capes.gov.br/"
  }
];

export default function IntegratedBasesPanel() {
  return (
    <section className="section-spacing section-alt">
      <div className="container-wide">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
          Bases Públicas Integradas
        </h2>
        <div className="text-center text-primary font-bold mb-4">DEBUG: Painel está sendo renderizado</div>
        <div className="grid md:grid-cols-3 gap-8">
          {BASES.map((base) => {
            const Icon = ICONS[base.icon] || Database;
            return (
              <a
                key={base.id}
                href={base.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-institutional hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2 font-serif">{base.name}</h3>
                <p className="text-muted-foreground text-center">{base.description}</p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

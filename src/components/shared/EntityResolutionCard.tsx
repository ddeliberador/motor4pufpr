import { Link2, Database } from "lucide-react";

interface ResolvedInstitution {
  canonical: string;
  count: number;
}

interface EntityResolutionCardProps {
  resolvedInstitutions: Record<string, ResolvedInstitution>;
}

const EntityResolutionCard = ({ resolvedInstitutions }: EntityResolutionCardProps) => {
  const entries = Object.entries(resolvedInstitutions).sort((a, b) => b[1].count - a[1].count);
  if (entries.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" /> Entity Resolution — Instituições Cross-Base
      </h3>
      <p className="text-[10px] text-muted-foreground mb-3">
        Instituições identificadas em múltiplas bases públicas simultaneamente (OpenAlex × PNCP × CAPES × CNPJ).
      </p>
      <div className="space-y-2">
        {entries.map(([id, inst]) => (
          <div key={id} className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg">
            <Database className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{inst.canonical}</p>
              <p className="text-[10px] text-muted-foreground">Resolução: "{id}" — presente em múltiplas fontes</p>
            </div>
            <span className="text-sm font-bold text-primary flex-shrink-0">{inst.count}</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full flex-shrink-0">cross-base</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EntityResolutionCard;

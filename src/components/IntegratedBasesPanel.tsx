import { useEffect, useState } from "react";
import { Database, FileText, Landmark, BarChart3, GraduationCap } from "lucide-react";

const ICONS: Record<string, any> = {
  database: Database,
  file: FileText,
  government: Landmark,
  chart: BarChart3,
  scholarship: GraduationCap,
};

export type IntegratedBase = {
  id: string;
  name: string;
  description: string;
  icon: string;
  url?: string;
};

export default function IntegratedBasesPanel() {
  const [bases, setBases] = useState<IntegratedBase[]>([]);
  useEffect(() => {
    fetch("/api/v1/integrated-bases")
      .then((res) => res.json())
      .then((data) => setBases(data.bases || []));
  }, []);

  return (
    <section className="section-spacing section-alt">
      <div className="container-wide">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
          Bases Públicas Integradas
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {bases.map((base) => {
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

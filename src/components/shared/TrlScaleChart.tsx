/**
 * Gráfico de escala TRL (Technology Readiness Level, NASA 1-9)
 * Mostra o nível estimado do objeto pesquisado dentro das 3 fases.
 */
interface TrlScaleChartProps {
  level: number;
  label?: string;
  compact?: boolean;
}

const TRL_LEVELS: Array<{ n: number; title: string; phase: 0 | 1 | 2 }> = [
  { n: 1, title: "Princípios básicos observados e relatados", phase: 0 },
  { n: 2, title: "Conceito tecnológico formulado", phase: 0 },
  { n: 3, title: "Prova de conceito experimental ou analítica", phase: 0 },
  { n: 4, title: "Validação de componentes em laboratório", phase: 1 },
  { n: 5, title: "Validação de protótipo em ambiente relevante", phase: 1 },
  { n: 6, title: "Protótipo demonstrado em ambiente operacional relevante", phase: 1 },
  { n: 7, title: "Demonstração de protótipo em ambiente real", phase: 2 },
  { n: 8, title: "Sistema completo, qualificado e testado", phase: 2 },
  { n: 9, title: "Sistema comprovado em operação plena no mercado", phase: 2 },
];

const PHASES = [
  { name: "Pesquisa e Conceito", range: "TRL 1–3" },
  { name: "Desenvolvimento e Prototipagem", range: "TRL 4–6" },
  { name: "Demonstração e Mercado", range: "TRL 7–9" },
];

export function TrlScaleChart({ level, label, compact = false }: TrlScaleChartProps) {
  const current = Math.min(9, Math.max(0, Math.round(level || 0)));

  return (
    <div className="space-y-4">
      {/* Barra de degraus */}
      <div className="flex items-end gap-1">
        {TRL_LEVELS.map((l) => {
          const reached = l.n <= current;
          const isCurrent = l.n === current;
          const height = 24 + l.n * 6;
          return (
            <div key={l.n} className="flex-1 flex flex-col items-center gap-1" title={`TRL ${l.n} — ${l.title}`}>
              <span className={`text-[10px] font-semibold ${isCurrent ? "text-foreground" : "text-transparent"}`}>
                atual
              </span>
              <div
                style={{ height }}
                className={`w-full rounded-t-md transition-all ${
                  isCurrent
                    ? "bg-primary ring-2 ring-primary/40"
                    : reached
                      ? l.phase === 0
                        ? "bg-amber-500/70"
                        : l.phase === 1
                          ? "bg-sky-500/70"
                          : "bg-emerald-500/70"
                      : "bg-muted"
                }`}
              />
              <span className={`text-[10px] ${isCurrent ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {l.n}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fases */}
      <div className="grid grid-cols-3 gap-2">
        {PHASES.map((p, i) => {
          const active = current >= i * 3 + 1;
          return (
            <div
              key={p.name}
              className={`rounded-lg border px-2 py-1.5 text-center ${
                active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
              }`}
            >
              <p className="text-[10px] font-semibold text-foreground leading-tight">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">{p.range}</p>
            </div>
          );
        })}
      </div>

      {/* Nível atual */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold text-foreground">
          TRL {current}/9 — {TRL_LEVELS[current - 1]?.title || "Sem dados suficientes"}
        </p>
        {label && <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>}
      </div>

      {!compact && (
        <ol className="space-y-1">
          {TRL_LEVELS.map((l) => (
            <li
              key={l.n}
              className={`flex gap-2 text-[11px] ${
                l.n === current ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              <span className="w-10 flex-shrink-0 tabular-nums">TRL {l.n}</span>
              <span>{l.title}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[10px] text-muted-foreground">
        Escala TRL (Technology Readiness Level) — metodologia NASA, adotada pela Finep, Embrapii e Horizon Europe.
      </p>
    </div>
  );
}

export default TrlScaleChart;

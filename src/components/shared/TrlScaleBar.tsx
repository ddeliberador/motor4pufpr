/**
 * Escala visual TRL 1–9 com faixas (Pesquisa Básica, Desenvolvimento, Mercado).
 * Usa dado real do EPO OPS quando disponível; caso contrário, estimativa por sinais.
 */
interface TrlScaleBarProps {
  trlData?: { estimate?: number; label?: string; rationale?: string; confidence?: string } | null;
  fallback?: number | null;
}

const FAIXAS = [
  { range: [1, 3], label: "Pesquisa Básica", color: "#6366f1" },
  { range: [4, 6], label: "Desenvolvimento", color: "#f59e0b" },
  { range: [7, 9], label: "Mercado", color: "#22c55e" },
];

export default function TrlScaleBar({ trlData, fallback }: TrlScaleBarProps) {
  const trl = trlData?.estimate ?? fallback ?? null;
  if (!trl) return null;

  const faixa = FAIXAS.find((f) => trl >= f.range[0] && trl <= f.range[1]) || FAIXAS[0];

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono text-primary uppercase tracking-wider">
          TRL — {trlData ? "dado real via EPO OPS" : "estimado por sinais"}
        </p>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {trlData?.confidence === "high" ? "confiança alta" : trlData?.confidence === "medium" ? "estimado" : "baixa confiança"}
        </span>
      </div>

      <div className="flex gap-1 mb-3">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
          const isActive = n === trl;
          const isPast = n < trl;
          const f = FAIXAS.find((f) => n >= f.range[0] && n <= f.range[1])!;
          return (
            <div key={n} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded"
                style={{
                  height: isActive ? 28 : isPast ? 20 : 12,
                  backgroundColor: isActive ? f.color : isPast ? f.color + "60" : "#1e293b",
                  border: isActive ? `2px solid ${f.color}` : "none",
                  transition: "all 0.2s",
                }}
              />
              <span style={{ fontSize: 8, color: isActive ? f.color : "#475569", fontWeight: isActive ? 700 : 400 }}>
                {n}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mb-3">
        {FAIXAS.map((f) => (
          <div key={f.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
            <span className="text-[9px] text-muted-foreground">{f.label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border/30">
        <span className="text-3xl font-bold font-mono" style={{ color: faixa.color }}>
          {trl}<span className="text-base font-normal text-muted-foreground">/9</span>
        </span>
        <div>
          <p className="text-xs font-medium text-foreground">{trlData?.label || faixa.label}</p>
          {trlData?.rationale && <p className="text-[10px] text-muted-foreground mt-0.5">{trlData.rationale}</p>}
        </div>
      </div>
    </div>
  );
}

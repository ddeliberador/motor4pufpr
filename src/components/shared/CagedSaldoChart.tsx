/**
 * Gráfico de linha inline: saldo mensal do CAGED (últimos 12 meses).
 */
interface CagedSaldoChartProps {
  serie: Array<{ data: string; valor: number }>;
  gradientId?: string;
}

export default function CagedSaldoChart({ serie, gradientId = "cagedGrad" }: CagedSaldoChartProps) {
  if (!serie || serie.length < 2) return null;

  const vals = serie.map((s) => s.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 560, H = 80, PAD = 8;
  const pts = serie.map((s, i) => {
    const x = PAD + (i / (serie.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (s.valor - min) / range) * (H - PAD * 2);
    return { x, y, valor: s.valor, mes: s.data };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const zeroY = PAD + (1 - (0 - min) / range) * (H - PAD * 2);

  return (
    <div className="bg-muted/20 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Saldo mensal — últimos 12 meses</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="currentColor" strokeWidth="0.5" className="text-border" strokeDasharray="3 3" />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon
          points={`${pts[0].x},${zeroY} ${polyline} ${pts[pts.length - 1].x},${zeroY}`}
          fill={`url(#${gradientId})`}
        />
        <polyline points={polyline} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill={p.valor >= 0 ? "#22c55e" : "#ef4444"} stroke="none" />
        ))}
        <text x={pts[0].x} y={H - 1} textAnchor="middle" fontSize="6" fill="#64748b">{pts[0].mes}</text>
        <text x={pts[pts.length - 1].x} y={H - 1} textAnchor="middle" fontSize="6" fill="#64748b">{pts[pts.length - 1].mes}</text>
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-red-400">mín: {min.toLocaleString("pt-BR")}</span>
        <span className="text-[9px] text-emerald-400">máx: {max.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

import { History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { HistoricoPoint } from "@/hooks/useMotorSearch";

interface Props {
  historico?: HistoricoPoint[] | null;
}

const SERIES = [
  { key: "gt", label: "GT — Gap de Tradução", color: "hsl(var(--primary))" },
  { key: "cd", label: "CD — Concentração", color: "hsl(var(--chart-2, 173 58% 39%))" },
  { key: "aue", label: "AUE — Articulação U-E", color: "hsl(var(--chart-3, 43 74% 66%))" },
  { key: "ei", label: "EI — Exposição Internacional", color: "hsl(var(--chart-4, 27 87% 67%))" },
] as const;

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function IndicesHistoryChart({ historico }: Props) {
  const points = Array.isArray(historico) ? historico : [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <History className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Evolução dos índices ao longo do tempo</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Cada ponto é uma busca anterior deste mesmo tema registrada pelo Motor da Inovação.
      </p>

      {points.length < 2 ? (
        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
          Esta é a primeira vez que este tema é registrado — a evolução aparecerá em buscas futuras.
        </p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points.map((p) => ({ ...p, label: fmtDate(p.data) }))} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(l) => `Busca em ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {SERIES.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

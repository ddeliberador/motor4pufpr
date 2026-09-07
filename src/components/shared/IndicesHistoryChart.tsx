import { History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { HistoricoPoint } from "@/hooks/useMotorSearch";

interface Props {
  historico?: HistoricoPoint[] | null;
}

const SERIES = [
  { key: "gt", label: "GT", full: "Gap de Tradução", color: "hsl(var(--primary))" },
  { key: "cd", label: "CD", full: "Concentração", color: "hsl(var(--chart-2, 173 58% 39%))" },
  { key: "aue", label: "AUE", full: "Articulação U-E", color: "hsl(var(--chart-3, 43 74% 66%))" },
  { key: "ei", label: "EI", full: "Exposição Internacional", color: "hsl(var(--chart-4, 27 87% 67%))" },
] as const;

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function IndicesHistoryChart({ historico }: Props) {
  const all = Array.isArray(historico) ? historico : [];
  const points = all.slice(-12);

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <h3 className="text-xs font-semibold text-foreground">Evolução dos índices</h3>
          <span className="text-[11px] text-muted-foreground truncate">
            · mesmo tema e mesma localidade
          </span>
        </div>
        <div className="flex items-center gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {points.length < 2 ? (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          Primeira vez que este tema é registrado nesta localidade — a evolução aparecerá nas próximas buscas.
        </p>
      ) : (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points.map((p) => ({ ...p, label: fmtDate(p.data) }))}
              margin={{ top: 4, right: 8, left: -24, bottom: -4 }}
            >
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                width={34}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(l) => `Busca em ${l}`}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={`${s.label} — ${s.full}`}
                  stroke={s.color}
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { ChartRow, ChartType } from "@/lib/bi/datasets";

const PALETA = [
  "hsl(var(--primary))", "#0f766e", "#b45309", "#1d4ed8", "#7c2d12",
  "#166534", "#6b21a8", "#9f1239", "#0e7490", "#4d7c0f",
];

const eixo = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

export function ChartRenderer({
  tipo, dados, metricName, altura = 320,
}: { tipo: ChartType; dados: ChartRow[]; metricName: string; altura?: number }) {
  if (dados.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: altura }}>
        Nenhum resultado para esta consulta.
      </div>
    );
  }

  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 6,
        fontSize: 12,
      }}
      formatter={(v: number) => [v.toLocaleString("pt-BR"), metricName]}
    />
  );

  return (
    <ResponsiveContainer width="100%" height={altura}>
      {tipo === "pie" ? (
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="label" outerRadius="75%" label={false}>
            {dados.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
          </Pie>
          {tooltip}
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      ) : tipo === "line" ? (
        <LineChart data={dados} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={eixo} interval="preserveStartEnd" />
          <YAxis tick={eixo} />
          {tooltip}
          <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name={metricName} />
        </LineChart>
      ) : tipo === "area" ? (
        <AreaChart data={dados} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={eixo} interval="preserveStartEnd" />
          <YAxis tick={eixo} />
          {tooltip}
          <Area type="monotone" dataKey="valor" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} name={metricName} />
        </AreaChart>
      ) : tipo === "bar_horizontal" ? (
        <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={eixo} />
          <YAxis type="category" dataKey="label" tick={eixo} width={140} />
          {tooltip}
          <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} name={metricName} />
        </BarChart>
      ) : (
        <BarChart data={dados} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={eixo} interval={0} angle={dados.length > 12 ? -45 : 0} textAnchor={dados.length > 12 ? "end" : "middle"} height={dados.length > 12 ? 70 : 30} />
          <YAxis tick={eixo} />
          {tooltip}
          <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name={metricName} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

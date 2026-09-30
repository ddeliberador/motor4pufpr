import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { PaineisPublicados } from "@/components/bi/PaineisPublicados";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ── Tipos ──────────────────────────────────────────────────────
interface ContUF    { uf: string; total: number }
interface ContTipo  { tipo: string; total: number }
interface ContMun   { municipio: string; uf: string; total: number }
interface Totais    { atores: number; comCoord: number; ufs: number; municipios: number }

const CORES_PIE = [
  "#34d399","#60a5fa","#f472b6","#a78bfa","#fb923c",
  "#facc15","#2dd4bf","#f97316","#818cf8","#e879f9",
  "#94a3b8","#22d3ee","#4ade80","#fbbf24",
];

// ── Componente principal ───────────────────────────────────────
export default function Analise() {
  const [porUF,    setPorUF]    = useState<ContUF[]>([]);
  const [porTipo,  setPorTipo]  = useState<ContTipo[]>([]);
  const [porMun,   setPorMun]   = useState<ContMun[]>([]);
  const [totais,   setTotais]   = useState<Totais | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [filtroUF, setFiltroUF] = useState<string>("");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        // 1. Total geral
        const { count: total }    = await supabase.from("research_locations").select("*", { count: "exact", head: true });
        const { count: comCoord } = await supabase.from("research_locations").select("*", { count: "exact", head: true }).not("latitude", "is", null);

        // 2. Por UF
        const { data: ufData } = await supabase
          .from("research_locations")
          .select("uf")
          .not("uf", "is", null);
        const contUF: Record<string, number> = {};
        (ufData || []).forEach(r => { contUF[r.uf!] = (contUF[r.uf!] || 0) + 1; });
        const ufArr = Object.entries(contUF)
          .map(([uf, total]) => ({ uf, total }))
          .sort((a, b) => a.total - b.total);

        // 3. Por tipo
        const { data: tipoData } = await supabase
          .from("research_locations")
          .select("tipo")
          .not("tipo", "is", null);
        const contTipo: Record<string, number> = {};
        (tipoData || []).forEach(r => { contTipo[r.tipo!] = (contTipo[r.tipo!] || 0) + 1; });
        const tipoArr = Object.entries(contTipo)
          .map(([tipo, total]) => ({ tipo, total }))
          .sort((a, b) => b.total - a.total);

        // 4. Por município (top 20)
        const { data: munData } = await supabase
          .from("research_locations")
          .select("municipio, uf")
          .not("municipio", "is", null);
        const contMun: Record<string, { municipio: string; uf: string; total: number }> = {};
        (munData || []).forEach(r => {
          const k = `${r.municipio}/${r.uf}`;
          if (!contMun[k]) contMun[k] = { municipio: r.municipio!, uf: r.uf!, total: 0 };
          contMun[k].total++;
        });
        const munArr = Object.values(contMun)
          .sort((a, b) => b.total - a.total)
          .slice(0, 20);

        setPorUF(ufArr);
        setPorTipo(tipoArr);
        setPorMun(munArr);
        setTotais({
          atores: total || 0,
          comCoord: comCoord || 0,
          ufs: ufArr.length,
          municipios: Object.keys(contMun).length,
        });
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  // Filtro por UF
  const ufFiltradas = useMemo(() =>
    filtroUF ? porUF.filter(r => r.uf === filtroUF) : porUF,
    [porUF, filtroUF]
  );

  const munFiltradas = useMemo(() =>
    filtroUF ? porMun.filter(r => r.uf === filtroUF) : porMun,
    [porMun, filtroUF]
  );

  if (loading) return (
    <div className="flex h-full min-h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Carregando análise do SNI…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-background pt-24 pb-8">
      <Header />
      <div className="p-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análise do SNI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema Nacional de Inovação Brasileiro · Motor da Inovação · UFPR/PPGPP
          </p>
        </div>
        <select
          value={filtroUF}
          onChange={e => setFiltroUF(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">Todos os estados</option>
          {porUF.map(r => (
            <option key={r.uf} value={r.uf}>{r.uf}</option>
          ))}
        </select>
      </div>

      {/* Big Numbers */}
      {totais && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Atores mapeados", valor: totais.atores.toLocaleString("pt-BR"), cor: "text-primary" },
            { label: "Com coordenada real", valor: totais.comCoord.toLocaleString("pt-BR"), cor: "text-green-400" },
            { label: "Estados cobertos", valor: String(totais.ufs), cor: "text-blue-400" },
            { label: "Municípios", valor: totais.municipios.toLocaleString("pt-BR"), cor: "text-orange-400" },
          ].map(m => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-4">
              <p className={`text-3xl font-bold ${m.cor}`}>{m.valor}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico 1 — Atores por UF */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Atores por Estado (UF)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={ufFiltradas} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="uf" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v.toLocaleString("pt-BR"), "Atores"]}
            />
            <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos 2 e 3 — lado a lado */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Pie — por tipo */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Tipo</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={porTipo}
                dataKey="total"
                nameKey="tipo"
                cx="50%"
                cy="50%"
                outerRadius={90}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ tipo, percent }: any) =>
                  percent > 0.03 ? `${String(tipo).split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""
                }
                labelLine={false}
              >
                {porTipo.map((_, i) => (
                  <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v.toLocaleString("pt-BR"), "Atores"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar — top 20 municípios */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {filtroUF ? `Municípios — ${filtroUF}` : "Top 20 Municípios"}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={munFiltradas}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 60, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                type="category"
                dataKey="municipio"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                width={56}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v.toLocaleString("pt-BR"), "Atores"]}
              />
              <Bar dataKey="total" fill="#34d399" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Painéis montados no construtor e publicados */}
      <PaineisPublicados />

      {/* Rodapé */}
      <p className="text-center text-[11px] text-muted-foreground pb-4">
        Fonte: Motor da Inovação · OpenAlex · ABStartups · EMBRAPII · OTD/CGEE · FORMICT · SINAPAD · UFPR/PPGPP · {new Date().getFullYear()}
      </p>
      </div>
    </div>
  );
}

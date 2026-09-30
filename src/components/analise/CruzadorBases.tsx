import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis,
} from "recharts";

// ── Catálogo de bases e suas métricas disponíveis ─────────────
const BASES = [
  {
    id: "sni-todos",
    label: "SNI — Todos os atores",
    layer: "SNI",
    cor: "#818cf8",
    metricas: [
      { id: "contagem", label: "Contagem de atores", unidade: "atores" },
    ],
  },
  {
    id: "sni-universidades",
    label: "SNI — Universidades / ICTs",
    layer: "SNI",
    cor: "#34d399",
    metricas: [
      { id: "contagem", label: "Contagem", unidade: "instituições" },
    ],
  },
  {
    id: "sni-startups",
    label: "SNI — Startups",
    layer: "SNI",
    cor: "#f472b6",
    metricas: [
      { id: "contagem", label: "Contagem", unidade: "startups" },
    ],
  },
  {
    id: "sni-embrapii",
    label: "SNI — Unidades EMBRAPII",
    layer: "SNI",
    cor: "#a78bfa",
    metricas: [
      { id: "contagem", label: "Contagem", unidade: "unidades" },
    ],
  },
  {
    id: "backhaul",
    label: "L2 — Backhaul / Conectividade",
    layer: "L2",
    cor: "#fb923c",
    metricas: [
      { id: "pct_com", label: "% municípios com backhaul", unidade: "%" },
      { id: "total_com", label: "Municípios com backhaul", unidade: "municípios" },
      { id: "total_sem", label: "Municípios sem backhaul", unidade: "municípios" },
    ],
  },
] as const;

type BaseId = typeof BASES[number]["id"];
type Eixo = "uf" | "municipio";

interface PontoCruz {
  eixo: string;   // UF ou município
  valorA: number;
  valorB: number;
  quadrante?: 1 | 2 | 3 | 4;
}

interface Props { filtroUF: string }

const COR_Q = (q: number) =>
  q === 1 ? "#34d399" : q === 2 ? "#f97316" : q === 3 ? "#60a5fa" : "#94a3b8";

const LABEL_Q = (q: number) =>
  q === 1 ? "Alto/Alto" : q === 2 ? "Alto A / Baixo B ⚠" :
  q === 3 ? "Baixo A / Alto B" : "Baixo/Baixo";

export default function CruzadorBases({ filtroUF }: Props) {
  const [baseA, setBaseA] = useState<BaseId>("sni-todos");
  const [baseB, setBaseB] = useState<BaseId>("backhaul");
  const [metricaA, setMetricaA] = useState("contagem");
  const [metricaB, setMetricaB] = useState("pct_com");
  const [eixo] = useState<Eixo>("uf");
  const [modo, setModo] = useState<"barras" | "dispersao">("barras");
  const [dados, setDados] = useState<PontoCruz[]>([]);
  const [carregando, setCarregando] = useState(false);

  const cfgA = BASES.find(b => b.id === baseA)!;
  const cfgB = BASES.find(b => b.id === baseB)!;
  const lblA = cfgA.metricas.find(m => m.id === metricaA)?.label ?? metricaA;
  const lblB = cfgB.metricas.find(m => m.id === metricaB)?.label ?? metricaB;
  const unidA = cfgA.metricas.find(m => m.id === metricaA)?.unidade ?? "";
  const unidB = cfgB.metricas.find(m => m.id === metricaB)?.unidade ?? "";

  useEffect(() => {
    setCarregando(true);
    Promise.all([
      buscarBase(baseA, metricaA, eixo, filtroUF),
      buscarBase(baseB, metricaB, eixo, filtroUF),
    ]).then(([dadosA, dadosB]) => {
      const mapa: Record<string, { a?: number; b?: number }> = {};
      dadosA.forEach(r => { mapa[r.k] = { ...mapa[r.k], a: r.v }; });
      dadosB.forEach(r => { mapa[r.k] = { ...mapa[r.k], b: r.v }; });
      setDados(
        Object.entries(mapa)
          .map(([k, v]) => ({ eixo: k, valorA: v.a ?? 0, valorB: v.b ?? 0 }))
          .filter(d => d.valorA > 0 || d.valorB > 0)
          .sort((a, b) => b.valorA - a.valorA)
      );
    }).finally(() => setCarregando(false));
  }, [baseA, baseB, metricaA, metricaB, eixo, filtroUF]);

  // Quadrantes
  const mediaA = useMemo(() =>
    dados.length ? dados.reduce((s, d) => s + d.valorA, 0) / dados.length : 0, [dados]);
  const mediaB = useMemo(() =>
    dados.length ? dados.reduce((s, d) => s + d.valorB, 0) / dados.length : 0, [dados]);

  const dadosQ = useMemo(() => dados.map(d => ({
    ...d,
    quadrante: (d.valorA >= mediaA && d.valorB >= mediaB) ? 1
      : (d.valorA >= mediaA) ? 2
      : (d.valorB >= mediaB) ? 3
      : 4 as 1|2|3|4,
  })), [dados, mediaA, mediaB]);

  const gaps = dadosQ.filter(d => d.quadrante === 2);

  const isPercentB = unidB === "%";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="material-symbols-outlined text-xl text-primary"
          style={{ fontVariationSettings: '"FILL" 1' }}>join</span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cruzamento de Bases</h2>
          <p className="text-xs text-muted-foreground">
            Escolha duas bases e as métricas — o Motor faz o cruzamento por estado
          </p>
        </div>
        {filtroUF && (
          <span className="ml-auto rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            {filtroUF}
          </span>
        )}
      </div>

      {/* Seletores — Base A e Base B */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Base A */}
        <div className="space-y-3 rounded-xl border-2 p-4 bg-muted/10" style={{ borderColor: cfgA.cor }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: cfgA.cor }}>A</div>
              <p className="text-sm font-bold text-foreground">Base A</p>
            </div>
            <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: cfgA.cor + "20", color: cfgA.cor, borderColor: cfgA.cor + "40" }}>
              {cfgA.layer}
            </span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Base de dados</label>
            <select
              value={baseA}
              onChange={e => {
                const nova = e.target.value as BaseId;
                setBaseA(nova);
                setMetricaA(BASES.find(b => b.id === nova)!.metricas[0].id);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {BASES.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Métrica</label>
            <select
              value={metricaA}
              onChange={e => setMetricaA(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            >
              {cfgA.metricas.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <p className="text-[11px] font-medium" style={{ color: cfgA.cor }}>
            ● {lblA}
          </p>
        </div>

        {/* Base B */}
        <div className="space-y-3 rounded-xl border-2 p-4 bg-muted/10" style={{ borderColor: cfgB.cor }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: cfgB.cor }}>B</div>
              <p className="text-sm font-bold text-foreground">Base B</p>
            </div>
            <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: cfgB.cor + "20", color: cfgB.cor, borderColor: cfgB.cor + "40" }}>
              {cfgB.layer}
            </span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Base de dados</label>
            <select
              value={baseB}
              onChange={e => {
                const nova = e.target.value as BaseId;
                setBaseB(nova);
                setMetricaB(BASES.find(b => b.id === nova)!.metricas[0].id);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            >
              {BASES.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Métrica</label>
            <select
              value={metricaB}
              onChange={e => setMetricaB(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            >
              {cfgB.metricas.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <p className="text-[11px] font-medium" style={{ color: cfgB.cor }}>
            ● {lblB}
          </p>
        </div>
      </div>

      {/* Resumo do cruzamento + modo */}
      <div className="flex items-center gap-3 flex-wrap rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: cfgA.cor }}>A</span>
          <span className="text-xs font-medium truncate" style={{ color: cfgA.cor }}>{lblA}</span>
          <span className="text-xs text-muted-foreground shrink-0">×</span>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: cfgB.cor }}>B</span>
          <span className="text-xs font-medium truncate" style={{ color: cfgB.cor }}>{lblB}</span>
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">· por UF</span>
        </div>
        <div className="flex gap-1 shrink-0">
          {(["barras", "dispersao"] as const).map(m => (
            <button key={m} onClick={() => setModo(m)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                modo === m ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}>
              {m === "barras" ? "📊 Barras" : "⬡ Dispersão"}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="min-h-[320px] flex items-center justify-center">
        {carregando ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Cruzando {cfgA.label} × {cfgB.label}…</p>
          </div>
        ) : dados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível para este cruzamento.</p>
        ) : modo === "barras" ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={dadosQ}
              margin={{ top: 4, right: 24, left: 0, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="eixo" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={-45} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                label={{ value: lblA, angle: -90, position: "insideLeft", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="right" orientation="right"
                domain={isPercentB ? [0, 100] : undefined}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => isPercentB ? `${v}%` : v.toLocaleString("pt-BR")}
                label={{ value: lblB, angle: 90, position: "insideRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [
                  name === lblB && isPercentB ? `${v.toFixed(1)}%` : v.toLocaleString("pt-BR"),
                  name
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="valorA" name={lblA} fill={cfgA.cor} radius={[3,3,0,0]} opacity={0.85} />
              <Line yAxisId="right" type="monotone" dataKey="valorB" name={lblB}
                stroke={cfgB.cor} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full space-y-2">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="valorB" name={lblB}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  domain={isPercentB ? [0, 105] : undefined}
                  tickFormatter={(v: number) => isPercentB ? `${v}%` : String(v)}
                  label={{ value: lblB, position: "insideBottom", offset: -8, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="number" dataKey="valorA" name={lblA}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: lblA, angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <ZAxis range={[60, 60]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }: any) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload as PontoCruz & { quadrante: number };
                    return (
                      <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-1">
                        <p className="font-bold text-foreground">{d.eixo}</p>
                        <p style={{ color: cfgA.cor }}>{lblA}: <strong>{d.valorA.toLocaleString("pt-BR")} {unidA}</strong></p>
                        <p style={{ color: cfgB.cor }}>{lblB}: <strong>{isPercentB ? d.valorB.toFixed(1) + "%" : d.valorB.toLocaleString("pt-BR") + " " + unidB}</strong></p>
                        <p className="text-[10px] italic" style={{ color: COR_Q(d.quadrante) }}>{LABEL_Q(d.quadrante)}</p>
                      </div>
                    );
                  }} />
                <Scatter data={dadosQ} shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const q = (payload as any).quadrante as number;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={14} fill={COR_Q(q)} fillOpacity={0.2} stroke={COR_Q(q)} strokeWidth={1.5} />
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="bold" fill={COR_Q(q)}>
                        {payload.eixo}
                      </text>
                    </g>
                  );
                }} />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center">
              {[1,2,3,4].map(q => (
                <div key={q} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_Q(q) }} />
                  <span className="text-[10px] text-muted-foreground">{LABEL_Q(q)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insight automático */}
      {gaps.length > 0 && !carregando && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base leading-none text-orange-400"
              style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
            <p className="text-xs font-semibold text-orange-400">Gap detectado</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">{gaps.map(d => d.eixo).join(", ")}</strong>
            {" "}têm <span style={{ color: cfgA.cor }}>{lblA}</span> acima da média, mas{" "}
            <span style={{ color: cfgB.cor }}>{lblB}</span> abaixo da média.
          </p>
        </div>
      )}

      {!carregando && dados.length > 0 && (
        <p className="text-right text-[11px] text-muted-foreground">
          {dados.length} estados · {cfgA.label} × {cfgB.label}
        </p>
      )}
    </div>
  );
}

// ── Fetch genérico por base e métrica ─────────────────────────
async function buscarBase(
  baseId: BaseId,
  metricaId: string,
  eixo: Eixo,
  filtroUF: string
): Promise<{ k: string; v: number }[]> {

  // SNI — research_locations
  if (baseId.startsWith("sni-")) {
    const filtroTipo: Record<string, string | null> = {
      "sni-todos": null,
      "sni-universidades": "ICT|Universidade|Instituto",
      "sni-startups": "Startup",
      "sni-embrapii": "Embrapii|EMBRAPII",
    };
    let q = supabase.from("research_locations").select("uf, tipo").not("uf", "is", null);
    if (filtroUF) q = q.eq("uf", filtroUF);
    const { data } = await q;
    const ft = filtroTipo[baseId];
    const cont: Record<string, number> = {};
    (data || []).forEach(r => {
      if (!r.uf) return;
      if (ft && !new RegExp(ft, "i").test(r.tipo ?? "")) return;
      cont[r.uf] = (cont[r.uf] || 0) + 1;
    });
    return Object.entries(cont).map(([k, v]) => ({ k, v }));
  }

  // Backhaul — infra_backhaul_municipio
  if (baseId === "backhaul") {
    let q = supabase.from("infra_backhaul_municipio").select("uf, tem_backhaul").not("uf", "is", null);
    if (filtroUF) q = q.eq("uf", filtroUF);
    const { data } = await q;
    const agg: Record<string, { com: number; sem: number; total: number }> = {};
    (data || []).forEach(r => {
      if (!r.uf) return;
      if (!agg[r.uf]) agg[r.uf] = { com: 0, sem: 0, total: 0 };
      agg[r.uf].total++;
      if (r.tem_backhaul) agg[r.uf].com++; else agg[r.uf].sem++;
    });
    return Object.entries(agg).map(([k, v]) => ({
      k,
      v: metricaId === "pct_com" ? Math.round(100 * v.com / v.total)
        : metricaId === "total_com" ? v.com
        : v.sem,
    }));
  }

  return [];
}

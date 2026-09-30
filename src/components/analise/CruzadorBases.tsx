import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Scatter, ScatterChart,
  ZAxis,
} from "recharts";

// ── Definição dos cruzamentos disponíveis ──────────────────────
const CRUZAMENTOS = [
  {
    id: "atores-x-backhaul",
    titulo: "Atores SNI × Conectividade",
    descricao: "Estados com muita ciência mas pouca fibra óptica revelam onde a conectividade ainda é barreira para o SNI.",
    icone: "hub",
    corA: "#818cf8", labelA: "Atores SNI",
    corB: "#fb923c", labelB: "% municípios com backhaul",
    pergunta: "Onde há ciência SEM conectividade?",
  },
  {
    id: "ict-x-backhaul",
    titulo: "ICTs/Universidades × Backhaul",
    descricao: "Instituições de pesquisa dependem de alta conectividade. Estados com ICTs mas sem fibra têm capacidade represada.",
    icone: "school",
    corA: "#34d399", labelA: "ICTs + Universidades",
    corB: "#fb923c", labelB: "% municípios com backhaul",
    pergunta: "Onde as ICTs estão sem infraestrutura?",
  },
  {
    id: "startups-x-backhaul",
    titulo: "Startups × Conectividade",
    descricao: "Startups precisam de conexão para operar. O padrão revela onde o ecossistema de inovação está limitado pela infra.",
    icone: "rocket_launch",
    corA: "#f472b6", labelA: "Startups",
    corB: "#fb923c", labelB: "% municípios com backhaul",
    pergunta: "Onde as startups estão sem fibra?",
  },
  {
    id: "embrapii-x-backhaul",
    titulo: "EMBRAPII × Conectividade",
    descricao: "Unidades EMBRAPII são pontes entre ciência e indústria. Conectividade define o alcance de cada unidade.",
    icone: "precision_manufacturing",
    corA: "#a78bfa", labelA: "Unidades EMBRAPII",
    corB: "#fb923c", labelB: "% municípios com backhaul",
    pergunta: "Onde a EMBRAPII está isolada?",
  },
] as const;

type CruzId = typeof CRUZAMENTOS[number]["id"];

interface PontoUF {
  uf: string;
  valorA: number;  // atores/ICTs/startups
  valorB: number;  // % backhaul
  quadrante: 1 | 2 | 3 | 4; // 1=alto/alto 2=alto/baixo 3=baixo/alto 4=baixo/baixo
}

interface Props { filtroUF: string }

export default function CruzadorBases({ filtroUF }: Props) {
  const [cruzAtivo, setCruzAtivo] = useState<CruzId>("atores-x-backhaul");
  const [dados, setDados] = useState<PontoUF[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState<"barras" | "dispersao">("barras");

  const config = CRUZAMENTOS.find(c => c.id === cruzAtivo)!;

  useEffect(() => {
    setCarregando(true);
    carregarCruzamento(cruzAtivo, filtroUF)
      .then(setDados)
      .finally(() => setCarregando(false));
  }, [cruzAtivo, filtroUF]);

  // Médias para calcular quadrantes
  const mediaA = useMemo(() =>
    dados.length ? dados.reduce((s, d) => s + d.valorA, 0) / dados.length : 0,
    [dados]
  );
  const mediaB = useMemo(() =>
    dados.length ? dados.reduce((s, d) => s + d.valorB, 0) / dados.length : 0,
    [dados]
  );

  // Dados com quadrante calculado
  const dadosComQuadrante = useMemo(() =>
    dados.map(d => ({
      ...d,
      quadrante: (d.valorA >= mediaA && d.valorB >= mediaB) ? 1
        : (d.valorA >= mediaA && d.valorB < mediaB) ? 2
        : (d.valorA < mediaA && d.valorB >= mediaB) ? 3
        : 4 as 1 | 2 | 3 | 4,
    })),
    [dados, mediaA, mediaB]
  );

  // Destaque: quadrante 2 = alto em atores, baixo em backhaul (gap de infraestrutura)
  const destaque = dadosComQuadrante.filter(d => d.quadrante === 2);

  const corQuadrante = (q: number) =>
    q === 1 ? "#34d399" : q === 2 ? "#f97316" : q === 3 ? "#60a5fa" : "#94a3b8";

  const labelQuadrante = (q: number) =>
    q === 1 ? "Alto SNI + Alta conectividade" :
    q === 2 ? "Alto SNI + Baixa conectividade ⚠" :
    q === 3 ? "Baixo SNI + Alta conectividade" :
    "Baixo SNI + Baixa conectividade";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>
          join
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cruzamento de Bases</h2>
          <p className="text-xs text-muted-foreground">Duas layers comparadas por estado — revela padrões que uma base sozinha não mostra</p>
        </div>
        {filtroUF && (
          <span className="ml-auto rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            Filtrado: {filtroUF}
          </span>
        )}
      </div>

      {/* Seletor de cruzamento */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CRUZAMENTOS.map(c => (
          <button
            key={c.id}
            onClick={() => setCruzAtivo(c.id)}
            className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all ${
              cruzAtivo === c.id
                ? "border-primary bg-primary/10"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-base leading-none ${cruzAtivo === c.id ? "text-primary" : "text-muted-foreground"}`}
                style={{ fontVariationSettings: '"FILL" 1' }}>
                {c.icone}
              </span>
              <span className={`text-[11px] font-semibold ${cruzAtivo === c.id ? "text-primary" : "text-foreground"}`}>
                {c.titulo}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground italic leading-tight">{c.pergunta}</p>
          </button>
        ))}
      </div>

      {/* Descrição + modo */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="flex-1 text-xs text-muted-foreground">{config.descricao}</p>
        <div className="flex gap-1 shrink-0">
          {(["barras", "dispersao"] as const).map(m => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                modo === m ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {m === "barras" ? "Barras duplas" : "Dispersão"}
            </button>
          ))}
        </div>
      </div>

      {/* Área do gráfico */}
      <div className="min-h-[320px] flex items-center justify-center">
        {carregando ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Cruzando bases…</p>
          </div>
        ) : dados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
        ) : modo === "barras" ? (
          // ── Barras duplas por UF ──
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={[...dadosComQuadrante].sort((a, b) => b.valorA - a.valorA)}
              margin={{ top: 4, right: 16, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="uf"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                label={{ value: config.labelA, angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `${v}%`}
                label={{ value: "% backhaul", angle: 90, position: "insideRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [
                  name === config.labelB ? `${v.toFixed(1)}%` : v.toLocaleString("pt-BR"),
                  name
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="valorA" name={config.labelA} fill={config.corA} radius={[3, 3, 0, 0]} opacity={0.85} />
              <Line yAxisId="right" type="monotone" dataKey="valorB" name={config.labelB} stroke={config.corB} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          // ── Gráfico de dispersão por quadrante ──
          <div className="w-full space-y-2">
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="valorB"
                  name="% Backhaul"
                  domain={[0, 105]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: config.labelB, position: "insideBottom", offset: -4, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  type="number"
                  dataKey="valorA"
                  name={config.labelA}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: config.labelA, angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }: any) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload as PontoUF & { quadrante: number };
                    return (
                      <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-1">
                        <p className="font-bold text-foreground">{d.uf}</p>
                        <p style={{ color: config.corA }}>{config.labelA}: <strong>{d.valorA.toLocaleString("pt-BR")}</strong></p>
                        <p style={{ color: config.corB }}>{config.labelB}: <strong>{d.valorB.toFixed(1)}%</strong></p>
                        <p className="text-[10px] italic" style={{ color: corQuadrante(d.quadrante) }}>
                          {labelQuadrante(d.quadrante)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter data={dadosComQuadrante} shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  const q = payload.quadrante as number;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={14} fill={corQuadrante(q)} fillOpacity={0.2} stroke={corQuadrante(q)} strokeWidth={1.5} />
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="bold" fill={corQuadrante(q)}>
                        {payload.uf}
                      </text>
                    </g>
                  );
                }} />
              </ScatterChart>
            </ResponsiveContainer>
            {/* Legenda de quadrantes */}
            <div className="flex flex-wrap gap-3 justify-center">
              {[1,2,3,4].map(q => (
                <div key={q} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: corQuadrante(q) }} />
                  <span className="text-[10px] text-muted-foreground">{labelQuadrante(q)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insight automático — quadrante 2 (alto SNI, baixo backhaul) */}
      {destaque.length > 0 && !carregando && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base leading-none text-orange-400" style={{ fontVariationSettings: '"FILL" 1' }}>
              warning
            </span>
            <p className="text-xs font-semibold text-orange-400">Gap de infraestrutura detectado</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">{destaque.map(d => d.uf).join(", ")}</strong>{" "}
            {destaque.length > 1 ? "têm" : "tem"} alto volume de {config.labelA.toLowerCase()} acima da média,
            mas cobertura de backhaul abaixo da média nacional.
            Isso indica capacidade institucional represada por falta de conectividade —
            argumento direto para políticas como o FUST e o Norte Conectado.
          </p>
        </div>
      )}

      {/* Rodapé */}
      {!carregando && dados.length > 0 && (
        <p className="text-right text-[11px] text-muted-foreground">
          {dados.length} estados · cruzamento {config.labelA} × {config.labelB}
          {filtroUF ? ` · filtrado: ${filtroUF}` : ""}
        </p>
      )}
    </div>
  );
}

// ── Funções de fetch dos cruzamentos ──────────────────────────
async function carregarCruzamento(id: string, uf: string): Promise<PontoUF[]> {
  // 1. Buscar backhaul por UF (base B — sempre a mesma nos 4 cruzamentos)
  let qBH = supabase.from("infra_backhaul_municipio").select("uf, tem_backhaul").not("uf", "is", null);
  if (uf) qBH = qBH.eq("uf", uf);
  const { data: bhData } = await qBH;

  const backhaul: Record<string, { com: number; total: number }> = {};
  (bhData || []).forEach(r => {
    if (!backhaul[r.uf]) backhaul[r.uf] = { com: 0, total: 0 };
    backhaul[r.uf].total++;
    if (r.tem_backhaul) backhaul[r.uf].com++;
  });

  // 2. Buscar base A conforme o cruzamento
  let filtroTipo: string | null = null;
  if (id === "ict-x-backhaul") filtroTipo = "ICT|Universidade|Instituto";
  if (id === "startups-x-backhaul") filtroTipo = "Startup";
  if (id === "embrapii-x-backhaul") filtroTipo = "Embrapii|EMBRAPII";

  let qRL = supabase.from("research_locations").select("uf, tipo").not("uf", "is", null);
  if (uf) qRL = qRL.eq("uf", uf);
  const { data: rlData } = await qRL;

  const atores: Record<string, number> = {};
  (rlData || []).forEach(r => {
    if (!r.uf || !r.tipo) return;
    if (filtroTipo) {
      const regex = new RegExp(filtroTipo, "i");
      if (!regex.test(r.tipo)) return;
    }
    atores[r.uf] = (atores[r.uf] || 0) + 1;
  });

  // 3. Cruzar por UF
  const ufs = new Set([...Object.keys(backhaul), ...Object.keys(atores)]);
  return Array.from(ufs)
    .map(u => ({
      uf: u,
      valorA: atores[u] || 0,
      valorB: backhaul[u] ? Math.round(100 * backhaul[u].com / backhaul[u].total) : 0,
      quadrante: 1 as const,
    }))
    .filter(d => d.valorA > 0 || d.valorB > 0)
    .sort((a, b) => b.valorA - a.valorA);
}

import { fetchAll } from "@/lib/fetchAll";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// Tipos para políticas
interface Politica {
  id: string;
  nome: string;
  orgao: string;
  ano: string;
  status: string;
  investimento: string;
  investimento_publico_brl?: number;
  instrumento: string;
  conexao_mapa: string;
  link: string;
}
interface LayerPoliticas {
  layer: string;
  nome: string;
  cor: string;
  politicas: Politica[];
}
interface PoliticasJson {
  layers: LayerPoliticas[];
}


// Configuração de cada layer disponível
const LAYERS = [
  {
    id: "sni-tipo",
    label: "SNI — Atores por Tipo",
    layer: "SNI",
    cor: "#34d399",
    descricao: "Distribuição dos atores do SNI por categoria institucional",
    tipo: "pie",
  },
  {
    id: "sni-fonte",
    label: "SNI — Atores por Base",
    layer: "SNI",
    cor: "#60a5fa",
    descricao: "Origem dos dados: ABStartups, OpenAlex, EMBRAPII, OTD/CGEE...",
    tipo: "bar",
  },
  {
    id: "sni-uf",
    label: "SNI — Atores por UF",
    layer: "SNI",
    cor: "#818cf8",
    descricao: "Concentração de atores por estado da federação",
    tipo: "bar",
  },
  {
    id: "backhaul-uf",
    label: "L2 — Backhaul por UF",
    layer: "L2",
    cor: "#fb923c",
    descricao: "Municípios com e sem backhaul de fibra óptica por estado",
    tipo: "bar-stacked",
  },
  {
    id: "l1-realtime",
    label: "L1 — Energia (ANEEL)",
    layer: "L1",
    cor: "#f472b6",
    descricao: null, // dados em tempo real
    tipo: "realtime",
  },
  {
    id: "l3-realtime",
    label: "L3 — Datacenters (PeeringDB)",
    layer: "L3",
    cor: "#facc15",
    descricao: null,
    tipo: "realtime",
  },
];

const CORES = ["#34d399","#60a5fa","#f472b6","#a78bfa","#fb923c","#facc15","#2dd4bf","#f97316","#818cf8"];

const LABEL_LAYER: Record<string, string> = {
  SNI: "SNI", L1: "L1", L2: "L2", L3: "L3", L4: "L4", L5: "L5", L6: "L6", L7: "L7",
};

const COR_LAYER: Record<string, string> = {
  SNI: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  L1:  "bg-pink-500/15 text-pink-400 border-pink-500/30",
  L2:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  L3:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

interface Props { filtroUF: string }

export default function LayerChartBuilder({ filtroUF }: Props) {
  const [layerAtiva, setLayerAtiva] = useState("sni-tipo");
  const [dados, setDados] = useState<{ name: string; value: number; value2?: number }[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [politicasData, setPoliticasData] = useState<LayerPoliticas[]>([]);
  const [abaPolitica, setAbaPolitica] = useState<"investimento" | "timeline" | "lista">("investimento");

  useEffect(() => {
    fetch("/politicas-layers.json")
      .then(r => r.json())
      .then((d: PoliticasJson) => setPoliticasData(d.layers))
      .catch(console.error);
  }, []);


  const config = LAYERS.find(l => l.id === layerAtiva)!;

  useEffect(() => {
    if (config.tipo === "realtime") return;
    setCarregando(true);
    carregar(layerAtiva, filtroUF).then(setDados).finally(() => setCarregando(false));
  }, [layerAtiva, filtroUF, config.tipo]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Título */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>
          bar_chart
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Construtor de Gráficos por Layer</h2>
          <p className="text-xs text-muted-foreground">Escolha a camada para visualizar os dados por estado</p>
        </div>
        {filtroUF && (
          <span className="ml-auto rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            Filtrado: {filtroUF}
          </span>
        )}
      </div>

      {/* Seletor de layer */}
      <div className="flex flex-wrap gap-2">
        {LAYERS.map(l => (
          <button
            key={l.id}
            onClick={() => setLayerAtiva(l.id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              layerAtiva === l.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted"
            }`}
          >
            <span className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COR_LAYER[l.layer] || "bg-muted text-muted-foreground border-border"}`}>
              {LABEL_LAYER[l.layer]}
            </span>
            {l.label.replace(/^(SNI|L\d) — /, "")}
          </button>
        ))}
      </div>

      {/* Descrição */}
      {config.descricao && (
        <p className="text-xs text-muted-foreground">{config.descricao}</p>
      )}

      {/* Área do gráfico */}
      <div className="min-h-[300px] flex items-center justify-center">
        {config.tipo === "realtime" ? (
          <div className="text-center space-y-3 py-8">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/40" style={{ fontVariationSettings: '"FILL" 1' }}>
              {config.layer === "L1" ? "bolt" : "dns"}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{config.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dados carregados em tempo real via Edge Function
              </p>
              <a
                href="/mapa"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm leading-none" style={{ fontVariationSettings: '"FILL" 1' }}>map</span>
                Ver no Mapa
              </a>
            </div>
          </div>
        ) : carregando ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Carregando dados…</p>
          </div>
        ) : dados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível para este filtro.</p>
        ) : config.tipo === "pie" ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dados}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ name, percent }: any) =>
                  percent > 0.03 ? `${String(name).split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""
                }
                labelLine={false}
              >
                {dados.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v.toLocaleString("pt-BR"), "Atores"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : config.tipo === "bar-stacked" ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [v.toLocaleString("pt-BR"), name === "value" ? "Com backhaul" : "Sem backhaul"]}
              />
              <Legend
                formatter={(value) => value === "value" ? "Com backhaul" : "Sem backhaul"}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="value" fill="#fb923c" stackId="a" radius={[0, 0, 0, 0]} name="value" />
              <Bar dataKey="value2" fill="#d1d5db" stackId="a" radius={[3, 3, 0, 0]} name="value2" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={dados.length > 15 ? -45 : 0}
                textAnchor={dados.length > 15 ? "end" : "middle"}
                height={dados.length > 15 ? 60 : 30}
              />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v.toLocaleString("pt-BR"), "Total"]}
              />
              <Bar dataKey="value" fill={config.cor} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Relações Políticas por Layer ── */}
      {politicasData.length > 0 && (
        <div className="mt-6 space-y-4 border-t border-border pt-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="material-symbols-outlined text-xl text-violet-400" style={{ fontVariationSettings: '"FILL" 1' }}>
              policy
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Políticas Públicas por Layer de IA</h3>
              <p className="text-xs text-muted-foreground">
                {politicasData.reduce((s, l) => s + l.politicas.length, 0)} políticas curadas ·{" "}
                R$ {(politicasData.reduce((s, l) => s + l.politicas.reduce((ss, p) => ss + (p.investimento_publico_brl || 0), 0), 0) / 1e9).toFixed(1)} bi mapeados
              </p>
            </div>
            {/* Abas de visualização */}
            <div className="ml-auto flex gap-1">
              {(["investimento", "timeline", "lista"] as const).map(aba => (
                <button
                  key={aba}
                  onClick={() => setAbaPolitica(aba)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    abaPolitica === aba
                      ? "bg-violet-500/20 text-violet-400"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {aba === "investimento" ? "Investimentos" : aba === "timeline" ? "Linha do tempo" : "Lista"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Aba: Investimentos por layer (bar chart) ── */}
          {abaPolitica === "investimento" && (() => {
            const dadosPol = politicasData
              .filter(l => l.layer !== "SNI") // SNI sem investimento_publico_brl na maioria
              .map(l => ({
                layer: `${l.layer} — ${l.nome}`,
                total: l.politicas.reduce((s, p) => s + (p.investimento_publico_brl || 0), 0) / 1e9,
                cor: l.cor === "pink" ? "#f472b6" : l.cor === "orange" ? "#fb923c" : l.cor === "yellow" ? "#facc15" : l.cor === "violet" ? "#a78bfa" : "#34d399",
                npol: l.politicas.length,
              }))
              .sort((a, b) => b.total - a.total);
            return (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dadosPol} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="layer" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={v => `R$ ${v}bi`}
                    />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: number, _n: string, props: any) => [
                        `R$ ${v.toFixed(1)} bilhões (${props.payload.npol} políticas)`,
                        "Investimento público"
                      ]}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {dadosPol.map((d, i) => (
                        <Cell key={i} fill={d.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Cards de detalhe por política */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {politicasData.flatMap(l =>
                    l.politicas
                      .filter(p => (p.investimento_publico_brl || 0) > 0)
                      .sort((a, b) => (b.investimento_publico_brl || 0) - (a.investimento_publico_brl || 0))
                      .slice(0, 2)
                      .map(p => {
                        const corHex = l.cor === "pink" ? "#f472b6" : l.cor === "orange" ? "#fb923c" : l.cor === "yellow" ? "#facc15" : l.cor === "violet" ? "#a78bfa" : "#34d399";
                        return (
                          <a
                            key={p.id}
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/60 transition-colors"
                          >
                            <span
                              className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                              style={{ background: `${corHex}20`, color: corHex, border: `1px solid ${corHex}40` }}
                            >
                              {l.layer}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-foreground leading-tight truncate">{p.nome}</p>
                              <p className="text-[10px] text-green-400 font-semibold mt-0.5">{p.investimento}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 italic">{p.conexao_mapa}</p>
                            </div>
                          </a>
                        );
                      })
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Aba: Linha do tempo ── */}
          {abaPolitica === "timeline" && (() => {
            const todas = politicasData.flatMap(l =>
              l.politicas.map(p => ({
                ...p,
                layer: l.layer,
                corHex: l.cor === "pink" ? "#f472b6" : l.cor === "orange" ? "#fb923c" : l.cor === "yellow" ? "#facc15" : l.cor === "violet" ? "#a78bfa" : "#34d399",
              }))
            ).sort((a, b) => Number(a.ano) - Number(b.ano));

            return (
              <div className="relative pl-4 space-y-0">
                {/* Linha vertical */}
                <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                {todas.map((p, i) => (
                  <div key={p.id} className="relative flex gap-3 pb-4">
                    {/* Dot */}
                    <div
                      className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background"
                      style={{ backgroundColor: p.corHex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-muted-foreground">{p.ano}</span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                          style={{ background: `${p.corHex}20`, color: p.corHex, border: `1px solid ${p.corHex}40` }}
                        >
                          {p.layer}
                        </span>
                        <span className={`text-[10px] font-medium ${p.status.includes("tramitação") ? "text-yellow-400" : p.status.includes("Histórica") ? "text-gray-400" : "text-green-400"}`}>
                          ● {p.status.split("—")[0].trim()}
                        </span>
                      </div>
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {p.nome}
                      </a>
                      <p className="text-[10px] text-green-400 font-semibold">{p.investimento}</p>
                      <p className="text-[10px] text-muted-foreground">{p.orgao}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Aba: Lista completa ── */}
          {abaPolitica === "lista" && (
            <div className="space-y-3">
              {politicasData.map(l => {
                const corHex = l.cor === "pink" ? "#f472b6" : l.cor === "orange" ? "#fb923c" : l.cor === "yellow" ? "#facc15" : l.cor === "violet" ? "#a78bfa" : "#34d399";
                return (
                  <div key={l.layer}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{ background: `${corHex}20`, color: corHex, borderColor: `${corHex}40` }}
                      >
                        {l.layer}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{l.nome}</span>
                      <span className="text-[10px] text-muted-foreground">
                        R$ {(l.politicas.reduce((s, p) => s + (p.investimento_publico_brl || 0), 0) / 1e9).toFixed(1)} bi · {l.politicas.length} políticas
                      </span>
                    </div>
                    <div className="space-y-1.5 pl-4 border-l-2" style={{ borderColor: `${corHex}40` }}>
                      {l.politicas.map(p => (
                        <div key={p.id} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: corHex }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={p.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-medium text-foreground hover:text-primary"
                              >
                                {p.nome}
                              </a>
                              <span className={`text-[10px] ${p.status.includes("tramitação") ? "text-yellow-400" : p.status.includes("Histórica") ? "text-gray-400" : "text-green-400"}`}>
                                ● {p.status.split("—")[0].trim()}
                              </span>
                            </div>
                            <p className="text-[10px] text-green-400 font-semibold">{p.investimento}</p>
                            <p className="text-[10px] text-muted-foreground italic">{p.conexao_mapa}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Rodapé com total */}
      {dados.length > 0 && config.tipo !== "realtime" && (

        <p className="text-right text-[11px] text-muted-foreground">
          {dados.length} categorias · {dados.reduce((s, d) => s + d.value, 0).toLocaleString("pt-BR")} registros
          {filtroUF ? ` em ${filtroUF}` : " no Brasil"}
        </p>
      )}
    </div>
  );
}

// ── Funções de fetch por layer ─────────────────────────────────
async function carregar(
  layerId: string,
  uf: string
): Promise<{ name: string; value: number; value2?: number }[]> {

  if (layerId === "sni-tipo") {
    let q = supabase.from("research_locations").select("tipo").not("tipo", "is", null);
    if (uf) q = q.eq("uf", uf);
    const data = await fetchAll<any>(q);
    const cont: Record<string, number> = {};
    (data || []).forEach(r => { cont[r.tipo!] = (cont[r.tipo!] || 0) + 1; });
    return Object.entries(cont).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }

  if (layerId === "sni-fonte") {
    let q = supabase.from("research_locations").select("fonte").not("fonte", "is", null);
    if (uf) q = q.eq("uf", uf);
    const data = await fetchAll<any>(q);
    const cont: Record<string, number> = {};
    (data || []).forEach(r => { cont[r.fonte!] = (cont[r.fonte!] || 0) + 1; });
    return Object.entries(cont).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }

  if (layerId === "sni-uf") {
    let q = supabase.from("research_locations").select("uf").not("uf", "is", null);
    if (uf) q = q.eq("uf", uf);
    const data = await fetchAll<any>(q);
    const cont: Record<string, number> = {};
    (data || []).forEach(r => { cont[r.uf!] = (cont[r.uf!] || 0) + 1; });
    return Object.entries(cont).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }

  if (layerId === "backhaul-uf") {
    let q = supabase.from("infra_backhaul_municipio").select("uf, tem_backhaul").not("uf", "is", null);
    if (uf) q = q.eq("uf", uf);
    const data = await fetchAll<any>(q);
    const cont: Record<string, { com: number; sem: number }> = {};
    (data || []).forEach(r => {
      if (!cont[r.uf]) cont[r.uf] = { com: 0, sem: 0 };
      if (r.tem_backhaul) cont[r.uf].com++; else cont[r.uf].sem++;
    });
    return Object.entries(cont)
      .map(([name, v]) => ({ name, value: v.com, value2: v.sem }))
      .sort((a, b) => b.value - a.value);
  }

  return [];
}

import { fetchAll } from "@/lib/fetchAll";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

interface UFPonto { uf: string; ict: number; startups: number }
interface Ator { id: string; nome: string; tipo: string; municipio: string; uf: string }

interface GapTooltipItem {
  dataKey?: string;
  value?: number;
  color?: string;
  payload?: UFPonto;
}

const CORES_TIPO: Record<string, string> = {
  "Startup": "#f472b6", "ICT": "#60a5fa", "Universidade": "#34d399",
  "Instituto de Pesquisa": "#a78bfa", "Unidade Embrapii": "#fb923c",
  "Centro de Supercomputação": "#facc15", "Laboratório de Inovação": "#2dd4bf",
};

const CORES_PIE = ["#f472b6","#60a5fa","#34d399","#a78bfa","#fb923c","#facc15","#2dd4bf","#818cf8"];

function GapTooltip({ active, payload, label }: { active?: boolean; payload?: GapTooltipItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label} — clique para ver os atores</p>
      {payload.map(item => (
        <p key={item.dataKey} className="font-medium" style={{ color: item.color }}>
          {item.dataKey === "ict" ? "ICTs/Universidades" : "Startups"}: {Number(item.value || 0).toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
}

export default function Cenario2Capacidade() {
  const [porTipo, setPorTipo] = useState<{ tipo: string; total: number }[]>([]);
  const [gaps, setGaps] = useState<UFPonto[]>([]);
  const [totais, setTotais] = useState({ atores: 0, ict: 0, startups: 0, embrapii: 0 });
  const [carregando, setCarregando] = useState(true);
  const [drawerInfo, setDrawerInfo] = useState<{ uf: string; filtro: string; titulo: string } | null>(null);
  const [atoresDrawer, setAtoresDrawer] = useState<Ator[]>([]);
  const [carregandoDrawer, setCarregandoDrawer] = useState(false);

  useEffect(() => {
    fetchAll<{ uf: string | null; tipo: string | null }>(supabase.from("research_locations").select("uf, tipo").not("uf", "is", null))
      .then(data => {
        const rows = data || [];
        const ct: Record<string, number> = {};
        rows.forEach(r => { if (r.tipo) ct[r.tipo] = (ct[r.tipo] || 0) + 1; });
        setPorTipo(Object.entries(ct).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total).slice(0, 8));
        const ufMap: Record<string, { ict: number; startups: number }> = {};
        rows.forEach(r => {
          if (!r.uf) return;
          if (!ufMap[r.uf]) ufMap[r.uf] = { ict: 0, startups: 0 };
          if (/ICT|Universidade|Instituto/i.test(r.tipo || "")) ufMap[r.uf].ict++;
          if (/Startup/i.test(r.tipo || "")) ufMap[r.uf].startups++;
        });
        setGaps(Object.entries(ufMap).map(([uf, v]) => ({ uf, ...v })).filter(d => d.ict > 0).sort((a, b) => b.ict - a.ict).slice(0, 20));
        setTotais({
          atores: rows.length,
          ict: rows.filter(r => /ICT|Universidade|Instituto/i.test(r.tipo || "")).length,
          startups: rows.filter(r => /Startup/i.test(r.tipo || "")).length,
          embrapii: rows.filter(r => /Embrapii/i.test(r.tipo || "")).length,
        });
        setCarregando(false);
      });
  }, []);

  function abrirDrawer(uf: string, filtro: string, titulo: string) {
    setDrawerInfo({ uf, filtro, titulo });
    setCarregandoDrawer(true);
    let q = supabase.from("research_locations").select("id, nome, tipo, municipio, uf").limit(60);
    if (uf) q = q.eq("uf", uf);
    if (filtro === "ict") q = q.or("tipo.ilike.%ICT%,tipo.ilike.%Universidade%,tipo.ilike.%Instituto%");
    if (filtro === "startup") q = q.ilike("tipo", "%Startup%");
    q.then(({ data }) => { setAtoresDrawer(data || []); setCarregandoDrawer(false); });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>O Brasil tem tradição científica. Mas ciência que não vira produto não gera riqueza.</strong> O Gap de Tradução (GT) mede a distância entre o número de ICTs e universidades e o número de startups por estado. Estados com GT alto têm capacidade reprimida — o conhecimento existe, mas o elo de mercado está quebrado. <strong className="text-foreground">Clique em qualquer barra ou fatia do gráfico</strong> para ver os atores daquele segmento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: totais.atores.toLocaleString("pt-BR"), l: "Atores totais no SNI", cor: "#818cf8" },
          { v: totais.ict.toLocaleString("pt-BR"), l: "ICTs / Universidades / Institutos", cor: "#34d399" },
          { v: totais.startups.toLocaleString("pt-BR"), l: "Startups mapeadas", cor: "#f472b6" },
          { v: totais.embrapii.toLocaleString("pt-BR"), l: "Unidades EMBRAPII", cor: "#fb923c" },
        ].map(m => (
          <div key={m.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold" style={{ color: m.cor }}>{m.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Gap de Tradução — barras agrupadas por UF */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-foreground">ICTs vs. Startups por Estado — Gap de Tradução</h2>
          <p className="text-xs text-muted-foreground mt-0.5">A diferença entre as barras é o gap · <strong className="text-foreground">clique numa barra para ver os atores</strong></p>
        </div>
        {carregando ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gaps} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              onClick={d => {
                if (!d?.activePayload?.[0]) return;
                const uf = d.activePayload[0].payload.uf;
                const key = d.activePayload[0].dataKey as string;
                abrirDrawer(uf, key === "ict" ? "ict" : "startup", `${key === "ict" ? "ICTs/Universidades" : "Startups"} — ${uf}`);
              }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="uf" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<GapTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar dataKey="ict" name="ICTs/Universidades" fill="#34d399" radius={[3,3,0,0]} cursor="pointer" opacity={0.9} />
              <Bar dataKey="startups" name="Startups" fill="#f472b6" radius={[3,3,0,0]} cursor="pointer" opacity={0.9} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie — composição */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold text-foreground mb-1">Composição do SNI por tipo</h2>
        <p className="text-xs text-muted-foreground mb-4">Clique numa fatia para ver os atores daquele tipo</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={porTipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={90}
              label={({ tipo, percent }: any) => percent > 0.04 ? `${String(tipo).split(" ")[0]} ${(percent*100).toFixed(0)}%` : ""}
              labelLine={false} cursor="pointer"
              onClick={(d: any) => abrirDrawer("", d.tipo.toLowerCase().includes("startup") ? "startup" : "ict", d.tipo)}>
              {porTipo.map((_, i) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v.toLocaleString("pt-BR"), "atores"]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Insight */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl text-emerald-400 shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>lightbulb</span>
          <div>
            <p className="text-sm font-semibold text-emerald-400">O que o GT revela para a tese</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Estados com alto Gap de Tradução têm excesso de ciência sem absorção pelo mercado. A EMBRAPII foi criada exatamente para preencher esse elo, mas seus {totais.embrapii} unidades credenciadas ainda são insuficientes para a dimensão do SNI brasileiro. O Motor da Inovação torna essa assimetria observável em escala nacional.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">→ Políticas relevantes: Programa EMBRAPII (R$ 2,5 bi), Nova Indústria Brasil (R$ 3,3 bi), Lei do Bem (R$ 11,98 bi em renúncia fiscal)</p>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerInfo && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setDrawerInfo(null)}>
          <div className="flex-1 bg-black/40" />
          <div className="w-full max-w-sm bg-card border-l border-border flex flex-col h-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Atores</p>
                <h3 className="text-sm font-bold text-foreground leading-tight">{drawerInfo.titulo}</h3>
              </div>
              <button onClick={() => setDrawerInfo(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {carregandoDrawer ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : atoresDrawer.map(a => (
                <div key={a.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-foreground leading-tight">{a.nome}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="rounded px-1.5 py-0.5 text-[10px]"
                      style={{ background: (CORES_TIPO[a.tipo] || "#94a3b8") + "20", color: CORES_TIPO[a.tipo] || "#94a3b8" }}>
                      {a.tipo}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{a.municipio} · {a.uf}</span>
                  </div>
                </div>
              ))}
              {!carregandoDrawer && (
                <p className="text-center text-[10px] text-muted-foreground pt-2">
                  {atoresDrawer.length} atores · <a href="/mapa" className="text-primary hover:underline">ver no Mapa</a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

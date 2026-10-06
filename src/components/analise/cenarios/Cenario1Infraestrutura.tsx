import { useState, useEffect } from "react";
import AtoresDrawer from "./AtoresDrawer";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface BHPonto { uf: string; com: number; sem: number; pct: number }
interface Ator { id: string; nome: string; tipo: string; municipio: string; uf: string }

export default function Cenario1Infraestrutura() {
  const [backhaul, setBackhaul] = useState<BHPonto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [drawerUF, setDrawerUF] = useState<string | null>(null);
  const [atoresDrawer, setAtoresDrawer] = useState<Ator[]>([]);
  const [carregandoDrawer, setCarregandoDrawer] = useState(false);

  useEffect(() => {
    // A API devolve no máximo 1.000 linhas por chamada: busca os 5.570 municípios em blocos paralelos.
    Promise.all([0, 1, 2, 3, 4, 5, 6].map(i =>
      supabase.from("infra_backhaul_municipio").select("uf, tem_backhaul").not("uf", "is", null)
        .order("codigo_ibge").range(i * 1000, i * 1000 + 999)))
      .then(res => {
        const data = res.flatMap(r => r.data || []);
        const agg: Record<string, { com: number; sem: number }> = {};
        (data || []).forEach(r => {
          if (!agg[r.uf]) agg[r.uf] = { com: 0, sem: 0 };
          if (r.tem_backhaul) agg[r.uf].com++; else agg[r.uf].sem++;
        });
        setBackhaul(
          Object.entries(agg)
            .map(([uf, v]) => ({ uf, com: v.com, sem: v.sem, pct: Math.round(100 * v.com / (v.com + v.sem)) }))
            .sort((a, b) => a.pct - b.pct)
        );
        setCarregando(false);
      });
  }, []);

  function abrirDrawer(uf: string) { setDrawerUF(uf); }

  const semFibra = backhaul.filter(b => b.pct < 70);
  const totalSem = backhaul.reduce((s, b) => s + b.sem, 0);
  const totalCom = backhaul.reduce((s, b) => s + b.com, 0);

  return (
    <div className="space-y-6">
      {/* Fio narrativo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>A IA não existe sem energia, sem fibra e sem lugar para processar.</strong> Antes de falar em modelos ou aplicações, o Brasil precisa responder: a infraestrutura está onde a ciência está? Este cenário cruza os dados de conectividade municipal (ANATEL) com a distribuição dos atores do SNI para revelar os estados onde o potencial de inovação está represado por falta de infraestrutura física.
        </p>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: (totalCom + totalSem).toLocaleString("pt-BR"), l: "Municípios mapeados", cor: "#fb923c" },
          { v: totalCom.toLocaleString("pt-BR"), l: "Com backhaul de fibra", cor: "#34d399" },
          { v: totalSem.toLocaleString("pt-BR"), l: "Sem backhaul", cor: "#f472b6" },
          { v: semFibra.length + " UFs", l: "Com < 70% de cobertura", cor: "#facc15" },
        ].map(m => (
          <div key={m.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold" style={{ color: m.cor }}>{m.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Gráfico — clicável */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-foreground">Cobertura de backhaul por estado (%)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Fonte: ANATEL 2025 · <strong className="text-foreground">clique numa barra para ver os atores SNI do estado</strong></p>
        </div>
        {carregando ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={backhaul} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              onClick={d => { if (d?.activePayload?.[0]) abrirDrawer(d.activePayload[0].payload.uf); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="uf" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, "Com backhaul"]}
                labelFormatter={l => `${l} — clique para ver os atores`}
              />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]} cursor="pointer">
                {backhaul.map((b, i) => (
                  <Cell key={i} fill={b.pct >= 90 ? "#34d399" : b.pct >= 70 ? "#fb923c" : "#f472b6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">🟢 ≥90% conectado · 🟠 70-90% · 🔴 &lt;70% — gap crítico</p>
      </div>

      {/* Insight */}
      {!carregando && semFibra.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-rose-400 shrink-0 mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
            <div>
              <p className="text-sm font-semibold text-rose-400">Gap crítico de conectividade</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                <strong className="text-foreground">{semFibra.map(b => b.uf).join(", ")}</strong> têm menos de 70% dos seus municípios conectados por fibra. Atores do SNI nesses estados operam com conectividade precária, limitando o alcance das políticas de IA mesmo quando o investimento existe.
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">→ Políticas relevantes: FUST (R$ 3,2 bi), Norte Conectado (R$ 1,3 bi), Leilão 5G (R$ 47 bi)</p>
            </div>
          </div>
        </div>
      )}

      {drawerUF && (
        <AtoresDrawer uf={drawerUF} titulo={drawerUF} cor="#fb923c"
          subtitulo={`${backhaul.find(b => b.uf === drawerUF)?.pct}% dos municípios com backhaul de fibra`}
          onClose={() => setDrawerUF(null)} />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lerBackhaulPelaFuncao } from "@/lib/bi/datasets";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Drawer, Spinner, Erro, TOOLTIP_STYLE } from "./Drawer";

interface BHPonto { uf: string; com: number; sem: number; pct: number }
interface Ator { id: string; nome: string; tipo: string | null; municipio: string | null; uf: string | null }

export default function Cenario1Infraestrutura() {
  const [backhaul, setBackhaul] = useState<BHPonto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerUF, setDrawerUF] = useState<string | null>(null);
  const [atores, setAtores] = useState<Ator[]>([]);
  const [carregandoDrawer, setCarregandoDrawer] = useState(false);

  useEffect(() => {
    // Conectividade pela camada de consumo do Mapa (map-infrastructure), nunca pela tabela direta.
    lerBackhaulPelaFuncao().then(rows => {
      const agg: Record<string, { com: number; sem: number }> = {};
      rows.forEach(r => {
        const uf = String(r.uf ?? ""); if (!uf) return;
        agg[uf] ??= { com: 0, sem: 0 };
        if (r.tem_backhaul === "sim") agg[uf].com++; else agg[uf].sem++;
      });
      setBackhaul(Object.entries(agg)
        .map(([uf, v]) => ({ uf, ...v, pct: Math.round(100 * v.com / (v.com + v.sem)) }))
        .sort((a, b) => a.pct - b.pct));
    }).catch(e => setErro(e.message)).finally(() => setCarregando(false));
  }, []);

  function abrirDrawer(uf: string) {
    setDrawerUF(uf); setCarregandoDrawer(true);
    supabase.from("research_locations").select("id, nome, tipo, municipio, uf")
      .eq("uf", uf).not("nome", "is", null).limit(50)
      .then(({ data }) => { setAtores((data as Ator[]) || []); setCarregandoDrawer(false); });
  }

  const semFibra = backhaul.filter(b => b.pct < 70);
  const totalSem = backhaul.reduce((s, b) => s + b.sem, 0);
  const totalCom = backhaul.reduce((s, b) => s + b.com, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>A IA não existe sem energia, sem fibra e sem lugar para processar.</strong> Este cenário cruza a conectividade municipal (ANATEL) com a distribuição dos atores do SNI para revelar os estados onde o potencial de inovação está represado por falta de infraestrutura física.
        </p>
      </div>

      {erro && <Erro msg={erro} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: (totalCom + totalSem).toLocaleString("pt-BR"), l: "Municípios mapeados", cor: "#fb923c" },
          { v: totalCom.toLocaleString("pt-BR"), l: "Com backhaul de fibra", cor: "#34d399" },
          { v: totalSem.toLocaleString("pt-BR"), l: "Sem backhaul", cor: "#f472b6" },
          { v: semFibra.length + " UFs", l: "Com < 70% de cobertura", cor: "#facc15" },
        ].map(m => (
          <div key={m.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold" style={{ color: m.cor }}>{carregando ? "—" : m.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Cobertura de backhaul por estado</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">% de municípios com fibra · fonte: ANATEL · <strong className="text-foreground">clique numa barra para ver os atores SNI do estado</strong></p>
        {carregando ? <Spinner /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={backhaul} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              onClick={(d: any) => d?.activePayload?.[0] && abrirDrawer(d.activePayload[0].payload.uf)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="uf" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Com backhaul"]}
                labelFormatter={l => `Estado: ${l} — clique para ver os atores`} />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]} cursor="pointer">
                {backhaul.map((b, i) => <Cell key={i} fill={b.pct >= 90 ? "#34d399" : b.pct >= 70 ? "#fb923c" : "#f472b6"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground text-right">verde ≥90% · laranja 70-90% · rosa &lt;70%</p>
      </div>

      {!carregando && semFibra.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 flex items-start gap-3">
          <span className="material-symbols-outlined text-xl text-destructive shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
          <div>
            <p className="text-sm font-semibold text-destructive">Gap crítico de conectividade</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              <strong className="text-foreground">{semFibra.map(b => b.uf).join(", ")}</strong> têm menos de 70% dos municípios com backhaul de fibra. Atores do SNI nesses estados operam com conectividade limitada.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">→ Políticas relevantes: FUST (R$ 3,2 bi), Norte Conectado (R$ 1,3 bi), Leilão 5G (R$ 47 bi)</p>
          </div>
        </div>
      )}

      {drawerUF && (
        <Drawer onClose={() => setDrawerUF(null)} header={<>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Atores SNI</p>
          <h3 className="text-base font-bold text-foreground">{drawerUF}</h3>
          <p className="text-xs text-muted-foreground">{backhaul.find(b => b.uf === drawerUF)?.pct}% de cobertura de backhaul</p>
        </>}>
          {carregandoDrawer ? <Spinner h="h-32" /> : atores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum ator mapeado</p>
          ) : atores.map(a => (
            <div key={a.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground leading-tight">{a.nome}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{a.tipo}</span>
                <span className="text-[10px] text-muted-foreground">{a.municipio}</span>
              </div>
            </div>
          ))}
          {!carregandoDrawer && atores.length > 0 && (
            <p className="text-center text-[10px] text-muted-foreground pt-2">{atores.length} atores exibidos (até 50) · <a href="/mapa" className="text-primary hover:underline">ver no Mapa</a></p>
          )}
        </Drawer>
      )}
    </div>
  );
}

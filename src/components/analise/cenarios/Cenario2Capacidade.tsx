import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lerTudo } from "@/lib/bi/datasets";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Drawer, Spinner, Erro, TOOLTIP_STYLE } from "./Drawer";

interface UFPonto { uf: string; ict: number; startups: number; gap: number }
interface Ator { id: string; nome: string; tipo: string | null; municipio: string | null; uf: string | null }

const PALETA = ["#f472b6", "#60a5fa", "#34d399", "#a78bfa", "#fb923c", "#facc15", "#2dd4bf", "#94a3b8"];
const RE_ICT = /ICT|Universidade|Instituto/i;

export default function Cenario2Capacidade() {
  const [porTipo, setPorTipo] = useState<{ tipo: string; total: number }[]>([]);
  const [gaps, setGaps] = useState<UFPonto[]>([]);
  const [totais, setTotais] = useState({ atores: 0, ict: 0, startups: 0, embrapii: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ uf: string; filtro: string } | null>(null);
  const [atores, setAtores] = useState<Ator[]>([]);
  const [carregandoDrawer, setCarregandoDrawer] = useState(false);

  useEffect(() => {
    // Leitura paginada de todos os atores (evita o corte de 1.000 linhas).
    lerTudo("research_locations", "uf,tipo").then(rows => {
      const tipo = (r: any) => String(r.tipo ?? "");
      const ct: Record<string, number> = {};
      rows.forEach(r => { if (r.tipo) ct[tipo(r)] = (ct[tipo(r)] || 0) + 1; });
      setPorTipo(Object.entries(ct).map(([t, total]) => ({ tipo: t, total })).sort((a, b) => b.total - a.total).slice(0, 8));
      const uf: Record<string, { ict: number; startups: number }> = {};
      rows.forEach(r => {
        const u = String(r.uf ?? ""); if (!u) return;
        uf[u] ??= { ict: 0, startups: 0 };
        if (RE_ICT.test(tipo(r))) uf[u].ict++;
        if (/Startup/i.test(tipo(r))) uf[u].startups++;
      });
      setGaps(Object.entries(uf).map(([u, v]) => ({ uf: u, ...v, gap: v.ict - v.startups }))
        .filter(d => d.ict > 0).sort((a, b) => b.gap - a.gap).slice(0, 20));
      setTotais({
        atores: rows.length,
        ict: rows.filter(r => RE_ICT.test(tipo(r))).length,
        startups: rows.filter(r => /Startup/i.test(tipo(r))).length,
        embrapii: rows.filter(r => /Embrapii/i.test(tipo(r))).length,
      });
    }).catch(e => setErro(e.message)).finally(() => setCarregando(false));
  }, []);

  function abrirDrawer(uf: string, filtro: string) {
    setDrawer({ uf, filtro }); setCarregandoDrawer(true);
    let q = supabase.from("research_locations").select("id, nome, tipo, municipio, uf").not("nome", "is", null).limit(60);
    if (uf) q = q.eq("uf", uf);
    if (filtro === "ict") q = q.or("tipo.ilike.%ICT%,tipo.ilike.%Universidade%,tipo.ilike.%Instituto%");
    else if (filtro === "startup") q = q.ilike("tipo", "%Startup%");
    else q = q.eq("tipo", filtro);
    q.then(({ data }) => { setAtores((data as Ator[]) || []); setCarregandoDrawer(false); });
  }

  const corTipo = (t: string | null) => PALETA[Math.max(0, porTipo.findIndex(p => p.tipo === t)) % PALETA.length];
  const rotulo = drawer?.filtro === "ict" ? "ICTs / Universidades" : drawer?.filtro === "startup" ? "Startups" : drawer?.filtro;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>Ciência que não vira produto não gera riqueza.</strong> O Gap de Tradução (GT) aqui é a diferença entre instituições de pesquisa (ICTs, universidades, institutos) e startups por estado. GT alto indica capacidade reprimida: o conhecimento existe, mas o elo de mercado está fraco. Clique numa barra para ver quem está naquele estado.
        </p>
      </div>

      {erro && <Erro msg={erro} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { v: totais.atores, l: "Atores totais no SNI", cor: "#818cf8" },
          { v: totais.ict, l: "ICTs / Universidades / Institutos", cor: "#34d399" },
          { v: totais.startups, l: "Startups mapeadas", cor: "#f472b6" },
          { v: totais.embrapii, l: "Unidades EMBRAPII", cor: "#fb923c" },
        ].map(m => (
          <div key={m.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold" style={{ color: m.cor }}>{carregando ? "—" : m.v.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Gap de Tradução por Estado (ICTs − Startups)</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">20 estados com maior gap · <strong className="text-foreground">clique numa barra para ver as ICTs ou startups do estado</strong></p>
        {carregando ? <Spinner /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gaps} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="uf" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => v.toLocaleString("pt-BR")}
                labelFormatter={l => `${l} — clique para ver os atores`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ict" name="ICTs/Universidades" fill="#34d399" radius={[3, 3, 0, 0]} cursor="pointer"
                onClick={(d: any) => abrirDrawer(d.uf ?? d.payload?.uf, "ict")} />
              <Bar dataKey="startups" name="Startups" fill="#f472b6" radius={[3, 3, 0, 0]} cursor="pointer"
                onClick={(d: any) => abrirDrawer(d.uf ?? d.payload?.uf, "startup")} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Composição do SNI por tipo de ator</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">8 tipos mais frequentes · clique numa fatia para ver os atores</p>
        {carregando ? <Spinner /> : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porTipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={90}
                label={({ tipo, percent }: any) => percent > 0.04 ? `${String(tipo).split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""}
                labelLine={false} cursor="pointer" onClick={(d: any) => abrirDrawer("", d.tipo ?? d.payload?.tipo)}>
                {porTipo.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString("pt-BR"), "atores"]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {!carregando && !erro && (
        <div className="rounded-xl border border-border bg-muted/20 p-5 flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0" style={{ fontVariationSettings: '"FILL" 1', color: "#34d399" }}>lightbulb</span>
          <div>
            <p className="text-sm font-semibold text-foreground">O que o GT revela</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {gaps[0] ? <>O maior gap está em <strong className="text-foreground">{gaps.slice(0, 3).map(g => `${g.uf} (${g.gap.toLocaleString("pt-BR")})`).join(", ")}</strong>. </> : null}
              Há {totais.embrapii.toLocaleString("pt-BR")} unidades EMBRAPII mapeadas para fazer a ponte entre {totais.ict.toLocaleString("pt-BR")} instituições de pesquisa e o mercado.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">→ Políticas relevantes: Programa EMBRAPII (R$ 2,5 bi), Nova Indústria Brasil (R$ 3,3 bi), Lei do Bem (R$ 11,98 bi em renúncia fiscal)</p>
          </div>
        </div>
      )}

      {drawer && (
        <Drawer onClose={() => setDrawer(null)} header={<>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{rotulo}</p>
          <h3 className="text-base font-bold text-foreground">{drawer.uf || "Todos os estados"}</h3>
        </>}>
          {carregandoDrawer ? <Spinner h="h-32" /> : atores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum ator mapeado</p>
          ) : atores.map(a => (
            <div key={a.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold text-foreground leading-tight">{a.nome}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: corTipo(a.tipo) + "20", color: corTipo(a.tipo) }}>{a.tipo}</span>
                <span className="text-[10px] text-muted-foreground">{a.municipio} · {a.uf}</span>
              </div>
            </div>
          ))}
          {!carregandoDrawer && atores.length > 0 && (
            <p className="text-center text-[10px] text-muted-foreground pt-2">{atores.length} atores exibidos (até 60) · <a href="/mapa" className="text-primary hover:underline">ver no Mapa</a></p>
          )}
        </Drawer>
      )}
    </div>
  );
}

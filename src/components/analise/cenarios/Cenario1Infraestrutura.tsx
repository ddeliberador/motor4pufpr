import { useState, useEffect, useMemo } from "react";
import AtoresDrawer from "./AtoresDrawer";
import { supabase } from "@/integrations/supabase/client";
import { carregarDatacenters } from "@/lib/bi/datasets";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { TIPOS_USINA, fmtMw, fmtGw, fmtPct, listaPt } from "@/lib/infraEstados";
import { fetchAll } from "@/lib/fetchAll";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

interface BHPonto { uf: string; com: number; sem: number; pct: number }
interface Datacenter { nome: string; cidade: string; org: string; uf: string }
type Estado<T> = { status: "carregando" } | { status: "erro"; erro: string } | { status: "ok"; dados: T; data?: string };

interface EnergiaUF { uf: string; usinas: number; mw_operacao: number; pct_renovavel: number; fonte_principal: string | null; maior_usina: string | null; pct_brasil: number; data_aneel: string | null }
interface EnergiaTipo { uf: string; tipo: string; fonte: string; renovavel: boolean; mw: number }
/** Rótulos de vw_energia_uf_tipo.fonte, na ordem e cor do gráfico. */
const FONTES_ENERGIA: { fonte: string; cor: string }[] = [
  { fonte: "Hídrica (UHE)", cor: "hsl(205 70% 45%)" },
  { fonte: "Hídrica pequena (PCH)", cor: "hsl(195 60% 60%)" },
  { fonte: "Micro-hidro (CGH)", cor: "hsl(185 45% 72%)" },
  { fonte: "Eólica (EOL)", cor: "hsl(150 45% 45%)" },
  { fonte: "Solar (UFV)", cor: "hsl(45 85% 55%)" },
  { fonte: "Termelétrica a biomassa (UTE)", cor: "hsl(90 35% 45%)" },
  { fonte: "Termelétrica fóssil (UTE)", cor: "hsl(15 60% 50%)" },
  { fonte: "Nuclear (UTN)", cor: "hsl(280 30% 50%)" },
];
interface CaboUF { uf: string; cabos_internacionais: number; cabos_fluviais: number; nomes_internacionais: string | null; nomes_fluviais: string | null }
interface Aterragem { ponto_id: string; nome: string; uf: string; cabos_internacionais: number }
interface Usina { nome: string; tipo: string; municipio: string | null; potencia_kw: number }
const fmtData = (d?: string) => d ? d.slice(0, 10).split("-").reverse().join("/") : "data indisponível";
const nomeUF = (uf: string) => ESTADOS[uf] ?? uf;
const tipoNome = (s: string) => { const t = TIPOS_USINA.find((x) => x.sigla === s); return t ? `${t.nome} (${t.sigla})` : s; };
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };
const tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

function Bloco({ titulo, frase, sub, children }: { titulo: string; frase?: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold text-foreground">{titulo}</h2>
      {frase && <p className="mt-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-base font-semibold text-foreground">{frase}</p>}
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
const Carregando = () => <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
const Indisponivel = ({ erro }: { erro: string }) => (
  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
    <strong className="text-foreground">Fonte indisponível no momento.</strong> Tente novamente em alguns minutos. <span className="text-xs">({erro})</span>
  </div>
);

export default function Cenario1Infraestrutura() {
  const [backhaul, setBackhaul] = useState<BHPonto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroBH, setErroBH] = useState<string | null>(null);
  const [drawerUF, setDrawerUF] = useState<string | null>(null);
  const [energia, setEnergia] = useState<Estado<{ uf: EnergiaUF[]; tipo: EnergiaTipo[] }>>({ status: "carregando" });
  const [cabos, setCabos] = useState<Estado<{ uf: CaboUF[]; pontos: Aterragem[] }>>({ status: "carregando" });
  const [usinasDaUF, setUsinasDaUF] = useState<Usina[] | null>(null);
  const [dcs, setDcs] = useState<Estado<Datacenter[]>>({ status: "carregando" });
  const [listaUsinasUF, setListaUsinasUF] = useState<string | null>(null);
  const [listaDcUF, setListaDcUF] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<{ col: string; desc: boolean }>({ col: "mw", desc: true });

  useEffect(() => {
    // A API devolve no máximo 1.000 linhas por chamada: busca os 5.570 municípios em blocos paralelos.
    Promise.all([0, 1, 2, 3, 4, 5, 6].map(i =>
      supabase.from("infra_backhaul_municipio").select("uf, tem_backhaul").not("uf", "is", null)
        .order("codigo_ibge").range(i * 1000, i * 1000 + 999)))
      .then(res => {
        const falha = res.find(r => r.error);
        if (falha?.error) throw new Error(falha.error.message);
        const data = res.flatMap(r => r.data || []);
        const agg: Record<string, { com: number; sem: number }> = {};
        data.forEach(r => {
          if (!agg[r.uf]) agg[r.uf] = { com: 0, sem: 0 };
          if (r.tem_backhaul) agg[r.uf].com++; else agg[r.uf].sem++;
        });
        setBackhaul(
          Object.entries(agg)
            .map(([uf, v]) => ({ uf, com: v.com, sem: v.sem, pct: Math.round(100 * v.com / (v.com + v.sem)) }))
            .sort((a, b) => a.pct - b.pct)
        );
      })
      .catch(e => setErroBH(String(e?.message ?? e)))
      .finally(() => setCarregando(false));

    // L1 · vw_energia_uf / vw_energia_uf_tipo, derivadas de aneel_usinas (a mesma tabela que a função do Mapa serve).
    Promise.all([
      fetchAll<EnergiaUF>(supabase.from("vw_energia_uf").select("uf,usinas,mw_operacao,pct_renovavel,fonte_principal,maior_usina,pct_brasil,data_aneel").order("uf")),
      fetchAll<EnergiaTipo>(supabase.from("vw_energia_uf_tipo").select("uf,tipo,fonte,renovavel,mw").order("uf").order("tipo")),
    ]).then(([uf, tipo]) => {
      if (!uf.length) throw new Error("sem dados");
      setEnergia({ status: "ok", dados: { uf: uf.map(e => ({ ...e, mw_operacao: Number(e.mw_operacao), pct_renovavel: Number(e.pct_renovavel), pct_brasil: Number(e.pct_brasil) })), tipo: tipo.map(t => ({ ...t, mw: Number(t.mw) })) }, data: uf[0].data_aneel ?? undefined });
    }).catch(e => setEnergia({ status: "erro", erro: String(e?.message ?? e) }));

    // L2 · cabos classificados (cabos_lista) a partir do mesmo snapshot TeleGeography do Mapa.
    Promise.all([
      fetchAll<CaboUF>(supabase.from("vw_cabos_uf").select("uf,cabos_internacionais,cabos_fluviais,nomes_internacionais,nomes_fluviais").order("uf")),
      fetchAll<Aterragem & { snapshot: string | null }>(supabase.from("vw_cabos_aterragens").select("ponto_id,nome,uf,cabos_internacionais,snapshot").gt("cabos_internacionais", 0).order("ponto_id")),
    ]).then(([uf, pontos]) => {
      if (!uf.length) throw new Error("sem dados");
      setCabos({ status: "ok", dados: { uf, pontos: pontos.sort((x, y) => y.cabos_internacionais - x.cabos_internacionais || x.nome.localeCompare(y.nome)) }, data: pontos[0]?.snapshot ?? undefined });
    }).catch(e => setCabos({ status: "erro", erro: String(e?.message ?? e) }));

    // L3 · função do Mapa, com o snapshot do PeeringDB como reserva.
    carregarDatacenters()
      .then(l => setDcs({ status: "ok", dados: l.map(x => ({ nome: String(x.nome ?? ""), cidade: String(x.cidade ?? ""), org: String(x.org ?? ""), uf: String(x.uf ?? "") })) }))
      .catch(e => setDcs({ status: "erro", erro: String(e?.message ?? e) }));
  }, []);

  const semFibra = backhaul.filter(b => b.pct < 70);
  const totalSem = backhaul.reduce((s, b) => s + b.sem, 0);
  const totalCom = backhaul.reduce((s, b) => s + b.com, 0);

  const energiaUF = useMemo(() => energia.status === "ok" ? [...energia.dados.uf].sort((a, b) => b.mw_operacao - a.mw_operacao) : [], [energia]);
  const totMw = energiaUF.reduce((s, e) => s + e.mw_operacao, 0);
  const renMw = energia.status === "ok" ? energia.dados.tipo.filter(t => t.renovavel).reduce((s, t) => s + t.mw, 0) : 0;
  const chartEnergia = useMemo(() => energiaUF.map(e => {
    const linha: Record<string, number | string> = { uf: e.uf };
    if (energia.status === "ok") energia.dados.tipo.filter(t => t.uf === e.uf).forEach(t => { linha[t.fonte] = Number(linha[t.fonte] ?? 0) + t.mw; });
    return linha;
  }), [energiaUF, energia]);
  const cabosInt = useMemo(() => cabos.status === "ok" ? cabos.dados.uf.filter(c => c.cabos_internacionais > 0).sort((a, b) => b.cabos_internacionais - a.cabos_internacionais) : [], [cabos]);
  const cabosFlu = useMemo(() => cabos.status === "ok" ? cabos.dados.uf.filter(c => c.cabos_fluviais > 0).sort((a, b) => b.cabos_fluviais - a.cabos_fluviais) : [], [cabos]);
  const ufsCabo = cabosInt.map(c => c.uf);
  const dcUF = useMemo(() => {
    if (dcs.status !== "ok") return [];
    const m: Record<string, number> = {};
    dcs.dados.forEach(d => { if (d.uf) m[d.uf] = (m[d.uf] ?? 0) + 1; });
    return Object.entries(m).map(([uf, n]) => ({ uf, n })).sort((a, b) => b.n - a.n);
  }, [dcs]);
  const totDc = dcs.status === "ok" ? dcs.dados.length : 0;

  const linhas = useMemo(() => Object.keys(ESTADOS).map(uf => {
    const e = energiaUF.find(x => x.uf === uf);
    const b = backhaul.find(x => x.uf === uf);
    return {
      uf, mw: energia.status === "ok" ? e?.mw_operacao ?? 0 : null,
      ren: energia.status === "ok" && e ? e.pct_renovavel : null,
      cabo: cabos.status === "ok" ? (ufsCabo.includes(uf) ? 1 : 0) : null,
      fibra: b ? b.pct : null,
      dc: dcs.status === "ok" ? dcUF.find(x => x.uf === uf)?.n ?? 0 : null,
    };
  }), [energiaUF, backhaul, ufsCabo, dcUF, energia.status, cabos.status, dcs.status]);
  const linhasOrd = [...linhas].sort((a, b) => {
    const k = ordem.col as keyof typeof a;
    const va = a[k], vb = b[k];
    if (k === "uf") return (ordem.desc ? -1 : 1) * nomeUF(String(va)).localeCompare(nomeUF(String(vb)));
    if (va == null) return 1; if (vb == null) return -1;
    return (ordem.desc ? -1 : 1) * (Number(va) - Number(vb));
  });
  const energiaSemDc = energia.status === "ok" && dcs.status === "ok"
    ? linhas.filter(l => (l.mw ?? 0) > 1000 && l.dc === 0).map(l => nomeUF(l.uf)) : null;

  const topE = energiaUF[0];
  const topDc = dcUF[0];
  useEffect(() => {
    if (!listaUsinasUF) return;
    setUsinasDaUF(null);
    supabase.from("aneel_usinas").select("nome,tipo,municipio,potencia_kw").eq("uf", listaUsinasUF)
      .order("potencia_kw", { ascending: false, nullsFirst: false }).range(0, 29)
      .then(({ data }) => setUsinasDaUF((data ?? []).map(u => ({ ...u, nome: u.nome ?? "", tipo: u.tipo ?? "", potencia_kw: Number(u.potencia_kw ?? 0) }))));
  }, [listaUsinasUF]);
  const dcsDaUF = listaDcUF && dcs.status === "ok" ? dcs.dados.filter(d => d.uf === listaDcUF).sort((a, b) => a.nome.localeCompare(b.nome)) : [];

  const num = (st: string, v: string) => st === "carregando" ? "…" : st === "erro" ? "—" : v;

  return (
    <div className="space-y-6">
      {/* Fio narrativo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-foreground leading-relaxed">
          <strong>A IA não existe sem energia, sem fibra e sem lugar para processar.</strong> Antes de falar em modelos ou aplicações, o Brasil precisa responder: a infraestrutura está onde a ciência está? Este cenário cruza os dados de conectividade municipal (ANATEL) com a distribuição dos atores do SNI para revelar os estados onde o potencial de inovação está represado por falta de infraestrutura física.
        </p>
      </div>

      {/* 1. Números do topo */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { v: num(energia.status, `${fmtGw(totMw)} GW`), l: energia.status === "erro" ? "Potência em operação · fonte indisponível no momento" : `Potência em operação · ${fmtPct(totMw ? 100 * renMw / totMw : 0)}% renovável (hídrica, eólica e solar)` },
          { v: num(cabos.status, `${ufsCabo.length} estados`), l: cabos.status === "erro" ? "Cabo submarino · fonte indisponível no momento" : "Com cabo submarino chegando" },
          { v: carregando ? "…" : erroBH ? "—" : `${fmtPct(100 * totalCom / (totalCom + totalSem))}%`, l: erroBH ? "Fibra · fonte indisponível no momento" : "Dos municípios com fibra (backhaul)" },
          { v: num(dcs.status, totDc.toLocaleString("pt-BR")), l: dcs.status === "erro" ? "Datacenters · fonte indisponível no momento" : "Datacenters no país" },
        ].map(m => (
          <div key={m.l} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{m.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      {/* 2. Energia */}
      <Bloco titulo="Quanta energia cada estado gera, e de que fonte?"
        frase={energia.status === "ok" && topE ? `${nomeUF(topE.uf)} tem a maior potência instalada, ${fmtGw(topE.mw_operacao)} GW, ${fmtPct(topE.pct_renovavel)}% de fonte renovável.` : undefined}
        sub={energia.status === "ok" ? `${energiaUF.reduce((s, e) => s + e.usinas, 0).toLocaleString("pt-BR")} usinas em operação na ANEEL, em MW (base de ${fmtData(energia.data)}). Clique num estado para ver as maiores usinas.` : undefined}>
        {energia.status === "ok" && topE && (
          <p className="mb-3 text-xs text-muted-foreground">Em {nomeUF(topE.uf)}, a fonte principal é {topE.fonte_principal ?? "—"}, a maior usina é {topE.maior_usina ?? "—"} e o estado responde por {fmtPct(topE.pct_brasil)}% da potência do Brasil. Passe o mouse sobre as barras para ver os demais estados.</p>
        )}
        {energia.status === "carregando" ? <Carregando /> : energia.status === "erro" ? <Indisponivel erro={energia.erro} /> : (
          <ResponsiveContainer width="100%" height={Math.max(420, chartEnergia.length * 22)}>
            <BarChart data={chartEnergia} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
              onClick={d => { const uf = d?.activePayload?.[0]?.payload?.uf; if (uf) setListaUsinasUF(uf); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={tick} tickFormatter={v => fmtMw(v)} />
              <YAxis type="category" dataKey="uf" tick={tick} width={32} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${fmtMw(v)} MW`, n]} labelFormatter={l => {
                const e = energiaUF.find(x => x.uf === l);
                return e ? `${nomeUF(e.uf)} · ${fmtGw(e.mw_operacao)} GW · ${fmtPct(e.pct_renovavel)}% renovável · ${fmtPct(e.pct_brasil)}% do Brasil · maior: ${e.maior_usina ?? "—"} — clique para ver as usinas` : String(l);
              }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {FONTES_ENERGIA.map(t => <Bar key={t.fonte} dataKey={t.fonte} name={t.fonte} stackId="e" fill={t.cor} cursor="pointer" />)}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Bloco>

      {/* 3. Cabos internacionais + infovias + backhaul */}
      <Bloco titulo="Por onde o Brasil se conecta ao mundo?"
        frase={cabos.status === "ok" ? `Os cabos submarinos internacionais chegam em ${cabosInt.length} estados: ${listaPt(cabosInt.map(c => `${nomeUF(c.uf)} (${c.cabos_internacionais})`))}.` : undefined}
        sub={cabos.status === "ok" ? "Só cabos que ligam o Brasil a outros países. Entre parênteses, quantos cabos internacionais chegam ao estado." : undefined}>
        {cabos.status === "carregando" ? <Carregando /> : cabos.status === "erro" ? <Indisponivel erro={cabos.erro} /> : (
          <div className="grid gap-5 lg:grid-cols-2">
            <ResponsiveContainer width="100%" height={Math.max(180, cabosInt.length * 30)}>
              <BarChart data={cabosInt} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={tick} allowDecimals={false} />
                <YAxis type="category" dataKey="uf" tick={tick} width={32} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Cabos internacionais"]} labelFormatter={l => { const c = cabosInt.find(x => x.uf === l); return `${nomeUF(String(l))}: ${c?.nomes_internacionais ?? ""}`; }} />
                <Bar dataKey="cabos_internacionais" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3">Ponto de aterragem</th><th className="py-2 pr-3">Estado</th><th className="py-2 text-right">Cabos internacionais</th></tr></thead>
                <tbody>{cabos.dados.pontos.map(a => (
                  <tr key={a.ponto_id} className="border-b border-border/50"><td className="py-1.5 pr-3 text-foreground">{a.nome}</td><td className="py-1.5 pr-3 text-muted-foreground">{nomeUF(a.uf)} ({a.uf})</td><td className="py-1.5 text-right font-semibold text-foreground">{a.cabos_internacionais}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </Bloco>

      <Bloco titulo="Infovias na Amazônia"
        frase={cabos.status === "ok" && cabosFlu.length ? `Há infovias fluviais em ${cabosFlu.length} estados: ${listaPt(cabosFlu.map(c => `${nomeUF(c.uf)} (${c.cabos_fluviais})`))}.` : undefined}
        sub="São cabos de fibra óptica lançados no leito dos rios, para levar conectividade dentro da região. Não são ligações com outros países.">
        {cabos.status === "carregando" ? <Carregando /> : cabos.status === "erro" ? <Indisponivel erro={cabos.erro} /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3">Estado</th><th className="py-2 pr-3 text-right">Infovias</th><th className="py-2">Nomes</th></tr></thead>
            <tbody>{cabosFlu.map(c => (
              <tr key={c.uf} className="border-b border-border/50 align-top"><td className="py-1.5 pr-3 text-foreground">{nomeUF(c.uf)}</td><td className="py-1.5 pr-3 text-right font-semibold">{c.cabos_fluviais}</td><td className="py-1.5 text-xs text-muted-foreground">{c.nomes_fluviais}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Bloco>

      {/* Backhaul (existente) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-foreground">Cobertura de backhaul por estado (%)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Fonte: ANATEL 2025 · <strong className="text-foreground">clique numa barra para ver os atores SNI do estado</strong></p>
        </div>
        {carregando ? <Carregando /> : erroBH ? <Indisponivel erro={erroBH} /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={backhaul} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              onClick={d => { if (d?.activePayload?.[0]) setDrawerUF(d.activePayload[0].payload.uf); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="uf" tick={tick} interval={0} />
              <YAxis tick={tick} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Com backhaul"]} labelFormatter={l => `${l} — clique para ver os atores`} />
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

      {/* 4. Datacenters */}
      <Bloco titulo="Onde estão os datacenters?"
        frase={dcs.status === "ok" && topDc ? `${nomeUF(topDc.uf)} concentra ${fmtPct(100 * topDc.n / totDc)}% dos datacenters do país.` : undefined}
        sub={dcs.status === "ok" ? "Datacenters e pontos de troca de tráfego registrados no PeeringDB. Clique num estado para ver a lista." : undefined}>
        {dcs.status === "carregando" ? <Carregando /> : dcs.status === "erro" ? <Indisponivel erro={dcs.erro} /> : (
          <ResponsiveContainer width="100%" height={Math.max(260, dcUF.length * 22)}>
            <BarChart data={dcUF} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
              onClick={d => { const uf = d?.activePayload?.[0]?.payload?.uf; if (uf) setListaDcUF(uf); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={tick} allowDecimals={false} />
              <YAxis type="category" dataKey="uf" tick={tick} width={32} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Datacenters"]} labelFormatter={l => `${nomeUF(String(l))} — clique para ver a lista`} />
              <Bar dataKey="n" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Bloco>

      {/* 5. Cruzamento */}
      <Bloco titulo="Onde as três camadas se encontram"
        frase={energiaSemDc ? (energiaSemDc.length
          ? `${energiaSemDc.length} ${energiaSemDc.length === 1 ? "estado tem" : "estados têm"} mais de 1 GW em operação e nenhum datacenter: ${listaPt(energiaSemDc)}.`
          : "Todos os estados com mais de 1 GW em operação têm ao menos um datacenter.") : undefined}
        sub="Mostra onde há energia sem capacidade de processamento. Clique no título de uma coluna para ordenar.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
              {[["uf", "Estado"], ["mw", "Potência em operação (MW)"], ["ren", "% renovável"], ["cabo", "Cabo submarino"], ["fibra", "% municípios com fibra"], ["dc", "Datacenters"]].map(([k, l]) => (
                <th key={k} className={`py-2 pr-3 ${k !== "uf" ? "text-right" : ""}`}>
                  <button className="hover:text-foreground" onClick={() => setOrdem(o => ({ col: k, desc: o.col === k ? !o.desc : k !== "uf" }))}>
                    {l}{ordem.col === k ? (ordem.desc ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
            </tr></thead>
            <tbody>{linhasOrd.map(l => (
              <tr key={l.uf} className="border-b border-border/50">
                <td className="py-1.5 pr-3 text-foreground">{nomeUF(l.uf)}</td>
                <td className="py-1.5 pr-3 text-right">{l.mw == null ? "—" : fmtMw(l.mw)}</td>
                <td className="py-1.5 pr-3 text-right">{l.ren == null ? "—" : `${fmtPct(l.ren)}%`}</td>
                <td className="py-1.5 pr-3 text-right">{l.cabo == null ? "—" : l.cabo ? "sim" : "não"}</td>
                <td className="py-1.5 pr-3 text-right">{l.fibra == null ? "—" : `${l.fibra}%`}</td>
                <td className="py-1.5 text-right">{l.dc == null ? "—" : l.dc}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">"—" indica fonte indisponível no momento, não zero.</p>
      </Bloco>

      {/* Notas metodológicas */}
      <footer className="rounded-xl border border-border bg-muted/30 p-5 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Notas metodológicas</p>
        <p>Energia (Layer 1): ANEEL SIGA, todas as usinas em operação, cópia mensal guardada no banco{energia.status === "ok" ? ` (base de ${fmtData(energia.data)})` : ""}. Renovável = hidrelétricas (UHE, PCH, CGH), eólica (EOL), solar (UFV) e termelétricas a biomassa.</p>
        <p className="mt-1">Cabos (Layer 2): TeleGeography Submarine Cable Map{cabos.status === "ok" && cabos.data ? `, retrato de ${fmtData(cabos.data)}` : ""}, classificados em internacionais, costeiros domésticos e fluviais; só os internacionais contam como conexão com o exterior. Os pontos de aterragem foram atribuídos à UF pela localização.</p>
        <p className="mt-1">Fibra (Layer 2): ANATEL, backhaul por município (2025).</p>
        <p className="mt-1">Datacenters (Layer 3): PeeringDB, consultado ao vivo, com o retrato de 23/09/2026 como reserva quando a fonte não responde.</p>
      </footer>

      {drawerUF && (
        <AtoresDrawer uf={drawerUF} titulo={drawerUF} cor="#fb923c"
          subtitulo={`${backhaul.find(b => b.uf === drawerUF)?.pct}% dos municípios com backhaul de fibra`}
          onClose={() => setDrawerUF(null)} />
      )}

      <Dialog open={!!listaUsinasUF} onOpenChange={o => !o && setListaUsinasUF(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maiores usinas · {listaUsinasUF && nomeUF(listaUsinasUF)}</DialogTitle>
            <DialogDescription>As 30 maiores usinas em operação do estado, por potência.</DialogDescription>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-2">Nome</th><th className="py-2 pr-2">Tipo</th><th className="py-2 pr-2">Município</th><th className="py-2 text-right">MW</th></tr></thead>
            <tbody>{(usinasDaUF ?? []).map((u, i) => (
              <tr key={i} className="border-b border-border/50"><td className="py-1.5 pr-2">{u.nome}</td><td className="py-1.5 pr-2 text-muted-foreground">{tipoNome(u.tipo)}</td><td className="py-1.5 pr-2 text-muted-foreground">{u.municipio}</td><td className="py-1.5 text-right font-semibold">{fmtMw(u.potencia_kw / 1000)}</td></tr>
            ))}</tbody>
          </table>
        </DialogContent>
      </Dialog>

      <Dialog open={!!listaDcUF} onOpenChange={o => !o && setListaDcUF(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Datacenters · {listaDcUF && nomeUF(listaDcUF)}</DialogTitle>
            <DialogDescription>{dcsDaUF.length} registros no PeeringDB.</DialogDescription>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-2">Nome</th><th className="py-2 pr-2">Cidade</th><th className="py-2">Organização</th></tr></thead>
            <tbody>{dcsDaUF.map((d, i) => (
              <tr key={i} className="border-b border-border/50"><td className="py-1.5 pr-2">{d.nome}</td><td className="py-1.5 pr-2 text-muted-foreground">{d.cidade}</td><td className="py-1.5 text-muted-foreground">{d.org}</td></tr>
            ))}</tbody>
          </table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

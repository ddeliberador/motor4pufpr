import { useState, useEffect, useMemo } from "react";
import AtoresDrawer from "./AtoresDrawer";
import { supabase } from "@/integrations/supabase/client";
import { carregarDatacenters } from "@/lib/bi/datasets";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import {
  TIPOS_USINA, RENOVAVEIS, agregarEnergia, featuresDoGeojson, aterragensBrasil,
  fmtMw, fmtGw, fmtPct, listaPt, type Usina, type Aterragem,
} from "@/lib/infraEstados";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

interface BHPonto { uf: string; com: number; sem: number; pct: number }
interface Datacenter { nome: string; cidade: string; org: string; uf: string }
type Estado<T> = { status: "carregando" } | { status: "erro"; erro: string } | { status: "ok"; dados: T; data?: string };

/** Limite de registros da função map-infrastructure (layer "energy"). */
const LIMITE_ANEEL = 6000;
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
  const [energia, setEnergia] = useState<Estado<Usina[]>>({ status: "carregando" });
  const [cabos, setCabos] = useState<Estado<Aterragem[]>>({ status: "carregando" });
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

    // L1 · mesma função do Mapa e do BI (layer "energy"); nome da usina é necessário para a lista.
    supabase.functions.invoke("map-infrastructure", { body: { layer: "energy" } }).then(({ data, error }) => {
      const p = data as { data?: Record<string, unknown>[]; failures?: { error: string }[] } | null;
      if (error || !p?.data?.length) {
        setEnergia({ status: "erro", erro: error?.message || (p?.failures ?? []).map(f => f.error).join("; ") || "sem dados" });
        return;
      }
      setEnergia({ status: "ok", data: new Date().toLocaleDateString("pt-BR"), dados: p.data.map(u => ({
        nome: String(u.nome ?? ""), tipo: String(u.tipo ?? ""), uf: String(u.uf ?? ""),
        municipio: String(u.municipio ?? ""), potencia_kw: Number(u.potencia_kw ?? 0),
      })) });
    }).catch(e => setEnergia({ status: "erro", erro: String(e?.message ?? e) }));

    // L2 · snapshot TeleGeography + UF pela geometria do IBGE.
    Promise.all([fetch("/submarine-cablemap/data.json").then(r => r.json()), fetch("/br-uf.geojson").then(r => r.json())])
      .then(([d, g]) => setCabos({ status: "ok", dados: aterragensBrasil(d, featuresDoGeojson(g)), data: String(d.generated_at ?? "").slice(0, 10) }))
      .catch(e => setCabos({ status: "erro", erro: String(e?.message ?? e) }));

    // L3 · função do Mapa, com o snapshot do PeeringDB como reserva.
    carregarDatacenters()
      .then(l => setDcs({ status: "ok", dados: l.map(x => ({ nome: String(x.nome ?? ""), cidade: String(x.cidade ?? ""), org: String(x.org ?? ""), uf: String(x.uf ?? "") })) }))
      .catch(e => setDcs({ status: "erro", erro: String(e?.message ?? e) }));
  }, []);

  const semFibra = backhaul.filter(b => b.pct < 70);
  const totalSem = backhaul.reduce((s, b) => s + b.sem, 0);
  const totalCom = backhaul.reduce((s, b) => s + b.com, 0);

  const energiaUF = useMemo(() => energia.status === "ok" ? agregarEnergia(energia.dados) : [], [energia]);
  const totMw = energiaUF.reduce((s, e) => s + e.total_mw, 0);
  const renMw = energiaUF.reduce((s, e) => s + e.renovavel_mw, 0);
  const chartEnergia = energiaUF.map(e => ({ uf: e.uf, ...e.por_tipo }));
  const ufsCabo = useMemo(() => cabos.status === "ok" ? [...new Set(cabos.dados.map(a => a.uf))].sort() : [], [cabos]);
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
      uf, mw: energia.status === "ok" ? e?.total_mw ?? 0 : null,
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
  const usinasDaUF = listaUsinasUF && energia.status === "ok"
    ? energia.dados.filter(u => u.uf === listaUsinasUF).sort((a, b) => b.potencia_kw - a.potencia_kw).slice(0, 30) : [];
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
        frase={energia.status === "ok" && topE ? `${nomeUF(topE.uf)} tem a maior potência instalada, ${fmtGw(topE.total_mw)} GW, ${fmtPct(topE.pct_renovavel)}% de fonte renovável.` : undefined}
        sub={energia.status === "ok" ? `Usinas em operação na ANEEL (${energia.dados.length.toLocaleString("pt-BR")} carregadas), em MW. Clique num estado para ver as maiores usinas.` : undefined}>
        {energia.status === "ok" && energia.dados.length >= LIMITE_ANEEL * 0.9 && (
          <p className="mb-3 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Cobertura parcial:</strong> a consulta à ANEEL traz no máximo {LIMITE_ANEEL.toLocaleString("pt-BR")} registros e foram carregadas {energia.dados.length.toLocaleString("pt-BR")} usinas. A potência dos estados pode estar subestimada.
          </p>
        )}
        {energia.status === "carregando" ? <Carregando /> : energia.status === "erro" ? <Indisponivel erro={energia.erro} /> : (
          <ResponsiveContainer width="100%" height={Math.max(420, chartEnergia.length * 22)}>
            <BarChart data={chartEnergia} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
              onClick={d => { const uf = d?.activePayload?.[0]?.payload?.uf; if (uf) setListaUsinasUF(uf); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={tick} tickFormatter={v => fmtMw(v)} />
              <YAxis type="category" dataKey="uf" tick={tick} width={32} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${fmtMw(v)} MW`, n]} labelFormatter={l => `${nomeUF(String(l))} — clique para ver as usinas`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {TIPOS_USINA.map(t => <Bar key={t.sigla} dataKey={t.sigla} name={`${t.nome} (${t.sigla})`} stackId="e" fill={t.cor} cursor="pointer" />)}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Bloco>

      {/* 3. Cabos + backhaul */}
      <Bloco titulo="Por onde o Brasil se conecta ao mundo?"
        frase={cabos.status === "ok" ? `Os cabos submarinos chegam em ${ufsCabo.length} estados: ${listaPt(ufsCabo.map(nomeUF))}.` : undefined}
        sub={cabos.status === "ok" ? "Pontos de aterragem de cabos submarinos no Brasil e quantos cabos chegam em cada um." : undefined}>
        {cabos.status === "carregando" ? <Carregando /> : cabos.status === "erro" ? <Indisponivel erro={cabos.erro} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3">Ponto de aterragem</th><th className="py-2 pr-3">Estado</th><th className="py-2 text-right">Cabos</th></tr></thead>
              <tbody>{cabos.dados.map(a => (
                <tr key={a.id} className="border-b border-border/50"><td className="py-1.5 pr-3 text-foreground">{a.nome}</td><td className="py-1.5 pr-3 text-muted-foreground">{nomeUF(a.uf)} ({a.uf})</td><td className="py-1.5 text-right font-semibold text-foreground">{a.cabos}</td></tr>
              ))}</tbody>
            </table>
          </div>
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
        <p>Energia (Layer 1): ANEEL SIGA, usinas na fase "Operação" com coordenadas, potência fiscalizada (ou outorgada, na falta dela); consultado ao vivo{energia.status === "ok" ? ` em ${energia.data}` : ""}. Renovável = hidrelétricas (UHE, PCH, CGH), eólica (EOL) e solar (UFV).</p>
        <p className="mt-1">Cabos submarinos (Layer 2): TeleGeography Submarine Cable Map{cabos.status === "ok" && cabos.data ? `, retrato de ${cabos.data.split("-").reverse().join("/")}` : ""}. Os pontos de aterragem foram atribuídos à UF pela localização dentro da malha estadual do IBGE; pontos sobre a linha da costa, fora do contorno simplificado, ficam com o estado mais próximo.</p>
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
            <tbody>{usinasDaUF.map((u, i) => (
              <tr key={i} className="border-b border-border/50"><td className="py-1.5 pr-2">{u.nome}</td><td className="py-1.5 pr-2 text-muted-foreground">{tipoNome(u.tipo)}{RENOVAVEIS.has(u.tipo) ? "" : ""}</td><td className="py-1.5 pr-2 text-muted-foreground">{u.municipio}</td><td className="py-1.5 text-right font-semibold">{fmtMw(u.potencia_kw / 1000)}</td></tr>
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

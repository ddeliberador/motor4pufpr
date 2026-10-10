import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import { ANO_MIN, ANO_MAX, TEC_IA, razao, ultimoAnoCompleto, fraseCrescimento } from "@/lib/interacao";

type Ind = { ano: number | null; tecnologia: string | null; lacos: number | null; lacos_destino_novo: number | null; lacos_par_repetido: number | null; lacos_interestaduais: number | null };
type Met = { recorte: string; ano_inicio: number; ano_fim: number; nos: number | null; componentes: number | null; maior_componente_pct: number | null; hhi_origem: number | null };
type Rec = { ano: number | null; tecnologia: string | null; fin_parceiro: string | null; projetos: number | null; valor_embrapii: number | null; valor_empresas: number | null; valor_unidades: number | null; valor_sebrae: number | null; valor_total: number | null };
type Coorte = { ano: number | null; tecnologia: string | null; concluidos: number | null; concluidos_com_pi: number | null };
type Pi = { ano: number | null; tipo_pedido: string | null; tecnologia: string | null; pedidos: number | null; cotitularidade: number | null };
type Emp = { destino_id: string; ano: number | null; tecnologia: string | null };

const COR = "#f59e0b";
const ANO_CORRENTE = new Date().getUTCFullYear();
const n = (v: number | null | undefined) => Number(v ?? 0);
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const brl = (v: number) => v >= 1e9 ? `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} bi` : `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
const TIPOS_PI = ["Patente - Invenção", "Patente - Modelo Utilidade", "Programa de Computador", "Desenho Industrial", "Topografia de Circuito Integrado", "Transferência de Tecnologia", "Outros"];
const CORES_PI = ["#f59e0b", "#fbbf24", "#38bdf8", "#a78bfa", "#34d399", "#94a3b8", "#f472b6"];
const NOME_PI: Record<string, string> = {
  "Programa de Computador": "Programa de computador", "Patente - Invenção": "Patente de invenção",
  "Transferência de Tecnologia": "Transferência de tecnologia", "Desenho Industrial": "Desenho industrial",
  "Patente - Modelo Utilidade": "Modelo de utilidade",
};
const NOME_FIN: Record<string, string> = {
  MCTI: "Ministério da Ciência, Tecnologia e Inovação", MEC: "Ministério da Educação",
  MDIC: "Ministério do Desenvolvimento, Indústria, Comércio e Serviços", MS: "Ministério da Saúde",
  BNDES: "Banco Nacional de Desenvolvimento Econômico e Social",
};
const nomeFin = (k: string) => { const s = k.trim().toUpperCase(); return NOME_FIN[s] ? `${NOME_FIN[s]} (${s})` : k; };
const JANELAS = [[2014, 2018], [2019, 2022], [2023, 2026]] as const;
const pc1 = (v: number) => (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const umEm = (v: number) => Math.round(1 / v);

function Card({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-xl font-bold text-foreground">{titulo}</h3>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
const Conclusao = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border-l-4 bg-muted/50 px-4 py-3 text-base font-semibold text-foreground" style={{ borderColor: COR }}>{children}</p>
);
const SemDado = () => <p className="py-10 text-center text-sm text-muted-foreground">Sem dado para o filtro escolhido.</p>;
const LegendaAndamento = () => (
  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: COR, opacity: 0.35 }} /> {ANO_CORRENTE}: ano em andamento</p>
);

export default function CenarioInteracao() {
  const [ind, setInd] = useState<Ind[]>([]);
  const [met, setMet] = useState<Met[]>([]);
  const [rec, setRec] = useState<Rec[]>([]);
  const [coorte, setCoorte] = useState<Coorte[]>([]);
  const [pi, setPi] = useState<Pi[]>([]);
  const [emp, setEmp] = useState<Emp[]>([]);
  const [extraido, setExtraido] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [anoIni, setAnoIni] = useState(ANO_MIN);
  const [anoFim, setAnoFim] = useState(ANO_MAX);
  const [soIA, setSoIA] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c, d, e, g, f] = await Promise.all([
          fetchAll<Ind>(supabase.from("vw_interacao_indicadores_ano").select("ano,tecnologia,lacos,lacos_destino_novo,lacos_par_repetido,lacos_interestaduais").eq("fonte", "embrapii").eq("tipo", "cooperacao_pdi")),
          fetchAll<Met>(supabase.from("interacao_metricas_rede").select("recorte,ano_inicio,ano_fim,nos,componentes,maior_componente_pct,hhi_origem").eq("fonte", "embrapii").eq("tipo", "cooperacao_pdi")),
          fetchAll<Rec>(supabase.from("vw_embrapii_recursos_ano").select("*")),
          fetchAll<Coorte>(supabase.from("vw_embrapii_resultados_coorte").select("ano,tecnologia,concluidos,concluidos_com_pi")),
          fetchAll<Pi>(supabase.from("vw_embrapii_pi_ano").select("ano,tipo_pedido,tecnologia,pedidos,cotitularidade")),
          fetchAll<Emp>(supabase.from("interacoes").select("destino_id,ano,tecnologia").eq("fonte", "embrapii").eq("tipo", "cooperacao_pdi").order("id")),
          supabase.from("embrapii_extracoes").select("extraido_em").order("extraido_em", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (f.error) throw f.error;
        setInd(a); setMet(b); setRec(c); setCoorte(d); setPi(e); setEmp(g);
        setExtraido(f.data?.extraido_em ?? null);
      } catch (err) {
        setErro((err as Error).message);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const passa = (r: { ano: number | null; tecnologia: string | null }) =>
    r.ano != null && r.ano >= anoIni && r.ano <= anoFim && (!soIA || r.tecnologia === TEC_IA);
  const anos = useMemo(() => Array.from({ length: anoFim - anoIni + 1 }, (_, i) => anoIni + i), [anoIni, anoFim]);
  const recorte = soIA ? TEC_IA : "todos";

  // Ações (detalhes técnicos + bloco 2)
  const acoes = useMemo(() => {
    const m = new Map<number, { l: number; nv: number; rp: number; ie: number }>();
    for (const r of ind) if (passa(r)) {
      const o = m.get(r.ano!) ?? { l: 0, nv: 0, rp: 0, ie: 0 };
      o.l += n(r.lacos); o.nv += n(r.lacos_destino_novo); o.rp += n(r.lacos_par_repetido); o.ie += n(r.lacos_interestaduais);
      m.set(r.ano!, o);
    }
    return anos.filter((a) => m.has(a)).map((a) => {
      const o = m.get(a)!;
      return { ano: a, lacos: o.l, estreante: razao(o.nv, o.l), repetido: razao(o.rp, o.l), interestadual: razao(o.ie, o.l) };
    });
  }, [ind, anos, soIA]); // eslint-disable-line react-hooks/exhaustive-deps

  const janelas = JANELAS.map(([i, f]) => ({ i, f, m: met.find((x) => x.recorte === recorte && x.ano_inicio === i && x.ano_fim === f) ?? null }));
  const redeAnual = met
    .filter((x) => x.recorte === recorte && x.ano_inicio === x.ano_fim && x.ano_inicio >= anoIni && x.ano_inicio <= anoFim)
    .sort((a, b) => a.ano_inicio - b.ano_inicio)
    .map((x) => ({ ano: x.ano_inicio, maior: x.maior_componente_pct, hhi: x.hhi_origem }));

  // Recursos
  const { recursosAno, porParceiro, totais, projetosAno } = useMemo(() => {
    const m = new Map<number, { e: number; em: number; u: number; s: number; t: number; p: number }>();
    const p = new Map<string, { proj: number; pub: number; tot: number }>();
    const tot = { e: 0, em: 0, u: 0, s: 0, t: 0, p: 0 };
    for (const r of rec) if (passa(r)) {
      const o = m.get(r.ano!) ?? { e: 0, em: 0, u: 0, s: 0, t: 0, p: 0 };
      o.e += n(r.valor_embrapii); o.em += n(r.valor_empresas); o.u += n(r.valor_unidades); o.s += n(r.valor_sebrae); o.t += n(r.valor_total); o.p += n(r.projetos);
      m.set(r.ano!, o);
      tot.e += n(r.valor_embrapii); tot.em += n(r.valor_empresas); tot.u += n(r.valor_unidades); tot.s += n(r.valor_sebrae); tot.t += n(r.valor_total); tot.p += n(r.projetos);
      const k = r.fin_parceiro || "Não informado";
      const q = p.get(k) ?? { proj: 0, pub: 0, tot: 0 };
      q.proj += n(r.projetos); q.pub += n(r.valor_embrapii); q.tot += n(r.valor_total);
      p.set(k, q);
    }
    const presentes = anos.filter((a) => m.has(a));
    const recursosAno = presentes.map((a) => {
      const o = m.get(a)!;
      const soma = o.e + o.em + o.u + o.s;
      return { ano: a, EMBRAPII: razao(o.e, soma), Empresas: razao(o.em, soma), Unidades: razao(o.u, soma), Sebrae: razao(o.s, soma), total: o.t };
    });
    const projetosAno = presentes.map((a) => ({ ano: a, projetos: m.get(a)!.p }));
    const porParceiro = [...p.entries()].map(([k, v]) => ({ k, ...v })).sort((a, b) => b.pub - a.pub);
    return { recursosAno, porParceiro, totais: tot, projetosAno };
  }, [rec, anos, soIA]); // eslint-disable-line react-hooks/exhaustive-deps

  const empresas = useMemo(() => new Set(emp.filter(passa).map((r) => r.destino_id)).size, [emp, anoIni, anoFim, soIA]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resultados
  const taxaPi = useMemo(() => {
    let c = 0, p = 0;
    for (const r of coorte) if (passa(r)) { c += n(r.concluidos); p += n(r.concluidos_com_pi); }
    return razao(p, c);
  }, [coorte, anoIni, anoFim, soIA]); // eslint-disable-line react-hooks/exhaustive-deps

  const { piAno, cotit, tiposPresentes, piTipos, totalPedidos } = useMemo(() => {
    const m = new Map<number, Record<string, number>>();
    const porTipo = new Map<string, number>();
    let ped = 0, cot = 0, total = 0;
    const presentes = new Set<string>();
    for (const r of pi) if (passa(r)) {
      const t = r.tipo_pedido || "Outros";
      presentes.add(t);
      const o = m.get(r.ano!) ?? {};
      o[t] = (o[t] ?? 0) + n(r.pedidos); m.set(r.ano!, o);
      total += n(r.pedidos);
      const simples = NOME_PI[t] ?? "Outros";
      porTipo.set(simples, (porTipo.get(simples) ?? 0) + n(r.pedidos));
      if (t !== "Transferência de Tecnologia") { ped += n(r.pedidos); cot += n(r.cotitularidade); }
    }
    return {
      piAno: anos.filter((a) => m.has(a)).map((a) => ({ ano: a, ...m.get(a)! })),
      cotit: razao(cot, ped),
      tiposPresentes: TIPOS_PI.filter((t) => presentes.has(t)),
      piTipos: [...porTipo].map(([tipo, pedidos]) => ({ tipo, pedidos })).filter((x) => x.pedidos > 0).sort((a, b) => b.pedidos - a.pedidos),
      totalPedidos: total,
    };
  }, [pi, anos, soIA]); // eslint-disable-line react-hooks/exhaustive-deps

  // Frases
  const fraseB1 = (() => {
    const comDado = projetosAno.filter((x) => x.projetos > 0);
    const ult = ultimoAnoCompleto(comDado.map((x) => x.ano), ANO_CORRENTE);
    if (ult == null || !comDado.length) return null;
    const pri = comDado.find((x) => x.projetos >= 50);
    const u = comDado.find((x) => x.ano === ult)!;
    if (!pri) return { texto: `Em ${ult} foram ${u.projetos.toLocaleString("pt-BR")} projetos.`, comp: false };
    return { texto: fraseCrescimento(ult, u.projetos, pri.ano, pri.projetos), comp: true };
  })();
  const fraseB2 = (() => {
    const v = acoes.filter((x) => x.repetido != null);
    const ult = ultimoAnoCompleto(v.map((x) => x.ano), ANO_CORRENTE);
    if (ult == null) return null;
    const u = v.find((x) => x.ano === ult)!.repetido!;
    const um = u > 0 ? `, cerca de 1 em cada ${umEm(u)}` : "";
    const base = `Em ${ult}, ${pc1(u)}% das parcerias eram repetidas${um}.`;
    const p0 = v.find((x) => x.lacos >= 50 && x.ano !== 2014);
    if (!p0) return { texto: base, comp: false };
    return { texto: `${base} Em ${p0.ano} eram ${pc1(p0.repetido!)}%.`, comp: true };
  })();
  const fraseB3 = (() => {
    const v = janelas.filter((j) => j.m?.maior_componente_pct != null);
    if (v.length < 1) return null;
    const ult = v[v.length - 1], pri = v[0];
    const base = `Entre ${ult.i} e ${ult.f}, ${pc1(ult.m!.maior_componente_pct!)}% das instituições e empresas estavam conectadas numa mesma rede`;
    return v.length > 1 ? `${base}, contra ${pc1(pri.m!.maior_componente_pct!)}% em ${pri.i}–${pri.f}.` : `${base}.`;
  })();
  const fraseB4 = totais.e > 0 ? `Para cada R$ 1 da EMBRAPII, as empresas colocaram R$ ${(totais.em / totais.e).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` : null;
  const somaFin = totais.e + totais.em + totais.u + totais.s;
  const partes = [
    { k: "EMBRAPII", v: totais.e, c: COR }, { k: "Empresas", v: totais.em, c: "#38bdf8" },
    { k: "Instituições de pesquisa", v: totais.u, c: "#34d399" }, { k: "Sebrae", v: totais.s, c: "#a78bfa" },
  ];

  const dataTxt = extraido ? new Date(extraido).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
  const tt = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 } };
  const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

  if (carregando) return <p className="py-16 text-center text-muted-foreground">Carregando dados da EMBRAPII…</p>;
  if (erro) return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Falha ao consultar os dados de interação: {erro}</p>;

  const segBtn = (ativo: boolean) => `px-3 py-1.5 text-sm ${ativo ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Período</span>
          <select aria-label="Ano inicial" value={anoIni} onChange={(e) => setAnoIni(Math.min(Number(e.target.value), anoFim))} className="rounded-md border border-border bg-background px-2 py-1">
            {Array.from({ length: ANO_MAX - ANO_MIN + 1 }, (_, i) => ANO_MIN + i).map((a) => <option key={a}>{a}</option>)}
          </select>
          <span className="text-muted-foreground">a</span>
          <select aria-label="Ano final" value={anoFim} onChange={(e) => setAnoFim(Math.max(Number(e.target.value), anoIni))} className="rounded-md border border-border bg-background px-2 py-1">
            {Array.from({ length: ANO_MAX - ANO_MIN + 1 }, (_, i) => ANO_MIN + i).map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Tecnologia">
          <button className={segBtn(!soIA)} aria-pressed={!soIA} onClick={() => setSoIA(false)}>Todas as tecnologias</button>
          <button className={segBtn(soIA)} aria-pressed={soIA} onClick={() => setSoIA(true)}>Somente IA</button>
        </div>
      </div>

      {/* Topo */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-base text-foreground">Cada projeto EMBRAPII reúne uma instituição de pesquisa e uma ou mais empresas. Chamamos de parceria cada par instituição–empresa dentro de um projeto.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Projetos de cooperação", totais.p.toLocaleString("pt-BR")],
            ["Empresas que contrataram pesquisa", empresas.toLocaleString("pt-BR")],
            ["Valor investido", brl(totais.t)],
            ["Pedidos de patente ou registro", totalPedidos.toLocaleString("pt-BR")],
          ].map(([r, v]) => (
            <div key={r} className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{r}</p>
              <p className="mt-1 text-3xl font-extrabold text-foreground">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <Card titulo="1. A cooperação está crescendo?" sub="Projetos contratados por ano.">
        {fraseB1 && <Conclusao>{fraseB1}</Conclusao>}
        {projetosAno.length === 0 ? <SemDado /> : (<>
          <ResponsiveContainer width="100%" height={280} className="mt-4">
            <BarChart data={projetosAno}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip {...tt} formatter={(v: number) => [v.toLocaleString("pt-BR"), "Projetos"]} />
              <Bar dataKey="projetos" radius={[4, 4, 0, 0]}>
                {projetosAno.map((d) => <Cell key={d.ano} fill={COR} fillOpacity={d.ano >= ANO_CORRENTE ? 0.35 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <LegendaAndamento />
        </>)}
      </Card>

      <Card titulo="2. As empresas voltam a cooperar?" sub="Parte das parcerias do ano que repetem uma dupla instituição–empresa que já tinha trabalhado junta.">
        {fraseB2 && <Conclusao>{fraseB2}</Conclusao>}
        {acoes.length === 0 ? <SemDado /> : (<>
          <ResponsiveContainer width="100%" height={260} className="mt-4">
            <LineChart data={acoes}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtPct} domain={[0, 1]} tick={{ fontSize: 12 }} />
              <Tooltip {...tt} formatter={(v: number) => [pct(v), "Parcerias repetidas"]} />
              <Line dataKey="repetido" stroke={COR} strokeWidth={2} dot={(p: { cx: number; cy: number; payload: { ano: number } }) => <circle key={p.payload.ano} cx={p.cx} cy={p.cy} r={3} fill={COR} fillOpacity={p.payload.ano >= ANO_CORRENTE ? 0.35 : 1} />} />
            </LineChart>
          </ResponsiveContainer>
          <LegendaAndamento />
        </>)}
        <p className="mt-2 text-xs text-muted-foreground">Mais parcerias repetidas indicam relações que se consolidam; mais empresas novas indicam um sistema que se abre.</p>
      </Card>

      <Card titulo="3. O sistema está conectado ou fragmentado?" sub="Parte das organizações ligadas, direta ou indiretamente, numa mesma rede. Os períodos são fixos.">
        {fraseB3 && <Conclusao>{fraseB3}</Conclusao>}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {janelas.map(({ i, f, m }) => (
            <div key={i} className="rounded-lg border border-border p-4 text-center">
              <p className="text-sm font-semibold text-muted-foreground">{i}–{f}</p>
              <p className="mt-1 text-4xl font-extrabold text-foreground">{m?.maior_componente_pct != null ? `${pc1(m.maior_componente_pct)}%` : "—"}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Quanto mais perto de 100%, mais integrado o sistema; valores baixos indicam grupos isolados que não se conversam.</p>
      </Card>

      <Card titulo="4. Quem paga?" sub="Divisão do valor total dos projetos no período (corrigido pelo IPCA).">
        {fraseB4 && <Conclusao>{fraseB4}</Conclusao>}
        {somaFin <= 0 ? <SemDado /> : (
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex h-10 w-full overflow-hidden rounded-md" role="img" aria-label="Divisão do financiamento">
                {partes.map((p) => <div key={p.k} style={{ width: `${(p.v / somaFin) * 100}%`, background: p.c }} title={`${p.k}: ${pct(p.v / somaFin)}`} />)}
              </div>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {partes.map((p) => (
                  <li key={p.k} className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: p.c }} />{p.k}: <strong>{pct(p.v / somaFin)}</strong> <span className="text-muted-foreground">({brl(p.v)})</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">De onde vem o dinheiro público</p>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-1">Origem</th><th className="pb-1 text-right">Projetos</th><th className="pb-1 text-right">Valor público</th></tr></thead>
                <tbody>
                  {porParceiro.map((p) => (
                    <tr key={p.k} className="border-t border-border">
                      <td className="py-1.5 pr-2">{nomeFin(p.k)}</td>
                      <td className="py-1.5 text-right font-mono">{p.proj.toLocaleString("pt-BR")}</td>
                      <td className="py-1.5 text-right font-mono">{brl(p.pub)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Card titulo="5. A cooperação gera resultado?" sub="Pedidos de patente ou registro gerados pelos projetos.">
        <div className="space-y-2">
          {taxaPi != null && taxaPi > 0 && <Conclusao>{pc1(taxaPi)}% dos projetos concluídos geraram ao menos um pedido de patente ou registro, cerca de 1 em cada {umEm(taxaPi)}.</Conclusao>}
          {cotit != null && <Conclusao>Em {pc1(cotit)}% dos pedidos, a instituição de pesquisa e a empresa dividem a titularidade.</Conclusao>}
        </div>
        {piTipos.length === 0 ? <SemDado /> : (
          <ResponsiveContainer width="100%" height={Math.max(160, piTipos.length * 40)} className="mt-4">
            <BarChart data={piTipos} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="tipo" width={170} tick={{ fontSize: 12 }} />
              <Tooltip {...tt} formatter={(v: number) => [v.toLocaleString("pt-BR"), "Pedidos"]} />
              <Bar dataKey="pedidos" fill={COR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <details className="rounded-xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-lg font-bold text-foreground">Detalhes técnicos</summary>
        <div className="mt-4 space-y-8">
          <dl className="grid gap-2 text-sm sm:grid-cols-[180px_1fr]">
            <dt className="font-semibold">Laço ou parceria</dt><dd className="text-muted-foreground">Um par instituição–empresa dentro de um projeto.</dd>
            <dt className="font-semibold">Nó</dt><dd className="text-muted-foreground">Uma organização (instituição ou empresa) na rede.</dd>
            <dt className="font-semibold">Componente</dt><dd className="text-muted-foreground">Um grupo de organizações ligadas entre si; muitos componentes significam rede fragmentada.</dd>
            <dt className="font-semibold">Maior componente</dt><dd className="text-muted-foreground">Parte das organizações que está no maior grupo conectado.</dd>
            <dt className="font-semibold">HHI</dt><dd className="text-muted-foreground">Índice de concentração das parcerias entre as unidades, de 0 a 1; perto de 0 é bem distribuído, perto de 1 é concentrado em poucas unidades.</dd>
            <dt className="font-semibold">Cotitularidade</dt><dd className="text-muted-foreground">Pedido de patente ou registro dividido entre a instituição e a empresa.</dd>
          </dl>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Laços por tipo (% dos laços do ano)</p>
            {acoes.length === 0 ? <SemDado /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={acoes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={fmtPct} domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <Tooltip {...tt} formatter={(v: number) => pct(v)} />
                  <Legend />
                  <Line dataKey="estreante" name="Empresa estreante" stroke={COR} strokeWidth={2} dot={false} />
                  <Line dataKey="repetido" name="Parceria repetida" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line dataKey="interestadual" name="Interestadual" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Estrutura da rede por período</p>
            <div className="grid gap-3 md:grid-cols-3">
              {janelas.map(({ i, f, m }) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-bold text-foreground">{i}–{f}</p>
                  {!m ? <p className="mt-2 text-sm text-muted-foreground">Sem dado</p> : (
                    <dl className="mt-2 grid grid-cols-2 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Nós</dt><dd className="text-right font-mono">{n(m.nos).toLocaleString("pt-BR")}</dd>
                      <dt className="text-muted-foreground">Componentes</dt><dd className="text-right font-mono">{n(m.componentes).toLocaleString("pt-BR")}</dd>
                      <dt className="text-muted-foreground">Maior componente</dt><dd className="text-right font-mono">{pct(m.maior_componente_pct)}</dd>
                      <dt className="text-muted-foreground">HHI entre unidades</dt><dd className="text-right font-mono">{m.hhi_origem?.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) ?? "—"}</dd>
                    </dl>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Maior componente e HHI por ano</p>
            {redeAnual.length === 0 ? <SemDado /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={redeAnual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="a" tickFormatter={fmtPct} domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="b" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip {...tt} formatter={(v: number, k: string) => (k === "Maior componente" ? pct(v) : v.toLocaleString("pt-BR", { maximumFractionDigits: 3 }))} />
                  <Legend />
                  <Line yAxisId="a" dataKey="maior" name="Maior componente" stroke={COR} strokeWidth={2} dot={false} />
                  <Line yAxisId="b" dataKey="hhi" name="HHI entre unidades" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Participação de cada financiador por ano</p>
            {recursosAno.length === 0 ? <SemDado /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recursosAno} stackOffset="expand">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={fmtPct} tick={{ fontSize: 12 }} />
                  <Tooltip {...tt} formatter={(v: number) => pct(v)} />
                  <Legend />
                  <Bar dataKey="EMBRAPII" stackId="r" fill={COR} />
                  <Bar dataKey="Empresas" stackId="r" fill="#38bdf8" />
                  <Bar dataKey="Unidades" stackId="r" fill="#34d399" />
                  <Bar dataKey="Sebrae" stackId="r" fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Pedidos por ano de depósito e tipo</p>
            {piAno.length === 0 ? <SemDado /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={piAno}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip {...tt} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {tiposPresentes.map((t) => <Bar key={t} dataKey={t} stackId="p" fill={CORES_PI[TIPOS_PI.indexOf(t)]} />)}
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Cotitularidade = pedidos com cotitularidade ÷ pedidos, sem contar "Transferência de Tecnologia".</p>
          </div>
        </div>
      </details>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Notas metodológicas</p>
        Fonte: EMBRAPII, painel público de dados (base SRInfo), extraído em {dataTxt}, com atualização mensal automática. Valores corrigidos pelo IPCA. Os dados cobrem a cooperação mediada pela EMBRAPII, um canal específico do SNI, e não o sistema inteiro. O ano corrente está incompleto e projetos recentes ainda não tiveram tempo de gerar PI. O ganho de TRL só é comparável a partir de 2022, por mudança na forma de registro.
      </div>
    </div>
  );
}

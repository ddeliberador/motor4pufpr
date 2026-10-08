import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import { ANO_MIN, ANO_MAX, TEC_IA, razao } from "@/lib/interacao";

type Ind = { ano: number | null; tecnologia: string | null; lacos: number | null; lacos_destino_novo: number | null; lacos_par_repetido: number | null; lacos_interestaduais: number | null };
type Met = { recorte: string; ano_inicio: number; ano_fim: number; nos: number | null; componentes: number | null; maior_componente_pct: number | null; hhi_origem: number | null };
type Rec = { ano: number | null; tecnologia: string | null; fin_parceiro: string | null; projetos: number | null; valor_embrapii: number | null; valor_empresas: number | null; valor_unidades: number | null; valor_sebrae: number | null; valor_total: number | null };
type Coorte = { ano: number | null; tecnologia: string | null; concluidos: number | null; concluidos_com_pi: number | null };
type Pi = { ano: number | null; tipo_pedido: string | null; tecnologia: string | null; pedidos: number | null; cotitularidade: number | null };

const COR = "#f59e0b";
const n = (v: number | null | undefined) => Number(v ?? 0);
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const brl = (v: number) => v >= 1e9 ? `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} bi` : `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
const TIPOS_PI = ["Patente - Invenção", "Patente - Modelo Utilidade", "Programa de Computador", "Desenho Industrial", "Topografia de Circuito Integrado", "Transferência de Tecnologia", "Outros"];
const CORES_PI = ["#f59e0b", "#fbbf24", "#38bdf8", "#a78bfa", "#34d399", "#94a3b8", "#f472b6"];

function Card({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-xl font-bold text-foreground">{titulo}</h3>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
const SemDado = () => <p className="py-10 text-center text-sm text-muted-foreground">Sem dado para o filtro escolhido.</p>;

export default function CenarioInteracao() {
  const [ind, setInd] = useState<Ind[]>([]);
  const [met, setMet] = useState<Met[]>([]);
  const [rec, setRec] = useState<Rec[]>([]);
  const [coorte, setCoorte] = useState<Coorte[]>([]);
  const [pi, setPi] = useState<Pi[]>([]);
  const [extraido, setExtraido] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [anoIni, setAnoIni] = useState(ANO_MIN);
  const [anoFim, setAnoFim] = useState(ANO_MAX);
  const [tecs, setTecs] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c, d, e, f] = await Promise.all([
          fetchAll<Ind>(supabase.from("vw_interacao_indicadores_ano").select("ano,tecnologia,lacos,lacos_destino_novo,lacos_par_repetido,lacos_interestaduais").eq("fonte", "embrapii").eq("tipo", "cooperacao_pdi")),
          fetchAll<Met>(supabase.from("interacao_metricas_rede").select("recorte,ano_inicio,ano_fim,nos,componentes,maior_componente_pct,hhi_origem").eq("fonte", "embrapii").eq("tipo", "cooperacao_pdi")),
          fetchAll<Rec>(supabase.from("vw_embrapii_recursos_ano").select("*")),
          fetchAll<Coorte>(supabase.from("vw_embrapii_resultados_coorte").select("ano,tecnologia,concluidos,concluidos_com_pi")),
          fetchAll<Pi>(supabase.from("vw_embrapii_pi_ano").select("ano,tipo_pedido,tecnologia,pedidos,cotitularidade")),
          supabase.from("embrapii_extracoes").select("extraido_em").order("extraido_em", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (f.error) throw f.error;
        setInd(a); setMet(b); setRec(c); setCoorte(d); setPi(e);
        setExtraido(f.data?.extraido_em ?? null);
      } catch (err) {
        setErro((err as Error).message);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const tecnologias = useMemo(
    () => [...new Set(ind.map((r) => r.tecnologia).filter(Boolean) as string[])].sort((x, y) => x.localeCompare(y, "pt-BR")),
    [ind],
  );
  const passa = (r: { ano: number | null; tecnologia: string | null }) =>
    r.ano != null && r.ano >= anoIni && r.ano <= anoFim && (tecs.size === 0 || (r.tecnologia != null && tecs.has(r.tecnologia)));
  const anos = useMemo(() => Array.from({ length: anoFim - anoIni + 1 }, (_, i) => anoIni + i), [anoIni, anoFim]);

  // Ações
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
  }, [ind, anos, tecs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rede
  const recorte = tecs.size === 1 ? [...tecs][0] : "todos";
  const janelas = [[2014, 2018], [2019, 2022], [2023, 2026]].map(([i, f]) => ({
    i, f, m: met.find((x) => x.recorte === recorte && x.ano_inicio === i && x.ano_fim === f) ?? null,
  }));
  const redeAnual = met
    .filter((x) => x.recorte === recorte && x.ano_inicio === x.ano_fim && x.ano_inicio >= anoIni && x.ano_inicio <= anoFim)
    .sort((a, b) => a.ano_inicio - b.ano_inicio)
    .map((x) => ({ ano: x.ano_inicio, maior: x.maior_componente_pct, hhi: x.hhi_origem }));

  // Recursos
  const { recursosAno, porParceiro } = useMemo(() => {
    const m = new Map<number, { e: number; em: number; u: number; s: number; t: number }>();
    const p = new Map<string, { proj: number; pub: number; tot: number }>();
    for (const r of rec) if (passa(r)) {
      const o = m.get(r.ano!) ?? { e: 0, em: 0, u: 0, s: 0, t: 0 };
      o.e += n(r.valor_embrapii); o.em += n(r.valor_empresas); o.u += n(r.valor_unidades); o.s += n(r.valor_sebrae); o.t += n(r.valor_total);
      m.set(r.ano!, o);
      const k = r.fin_parceiro || "Não informado";
      const q = p.get(k) ?? { proj: 0, pub: 0, tot: 0 };
      q.proj += n(r.projetos); q.pub += n(r.valor_embrapii); q.tot += n(r.valor_total);
      p.set(k, q);
    }
    const recursosAno = anos.filter((a) => m.has(a)).map((a) => {
      const o = m.get(a)!;
      const soma = o.e + o.em + o.u + o.s;
      return { ano: a, EMBRAPII: razao(o.e, soma), Empresas: razao(o.em, soma), Unidades: razao(o.u, soma), Sebrae: razao(o.s, soma), total: o.t };
    });
    const porParceiro = [...p.entries()].map(([k, v]) => ({ k, ...v })).sort((a, b) => b.tot - a.tot);
    return { recursosAno, porParceiro };
  }, [rec, anos, tecs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resultados
  const coorteSerie = useMemo(() => {
    const m = new Map<number, { c: number; p: number }>();
    for (const r of coorte) if (passa(r)) {
      const o = m.get(r.ano!) ?? { c: 0, p: 0 };
      o.c += n(r.concluidos); o.p += n(r.concluidos_com_pi); m.set(r.ano!, o);
    }
    return anos.filter((a) => m.has(a)).map((a) => ({ ano: a, taxa: razao(m.get(a)!.p, m.get(a)!.c), concluidos: m.get(a)!.c }));
  }, [coorte, anos, tecs]); // eslint-disable-line react-hooks/exhaustive-deps

  const { piAno, cotit, tiposPresentes } = useMemo(() => {
    const m = new Map<number, Record<string, number>>();
    let ped = 0, cot = 0;
    const presentes = new Set<string>();
    for (const r of pi) if (passa(r)) {
      const t = r.tipo_pedido || "Outros";
      presentes.add(t);
      const o = m.get(r.ano!) ?? {};
      o[t] = (o[t] ?? 0) + n(r.pedidos); m.set(r.ano!, o);
      if (t !== "Transferência de Tecnologia") { ped += n(r.pedidos); cot += n(r.cotitularidade); }
    }
    return {
      piAno: anos.filter((a) => m.has(a)).map((a) => ({ ano: a, ...m.get(a)! })),
      cotit: razao(cot, ped),
      tiposPresentes: TIPOS_PI.filter((t) => presentes.has(t)),
    };
  }, [pi, anos, tecs]); // eslint-disable-line react-hooks/exhaustive-deps

  const alternarTec = (t: string) => setTecs((s) => { const x = new Set(s); x.has(t) ? x.delete(t) : x.add(t); return x; });
  const dataTxt = extraido ? new Date(extraido).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
  const tt = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 } };
  const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

  if (carregando) return <p className="py-16 text-center text-muted-foreground">Carregando dados da EMBRAPII…</p>;
  if (erro) return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Falha ao consultar os dados de interação: {erro}</p>;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-foreground">Anos</span>
          <select value={anoIni} onChange={(e) => setAnoIni(Math.min(Number(e.target.value), anoFim))} className="rounded-md border border-border bg-background px-2 py-1">
            {Array.from({ length: 13 }, (_, i) => 2014 + i).map((a) => <option key={a}>{a}</option>)}
          </select>
          <span className="text-muted-foreground">a</span>
          <select value={anoFim} onChange={(e) => setAnoFim(Math.max(Number(e.target.value), anoIni))} className="rounded-md border border-border bg-background px-2 py-1">
            {Array.from({ length: 13 }, (_, i) => 2014 + i).map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm font-semibold text-foreground">Tecnologia habilitadora</span>
          <button onClick={() => setTecs(new Set([TEC_IA]))}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${tecs.size === 1 && tecs.has(TEC_IA) ? "border-primary bg-primary text-primary-foreground" : "border-primary/50 text-primary hover:bg-primary/10"}`}>
            Somente IA
          </button>
          <button onClick={() => setTecs(new Set())}
            className={`rounded-full border px-3 py-1 text-xs ${tecs.size === 0 ? "border-foreground/40 bg-muted font-semibold" : "border-border text-muted-foreground hover:bg-muted"}`}>
            Todas
          </button>
          {tecnologias.map((t) => (
            <button key={t} onClick={() => alternarTec(t)}
              className={`rounded-full border px-3 py-1 text-xs ${tecs.has(t) ? "border-foreground/40 bg-muted font-semibold text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <Card titulo="Ações — laços entre ICT e empresa" sub="Cada laço é um vínculo projeto–empresa contratado por uma unidade EMBRAPII. Percentuais calculados sobre a soma dos laços filtrados.">
        {acoes.length === 0 ? <SemDado /> : (
          <div className="grid gap-6 lg:grid-cols-2">
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={acoes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip {...tt} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                <Bar dataKey="lacos" name="Laços no ano" fill={COR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card titulo="Estrutura da rede" sub={`Recorte: ${recorte === "todos" ? "todas as tecnologias" : recorte}${tecs.size > 1 ? " (com várias tecnologias selecionadas, usa-se a rede completa)" : ""}. As janelas são fixas e não seguem o filtro de anos.`}>
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
        <div className="mt-5">
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
      </Card>

      <Card titulo="Recursos" sub="Participação de cada financiador no valor dos projetos contratados no ano (valores corrigidos pelo IPCA).">
        {recursosAno.length === 0 ? <SemDado /> : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
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
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Quem financia a parte pública</p>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-1">Parceiro</th><th className="pb-1 text-right">Projetos</th><th className="pb-1 text-right">Parte EMBRAPII</th></tr></thead>
                <tbody>
                  {porParceiro.map((p) => (
                    <tr key={p.k} className="border-t border-border">
                      <td className="py-1.5 pr-2">{p.k}</td>
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

      <Card titulo="Resultados" sub="Propriedade intelectual gerada pelos projetos.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">% de projetos concluídos com ao menos um pedido de PI, por ano de contrato</p>
            {coorteSerie.length === 0 ? <SemDado /> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={coorteSerie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={fmtPct} tick={{ fontSize: 12 }} />
                  <Tooltip {...tt} formatter={(v: number, k: string) => (k === "concluidos" ? v : pct(v))} />
                  <Line dataKey="taxa" name="Concluídos com PI" stroke={COR} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Pedidos por ano de depósito e tipo</p>
              <p className="text-sm"><span className="text-muted-foreground">Cotitularidade: </span><span className="font-mono font-bold">{pct(cotit)}</span></p>
            </div>
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
      </Card>

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Notas metodológicas</p>
        Fonte: EMBRAPII, painel público de dados (base SRInfo), extraído em {dataTxt}, atualização mensal automática. Valores corrigidos pelo IPCA. Os dados cobrem a cooperação mediada pela EMBRAPII, um canal específico do SNI, e não o sistema inteiro. O ano corrente está incompleto e projetos recentes ainda não tiveram tempo de gerar PI. O ganho de TRL só é comparável a partir de 2022, por mudança na forma de registro.
      </div>
    </div>
  );
}

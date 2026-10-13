import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetchAll";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { SITUACOES_ENERGIA, corSituacao, fmtGwh, fmtPct, mmgdQuedaAtipica, razaoPct } from "@/lib/infraEstados";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Balanco {
  uf: string; ano: number; geracao_gwh: number; consumo_gwh: number; razao_geracao_consumo: number; razao_brasil: number;
  situacao: string; pct_industrial: number; pct_industrial_brasil: number; consumo_per_capita_kwh: number; per_capita_brasil: number;
  populacao_estimada: number; mmgd_mw: number | null; pct_mmgd: number | null; crescimento_consumo_5a_pct: number | null;
}
interface Classe { uf: string; ano: number; classe: string; rotulo: string; ordem: number; gwh: number; pct_do_consumo: number }
interface Serie { uf: string; ano: number; geracao_gwh: number; consumo_gwh: number }
type Carga = { status: "carregando" } | { status: "erro"; erro: string } | { status: "ok"; balanco: Balanco[]; classes: Classe[]; br: { classe: string; gwh: number }[]; serie: Serie[]; mmgdAnt: Record<string, number> };

const CORES_CLASSE = ["hsl(205 60% 50%)", "hsl(15 60% 52%)", "hsl(45 75% 55%)", "hsl(110 35% 45%)", "hsl(280 30% 55%)", "hsl(190 45% 60%)", "hsl(330 40% 58%)", "hsl(0 0% 60%)"];
const tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };
const n = (v: unknown) => (v == null ? null : Number(v));

type Feature = { properties: { sigla: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } };
const projetar = (lon: number, lat: number) => [(lon + 74.2) / 40.6 * 900, (5.6 - lat) / 39.6 * 900];
const caminho = (f: Feature) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates as number[][][]] : f.geometry.coordinates as number[][][][])
  .map(p => p.map(r => r.map(([lon, lat], i) => `${i ? "L" : "M"}${projetar(lon, lat).join(",")}`).join("") + "Z").join("")).join("");

function BarraClasses({ titulo, itens }: { titulo: string; itens: { rotulo: string; pct: number; cor: string }[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-foreground">{titulo}</p>
      <div className="flex h-7 w-full overflow-hidden rounded">
        {itens.map(i => <div key={i.rotulo} style={{ width: `${i.pct}%`, background: i.cor }} title={`${i.rotulo}: ${fmtPct(i.pct)}%`} />)}
      </div>
    </div>
  );
}

export default function BalancoEnergia({ dcPorUF }: { dcPorUF: Record<string, number> | null }) {
  const [uf, setUf] = useState("PR");
  const [carga, setCarga] = useState<Carga>({ status: "carregando" });
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    fetch("/br-uf.geojson").then(r => r.json()).then(j => setFeatures(j.features)).catch(() => setFeatures([]));
    Promise.all([
      fetchAll<Balanco>(supabase.from("vw_energia_balanco_uf" as never).select("*").order("uf")),
      fetchAll<Classe>(supabase.from("vw_energia_consumo_classe_uf" as never).select("uf,ano,classe,rotulo,ordem,gwh,pct_do_consumo").order("uf").order("ano").order("ordem")),
      fetchAll<Serie>(supabase.from("vw_energia_serie_uf" as never).select("uf,ano,geracao_gwh,consumo_gwh").order("uf").order("ano")),
    ]).then(async ([b, c, s]) => {
      if (!b.length) throw new Error("sem dados");
      const ano = Number(b[0].ano);
      const [{ data: br, error: e1 }, { data: ant, error: e2 }] = await Promise.all([
        supabase.from("energia_uf_epe").select("indicador,valor").eq("uf", "BR").eq("ano", ano).like("indicador", "consumo_%_gwh").order("indicador").range(0, 99),
        supabase.from("energia_uf_epe").select("uf,valor").eq("indicador", "capacidade_mmgd_mw").eq("ano", ano - 1).order("uf").range(0, 99),
      ]);
      if (e1 || e2) throw new Error((e1 ?? e2)!.message);
      setCarga({
        status: "ok",
        balanco: b.map(x => ({ ...x, ano: Number(x.ano), geracao_gwh: Number(x.geracao_gwh), consumo_gwh: Number(x.consumo_gwh), razao_geracao_consumo: Number(x.razao_geracao_consumo), razao_brasil: Number(x.razao_brasil), pct_industrial: Number(x.pct_industrial), pct_industrial_brasil: Number(x.pct_industrial_brasil), consumo_per_capita_kwh: Number(x.consumo_per_capita_kwh), per_capita_brasil: Number(x.per_capita_brasil), populacao_estimada: Number(x.populacao_estimada), mmgd_mw: n(x.mmgd_mw), pct_mmgd: n(x.pct_mmgd), crescimento_consumo_5a_pct: n(x.crescimento_consumo_5a_pct) })),
        classes: c.filter(x => Number(x.ano) === ano).map(x => ({ ...x, gwh: Number(x.gwh), pct_do_consumo: Number(x.pct_do_consumo) })),
        br: (br ?? []).filter(r => r.indicador !== "consumo_gwh").map(r => ({ classe: r.indicador.replace(/^consumo_|_gwh$/g, ""), gwh: Number(r.valor) })),
        serie: s.map(x => ({ uf: x.uf, ano: Number(x.ano), geracao_gwh: Number(x.geracao_gwh), consumo_gwh: Number(x.consumo_gwh) })),
        mmgdAnt: Object.fromEntries((ant ?? []).map(r => [r.uf, Number(r.valor)])),
      });
    }).catch(e => setCarga({ status: "erro", erro: String(e?.message ?? e) }));
  }, []);

  const d = carga.status === "ok" ? carga.balanco.find(x => x.uf === uf) : undefined;
  const classesUF = useMemo(() => carga.status === "ok" ? carga.classes.filter(c => c.uf === uf).sort((a, b) => a.ordem - b.ordem) : [], [carga, uf]);
  const itensUF = classesUF.map((c, i) => ({ rotulo: c.rotulo, pct: c.pct_do_consumo, cor: CORES_CLASSE[i % CORES_CLASSE.length] }));
  const itensBR = useMemo(() => {
    if (carga.status !== "ok") return [];
    const tot = carga.br.reduce((s, r) => s + r.gwh, 0);
    return classesUF.map((c, i) => ({ rotulo: c.rotulo, pct: tot ? 100 * (carga.br.find(r => r.classe === c.classe)?.gwh ?? 0) / tot : 0, cor: CORES_CLASSE[i % CORES_CLASSE.length] }));
  }, [carga, classesUF]);
  const serie = carga.status === "ok" ? carga.serie.filter(s => s.uf === uf) : [];
  const nome = ESTADOS[uf] ?? uf;
  const dc = dcPorUF ? dcPorUF[uf] ?? 0 : null;
  const queda = carga.status === "ok" && d ? mmgdQuedaAtipica(d.mmgd_mw, carga.mmgdAnt[uf]) : false;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold text-foreground">Gera mais ou menos do que consome?</h2>
      {carga.status === "carregando" ? <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        : carga.status === "erro" ? <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"><strong className="text-foreground">Fonte indisponível no momento.</strong> <span className="text-xs">({carga.erro})</span></div>
        : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            <figure className="min-w-0">
              <label htmlFor="balanco-uf" className="mb-2 block text-sm font-semibold">Estado</label>
              <select id="balanco-uf" value={uf} onChange={e => setUf(e.target.value)} className="mb-3 h-11 w-full rounded-md border border-input bg-background px-3 text-base">
                {Object.entries(ESTADOS).sort((a, b) => a[1].localeCompare(b[1], "pt-BR")).map(([s, nm]) => <option key={s} value={s}>{nm} · {s}</option>)}
              </select>
              <svg viewBox="0 0 900 900" className="mx-auto block aspect-square w-full max-w-[420px]" aria-label="Mapa da situação energética por estado">
                {features.map(f => {
                  const s = f.properties.sigla;
                  const sit = carga.balanco.find(b => b.uf === s)?.situacao;
                  return <path key={s} d={caminho(f)} fill={corSituacao(sit)} stroke={s === uf ? "hsl(var(--foreground))" : "hsl(var(--background))"} strokeWidth={s === uf ? 5 : 1.5}
                    role="button" tabIndex={0} aria-label={`Selecionar ${ESTADOS[s]}`} onClick={() => setUf(s)} className="cursor-pointer hover:opacity-75"><title>{ESTADOS[s]} · {sit ?? "indisponível"}</title></path>;
                })}
              </svg>
              <figcaption><ul className="mt-2 space-y-1 text-xs">{SITUACOES_ENERGIA.map(s => (
                <li key={s} className={`flex items-center gap-2 ${d?.situacao === s ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  <svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="2" fill={corSituacao(s)} /></svg>
                  {s} · {carga.balanco.filter(b => b.situacao === s).length} estados
                </li>))}</ul></figcaption>
            </figure>
            {d ? (
              <div className="min-w-0 space-y-4">
                <p className="flex items-center gap-2 text-sm font-semibold"><svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="2" fill={corSituacao(d.situacao)} /></svg>{nome}: {d.situacao}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-4"><p className="text-2xl font-bold">{fmtGwh(d.geracao_gwh)} GWh</p><p className="text-xs text-muted-foreground">Energia gerada em {d.ano}</p></div>
                  <div className="rounded-lg border border-border p-4"><p className="text-2xl font-bold">{fmtGwh(d.consumo_gwh)} GWh</p><p className="text-xs text-muted-foreground">Energia consumida da rede em {d.ano}</p></div>
                </div>
                <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-base font-semibold">Em {d.ano}, {nome} gerou {razaoPct(d.razao_geracao_consumo).toLocaleString("pt-BR")}% da energia que consumiu da rede. A média do Brasil é {razaoPct(d.razao_brasil)}%.</p>
                <p className="text-xs text-muted-foreground">O Brasil passa de 100% porque a geração inclui perdas na transmissão, autoprodução e geração distribuída, que não entram no consumo da rede. Por isso cada estado é comparado com a média do país, não com 100%.</p>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">{nome} {d.situacao === "Exporta energia" ? "exporta energia" : d.situacao === "Perto do equilíbrio" ? "está perto do equilíbrio" : "depende de energia de outros estados"} e {dc == null ? "o número de datacenters está indisponível no momento" : `${d.situacao === "Exporta energia" ? "tem" : "concentra"} ${dc} ${dc === 1 ? "datacenter" : "datacenters"}`}.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Situação energética (EPE) ao lado da infraestrutura de dados (PeeringDB, camada L3): mostra onde há energia sobrando e onde está o processamento.</p>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Sem dados para {nome}.</p>}
          </div>

          {d && <>
            <div>
              <h3 className="text-lg font-bold">Quem consome a energia do estado?</h3>
              <p className="mt-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-base font-semibold">A indústria responde por {fmtPct(d.pct_industrial)}% do consumo de {nome}, contra {fmtPct(d.pct_industrial_brasil)}% no Brasil.</p>
              <div className="mt-3 space-y-3">
                <BarraClasses titulo={nome} itens={itensUF} />
                <BarraClasses titulo="Brasil" itens={itensBR} />
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{itensUF.map((i, k) => (
                  <li key={i.rotulo} className="flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2" fill={i.cor} /></svg>{i.rotulo}: {fmtPct(i.pct)}% (Brasil {fmtPct(itensBR[k]?.pct ?? 0)}%)</li>))}</ul>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-lg font-bold">Consumo por habitante</h3>
                <p className="mt-2 text-2xl font-bold">{fmtGwh(d.consumo_per_capita_kwh)} kWh</p>
                <p className="text-xs text-muted-foreground">por habitante em {d.ano}; Brasil: {fmtGwh(d.per_capita_brasil)} kWh · população estimada de {(d.populacao_estimada / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} milhões</p>
                {d.crescimento_consumo_5a_pct != null && <p className="mt-2 text-sm">O consumo {d.crescimento_consumo_5a_pct >= 0 ? "cresceu" : "caiu"} {fmtPct(Math.abs(d.crescimento_consumo_5a_pct))}% em 5 anos.</p>}
              </div>
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-lg font-bold">Geração distribuída</h3>
                <p className="mt-2 text-2xl font-bold">{d.mmgd_mw == null ? "—" : `${fmtGwh(d.mmgd_mw)} MW`}</p>
                <p className="text-xs text-muted-foreground">{d.pct_mmgd != null && `${fmtPct(d.pct_mmgd)}% da capacidade do estado · `}painéis solares de telhados e pequenas usinas (MMGD). Essa potência não aparece no mapa de usinas da ANEEL, que só traz as usinas centralizadas.</p>
                {queda && <p className="mt-2 text-[11px] text-muted-foreground">⚠ Valor da fonte em revisão; queda atípica em relação a {d.ano - 1}.</p>}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold">Geração e consumo ao longo do tempo</h3>
              <p className="mt-1 text-xs text-muted-foreground">A geração hidrelétrica varia muito com a chuva de cada ano.</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={serie} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ano" tick={tick} />
                  <YAxis tick={tick} tickFormatter={v => fmtGwh(v)} width={60} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, k: string) => [`${fmtGwh(v)} GWh`, k]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="geracao_gwh" name="Geração" stroke="hsl(150 45% 42%)" strokeWidth={2} dot={false} />
                  <Line dataKey="consumo_gwh" name="Consumo da rede" stroke="hsl(15 60% 52%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>}

          <p className="text-[11px] leading-relaxed text-muted-foreground">Fonte: EPE, Anuário Estatístico de Energia Elétrica 2026 (ano-base 2025): geração por UF (Tabela 2.5, inclui autoprodução e MMGD), consumo da rede por UF e classe (Tabelas 3.12 a 3.22, não inclui autoconsumo de MMGD nem autoprodução consumida no local), consumo per capita (Tabela 3.63, população do IBGE) e capacidade em MMGD (Tabela 2.2). Classificação: exporta energia quando a relação geração/consumo do estado é pelo menos 25% maior que a do Brasil; depende de outros estados quando é pelo menos 25% menor.</p>
        </div>
      )}
    </section>
  );
}

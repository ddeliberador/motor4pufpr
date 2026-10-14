import { useEffect, useState } from "react";
import { Cable, Network, Server, Zap, TriangleAlert, ArrowUpRight, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { fraseBalanco, type EstadoCruzamento } from "@/lib/cruzamentoInfra";

export interface DetalheInfra {
  energia: { rotulo: string; valor: string }[];
  conectividade: { rotulo: string; valor: string }[];
  datacenters: { nome: string; cidade: string; org: string }[] | null;
}
type Painel = Record<string, string | number | null>;
type Apontamento = { codigo: string; tipo: "critico" | "oportunidade" | "contexto"; titulo: string; texto: string; ordem: number };
type Regra = { codigo: string; condicao: string; justificativa: string };
type Fluxo = { origem: string; destino: string; gwh_liquido: number };

const n = (v: unknown, c = 1) => v == null ? "indisponível" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
const num = (v: unknown) => v == null ? null : Number(v);
const POS: Record<string, [number, number]> = { N: [70, 30], NE: [230, 40], SE: [170, 130], S: [100, 185] };
const GRUPOS = [
  { tipo: "critico", nome: "Pontos críticos", cor: "text-[hsl(var(--energia-depende))]", Icon: TriangleAlert },
  { tipo: "oportunidade", nome: "Possibilidades de investimento", cor: "text-[hsl(var(--energia-exporta))]", Icon: ArrowUpRight },
  { tipo: "contexto", nome: "Contexto", cor: "text-muted-foreground", Icon: Info },
] as const;

function Diagrama({ fluxos, destaque }: { fluxos: Fluxo[]; destaque: string | null }) {
  const max = Math.max(1, ...fluxos.map(f => Math.abs(f.gwh_liquido)));
  return <svg viewBox="0 0 300 220" className="h-40 w-full" role="img" aria-label="Fluxos líquidos entre subsistemas (ONS)">
    <defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0L10,5L0,10z" fill="hsl(var(--muted-foreground))" /></marker></defs>
    {fluxos.map(f => {
      const [a, b] = f.gwh_liquido >= 0 ? [f.origem, f.destino] : [f.destino, f.origem];
      const p = POS[a], q = POS[b]; if (!p || !q) return null;
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), k = 26 / L;
      return <g key={`${f.origem}${f.destino}`}><line x1={p[0] + dx * k} y1={p[1] + dy * k} x2={q[0] - dx * k} y2={q[1] - dy * k} stroke="hsl(var(--muted-foreground))" strokeWidth={1 + 7 * Math.abs(f.gwh_liquido) / max} markerEnd="url(#seta)" opacity={0.7} />
        <text x={(p[0] + q[0]) / 2} y={(p[1] + q[1]) / 2 - 6} fontSize="9" textAnchor="middle" fill="hsl(var(--foreground))">{n(Math.abs(f.gwh_liquido) / 1000, 1)} TWh</text></g>;
    })}
    {Object.entries(POS).map(([s, [x, y]]) => <g key={s}><circle cx={x} cy={y} r={20} fill={s === destaque ? "hsl(var(--primary))" : "hsl(var(--muted))"} stroke="hsl(var(--border))" />
      <text x={x} y={y + 4} fontSize="11" fontWeight="700" textAnchor="middle" fill={s === destaque ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}>{s}</text></g>)}
  </svg>;
}

function Barra({ rotulo, valor, brasil, unidade }: { rotulo: string; valor: number | null; brasil: number | null; unidade: string }) {
  const max = Math.max(valor ?? 0, brasil ?? 0, 1);
  return <div className="space-y-1 text-xs">
    <p><strong className="text-sm">{n(valor)}</strong> {unidade} · Brasil {n(brasil)}</p>
    <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${100 * (valor ?? 0) / max}%` }} /></div>
    <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-muted-foreground/50" style={{ width: `${100 * (brasil ?? 0) / max}%` }} /></div>
    <p className="text-[10px] text-muted-foreground">{rotulo}: estado (azul) e Brasil (cinza)</p>
  </div>;
}

export default function PainelEstadoInfraestrutura({ estado, detalhe, onClose }: { estado: EstadoCruzamento | null; detalhe: DetalheInfra | null; onClose: () => void }) {
  const uf = estado?.uf ?? null, dc = estado?.dc ?? null;
  const [p, setP] = useState<Painel | null | "erro">(null);
  const [aps, setAps] = useState<Apontamento[] | null | "erro">(null);
  const [regras, setRegras] = useState<Record<string, Regra>>({});
  const [fluxos, setFluxos] = useState<Fluxo[]>([]);

  useEffect(() => {
    if (!uf) return;
    let vivo = true; setP(null); setAps(null);
    const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: object) => any };
    db.from("vw_uf_infra_painel").select("*").eq("uf", uf).maybeSingle().then(({ data, error }: any) => vivo && setP(error || !data ? "erro" : data));
    db.rpc("fn_uf_infra_apontamentos", { p_uf: uf, p_datacenters: dc }).then(({ data, error }: any) => vivo && setAps(error ? "erro" : data ?? []));
    return () => { vivo = false; };
  }, [uf, dc]);

  useEffect(() => {
    if (!uf || Object.keys(regras).length) return;
    const db = supabase as unknown as { from: (t: string) => any };
    db.from("infra_regras_uf").select("codigo,condicao,justificativa").order("ordem").then(({ data }: any) => data && setRegras(Object.fromEntries((data as Regra[]).map(r => [r.codigo, r]))));
    db.from("ons_intercambio_subsistema").select("ano,origem,destino,gwh_liquido").order("ano", { ascending: false }).order("origem").then(({ data }: any) => {
      const rows = (data ?? []) as (Fluxo & { ano: number })[]; const ano = rows[0]?.ano;
      setFluxos(rows.filter(r => r.ano === ano).map(r => ({ ...r, gwh_liquido: Number(r.gwh_liquido) })));
    });
  }, [uf, regras]);

  const d = p && p !== "erro" ? p : null;
  const cfurh = num(d?.cfurh_estado_municipios_mi);
  const tdif = num(d?.tarifa_dif_brasil_pct);
  const blocos = d ? [
    { t: "1. Como a energia circula?", c: <>
      <p className="text-sm">Subsistema <strong>{d.nome_subsistema ?? "indisponível"}</strong>: {String(d.subsistema_papel ?? "papel indisponível").toLowerCase()} em {d.ano_intercambio ?? "—"} ({n(Math.abs(Number(d.subsistema_saldo_exportado_gwh ?? NaN)), 0)} GWh líquidos).</p>
      <p className="mt-1 text-sm">Estado: <strong>{d.situacao ?? "indisponível"}</strong>, {fraseBalanco(num(d.razao_geracao_consumo))}.</p>
      <Diagrama fluxos={fluxos} destaque={d.subsistema as string | null} />
      <p className="text-[11px] text-muted-foreground">A energia não pertence ao estado onde é gerada: as usinas entregam no sistema interligado, e o ONS decide o despacho para o país inteiro. O ONS publica fluxos entre subsistemas, não entre estados.</p>
      {d.nota_interligacao && <p className="mt-2 rounded border border-border bg-muted/40 p-2 text-xs">{d.nota_interligacao} {d.nota_interligacao_fonte && <a className="text-primary underline" href={String(d.nota_interligacao_fonte)} target="_blank" rel="noreferrer">fonte</a>}</p>}
    </> },
    { t: "2. Quanto custa a energia aqui?", c: <>
      <p className="text-sm"><strong className="text-lg">R$ {n(d.tarifa_residencial_rs_mwh, 0)}/MWh</strong> · Brasil R$ {n(d.tarifa_residencial_brasil, 0)}/MWh</p>
      <p className="text-sm">{tdif == null ? "Diferença indisponível" : `${n(Math.abs(tdif))}% ${tdif >= 0 ? "acima" : "abaixo"} da média`}{d.tarifa_posicao_mais_cara != null && ` · ${28 - Number(d.tarifa_posicao_mais_cara)}ª mais barata de 27`}</p>
      <p className="text-xs text-muted-foreground">Distribuidora principal: {d.distribuidora_principal ?? "indisponível"}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">Tarifa homologada pela ANEEL, sem ICMS, PIS/Cofins e bandeiras; média das distribuidoras do estado ponderada pelas unidades consumidoras.</p>
    </> },
    { t: "3. Quem fica com a receita?", c: <>
      <p className="text-sm"><strong className="text-lg">{cfurh == null ? "indisponível" : cfurh === 0 ? "R$ 0" : `R$ ${n(cfurh)} milhões`}</strong> de CFURH em {d.ano_cfurh ?? "—"}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">O ICMS sobre energia é recolhido no estado onde ela é consumida. O estado que gera recebe a compensação financeira das hidrelétricas (CFURH) e, no caso de Itaipu, royalties.</p>
    </> },
    { t: "4. O fornecimento é confiável?", c: <>
      <Barra rotulo={`DEC ${d.ano_qualidade ?? ""}`} valor={num(d.dec_horas)} brasil={num(d.dec_brasil)} unidade="h sem energia por consumidor" />
      <div className="mt-2"><Barra rotulo="FEC" valor={num(d.fec_interrupcoes)} brasil={num(d.fec_brasil)} unidade="interrupções" /></div>
      <p className="mt-2 text-[11px] text-muted-foreground">ANEEL/EPE; média do Brasil ponderada pelo número de consumidores.</p>
    </> },
    { t: "5. Há infraestrutura para crescer?", c: <dl className="space-y-1 text-sm">
      <div><dt className="text-xs text-muted-foreground">Crescimento do consumo em 5 anos</dt><dd className="font-semibold">{d.crescimento_consumo_5a_pct == null ? "indisponível" : `${n(d.crescimento_consumo_5a_pct)}%`}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Municípios com fibra</dt><dd className="font-semibold">{d.pct_municipios_com_fibra == null ? "indisponível" : `${n(d.pct_municipios_com_fibra)}% (${d.com_fibra} de ${d.municipios})`}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Cabos submarinos internacionais</dt><dd className="font-semibold">{d.cabos_internacionais ?? "indisponível"}</dd></div>
    </dl> },
  ] : [];

  return <Dialog open={estado != null} onOpenChange={open => !open && onClose()}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto p-5 sm:p-6">
      <DialogHeader className="pr-6 text-left">
        <DialogTitle className="text-2xl leading-tight">{estado && ESTADOS[estado.uf]} · Infraestrutura de IA</DialogTitle>
        <DialogDescription>{estado?.situacao ?? "Balanço indisponível"} · {fraseBalanco(estado?.razao ?? null)}. Referência Brasil: {estado?.brasil == null ? "indisponível" : `${estado.brasil.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}×`}.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-5 md:grid-cols-3">
        {[{ nome: "Energia", icon: Zap, itens: detalhe?.energia ?? [] }, { nome: "Conectividade física", icon: Cable, itens: detalhe?.conectividade ?? [] }, { nome: "Processamento", icon: Server, itens: [{ rotulo: "Datacenters e pontos de troca de tráfego", valor: estado?.dc == null ? "indisponível" : String(estado.dc) }] }].map(b => <section key={b.nome} className="min-w-0 border-t-2 border-primary pt-3">
          <h3 className="flex items-center gap-2 text-base font-bold"><b.icon className="h-4 w-4 text-primary" />{b.nome}</h3>
          <dl className="mt-3 space-y-3">{b.itens.map(m => <div key={m.rotulo}><dt className="text-xs text-muted-foreground">{m.rotulo}</dt><dd className="mt-1 break-words text-sm font-semibold">{m.valor}</dd></div>)}</dl>
        </section>)}
      </div>
      <section className="border-t border-border pt-4" aria-labelledby="cinco-perguntas">
        <h3 id="cinco-perguntas" className="text-lg font-bold">Energia no estado em cinco perguntas</h3>
        {p === "erro" ? <p className="mt-2 text-sm text-muted-foreground">Fonte indisponível.</p> : !d ? <p className="mt-2 text-sm text-muted-foreground">Carregando…</p> :
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{blocos.map(b => <div key={b.t} className="min-w-0 rounded-lg border border-border p-3"><h4 className="mb-2 text-sm font-bold">{b.t}</h4>{b.c}</div>)}</div>}
      </section>
      <section className="border-t border-border pt-4">
        <h3 className="text-lg font-bold">Pontos críticos e possibilidades de investimento</h3>
        {aps === "erro" ? <p className="mt-2 text-sm text-muted-foreground">Apontamentos indisponíveis.</p> : aps == null ? <p className="mt-2 text-sm text-muted-foreground">Carregando…</p> :
          <div className="mt-3 grid gap-4 md:grid-cols-3">{GRUPOS.map(g => {
            const itens = aps.filter(a => a.tipo === g.tipo);
            return <div key={g.tipo} className="min-w-0" data-grupo={g.tipo}>
              <p className={`flex items-center gap-2 text-sm font-semibold ${g.cor}`}><g.Icon size={18} />{g.nome}</p>
              {itens.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum pelas regras atuais</p> : <ul className="mt-2 divide-y divide-border">{itens.map(a => <li key={a.codigo} data-codigo={a.codigo} className="py-3">
                <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{a.titulo}</p>
                  <Popover><PopoverTrigger className="shrink-0 text-xs text-primary underline">por quê?</PopoverTrigger>
                    <PopoverContent className="text-xs"><p className="font-semibold">Regra {a.codigo}</p><p className="mt-1"><strong>Condição:</strong> {regras[a.codigo]?.condicao ?? "indisponível"}</p><p className="mt-1"><strong>Justificativa:</strong> {regras[a.codigo]?.justificativa ?? "indisponível"}</p></PopoverContent></Popover></div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.texto}</p>
              </li>)}</ul>}
            </div>;
          })}</div>}
        <p className="mt-2 text-xs text-muted-foreground">Os apontamentos são triagens a partir dessas bases, não estudos de viabilidade; exigem verificar capacidade elétrica local, custos, licenciamento, disponibilidade de água, latência e demanda.</p>
      </section>
      <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold">Instalações registradas no estado ({estado?.dc ?? "indisponível"})</summary>
        {detalhe?.datacenters == null ? <p className="mt-3 text-sm text-muted-foreground">Fonte indisponível.</p> : detalhe.datacenters.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nenhuma instalação registrada na fonte para este estado.</p> : <ul className="mt-3 divide-y divide-border">{detalhe.datacenters.map((x, i) => <li key={`${x.nome}-${i}`} className="py-2 text-sm"><strong>{x.nome}</strong><p className="text-xs text-muted-foreground">{x.cidade} · {x.org}</p></li>)}</ul>}
      </details>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Network size={16} className="shrink-0" />Fontes: EPE (balanço, consumo e DEC/FEC), ANEEL (usinas, tarifas, CFURH e unidades consumidoras), ONS (intercâmbio entre subsistemas), ANATEL (backhaul), TeleGeography (cabos) e PeeringDB (instalações).</p>
    </DialogContent>
  </Dialog>;
}

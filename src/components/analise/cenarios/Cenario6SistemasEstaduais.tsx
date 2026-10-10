import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Sankey } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchAll } from "@/lib/fetchAll";
import { agruparValores, carregarEstado, CATEGORIAS_ESTADUAIS, corPerfil, ESTADOS, fmtMilhoes, fmtNumero, fmtPct, montarSankey, totalAtores, UF_INICIAL, type DadosEstado, type ViewRow } from "@/lib/sistemasEstaduais";
import MapaSistemasEstaduais from "./MapaSistemasEstaduais";
import AtoresEstaduaisDialog from "./AtoresEstaduaisDialog";

type Camada = Database["public"]["Tables"]["camadas_ia"]["Row"];
type Regra = Database["public"]["Tables"]["camada_regras"]["Row"];
const fluxoCor = "hsl(var(--sistema-fluxo))";
const localCor = "hsl(var(--sistema-local))";
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };
function Secao({ titulo, sub, children }: { titulo: string; sub?: string; children: ReactNode }) {
  return <section className="border-t border-border pt-6"><h2 className="text-2xl font-bold">{titulo}</h2>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}<div className="mt-5">{children}</div></section>;
}
function Metrica({ titulo, valor, children }: { titulo: string; valor: string; children?: ReactNode }) {
  return <div className="min-w-0 rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{titulo}</p><p className="mt-2 break-words text-2xl font-extrabold tabular-nums">{valor}</p>{children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}</div>;
}
function Barras({ dados, uf, dinheiro = false }: { dados: { nome: string; valor: number }[]; uf: string; dinheiro?: boolean }) {
  if (!dados.length) return <p className="py-12 text-sm text-muted-foreground">Sem relações registradas neste recorte.</p>;
  return <ResponsiveContainer width="100%" height={Math.max(220, dados.length * 25 + 40)}><BarChart data={dados} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmtNumero(v)} />
    <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} interval={0} />
    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [dinheiro ? fmtMilhoes(v) : fmtNumero(v), dinheiro ? "Investimento" : "Relações"]} />
    <Bar dataKey="valor" name={dinheiro ? "R$ milhões" : "Relações"} radius={[0, 3, 3, 0]}>{dados.map(r => <Cell key={r.nome} fill={r.nome === uf ? localCor : fluxoCor} />)}</Bar>
  </BarChart></ResponsiveContainer>;
}

export default function Cenario6SistemasEstaduais() {
  const [uf, setUf] = useState(UF_INICIAL);
  const [perfis, setPerfis] = useState<ViewRow<"vw_uf_relacoes_perfil">[]>([]);
  const [camadas, setCamadas] = useState<Camada[]>([]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [extraido, setExtraido] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosEstado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [classificacaoAberta, setClassificacaoAberta] = useState(false);
  const [celula, setCelula] = useState<{ categoria: string; camada: string; nome: string } | null>(null);
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [p, c, r, e] = await Promise.all([
          fetchAll<ViewRow<"vw_uf_relacoes_perfil">>(supabase.from("vw_uf_relacoes_perfil").select("*").order("uf")),
          fetchAll<Camada>(supabase.from("camadas_ia").select("*").order("ordem")),
          fetchAll<Regra>(supabase.from("camada_regras").select("*").order("regra_id")),
          supabase.from("embrapii_extracoes").select("extraido_em").order("extraido_em", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (e.error) throw e.error;
        if (ativo) { setPerfis(p); setCamadas(c); setRegras(r); setExtraido(e.data?.extraido_em ?? null); }
      } catch (e) { if (ativo) setErroGeral((e as Error).message); }
    })();
    return () => { ativo = false; };
  }, []);
  useEffect(() => {
    let ativo = true;
    setDados(null); setErro(null); setCelula(null);
    carregarEstado(uf).then(d => { if (ativo) setDados(d); }).catch(e => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [uf]);
  const entrada = useMemo(() => agruparValores(dados?.entrada ?? [], r => r.origem_uf, r => r.lacos), [dados]);
  const saida = useMemo(() => agruparValores(dados?.saida ?? [], r => r.destino_uf, r => r.lacos), [dados]);
  const saidaPrivada = useMemo(() => agruparValores(dados?.fomentoSaida ?? [], r => r.uf_unidade, r => r.valor_empresas, 1e6), [dados]);
  const sankey = useMemo(() => montarSankey(dados?.fomentoEntrada ?? [], uf), [dados, uf]);
  const maxCelula = Math.max(1, ...(dados?.composicao ?? []).map(r => r.atores ?? 0));
  const colunas = [...camadas.map(c => ({ codigo: c.codigo, nome: c.nome })), { codigo: "—", nome: "Sem camada" }];
  const p = dados?.perfil;
  const f = dados?.fomento;
  const b = dados?.conversao;
  const comparacoes = [
    { titulo: "Relações ICT–empresa por 100 doutores", estado: b?.lacos_por_100_doutores, brasil: b?.lacos_por_100_doutores_brasil, percentual: false },
    { titulo: "Patentes por 100 doutores", estado: b?.patentes_por_100_doutores, brasil: b?.patentes_por_100_doutores_brasil, percentual: false },
    { titulo: "Projetos concluídos com pedido de PI", estado: b?.pct_concluidos_com_pi, brasil: b?.pct_concluidos_com_pi_brasil, percentual: true },
  ];
  return <div className="space-y-7" data-testid="sistemas-estaduais">
    <section><h2 className="text-2xl font-bold">Vista nacional</h2><p className="mt-1 text-sm text-muted-foreground">Perfil das relações de cooperação de cada sistema estadual · canal EMBRAPII</p>
      {erroGeral && <p role="alert" className="mt-3 text-destructive">Falha ao consultar classificações: {erroGeral}</p>}
      <MapaSistemasEstaduais perfis={perfis} uf={uf} onChange={setUf} />
    </section>
    {erro ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">Falha ao carregar {ESTADOS[uf]}: {erro}</p> : !dados ? <p role="status" className="py-12 text-center text-muted-foreground">Carregando o sistema de {ESTADOS[uf]}…</p> : <div key={uf} data-testid="estado-carregado" data-uf={uf} className="space-y-7">
      <section className="border-t border-border pt-6">
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-3xl font-extrabold">{ESTADOS[uf]} <span className="text-muted-foreground">· {uf}</span></h2><span className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-bold"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="6" fill={corPerfil(p?.perfil ?? null)} /></svg>{p?.perfil ?? "Perfil indisponível"}</span></div>
        <p className="mt-3 text-base text-muted-foreground">{p?.pct_empresas_buscam_fora != null ? `${fmtPct(p.pct_empresas_buscam_fora)} das relações das empresas locais são com unidades de outros estados${p.uf_principal_origem_externa ? `, principalmente ${p.uf_principal_origem_externa}` : ""}.` : "Não há relações das empresas locais registradas para calcular a participação externa."}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica titulo="Atores mapeados" valor={fmtNumero(totalAtores(dados.resumo))} />
          <Metrica titulo="Unidades EMBRAPII ativas" valor={fmtNumero(p?.unidades_ativas)} />
          <Metrica titulo="Relações das empresas locais" valor={fmtNumero(p?.lacos_empresas_locais)} />
          <Metrica titulo="Relações das unidades locais" valor={fmtNumero(p?.lacos_unidades_locais)} />
        </div>
      </section>
      <Secao titulo="Quem forma o sistema" sub="Atores por categoria e camada de IA (Inteligência Artificial)">
        <div className="overflow-x-auto"><table className="w-full min-w-[880px] border-collapse text-sm"><thead><tr><th className="p-2 text-left">Categoria</th>{colunas.map(c => <th key={c.codigo} className="w-[9%] p-2 text-center"><span className="block font-bold">{c.codigo === "—" ? "" : c.codigo}</span><span className="text-xs font-medium text-muted-foreground">{c.nome}</span></th>)}<th className="p-2 text-right">Total único</th></tr></thead>
          <tbody>{CATEGORIAS_ESTADUAIS.map(cat => <tr key={cat.id} className="border-t border-border"><th className="p-2 text-left font-semibold">{cat.nome}</th>{colunas.map(c => {
            const valor = dados.composicao.find(r => r.categoria === cat.id && r.camada === c.codigo)?.atores ?? 0;
            const intensidade = valor === 0 ? "bg-muted/20" : valor / maxCelula > .65 ? "sistema-celula-forte" : valor / maxCelula > .2 ? "sistema-celula-media" : "sistema-celula-leve";
            return <td key={c.codigo} className="p-1"><Button variant="ghost" className={`h-12 w-full rounded-sm font-bold tabular-nums hover:bg-accent/20 ${intensidade}`} aria-label={`${cat.nome}, ${c.nome}: ${valor} atores`} onClick={() => setCelula({ categoria: cat.id, camada: c.codigo, nome: c.nome })}>{valor === 0 ? <span className="text-muted-foreground">—</span> : fmtNumero(valor)}</Button></td>;
          })}<td className="p-2 text-right font-bold tabular-nums">{fmtNumero(dados.resumo.find(r => r.categoria === cat.id)?.atores ?? 0)}</td></tr>)}</tbody>
        </table></div>
        <p className="mt-3 text-xs text-muted-foreground">Totais por categoria vêm do resumo de atores únicos, não da soma das células: um ator pode pertencer a mais de uma camada. “—” indica célula sem atores. UF inferida em {fmtNumero(dados.resumo.reduce((s, r) => s + (r.atores_uf_inferida ?? 0), 0))} atores.</p>
      </Secao>
      <Secao titulo="Como se relaciona" sub="Relações somadas em todos os anos e tecnologias disponíveis. Verde identifica a própria UF.">
        <div className="grid gap-6 lg:grid-cols-2"><div className="min-w-0"><h3 className="mb-3 text-lg font-bold">De onde vêm as unidades que atendem as empresas do estado</h3><Barras dados={entrada} uf={uf} /></div><div className="min-w-0"><h3 className="mb-3 text-lg font-bold">Para onde vão os serviços das unidades do estado</h3><Barras dados={saida} uf={uf} /></div></div>
        <p className="mt-4 border-t border-border pt-3 text-sm"><span className="text-muted-foreground">Unidade principal: </span><strong>{p?.unidade_principal ?? "Sem unidade com relações registradas"}</strong>{p?.pct_unidade_principal != null && <> · concentra <strong>{fmtPct(p.pct_unidade_principal)}</strong> das relações das unidades locais</>}</p>
      </Secao>
      <Secao titulo="Por onde passa o fomento" sub="P&D cooperativo via EMBRAPII · valores corrigidos pelo IPCA">
        <div className="grid gap-3 md:grid-cols-3">
          <Metrica titulo="Fomento público recebido pelas unidades" valor={fmtMilhoes(f?.publico_recebido_unidades_mi)}>Principal financiador: <strong>{f?.principal_financiador ?? "Não informado"}</strong></Metrica>
          <Metrica titulo="Investimento das empresas locais" valor={fmtMilhoes(f?.privado_investido_empresas_locais_mi)}>Para fora: <strong>{fmtMilhoes(f?.privado_investido_fora_mi)}</strong> · {fmtPct(f?.pct_privado_investido_fora)}</Metrica>
          <Metrica titulo="Investimento de empresas de outros estados nas unidades locais" valor={fmtMilhoes(f?.privado_entrante_de_outros_estados_mi)} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="min-w-0"><h3 className="text-lg font-bold">Financiadores → unidades de {uf} → empresas atendidas</h3><p className="mt-1 text-xs text-muted-foreground">Fomento público · R$ milhões</p>
          {sankey.links.length === 0 ? <p className="py-12 text-sm text-muted-foreground">Sem fomento público recebido por unidades locais.</p> : <><div className="mt-3 overflow-x-auto"><div className="min-w-[460px]"><ResponsiveContainer width="100%" height={Math.max(320, (sankey.nodes.length - 1) * 18)}><Sankey data={sankey} nodePadding={18} nodeWidth={12} iterations={64} margin={{ top: 12, bottom: 12, left: 120, right: 120 }} link={{ stroke: fluxoCor, strokeOpacity: 0.35 }} node={{ fill: localCor }}><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtMilhoes(v)} /></Sankey></ResponsiveContainer></div></div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">{agruparValores(dados.fomentoEntrada, r => r.financiador, r => r.valor_publico, 1e6).map(r => <span key={r.nome}>{r.nome}: {fmtMilhoes(r.valor)}</span>)}</div></>}
        </div><div className="min-w-0"><h3 className="text-lg font-bold">Empresas de {uf} → UF das unidades contratadas</h3><p className="mb-3 mt-1 text-xs text-muted-foreground">Investimento das empresas · R$ milhões</p><Barras dados={saidaPrivada} uf={uf} dinheiro /></div></div>
      </Secao>
      <Secao titulo="Base científica e conversão" sub="Titulações e patentes: 2020–2024. PI: projetos concluídos das unidades locais, conforme a base de conversão.">
        <div className="grid gap-3 md:grid-cols-3">{comparacoes.map(c => {
          const comparavel = c.estado != null && c.brasil != null;
          const acima = comparavel && (c.estado ?? 0) > (c.brasil ?? 0);
          const igual = comparavel && c.estado === c.brasil;
          const fmt = c.percentual ? fmtPct : fmtNumero;
          return <div key={c.titulo} className="rounded-lg border border-border bg-card p-4"><h3 className="text-sm font-semibold">{c.titulo}</h3><div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">{uf}</p><p className="mt-1 text-2xl font-bold tabular-nums">{fmt(c.estado)}</p></div><div><p className="text-xs text-muted-foreground">Brasil</p><p className="mt-1 text-2xl font-bold tabular-nums">{fmt(c.brasil)}</p></div></div><p className={`mt-3 flex items-center gap-1 text-xs font-semibold ${acima ? "text-accent" : "text-muted-foreground"}`}>{comparavel ? <>{igual ? "=" : acima ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{igual ? "Igual à" : acima ? "Acima da" : "Abaixo da"} referência nacional</> : "Indisponível para comparação"}</p></div>;
        })}</div>
        <p className="mt-3 text-xs text-muted-foreground">Base estadual: {fmtNumero(b?.doutores_titulados_2020_2024)} doutores · {fmtNumero(b?.mestres_titulados_2020_2024)} mestres · {fmtNumero(b?.patentes_residentes_2020_2024)} patentes de residentes · {fmtNumero(b?.projetos_concluidos_unidades_locais)} projetos concluídos.</p>
      </Secao>
      <Secao titulo="Limitações do estado">{dados.limitacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma limitação identificada pelas regras atuais</p> : <ul className="divide-y divide-border">{dados.limitacoes.map(l => <li key={l.codigo} className="py-4 first:pt-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-1 text-xs font-semibold ${l.severidade === "alta" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-muted text-muted-foreground"}`}>{l.severidade === "alta" ? "Alta" : "Média"}</span><h3 className="text-lg font-bold">{l.titulo}</h3></div><p className="mt-2 text-sm text-muted-foreground">{l.texto}</p></li>)}</ul>}</Secao>
    </div>}
    <section className="border-t border-border pt-5"><Button variant="ghost" className="h-auto w-full justify-between px-0 py-2 text-xl font-bold" aria-expanded={classificacaoAberta} aria-controls="sistemas-classificacao" onClick={() => setClassificacaoAberta(v => !v)}>Como classificamos{classificacaoAberta ? <ChevronUp /> : <ChevronDown />}</Button>
      {classificacaoAberta && <div id="sistemas-classificacao" className="mt-4 space-y-5"><dl className="grid gap-4 md:grid-cols-2">{camadas.map(c => <div key={c.codigo}><dt className="font-bold">{c.codigo} · {c.nome}</dt><dd className="mt-1 text-sm text-muted-foreground">{c.descricao ?? "Descrição não informada"}</dd></div>)}</dl><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr>{["Regra", "Alvo", "Condição", "Camada", "Confiança", "Justificativa"].map(t => <th key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{regras.map(r => <tr key={r.regra_id} className="border-t border-border">{[r.regra_id, r.alvo, r.condicao, r.camada, r.confianca, r.justificativa].map((v, i) => <td key={i} className="p-2 align-top">{v}</td>)}</tr>)}</tbody></table></div></div>}
    </section>
    <footer className="border-t border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground"><h3 className="mb-2 font-semibold text-foreground">Notas metodológicas</h3>Atores: OpenAlex, ABStartups, Observatório CGEE, FORMICT/MCTI, SINAPAD, mapeamento LISP e EMBRAPII. Parte dos atores teve a UF inferida a partir do município e das coordenadas, e isso é indicado em cada ator. Um ator pode pertencer a mais de uma camada; a classificação segue regras explícitas, listadas em Como classificamos. As camadas de Energia e de Infraestrutura aparecem com poucos atores porque, no Mapa, estão representadas como ativos (usinas, cabos, pontos de troca de tráfego), e não como organizações. Relações e fomento cobrem apenas o canal EMBRAPII, com valores corrigidos pelo IPCA e rateados entre as empresas de cada projeto; não incluem FAPs, Finep, CNPq ou BNDES fora desse canal. A mesma instituição pode aparecer em mais de uma base. Dados EMBRAPII extraídos em {extraido ? new Date(extraido).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "data indisponível"}.</footer>
    {celula && <AtoresEstaduaisDialog key={`${uf}-${celula.categoria}-${celula.camada}`} uf={uf} categoria={celula.categoria} camada={celula.camada} camadaNome={celula.nome} onClose={() => setCelula(null)} />}
  </div>;
}
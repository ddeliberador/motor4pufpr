import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, Download, ExternalLink, FileText, Landmark, DoorOpen } from "lucide-react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { fetchAll } from "@/lib/fetchAll";
import { safeHttpUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MetricaCartao from "./MetricaCartao";
import GraficosOportunidades from "./GraficosOportunidades";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { COBERTURAS, destacarTermos, rotuloCobertura, type Cobertura } from "@/lib/demandaPublica";
import { diasRestantes, textoDias } from "@/lib/chamadasPublicas";
import { FILTROS_VAZIOS, contagensOportunidades, filtrarOportunidades, chamadaIdNumerico, exportarOportunidadesExcel, type Oportunidade, type AreaOportunidades, type FiltrosOportunidade } from "@/lib/oportunidadesPublicas";

type Projeto = { cod_projeto: string; termos_em_comum: string[]; titulo: string | null; ue_sigla: string | null; ue_uf: string | null; ano: number | null };
// Views supplied by the project, until generated client types include them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const SELO = ["border-accent/50 text-accent", "border-border text-muted-foreground", "border-dashed border-border text-muted-foreground"];
const GRUPOS = ["Com possível solução no Motor", "Sem solução catalogada", "Descrição insuficiente para cruzar"];
const fmtData = (s: string | null) => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : null;
const nomeUf = (u: string | null) => u == null ? "UF não identificada" : u === "BR" ? "Alcance nacional" : ESTADOS[u] ?? u;

export default function Cenario7DemandaPublica() {
  const [oportunidades, setOportunidades] = useState<Oportunidade[] | null>(null);
  const [areas, setAreas] = useState<AreaOportunidades[] | null>(null);
  const [metodo, setMetodo] = useState<{ seg: { area: string; segmento: string }[]; ign: { termo: string; motivo: string | null }[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState<FiltrosOportunidade>(FILTROS_VAZIOS);
  const [aberto, setAberto] = useState<Oportunidade | null>(null);
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);
  const [erroProjetos, setErroProjetos] = useState<string | null>(null);
  const [erroExportacao, setErroExportacao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      fetchAll<Oportunidade>(db.from("vw_oportunidades").select("*").order("ordem_cobertura").order("ordem_status").order("prazo", { nullsFirst: false }).order("id")),
      fetchAll<AreaOportunidades>(db.from("vw_oportunidades_area").select("*").order("area")),
    ]).then(([o, a]) => { if (ativo) { setOportunidades(o); setAreas(a); } }).catch(e => ativo && setErro(String(e?.message ?? e)));
    Promise.all([
      fetchAll<{ area: string; segmento: string }>(db.from("desafio_area_segmento").select("area,segmento").order("area").order("segmento")),
      fetchAll<{ termo: string; motivo: string | null }>(db.from("desafio_termos_ignorados").select("termo,motivo").order("termo")),
    ]).then(([seg, ign]) => ativo && setMetodo({ seg, ign })).catch(() => ativo && setMetodo(null));
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setProjetos(null); setErroProjetos(null);
    (async () => {
      const chamada = aberto.tipo_registro === "chamada";
      const id = chamada ? chamadaIdNumerico(aberto) : aberto.id;
      if (id == null) throw new Error("Identificador da chamada indisponível.");
      const rel = await fetchAll<{ cod_projeto: string; termos_em_comum: string[] }>(db.from(chamada ? "chamada_projeto_relacionado" : "desafio_projeto_relacionado")
        .select("cod_projeto,termos_em_comum").eq(chamada ? "chamada_id" : "desafio_id", id).order("cod_projeto"));
      type LinhaProjeto = { cod_projeto: string; proj_titulo_publico: string | null; ue_sigla: string | null; ue_uf: string | null; ano_contrato: number | null };
      const dados: LinhaProjeto[] = [];
      for (let i = 0; i < rel.length; i += 100) {
        dados.push(...await fetchAll<LinhaProjeto>(db.from("embrapii_projetos").select("cod_projeto,proj_titulo_publico,ue_sigla,ue_uf,ano_contrato").in("cod_projeto", rel.slice(i, i + 100).map(r => r.cod_projeto)).order("cod_projeto")));
      }
      const p = new Map(dados.map(x => [x.cod_projeto, x]));
      if (ativo) setProjetos(rel.map(r => { const x = p.get(r.cod_projeto); return { ...r, titulo: x?.proj_titulo_publico ?? null, ue_sigla: x?.ue_sigla ?? null, ue_uf: x?.ue_uf ?? null, ano: x?.ano_contrato ?? null }; }));
    })().catch(e => ativo && setErroProjetos(String(e?.message ?? e)));
    return () => { ativo = false; };
  }, [aberto]);

  const c = oportunidades ? contagensOportunidades(oportunidades) : null;
  const lista = oportunidades ? filtrarOportunidades(oportunidades, f) : [];
  const opcoes = (k: keyof Oportunidade) => [...new Set((oportunidades ?? []).map(o => o[k]).filter(v => typeof v === "string") as string[])].sort();
  const sel = (k: keyof FiltrosOportunidade, rot: string, ops: string[], nome?: (v: string) => string) => (
    <label className="text-xs text-muted-foreground">{rot}
      <select className="mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}>
        <option value="">Todos</option>{ops.map(o => <option key={o} value={o}>{nome ? nome(o) : o}</option>)}
      </select>
    </label>);
  if (erro) return <p className="border border-border p-4 text-sm text-foreground">Dados indisponíveis: {erro}</p>;

  return (
    <div className="space-y-8">
      <section aria-label="Números de destaque" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricaCartao icon={Landmark} valor={c?.total} rotulo="oportunidades no levantamento" />
        <MetricaCartao icon={DoorOpen} valor={c?.vigentes} rotulo="vigentes: abertas ou em andamento" />
        <MetricaCartao icon={CheckCircle2} valor={c?.com} rotulo="com possível solução encontrada no Motor" />
        <MetricaCartao icon={AlertTriangle} valor={c?.sem} rotulo="sem solução catalogada" />
        <MetricaCartao icon={CircleHelp} valor={c?.insuf} rotulo="com descrição insuficiente para cruzar" />
      </section>
      {oportunidades && c && c.com > 0 && <div className="flex flex-col items-end gap-2">
        <Button variant="outline" size="sm" className="h-auto max-w-full whitespace-normal text-left" onClick={() => { setErroExportacao(null); exportarOportunidadesExcel(oportunidades).catch(() => setErroExportacao("Não foi possível exportar o Excel. Tente novamente.")); }}>
          <Download size={14} />Exportar em Excel as {c.com} oportunidades com possível solução
        </Button>{erroExportacao && <p role="alert" className="text-sm text-muted-foreground">{erroExportacao}</p>}
      </div>}
      {areas && <GraficosOportunidades areas={areas} onArea={area => setF({ ...FILTROS_VAZIOS, area })} />}
      <section aria-labelledby="lista-t" className="space-y-4">
        <h2 id="lista-t" className="text-xl font-bold">Lista de oportunidades</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="col-span-2 text-xs text-muted-foreground">Buscar<Input className="mt-1 h-9" value={f.busca} onChange={e => setF({ ...f, busca: e.target.value })} placeholder="nome, órgão…" /></label>
          {sel("tipo_registro", "Registro", ["desafio", "chamada"], v => v === "desafio" ? "Desafios" : "Chamadas")}
          {sel("area", "Área", opcoes("area"))}{sel("uf", "UF", opcoes("uf"), nomeUf)}{sel("esfera", "Esfera", opcoes("esfera"))}
          {sel("status", "Status", opcoes("status"))}{sel("tipo", "Tipo", opcoes("tipo"))}{sel("cobertura", "Cobertura", COBERTURAS, c => rotuloCobertura(c as Cobertura))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span role="status">{lista.length} de {oportunidades?.length ?? "…"} oportunidades</span>{JSON.stringify(f) !== JSON.stringify(FILTROS_VAZIOS) && <Button variant="ghost" size="sm" onClick={() => setF(FILTROS_VAZIOS)}>Limpar filtros</Button>}</div>
        {!oportunidades ? <p className="text-sm text-muted-foreground">Carregando…</p> : !lista.length ? <p className="text-sm text-muted-foreground">Nenhuma oportunidade encontrada para estes filtros.</p> : COBERTURAS.map((cobertura, i) => {
          const grupo = lista.filter(o => o.cobertura === cobertura);
          return <section key={cobertura} className="space-y-3" aria-label={GRUPOS[i]}>
            <h3 className="border-b border-border pb-2 text-base font-semibold">{GRUPOS[i]} ({grupo.length})</h3>
            <div className="grid gap-3 md:grid-cols-2">{grupo.map(d => <article key={d.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <Button variant="ghost" onClick={() => setAberto(d)} className="block h-auto w-full whitespace-normal p-0 text-left font-normal hover:bg-muted hover:text-foreground" aria-label={`Abrir detalhe de ${d.nome}`}>
                <span className="flex flex-wrap items-center gap-1.5 text-[10px]"><span className="text-muted-foreground">{d.id}</span><span className="rounded border border-border px-1.5 py-0.5">{d.tipo_registro === "desafio" ? "Desafio" : "Chamada"}</span><span className="rounded border border-border px-1.5 py-0.5">{d.status}</span></span>
                <span className="mt-2 block text-sm font-semibold leading-snug">{d.nome}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{[d.orgao, d.area, nomeUf(d.uf)].filter(Boolean).join(" · ")}</span>
                {d.chamada_nome && <span className="mt-1 block text-xs text-muted-foreground">Parte de: {d.chamada_nome}</span>}
                <span className="mt-1 block text-xs text-muted-foreground">{d.prazo ? `Prazo: ${fmtData(d.prazo)} · ${textoDias(diasRestantes(d.prazo))}` : "Prazo não informado"}</span>
                {d.status === "A verificar" && <span className="mt-1 block text-xs text-muted-foreground">prazo não confirmado</span>}
                {d.valor_texto && <span className="mt-1 block text-xs text-muted-foreground">{d.valor_texto}</span>}
              </Button>
              <div className="mt-auto flex flex-wrap gap-3 text-xs">
                {safeHttpUrl(d.fonte_url) && <a className="inline-flex items-center gap-1 text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent" href={safeHttpUrl(d.fonte_url)} target="_blank" rel="noreferrer">Fonte <ExternalLink size={12} /></a>}
                {safeHttpUrl(d.pagina_url) && <a className="inline-flex items-center gap-1 text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent" href={safeHttpUrl(d.pagina_url)} target="_blank" rel="noreferrer">Página <ExternalLink size={12} /></a>}
              </div>
            </article>)}</div>
          </section>;
        })}
      </section>
      <details className="rounded-lg border border-border p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><ChevronDown size={16} />Como cruzamos</summary>
        <p className="mt-3 text-sm text-muted-foreground">Desafios e chamadas sem desafio ligado são comparados com os títulos dos projetos EMBRAPII. Chamadas com vínculo herdam os projetos dos desafios ligados. Um projeto conta como possivelmente relacionado quando compartilha ao menos dois termos específicos com o nome e o problema do desafio, isto é, termos que aparecem em até 40 títulos e que não estão na lista de termos genéricos. As startups entram por setor: a área do desafio corresponde a segmentos da ABStartups, numa tabela explícita. Não usamos IA no cruzamento por termos. As startups não têm descrição de produto na base, por isso contam só como oferta setorial.</p>
        {metodo ? <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Área → segmentos ABStartups</h4>
            <table className="w-full text-xs"><tbody>{[...new Set(metodo.seg.map(s => s.area))].map(a => <tr key={a} className="border-b border-border/50 align-top"><td className="py-1 pr-2 font-medium">{a}</td><td className="py-1 text-muted-foreground">{metodo.seg.filter(s => s.area === a).map(s => s.segmento).join("; ")}</td></tr>)}</tbody></table></div>
          <div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Termos genéricos ignorados ({metodo.ign.length})</h4>
            <p className="text-xs text-muted-foreground">{metodo.ign.map(t => t.termo).join(", ")}</p></div>
        </div> : <p className="mt-3 text-xs text-muted-foreground">Tabelas do método indisponíveis.</p>}
      </details>

      <p className="border-t border-border pt-3 text-[11px] text-muted-foreground"><FileText size={12} className="mr-1 inline" />Desafios: levantamento de desafios públicos já publicados (esboço compartilhado pela Profª Eunice Liu, MCTI), montado a partir da Plataforma Desafios (Enap), de sites de órgãos públicos, de editais e de notícias, conferido em 07/10/2026. Cada oportunidade traz o link de onde os dados foram lidos. Chamadas: levantamento de 14/10/2026 compartilhado pela coorientação, retrato daquela data cujo status pode mudar. A área das chamadas foi classificada manualmente a partir do tema (tabela chamada_area), sujeita a revisão. Chamadas com desafios ligados aparecem por seus desafios, sem duplicação. O valor mistura prêmio, teto de contrato e fomento, por isso não é somado. Oferta: projetos EMBRAPII e startups ABStartups já presentes no Motor.</p>

      <Dialog open={!!aberto} onOpenChange={o => !o && setAberto(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {aberto && <>
            <DialogHeader>
              <DialogTitle className="pr-6 leading-snug">{aberto.nome}</DialogTitle>
              <DialogDescription>{[aberto.id, aberto.orgao, aberto.area, nomeUf(aberto.uf)].filter(Boolean).join(" · ")}</DialogDescription>
            </DialogHeader>
            <span className={`w-fit rounded border px-1.5 py-0.5 text-xs font-semibold ${SELO[COBERTURAS.indexOf(aberto.cobertura)]}`}>{rotuloCobertura(aberto.cobertura)}</span>
            {aberto.chamada_nome && <p className="text-sm text-muted-foreground">Parte de: {aberto.chamada_nome}</p>}
            <div><h4 className="text-xs font-semibold uppercase text-muted-foreground">Descrição</h4><p className="mt-1 text-sm text-foreground">{aberto.descricao || "Não descrito na fonte."}</p></div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <MetricaCartao icon={Landmark} valor={aberto.startups_segmento_uf} rotulo={`startups do segmento em ${nomeUf(aberto.uf)}`} />
              <MetricaCartao icon={Landmark} valor={aberto.startups_segmento_brasil} rotulo="startups do segmento no Brasil" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Projetos EMBRAPII possivelmente relacionados</h4>
              <p className="mt-1 text-xs text-muted-foreground">Correspondência por termos em comum ou herdada dos desafios ligados. Indica competência próxima, não validação de aderência nem prova de solução.</p>
              {erroProjetos ? <p className="mt-2 text-sm text-muted-foreground">Projetos indisponíveis: {erroProjetos}</p> : projetos == null ? <p className="mt-2 text-sm text-muted-foreground">Carregando…</p> : !projetos.length ? <p className="mt-2 text-sm text-muted-foreground">Nenhum projeto relacionado pelos critérios do cruzamento.</p> :
                <ul className="mt-2 space-y-2">{projetos.map(p => <li key={p.cod_projeto} className="rounded border border-border p-2 text-sm">
                  <p className="text-foreground">{p.titulo ? destacarTermos(p.titulo, p.termos_em_comum).map((s, i) => s.marcado ? <mark key={i} className="rounded bg-accent/20 px-0.5 text-foreground">{s.texto}</mark> : <span key={i}>{s.texto}</span>) : p.cod_projeto}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{[p.ue_sigla, p.ue_uf, p.ano].filter(Boolean).join(" · ")} · termos em comum: {p.termos_em_comum.join(", ")}</p>
                </li>)}</ul>}
            </div>
            {!!aberto.unidades?.length && <div><h4 className="text-xs font-semibold uppercase text-muted-foreground">Unidades EMBRAPII envolvidas</h4><p className="mt-1 text-sm">{aberto.unidades.join(", ")}</p></div>}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

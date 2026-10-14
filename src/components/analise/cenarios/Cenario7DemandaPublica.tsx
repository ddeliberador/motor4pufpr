import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleHelp, Download, ExternalLink, FileText, Landmark, DoorOpen } from "lucide-react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { fetchAll } from "@/lib/fetchAll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MetricaCartao from "./MetricaCartao";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { COBERTURAS, contagens, destacarTermos, exportarComSolucaoExcel, filtrarDesafios, fraseLacuna, ordenarLacunas, rotuloCobertura, type Cobertura, type Desafio, type FiltrosDesafio, type LacunaArea } from "@/lib/demandaPublica";

type UfLinha = { uf: string | null; desafios: number; com_solucao_relacionada: number; sem_solucao_catalogada: number; abertos: number; municipais: number; estaduais: number; federais: number };
type Projeto = { cod_projeto: string; termos_em_comum: string[]; titulo: string | null; ue_sigla: string | null; ue_uf: string | null; ano: number | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const COR = ["bg-primary", "bg-destructive", "bg-muted-foreground/40"];
const SELO = ["border-primary/50 text-primary", "border-destructive/50 text-destructive", "border-border text-muted-foreground"];
const ROT = ["com possível solução", "sem solução catalogada", "descrição insuficiente"];
const VAZIO: FiltrosDesafio = { area: "", uf: "", esfera: "", status: "", tipo: "", cobertura: "", busca: "" };
const fmtData = (s: string | null) => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : null;
const nomeUf = (u: string | null) => u == null ? "UF não identificada" : u === "BR" ? "Alcance nacional" : ESTADOS[u] ?? u;

function Barra({ partes, total }: { partes: number[]; total: number }) {
  return <div className="flex h-3 w-full overflow-hidden rounded bg-muted">{partes.map((p, i) => p > 0 && <div key={i} className={COR[i]} style={{ width: `${(p / total) * 100}%` }} />)}</div>;
}

export default function Cenario7DemandaPublica() {
  const [desafios, setDesafios] = useState<Desafio[] | null>(null);
  const [lacunas, setLacunas] = useState<LacunaArea[] | null>(null);
  const [ufs, setUfs] = useState<UfLinha[] | null>(null);
  const [metodo, setMetodo] = useState<{ seg: { area: string; segmento: string }[]; ign: { termo: string; motivo: string | null }[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState<FiltrosDesafio>(VAZIO);
  const [aberto, setAberto] = useState<Desafio | null>(null);
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAll<Desafio>(db.from("vw_desafios_cobertura").select("*").order("desafio_id")),
      fetchAll<LacunaArea>(db.from("vw_desafios_lacunas_area").select("*").order("area")),
      fetchAll<UfLinha>(db.from("vw_desafios_uf").select("*").order("uf")),
    ]).then(([d, l, u]) => { setDesafios(d); setLacunas(l); setUfs(u); }).catch(e => setErro(String(e?.message ?? e)));
    Promise.all([
      fetchAll<{ area: string; segmento: string }>(db.from("desafio_area_segmento").select("area,segmento").order("area").order("segmento")),
      fetchAll<{ termo: string; motivo: string | null }>(db.from("desafio_termos_ignorados").select("termo,motivo").order("termo")),
    ]).then(([seg, ign]) => setMetodo({ seg, ign })).catch(() => setMetodo(null));
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setProjetos(null);
    (async () => {
      const rel = await fetchAll<{ cod_projeto: string; termos_em_comum: string[] }>(db.from("desafio_projeto_relacionado").select("cod_projeto,termos_em_comum").eq("desafio_id", aberto.desafio_id).order("cod_projeto"));
      if (!rel.length) return setProjetos([]);
      const { data, error } = await db.from("embrapii_projetos").select("cod_projeto,proj_titulo_publico,ue_sigla,ue_uf,ano_contrato").in("cod_projeto", rel.map(r => r.cod_projeto)).order("cod_projeto");
      if (error) throw error;
      const p = new Map((data ?? []).map((x: { cod_projeto: string }) => [x.cod_projeto, x]));
      setProjetos(rel.map(r => { const x = p.get(r.cod_projeto) as { proj_titulo_publico: string | null; ue_sigla: string | null; ue_uf: string | null; ano_contrato: number | null } | undefined;
        return { ...r, titulo: x?.proj_titulo_publico ?? null, ue_sigla: x?.ue_sigla ?? null, ue_uf: x?.ue_uf ?? null, ano: x?.ano_contrato ?? null }; }));
    })().catch(() => setProjetos([]));
  }, [aberto]);

  const c = desafios ? contagens(desafios) : null;
  const lac = lacunas ? ordenarLacunas(lacunas) : [];
  const maxArea = Math.max(1, ...lac.map(l => l.desafios));
  const ufsOrd = useMemo(() => [...(ufs ?? [])].sort((a, b) => b.sem_solucao_catalogada - a.sem_solucao_catalogada || b.desafios - a.desafios), [ufs]);
  const maxUf = Math.max(1, ...ufsOrd.map(u => u.desafios));
  const lista = desafios ? filtrarDesafios(desafios, f) : [];
  const opcoes = (k: keyof Desafio) => [...new Set((desafios ?? []).map(d => d[k]).filter(v => v != null) as string[])].sort();
  const sel = (k: keyof FiltrosDesafio, rot: string, ops: string[], nome?: (v: string) => string) => (
    <label className="text-xs text-muted-foreground">{rot}
      <select className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}>
        <option value="">Todos</option>{ops.map(o => <option key={o} value={o}>{nome ? nome(o) : o}</option>)}
      </select>
    </label>);

  if (erro) return <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Dados indisponíveis: {erro}</p>;

  return (
    <div className="space-y-8">
      <section aria-label="Números de destaque" className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricaCartao icon={Landmark} valor={c?.total} rotulo="desafios mapeados" />
        <MetricaCartao icon={DoorOpen} valor={c?.abertos} rotulo="com inscrição aberta hoje" />
        <MetricaCartao icon={CheckCircle2} valor={c?.com} rotulo="com possível solução encontrada no Motor" />
        <MetricaCartao icon={AlertTriangle} valor={c?.sem} rotulo="sem solução catalogada" />
        <MetricaCartao icon={CircleHelp} valor={c?.insuf} rotulo="com descrição insuficiente para cruzar" />
      </section>

      {desafios && c && c.com > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => exportarComSolucaoExcel(desafios)}>
            <Download size={14} className="mr-1" />Exportar em Excel os {c.com} com possível solução encontrada no Motor
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">{ROT.map((r, i) => <span key={r} className="flex items-center gap-1"><span className={`h-3 w-3 rounded-sm ${COR[i]}`} />{r}</span>)}</div>

      <section aria-labelledby="lacunas-t" className="space-y-3">
        <h2 id="lacunas-t" className="text-xl font-bold text-foreground">Onde estão as lacunas</h2>
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-base font-semibold text-foreground">{lacunas ? fraseLacuna(lacunas) ?? "Sem áreas no levantamento." : "Carregando…"}</p>
        <div className="space-y-2">
          <div className="hidden grid-cols-[10rem_1fr_6rem] gap-3 text-[10px] uppercase text-muted-foreground sm:grid"><span>Área</span><span>Desafios por cobertura</span><span className="text-right">Startups do segmento (Brasil)</span></div>
          {lac.map(l => (
            <button key={l.area} onClick={() => setF({ ...VAZIO, area: l.area })} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded px-1 py-1 text-left hover:bg-muted sm:grid-cols-[10rem_1fr_6rem]">
              <span className="text-sm font-medium text-foreground">{l.area} <span className="text-xs text-muted-foreground">({l.sem_solucao_catalogada}/{l.desafios})</span></span>
              <span className="order-3 col-span-2 sm:order-none sm:col-span-1" style={{ width: `${(l.desafios / maxArea) * 100}%` }}><Barra partes={[l.com_solucao_relacionada, l.sem_solucao_catalogada, l.descricao_insuficiente]} total={l.desafios} /></span>
              <span className="text-right text-sm font-semibold text-foreground">{l.startups_segmento_brasil == null ? "—" : l.startups_segmento_brasil.toLocaleString("pt-BR")}</span>
            </button>))}
        </div>
      </section>

      <section aria-labelledby="uf-t" className="space-y-3">
        <h2 id="uf-t" className="text-xl font-bold text-foreground">Por estado</h2>
        <p className="text-sm text-muted-foreground">Clique num estado para filtrar a lista. Número em vermelho: desafios sem solução catalogada.</p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {ufsOrd.map(u => { const k = u.uf ?? ""; const insuf = u.desafios - u.com_solucao_relacionada - u.sem_solucao_catalogada;
            return <button key={k || "nd"} disabled={!u.uf} aria-pressed={f.uf === k} onClick={() => setF({ ...f, uf: f.uf === k ? "" : k })}
              className={`grid grid-cols-[9rem_1fr_3rem] items-center gap-2 rounded px-1 py-1 text-left hover:bg-muted ${f.uf === k && k ? "ring-2 ring-primary" : ""}`}>
              <span className="truncate text-sm text-foreground">{nomeUf(u.uf)}</span>
              <span style={{ width: `${(u.desafios / maxUf) * 100}%` }}><Barra partes={[u.com_solucao_relacionada, u.sem_solucao_catalogada, insuf]} total={u.desafios} /></span>
              <span className="text-right text-xs"><strong className="text-destructive">{u.sem_solucao_catalogada}</strong><span className="text-muted-foreground">/{u.desafios}</span></span>
            </button>; })}
        </div>
      </section>

      <section aria-labelledby="lista-t" className="space-y-3">
        <h2 id="lista-t" className="text-xl font-bold text-foreground">Lista de desafios</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          <label className="col-span-2 text-xs text-muted-foreground md:col-span-4 lg:col-span-1">Buscar<Input className="mt-1 h-9" value={f.busca} onChange={e => setF({ ...f, busca: e.target.value })} placeholder="nome, órgão…" /></label>
          {sel("area", "Área", opcoes("area"))}{sel("uf", "UF", opcoes("uf"), nomeUf)}{sel("esfera", "Esfera", opcoes("esfera"))}
          {sel("status", "Status", opcoes("status"))}{sel("tipo", "Tipo de chamada", opcoes("tipo_chamada"))}{sel("cobertura", "Cobertura", COBERTURAS, c => rotuloCobertura(c as Cobertura))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{lista.length} de {desafios?.length ?? "…"} desafios</span>{JSON.stringify(f) !== JSON.stringify(VAZIO) && <Button variant="ghost" size="sm" onClick={() => setF(VAZIO)}>Limpar filtros</Button>}</div>
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map(d => { const i = COBERTURAS.indexOf(d.cobertura);
            return <article key={d.desafio_id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <button onClick={() => setAberto(d)} className="text-left" aria-label={`Abrir detalhe de ${d.nome}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-muted-foreground">{d.desafio_id}</span>
                  <span className={`rounded border px-1.5 py-0.5 font-semibold ${SELO[i]}`}>{ROT[i]}</span>
                  {d.verificacao === "Só título e link" && <span className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">só título e link</span>}
                </div>
                <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground hover:underline">{d.nome}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{[d.orgao, d.area, nomeUf(d.uf), d.status].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d.inscricoes_ate ? `Inscrições até ${fmtData(d.inscricoes_ate)}` : "Prazo não informado"}{d.premio_ou_contrato ? ` · ${d.premio_ou_contrato}` : ""}</p>
              </button>
              <div className="mt-auto flex gap-3 text-xs">
                {d.fonte_url && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={d.fonte_url} target="_blank" rel="noreferrer">Fonte <ExternalLink size={12} /></a>}
                {d.pagina_url && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={d.pagina_url} target="_blank" rel="noreferrer">Página <ExternalLink size={12} /></a>}
              </div>
            </article>; })}
        </div>
      </section>

      <details className="rounded-lg border border-border p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><ChevronDown size={16} />Como cruzamos</summary>
        <p className="mt-3 text-sm text-muted-foreground">Cada desafio é comparado com os títulos dos 4.540 projetos EMBRAPII. Um projeto conta como possivelmente relacionado quando compartilha ao menos dois termos específicos com o nome e o problema do desafio, isto é, termos que aparecem em até 40 títulos e que não estão na lista de termos genéricos. As startups entram por setor: a área do desafio corresponde a segmentos da ABStartups, numa tabela explícita. Não usamos IA para classificar. As startups não têm descrição de produto na base, por isso contam só como oferta setorial.</p>
        {metodo ? <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Área → segmentos ABStartups</h4>
            <table className="w-full text-xs"><tbody>{[...new Set(metodo.seg.map(s => s.area))].map(a => <tr key={a} className="border-b border-border/50 align-top"><td className="py-1 pr-2 font-medium">{a}</td><td className="py-1 text-muted-foreground">{metodo.seg.filter(s => s.area === a).map(s => s.segmento).join("; ")}</td></tr>)}</tbody></table></div>
          <div><h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Termos genéricos ignorados ({metodo.ign.length})</h4>
            <p className="text-xs text-muted-foreground">{metodo.ign.map(t => t.termo).join(", ")}</p></div>
        </div> : <p className="mt-3 text-xs text-muted-foreground">Tabelas do método indisponíveis.</p>}
      </details>

      <p className="border-t border-border pt-3 text-[11px] text-muted-foreground"><FileText size={12} className="mr-1 inline" />Desafios: levantamento de desafios públicos já publicados (esboço compartilhado pela Profª Eunice Liu, MCTI), montado a partir da Plataforma Desafios (Enap), de sites de órgãos públicos, de editais e de notícias, conferido em 07/10/2026. Cada desafio traz o link de onde os dados foram lidos. O valor mistura prêmio, teto de contrato e fomento, por isso não é somado. Oferta: projetos EMBRAPII e startups ABStartups já presentes no Motor.</p>

      <Dialog open={!!aberto} onOpenChange={o => !o && setAberto(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {aberto && <>
            <DialogHeader>
              <DialogTitle className="pr-6 leading-snug">{aberto.nome}</DialogTitle>
              <DialogDescription>{[aberto.desafio_id, aberto.orgao, aberto.area, nomeUf(aberto.uf)].filter(Boolean).join(" · ")}</DialogDescription>
            </DialogHeader>
            <span className={`w-fit rounded border px-1.5 py-0.5 text-xs font-semibold ${SELO[COBERTURAS.indexOf(aberto.cobertura)]}`}>{rotuloCobertura(aberto.cobertura)}</span>
            <div><h4 className="text-xs font-semibold uppercase text-muted-foreground">Problema</h4><p className="mt-1 text-sm text-foreground">{aberto.problema || "Não descrito na fonte."}</p></div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <MetricaCartao icon={Landmark} valor={aberto.startups_segmento_uf} rotulo={`startups do segmento em ${nomeUf(aberto.uf)}`} />
              <MetricaCartao icon={Landmark} valor={aberto.startups_segmento_brasil} rotulo="startups do segmento no Brasil" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Projetos EMBRAPII possivelmente relacionados</h4>
              <p className="mt-1 text-xs text-muted-foreground">Projetos cujo título compartilha termos específicos com o desafio. Indicam competência próxima, não comprovam que o problema foi resolvido.</p>
              {projetos == null ? <p className="mt-2 text-sm text-muted-foreground">Carregando…</p> : !projetos.length ? <p className="mt-2 text-sm text-muted-foreground">Nenhum projeto relacionado pelos critérios do cruzamento.</p> :
                <ul className="mt-2 space-y-2">{projetos.map(p => <li key={p.cod_projeto} className="rounded border border-border p-2 text-sm">
                  <p className="text-foreground">{p.titulo ? destacarTermos(p.titulo, p.termos_em_comum).map((s, i) => s.marcado ? <mark key={i} className="rounded bg-primary/20 px-0.5 text-foreground">{s.texto}</mark> : <span key={i}>{s.texto}</span>) : p.cod_projeto}</p>
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

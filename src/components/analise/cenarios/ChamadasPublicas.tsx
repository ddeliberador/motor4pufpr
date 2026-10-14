import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";
import { fetchAll } from "@/lib/fetchAll";
import { Button } from "@/components/ui/button";
import { diasRestantes, exportarChamadasExcel, filtrarChamadas, textoDias, type Chamada, type FiltrosChamada, type ProjetoChamada } from "@/lib/chamadasPublicas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const VAZIO: FiltrosChamada = { status: "", esfera: "", uf: "", instrumento: "" };
const fmt = (s: string | null) => s ? new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR") : null;

export default function ChamadasPublicas() {
  const [cs, setCs] = useState<Chamada[] | null>(null);
  const [proj, setProj] = useState<Map<number, ProjetoChamada[]>>(new Map());
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState<FiltrosChamada>(VAZIO);

  useEffect(() => {
    (async () => {
      const [c, rel] = await Promise.all([
        fetchAll<Chamada>(db.from("chamadas_publicas").select("*").order("prazo_final", { nullsFirst: false }).order("chamada_id")),
        fetchAll<Omit<ProjetoChamada, "titulo" | "ue_sigla" | "ue_uf">>(db.from("chamada_projeto_relacionado").select("chamada_id,cod_projeto,termos_em_comum,n_termos,origem").order("chamada_id").order("n_termos", { ascending: false }).order("cod_projeto")),
      ]);
      const info = new Map<string, { proj_titulo_publico: string | null; ue_sigla: string | null; ue_uf: string | null }>();
      const cods = [...new Set(rel.map(r => r.cod_projeto))];
      for (let i = 0; i < cods.length; i += 200) {
        const { data, error } = await db.from("embrapii_projetos").select("cod_projeto,proj_titulo_publico,ue_sigla,ue_uf").in("cod_projeto", cods.slice(i, i + 200));
        if (error) throw error;
        (data ?? []).forEach((x: { cod_projeto: string }) => info.set(x.cod_projeto, x as never));
      }
      const m = new Map<number, ProjetoChamada[]>();
      rel.forEach(r => { const x = info.get(r.cod_projeto);
        m.set(r.chamada_id, [...(m.get(r.chamada_id) ?? []), { ...r, titulo: x?.proj_titulo_publico ?? null, ue_sigla: x?.ue_sigla ?? null, ue_uf: x?.ue_uf ?? null }]); });
      setCs(c); setProj(m);
    })().catch(e => setErro(String(e?.message ?? e)));
  }, []);

  const lista = useMemo(() => cs ? filtrarChamadas(cs, f) : [], [cs, f]);
  const comSolucao = (cs ?? []).filter(c => proj.get(c.chamada_id)?.length).length;
  const ops = (k: keyof Chamada) => [...new Set((cs ?? []).map(c => c[k]).filter(v => v != null) as string[])].sort();
  const sel = (k: keyof FiltrosChamada, rot: string, o: string[]) => (
    <label className="text-xs text-muted-foreground">{rot}
      <select className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}>
        <option value="">Todos</option>{o.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </label>);

  return (
    <section aria-labelledby="chamadas-t" className="space-y-3">
      <h2 id="chamadas-t" className="text-xl font-bold text-foreground">Chamadas abertas e em andamento</h2>
      <p className="text-sm text-muted-foreground">Editais, CPSI, hackathons e consultas públicas. Uma chamada pode reunir vários desafios. Os dias restantes são calculados a partir da data de hoje.</p>
      {erro ? <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Chamadas indisponíveis: {erro}</p> : <>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {sel("status", "Status", ops("status"))}{sel("esfera", "Esfera", ops("esfera"))}{sel("uf", "UF", ops("uf"))}{sel("instrumento", "Instrumento", ops("instrumento"))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{lista.length} de {cs?.length ?? "…"} chamadas · {comSolucao} com possível solução EMBRAPII</span>
          <div className="flex gap-2">
            {JSON.stringify(f) !== JSON.stringify(VAZIO) && <Button variant="ghost" size="sm" onClick={() => setF(VAZIO)}>Limpar filtros</Button>}
            {cs && comSolucao > 0 && <Button variant="outline" size="sm" onClick={() => exportarChamadasExcel(cs, proj)}><Download size={14} className="mr-1" />Exportar em Excel as {comSolucao} com possível solução EMBRAPII</Button>}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map(c => { const ps = proj.get(c.chamada_id) ?? []; const dias = diasRestantes(c.prazo_final);
            const unidades = [...new Set(ps.map(p => p.ue_sigla).filter(Boolean))];
            return <article key={c.chamada_id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded border border-border px-1.5 py-0.5 font-semibold text-foreground">{c.status}</span>
                {c.instrumento && <span className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">{c.instrumento}</span>}
                {c.status === "Verificar" && <span className="rounded border border-destructive/50 px-1.5 py-0.5 font-semibold text-destructive">prazo não confirmado</span>}
              </div>
              <h3 className="text-sm font-semibold leading-snug text-foreground">{c.nome}</h3>
              <p className="text-xs text-muted-foreground">{[c.orgao, c.esfera, c.uf, c.tema].filter(Boolean).join(" · ")}</p>
              <p className="text-xs text-foreground">{c.prazo_final ? <>Prazo final {fmt(c.prazo_final)} · <strong className={dias != null && dias < 0 ? "text-muted-foreground" : "text-primary"}>{textoDias(dias)}</strong></> : "Prazo não informado"}{c.valor_premio ? ` · ${c.valor_premio}` : ""}</p>
              <div className="rounded border border-border bg-muted/40 p-2 text-xs">
                <p className="font-semibold text-foreground">Possível solução EMBRAPII</p>
                {ps.length ? <>
                  <p className="text-muted-foreground">Unidade{unidades.length > 1 ? "s" : ""}: {unidades.join(", ") || "não informada"} · {ps.length} {ps.length === 1 ? "projeto" : "projetos"}{ps[0].origem === "herdado" ? " (herdados dos desafios ligados)" : ""}</p>
                  <ul className="mt-1 list-disc pl-4 text-foreground">{ps.slice(0, 3).map(p => <li key={p.cod_projeto}>{p.titulo ?? p.cod_projeto} <span className="text-muted-foreground">({p.termos_em_comum.join(", ")})</span></li>)}</ul>
                  <p className="mt-1 text-[10px] text-muted-foreground">Correspondência por termos em comum, não validação de aderência.</p>
                </> : <p className="text-muted-foreground">Nenhuma correspondência encontrada.</p>}
              </div>
              <div className="mt-auto flex flex-wrap gap-3 text-xs">
                {c.link_oficial && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={c.link_oficial} target="_blank" rel="noreferrer">Link oficial <ExternalLink size={12} /></a>}
                {c.fonte_info && <span className="text-muted-foreground">Fonte: {c.fonte_info}</span>}
              </div>
            </article>; })}
        </div>
        <p className="text-[11px] text-muted-foreground">Chamadas: planilha de levantamento de 14/10/2026 compartilhada pela coorientação. É um retrato daquela data; o status muda, confira sempre o link oficial. Valor ou prêmio é texto e não é somado.</p>
      </>}
    </section>
  );
}

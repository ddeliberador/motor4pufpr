import { useEffect, useState } from "react";
import { Info, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS_ESTADUAIS, fmtNumero, type ViewRow } from "@/lib/sistemasEstaduais";

const POR_PAGINA = 20;
type Ator = ViewRow<"vw_atores_sni_lista">;
type Relacao = ViewRow<"vw_relacoes_cooperacao">;
export type FiltroRelacoes = { aba: "empresas" | "instituicoes"; atorId?: string; instituicao?: string; outraUf?: string; rotulo?: string };
const esc = (s: string) => s.replace(/[,()*%\\]/g, " ").trim();
const fmtReais = (v: number | null) => v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Paginacao({ pagina, total, onChange }: { pagina: number; total: number; onChange: (p: number) => void }) {
  const ult = Math.max(0, Math.ceil(total / POR_PAGINA) - 1);
  return <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>{fmtNumero(total)} resultado(s) · página {pagina + 1} de {ult + 1}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={pagina === 0} onClick={() => onChange(pagina - 1)}>Anterior</Button><Button size="sm" variant="outline" disabled={pagina >= ult} onClick={() => onChange(pagina + 1)}>Próxima</Button></div></div>;
}

export function ListaAtores({ uf, camadas, onAtor }: { uf: string; camadas: { nome: string }[]; onAtor: (a: Ator) => void }) {
  const [categoria, setCategoria] = useState<string | null>(null);
  const [camada, setCamada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [linhas, setLinhas] = useState<Ator[]>([]);
  const [total, setTotal] = useState(0);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => { setPagina(0); }, [uf, categoria, camada, busca]);
  useEffect(() => {
    let ativo = true;
    Promise.all([null, ...CATEGORIAS_ESTADUAIS.map(c => c.id)].map(async c => {
      let q = supabase.from("vw_atores_sni_lista").select("ator_id", { count: "exact", head: true }).eq("uf", uf);
      if (c) q = q.eq("categoria", c);
      const { count, error } = await q; if (error) throw error;
      return [c ?? "todos", count ?? 0] as const;
    })).then(r => { if (ativo) setContagens(Object.fromEntries(r)); }).catch(e => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [uf]);
  useEffect(() => {
    let ativo = true;
    const t = setTimeout(async () => {
      let q = supabase.from("vw_atores_sni_lista").select("*", { count: "exact" }).eq("uf", uf);
      if (categoria) q = q.eq("categoria", categoria);
      if (camada === "Sem camada") q = q.or("camadas.is.null,camadas.eq.{}");
      else if (camada) q = q.contains("camadas", [camada]);
      if (busca.trim()) q = q.ilike("nome", `%${esc(busca)}%`);
      const { data, count, error } = await q.order("relacoes", { ascending: false, nullsFirst: false }).order("nome").order("ator_id").range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      if (!ativo) return;
      if (error) setErro(error.message); else { setErro(null); setLinhas(data ?? []); setTotal(count ?? 0); }
    }, 250);
    return () => { ativo = false; clearTimeout(t); };
  }, [uf, categoria, camada, busca, pagina]);
  const cats = [{ id: null as string | null, nome: "Todos", k: "todos" }, ...CATEGORIAS_ESTADUAIS.map(c => ({ id: c.id as string | null, nome: c.id === "ict" ? "Instituições de pesquisa" : c.nome, k: c.id }))];
  return <TooltipProvider>
    <div className="flex flex-wrap gap-2">{cats.map(c => <Button key={c.k} size="sm" variant={categoria === c.id ? "default" : "outline"} onClick={() => setCategoria(c.id)}>{c.nome} <span className="ml-1 tabular-nums opacity-70">{fmtNumero(contagens[c.k])}</span></Button>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{[null, ...camadas.map(c => c.nome), "Sem camada"].map(c => <Button key={c ?? "todas"} size="sm" variant={camada === c ? "secondary" : "ghost"} className="h-7 border border-border text-xs" onClick={() => setCamada(c)}>{c ?? "Todas as camadas"}</Button>)}</div>
    <p className="mt-2 text-xs text-muted-foreground">Camadas de IA em que o ator atua, segundo as regras em Como classificamos.</p>
    <Input className="mt-3 max-w-sm" placeholder="Buscar por nome" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar ator por nome" />
    {erro && <p role="alert" className="mt-3 text-destructive">Falha ao consultar atores: {erro}</p>}
    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm" data-testid="lista-atores"><thead><tr className="text-muted-foreground">{["Nome", "Tipo", "Município", "Camadas de IA", "Relações"].map(h => <th key={h} className={`p-2 ${h === "Relações" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
      <tbody>{linhas.map(a => { const clicavel = (a.relacoes ?? 0) > 0; return <tr key={a.ator_id} className={`border-t border-border ${clicavel ? "cursor-pointer hover:bg-muted/40" : ""}`} onClick={() => clicavel && onAtor(a)}>
        <td className="p-2 font-semibold">{clicavel ? <button className="text-left underline-offset-2 hover:underline">{a.nome}</button> : a.nome}{a.uf_origem?.startsWith("inferida") && <Tooltip><TooltipTrigger asChild><Info className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" aria-label="Estado inferido pelo município e coordenadas" /></TooltipTrigger><TooltipContent>Estado inferido pelo município e coordenadas</TooltipContent></Tooltip>}</td>
        <td className="p-2 text-muted-foreground">{a.tipo ?? "—"}</td><td className="p-2 text-muted-foreground">{a.municipio ?? "—"}</td>
        <td className="p-2"><div className="flex flex-wrap gap-1">{(a.camadas ?? []).length ? a.camadas!.map(c => <span key={c} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px]">{c}</span>) : <span className="text-xs text-muted-foreground">Sem camada</span>}</div></td>
        <td className="p-2 text-right font-bold tabular-nums">{fmtNumero(a.relacoes ?? 0)}</td></tr>; })}
        {!linhas.length && !erro && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum ator neste recorte.</td></tr>}</tbody></table></div>
    <Paginacao pagina={pagina} total={total} onChange={setPagina} />
  </TooltipProvider>;
}

function consulta(uf: string, f: FiltroRelacoes, busca: string, soFora: boolean) {
  let q = supabase.from("vw_relacoes_cooperacao").select("*", { count: "exact" }).eq(f.aba === "empresas" ? "empresa_uf" : "instituicao_uf", uf);
  if (f.atorId) q = q.or(`instituicao_id.eq.${f.atorId},empresa_id.eq.${f.atorId}`);
  if (f.instituicao) q = q.eq("instituicao", f.instituicao);
  if (f.outraUf) q = q.eq(f.aba === "empresas" ? "instituicao_uf" : "empresa_uf", f.outraUf);
  if (soFora) q = q.eq("mesmo_estado", false);
  const b = esc(busca);
  if (b) q = q.or(`instituicao.ilike.%${b}%,empresa.ilike.%${b}%,projeto.ilike.%${b}%`);
  return q.order("ano", { ascending: false, nullsFirst: false }).order("relacao_id");
}

export function ListaRelacoes({ uf, filtro, onFiltro, totais }: { uf: string; filtro: FiltroRelacoes; onFiltro: (f: FiltroRelacoes) => void; totais: { empresas: number | null; instituicoes: number | null } }) {
  const [busca, setBusca] = useState("");
  const [soFora, setSoFora] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [linhas, setLinhas] = useState<Relacao[]>([]);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);
  useEffect(() => { setPagina(0); }, [uf, filtro, busca, soFora]);
  useEffect(() => {
    let ativo = true;
    const t = setTimeout(async () => {
      const { data, count, error } = await consulta(uf, filtro, busca, soFora).range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      if (!ativo) return;
      if (error) setErro(error.message); else { setErro(null); setLinhas(data ?? []); setTotal(count ?? 0); }
    }, 250);
    return () => { ativo = false; clearTimeout(t); };
  }, [uf, filtro, busca, soFora, pagina]);
  async function baixar() {
    setBaixando(true);
    try {
      const todas: Relacao[] = [];
      for (let i = 0; ; i += 1000) {
        const { data, error } = await consulta(uf, filtro, busca, soFora).range(i, i + 999);
        if (error) throw error;
        todas.push(...(data ?? [])); if ((data ?? []).length < 1000) break;
      }
      const cols = ["ano", "data_contrato", "instituicao", "instituicao_tipo", "instituicao_uf", "empresa", "empresa_porte", "empresa_uf", "cod_projeto", "projeto", "status", "tecnologia", "area_aplicacao", "financiador", "valor_rateado", "mesmo_estado"] as const;
      const cel = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [cols.join(";"), ...todas.map(r => cols.map(c => cel(r[c])).join(";"))].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
      a.download = `relacoes-${uf}-${filtro.aba}.csv`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { setErro((e as Error).message); } finally { setBaixando(false); }
  }
  const abas = [{ id: "empresas" as const, nome: "Empresas do estado", n: totais.empresas }, { id: "instituicoes" as const, nome: "Instituições do estado", n: totais.instituicoes }];
  return <div>
    <div className="flex flex-wrap gap-2" role="tablist">{abas.map(a => <Button key={a.id} role="tab" aria-selected={filtro.aba === a.id} variant={filtro.aba === a.id ? "default" : "outline"} onClick={() => onFiltro({ aba: a.id })}>{a.nome} <span className="ml-1 tabular-nums opacity-70">{fmtNumero(a.n)}</span></Button>)}</div>
    {filtro.rotulo && <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1 text-sm">Filtro: <strong>{filtro.rotulo}</strong><button aria-label="Remover filtro" onClick={() => onFiltro({ aba: filtro.aba })}><X className="h-4 w-4" /></button></div>}
    <div className="mt-3 flex flex-wrap items-center gap-3"><Input className="max-w-sm" placeholder="Buscar instituição, empresa ou projeto" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar relações" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soFora} onChange={e => setSoFora(e.target.checked)} />Só com outros estados</label>
      <Button size="sm" variant="outline" className="ml-auto" disabled={baixando} onClick={baixar}><Download className="mr-1 h-4 w-4" />{baixando ? "Gerando…" : "Baixar CSV"}</Button></div>
    {erro && <p role="alert" className="mt-3 text-destructive">Falha ao consultar relações: {erro}</p>}
    <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm" data-testid="lista-relacoes"><thead><tr className="text-muted-foreground">{["Ano", "Instituição", "Empresa", "Projeto", "Tecnologia", "Valor"].map(h => <th key={h} className={`p-2 ${h === "Valor" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
      <tbody>{linhas.map(r => { const fora = r.mesmo_estado === false; const selo = <span className="ml-1 rounded border border-border px-1 text-[10px] text-muted-foreground">outro estado</span>; return <tr key={r.relacao_id} className="border-t border-border align-top">
        <td className="p-2 tabular-nums">{r.ano ?? "—"}</td>
        <td className="p-2">{r.instituicao ?? "—"} <span className="text-muted-foreground">· {r.instituicao_uf ?? "?"}</span>{fora && filtro.aba === "empresas" && selo}</td>
        <td className="p-2">{r.empresa ?? "—"} <span className="text-muted-foreground">· {r.empresa_uf ?? "?"}</span>{fora && filtro.aba === "instituicoes" && selo}</td>
        <td className="max-w-[280px] p-2 text-muted-foreground">{r.projeto ?? "—"}</td><td className="p-2 text-muted-foreground">{r.tecnologia ?? "—"}</td>
        <td className="p-2 text-right tabular-nums">{fmtReais(r.valor_rateado)}</td></tr>; })}
        {!linhas.length && !erro && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma relação neste recorte.</td></tr>}</tbody></table></div>
    <Paginacao pagina={pagina} total={total} onChange={setPagina} />
  </div>;
}

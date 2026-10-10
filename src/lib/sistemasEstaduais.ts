import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchAll } from "@/lib/fetchAll";

export type ViewRow<K extends keyof Database["public"]["Views"]> = Database["public"]["Views"][K]["Row"];
export const UF_INICIAL = "PR";
export const ESTADOS: Record<string, string> = { AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins" };
export const CATEGORIAS_ESTADUAIS = [
  { id: "ict", nome: "ICTs / Universidades" }, { id: "empresa", nome: "Empresas" },
  { id: "startup", nome: "Startups" }, { id: "habitat", nome: "Habitats" }, { id: "governo", nome: "Governo" },
];
export const PERFIS = ["Exportador de competência", "Importador de competência", "Autocentrado", "Aberto (circula nos dois sentidos)", "Rede incipiente", "Sem oferta local"];
export const corPerfil = (perfil: string | null) => {
  const i = PERFIS.indexOf(perfil ?? "");
  return i < 0 ? "hsl(var(--muted))" : `hsl(var(--sistema-perfil-${i + 1}))`;
};
export const fmtNumero = (v: number | null | undefined) => v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export const fmtPct = (v: number | null | undefined) => v == null ? "—" : `${fmtNumero(v)}%`;
export const fmtMilhoes = (v: number | null | undefined) => v == null ? "—" : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} mi`;

export function totalAtores(resumo: Pick<ViewRow<"vw_uf_atores_resumo">, "atores">[]) {
  return resumo.reduce((s, r) => s + (r.atores ?? 0), 0);
}
export function agruparValores<T>(linhas: T[], chave: (r: T) => string | null, valor: (r: T) => number | null, divisor = 1) {
  const grupos = new Map<string, number>();
  for (const r of linhas) {
    const k = chave(r) ?? "Não informado";
    grupos.set(k, (grupos.get(k) ?? 0) + (valor(r) ?? 0) / divisor);
  }
  return [...grupos].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
}
export function montarSankey(linhas: ViewRow<"vw_uf_fomento_fluxo">[], uf: string) {
  const origem = agruparValores(linhas, r => r.financiador, r => r.valor_publico, 1e6).filter(r => r.valor > 0);
  const destino = agruparValores(linhas, r => r.uf_empresa, r => r.valor_publico, 1e6).filter(r => r.valor > 0);
  const meio = origem.length;
  return {
    nodes: [...origem.map(r => ({ name: r.nome })), { name: `Unidades · ${uf}` }, ...destino.map(r => ({ name: `Empresas · ${r.nome}` }))],
    links: [...origem.map((r, i) => ({ source: i, target: meio, value: r.valor })), ...destino.map((r, i) => ({ source: meio, target: meio + 1 + i, value: r.valor }))],
  };
}

async function lerUma<K extends keyof Database["public"]["Views"]>(view: K, uf: string): Promise<ViewRow<K> | null> {
  // Generic view names defeat PostgREST column inference; all views read here expose `uf`.
  const { data, error } = await (supabase.from(view as "vw_uf_relacoes_perfil").select("*").eq("uf", uf).maybeSingle());
  if (error) throw error;
  return data as unknown as ViewRow<K> | null;
}
export async function carregarEstado(uf: string) {
  const [perfil, resumo, composicao, entrada, saida, fomentoEntrada, fomentoSaida, fomento, conversao, limitacoes] = await Promise.all([
    lerUma("vw_uf_relacoes_perfil", uf),
    fetchAll<ViewRow<"vw_uf_atores_resumo">>(supabase.from("vw_uf_atores_resumo").select("*").eq("uf", uf).order("categoria")),
    fetchAll<ViewRow<"vw_uf_composicao">>(supabase.from("vw_uf_composicao").select("*").eq("uf", uf).order("categoria").order("camada_ordem")),
    fetchAll<ViewRow<"vw_interacao_fluxo_uf">>(supabase.from("vw_interacao_fluxo_uf").select("*").eq("destino_uf", uf).order("origem_uf").order("ano").order("tecnologia")),
    fetchAll<ViewRow<"vw_interacao_fluxo_uf">>(supabase.from("vw_interacao_fluxo_uf").select("*").eq("origem_uf", uf).order("destino_uf").order("ano").order("tecnologia")),
    fetchAll<ViewRow<"vw_uf_fomento_fluxo">>(supabase.from("vw_uf_fomento_fluxo").select("*").eq("uf_unidade", uf).order("financiador").order("uf_empresa").order("ano").order("tecnologia")),
    fetchAll<ViewRow<"vw_uf_fomento_fluxo">>(supabase.from("vw_uf_fomento_fluxo").select("*").eq("uf_empresa", uf).order("financiador").order("uf_unidade").order("ano").order("tecnologia")),
    lerUma("vw_uf_fomento_resumo", uf), lerUma("vw_uf_base_conversao", uf),
    fetchAll<ViewRow<"vw_uf_limitacoes">>(supabase.from("vw_uf_limitacoes").select("*").eq("uf", uf).order("ordem").order("codigo")),
  ]);
  return { perfil, resumo, composicao, entrada, saida, fomentoEntrada, fomentoSaida, fomento, conversao, limitacoes };
}
export type DadosEstado = Awaited<ReturnType<typeof carregarEstado>>;
export type AtorClassificado = ViewRow<"vw_atores_sni"> & { regras: ViewRow<"vw_ator_camada">[] };
export async function carregarAtoresCelula(uf: string, categoria: string, camada: string): Promise<AtorClassificado[]> {
  const atores = await fetchAll<ViewRow<"vw_atores_sni">>(supabase.from("vw_atores_sni").select("*").eq("uf", uf).eq("categoria", categoria).order("nome").order("ator_id"));
  const ids = atores.flatMap(a => a.ator_id ? [a.ator_id] : []);
  const regras: ViewRow<"vw_ator_camada">[] = [];
  // Bounded ID batches avoid long URLs and keep classification reads confined to the selected UF/category.
  for (let i = 0; i < ids.length; i += 100) {
    let q = supabase.from("vw_ator_camada").select("*").in("ator_id", ids.slice(i, i + 100)).order("ator_id").order("camada").order("regra_id");
    if (camada !== "—") q = q.eq("camada", camada);
    regras.push(...await fetchAll<ViewRow<"vw_ator_camada">>(q));
  }
  const porAtor = new Map<string, ViewRow<"vw_ator_camada">[]>();
  for (const r of regras) if (r.ator_id) porAtor.set(r.ator_id, [...(porAtor.get(r.ator_id) ?? []), r]);
  return atores.map(a => ({ ...a, regras: porAtor.get(a.ator_id ?? "") ?? [] })).filter(a => camada === "—" ? a.regras.length === 0 : a.regras.length > 0);
}
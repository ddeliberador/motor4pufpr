import { COBERTURAS, type Cobertura } from "./demandaPublica";

export type Oportunidade = {
  id: string; tipo_registro: "desafio" | "chamada"; nome: string; descricao: string | null;
  orgao: string | null; esfera: string | null; uf: string | null; area: string | null; tipo: string | null;
  status: string; prazo: string | null; valor_texto: string | null; fonte_url: string | null;
  pagina_url: string | null; verificacao: string | null; cobertura: Cobertura; projetos_embrapii: number | null;
  unidades: string[] | null; exemplos: string[] | null; exemplos_termos: string[] | null;
  startups_segmento_uf: number | null; startups_segmento_brasil: number | null;
  chamada_id: number | null; chamada_nome: string | null; ordem_cobertura: number; ordem_status: number;
};
export type AreaOportunidades = { area: string; total: number; com_solucao: number; sem_solucao: number; insuficiente: number; vigentes: number; startups_segmento_brasil: number | null };
export type UfOportunidades = Omit<AreaOportunidades, "area" | "startups_segmento_brasil"> & { uf: string | null };
export type FiltrosOportunidade = { busca: string; area: string; uf: string; esfera: string; status: string; tipo: string; cobertura: string; tipo_registro: string };
export const FILTROS_VAZIOS: FiltrosOportunidade = { busca: "", area: "", uf: "", esfera: "", status: "", tipo: "", cobertura: "", tipo_registro: "" };
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function ordenarOportunidades(os: Oportunidade[]) {
  return [...os].sort((a, b) => a.ordem_cobertura - b.ordem_cobertura || a.ordem_status - b.ordem_status
    || (a.prazo ?? "9999-12-31").localeCompare(b.prazo ?? "9999-12-31") || a.id.localeCompare(b.id));
}
export function filtrarOportunidades(os: Oportunidade[], f: FiltrosOportunidade) {
  const busca = norm(f.busca.trim());
  return ordenarOportunidades(os.filter(o => Object.entries(f).every(([k, v]) => k === "busca" || !v || o[k as keyof Oportunidade] === v)
    && (!busca || norm([o.id, o.nome, o.descricao, o.orgao, o.chamada_nome].filter(Boolean).join(" ")).includes(busca))));
}
export function contagensOportunidades(os: Oportunidade[]) {
  return { total: os.length, vigentes: os.filter(o => o.status === "Aberta" || o.status === "Em andamento").length,
    com: os.filter(o => o.cobertura === COBERTURAS[0]).length, sem: os.filter(o => o.cobertura === COBERTURAS[1]).length,
    insuf: os.filter(o => o.cobertura === COBERTURAS[2]).length };
}
export function fraseLacunaOportunidades(areas: AreaOportunidades[]) {
  const a = [...areas].sort((a, b) => b.sem_solucao - a.sem_solucao || b.total - a.total)[0];
  if (!a) return null;
  return `Em ${a.area}, ${a.sem_solucao} de ${a.total - a.insuficiente} oportunidades com descrição não têm solução catalogada no Motor${a.startups_segmento_brasil ? `, embora haja ${a.startups_segmento_brasil.toLocaleString("pt-BR")} startups dos segmentos ligados à área` : ""}.`;
}
export function chamadaIdNumerico(o: Pick<Oportunidade, "id" | "chamada_id">) {
  if (o.chamada_id != null) return Number(o.chamada_id);
  const match = /^CH-(\d+)$/.exec(o.id);
  return match ? Number(match[1]) : null;
}
export function linhasExcelOportunidades(os: Oportunidade[]) {
  return os.filter(o => o.cobertura === COBERTURAS[0]).map(o => ({
    ID: o.id, tipo_registro: o.tipo_registro, chamada_nome: o.chamada_nome ?? "", Oportunidade: o.nome,
    Órgão: o.orgao ?? "", Esfera: o.esfera ?? "", UF: o.uf ?? "", Área: o.area ?? "", Tipo: o.tipo ?? "",
    Status: o.status, Prazo: o.prazo ?? "", "Valor ou prêmio": o.valor_texto ?? "",
    "Projetos EMBRAPII relacionados": o.projetos_embrapii ?? "", "Unidades EMBRAPII": (o.unidades ?? []).join("; "),
    "Exemplos de projetos": (o.exemplos ?? []).join(" | "), "Startups do segmento no Brasil": o.startups_segmento_brasil ?? "",
    Fonte: o.fonte_url ?? "", Página: o.pagina_url ?? "",
  }));
}
export async function exportarOportunidadesExcel(os: Oportunidade[]) {
  const { utils, writeFile } = await import("xlsx");
  const ws = utils.json_to_sheet(linhasExcelOportunidades(os));
  ws["!cols"] = Object.keys(linhasExcelOportunidades(os)[0] ?? {}).map(() => ({ wch: 24 }));
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Oportunidades com solução");
  writeFile(wb, `oportunidades-com-solucao-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
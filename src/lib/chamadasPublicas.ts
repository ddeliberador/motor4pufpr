export type Chamada = {
  chamada_id: number; nome: string; orgao: string | null; esfera: string | null; uf: string | null; instrumento: string | null;
  tema: string | null; quem_pode: string | null; abertura: string | null; prazo_final: string | null; status: string;
  valor_premio: string | null; link_oficial: string | null; fonte_info: string | null; observacoes: string | null; levantamento_em: string;
};
export type ProjetoChamada = { chamada_id: number; cod_projeto: string; termos_em_comum: string[]; n_termos: number; origem: string; titulo: string | null; ue_sigla: string | null; ue_uf: string | null };

/** Dias entre hoje (data local) e o prazo final. Negativo: prazo já passou. */
export function diasRestantes(prazo: string | null, hoje: Date = new Date()): number | null {
  if (!prazo) return null;
  const [a, m, d] = prazo.slice(0, 10).split("-").map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const h = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - h) / 86_400_000);
}

export function textoDias(n: number | null): string {
  if (n == null) return "prazo não informado";
  if (n < 0) return `prazo passou há ${-n} ${-n === 1 ? "dia" : "dias"}`;
  if (n === 0) return "termina hoje";
  return `${n} ${n === 1 ? "dia restante" : "dias restantes"}`;
}

export type FiltrosChamada = { status: string; esfera: string; uf: string; instrumento: string };
export const filtrarChamadas = (cs: Chamada[], f: FiltrosChamada) =>
  cs.filter(c => (!f.status || c.status === f.status) && (!f.esfera || c.esfera === f.esfera) && (!f.uf || c.uf === f.uf) && (!f.instrumento || c.instrumento === f.instrumento));

/** Exporta para Excel as chamadas com possível solução EMBRAPII (correspondência por termos). */
export async function exportarChamadasExcel(cs: Chamada[], proj: Map<number, ProjetoChamada[]>) {
  const { utils, writeFile } = await import("xlsx");
  const lista = cs.filter(c => proj.get(c.chamada_id)?.length);
  const linhas = lista.map(c => { const ps = proj.get(c.chamada_id)!;
    return {
      "ID": c.chamada_id, "Chamada": c.nome, "Órgão": c.orgao ?? "", "Esfera": c.esfera ?? "", "UF": c.uf ?? "",
      "Instrumento": c.instrumento ?? "", "Tema": c.tema ?? "", "Status": c.status, "Prazo final": c.prazo_final ?? "",
      "Valor ou prêmio": c.valor_premio ?? "", "Origem do vínculo": ps[0].origem === "herdado" ? "herdado dos desafios ligados" : "termos em comum",
      "Projetos EMBRAPII relacionados": ps.length,
      "Unidades EMBRAPII": [...new Set(ps.map(p => p.ue_sigla).filter(Boolean))].join("; "),
      "Exemplos de projetos": ps.slice(0, 3).map(p => p.titulo ?? p.cod_projeto).join(" | "),
      "Link oficial": c.link_oficial ?? "", "Fonte": c.fonte_info ?? "",
    }; });
  const ws = utils.json_to_sheet(linhas);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Chamadas com solução");
  writeFile(wb, `chamadas-com-possivel-solucao-embrapii-${new Date().toISOString().slice(0, 10)}.xlsx`);
  return lista.length;
}

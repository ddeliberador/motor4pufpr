export type Cobertura = "Possível solução relacionada no Motor" | "Sem solução catalogada no Motor" | "Descrição insuficiente para cruzar";
export const COBERTURAS: Cobertura[] = ["Possível solução relacionada no Motor", "Sem solução catalogada no Motor", "Descrição insuficiente para cruzar"];

/** Rótulos exibidos na tela. O banco guarda "relacionada"; só a apresentação muda. */
export const ROTULO_COBERTURA: Record<Cobertura, string> = {
  "Possível solução relacionada no Motor": "Possível solução encontrada no Motor",
  "Sem solução catalogada no Motor": "Sem solução catalogada no Motor",
  "Descrição insuficiente para cruzar": "Descrição insuficiente para cruzar",
};
export const rotuloCobertura = (c: Cobertura) => ROTULO_COBERTURA[c] ?? c;

export type Desafio = {
  desafio_id: string; nome: string; problema: string | null; orgao: string | null; esfera: string | null; uf: string | null;
  area: string | null; tipo_chamada: string | null; ano: number | null; inscricoes_ate: string | null; status: string | null;
  premio_ou_contrato: string | null; valor_rs: number | null; fonte_url: string | null; pagina_url: string | null; verificacao: string | null;
  startups_segmento_uf: number | null; startups_segmento_brasil: number | null; projetos_embrapii_relacionados: number | null;
  unidades_embrapii_relacionadas: number | null; unidades: string[] | null; exemplos: string[] | null; exemplos_termos: string[] | null;
  cobertura: Cobertura;
};
export type LacunaArea = {
  area: string; desafios: number; com_solucao_relacionada: number; sem_solucao_catalogada: number; descricao_insuficiente: number;
  pct_sem_solucao: number | null; startups_segmento_brasil: number | null; projetos_embrapii_relacionados: number | null;
};

export function contagens(ds: Desafio[]) {
  const c = (k: Cobertura) => ds.filter(d => d.cobertura === k).length;
  return { total: ds.length, abertos: ds.filter(d => d.status === "Aberto").length, com: c(COBERTURAS[0]), sem: c(COBERTURAS[1]), insuf: c(COBERTURAS[2]) };
}

export const ordenarLacunas = (ls: LacunaArea[]) => [...ls].sort((a, b) => b.sem_solucao_catalogada - a.sem_solucao_catalogada || b.desafios - a.desafios);

export function fraseLacuna(ls: LacunaArea[]): string | null {
  const t = ordenarLacunas(ls)[0];
  if (!t) return null;
  const comDescricao = t.desafios - t.descricao_insuficiente;
  const st = t.startups_segmento_brasil ? `, embora haja ${t.startups_segmento_brasil.toLocaleString("pt-BR")} startups dos segmentos ligados à área` : "";
  return `Em ${t.area}, ${t.sem_solucao_catalogada} de ${comDescricao} desafios com descrição não têm solução catalogada no Motor${st}.`;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Divide o título em trechos, marcando palavras que começam por algum termo (radical) em comum. */
export function destacarTermos(titulo: string, termos: string[]): { texto: string; marcado: boolean }[] {
  const radicais = termos.flatMap(t => t.split(/\s+/)).filter(Boolean).map(norm);
  return titulo.split(/(\s+)/).filter(p => p !== "").map(p => {
    const w = norm(p.replace(/[^\p{L}\p{N}]/gu, ""));
    return { texto: p, marcado: !!w && radicais.some(r => w.startsWith(r)) };
  });
}

export type FiltrosDesafio = { area: string; uf: string; esfera: string; status: string; tipo: string; cobertura: string; busca: string };
export function filtrarDesafios(ds: Desafio[], f: FiltrosDesafio) {
  const b = norm(f.busca.trim());
  const ok = (v: string | null, alvo: string) => !alvo || (v ?? "") === alvo;
  return ds.filter(d => ok(d.area, f.area) && ok(d.uf, f.uf) && ok(d.esfera, f.esfera) && ok(d.status, f.status) && ok(d.tipo_chamada, f.tipo) && ok(d.cobertura, f.cobertura)
    && (!b || norm([d.nome, d.problema, d.orgao, d.desafio_id].filter(Boolean).join(" ")).includes(b)));
}

/** Exporta para Excel os desafios com possível solução encontrada no Motor. */
export async function exportarComSolucaoExcel(ds: Desafio[]) {
  const { utils, writeFile } = await import("xlsx");
  const lista = ds.filter(d => d.cobertura === COBERTURAS[0]);
  const linhas = lista.map(d => ({
    "ID": d.desafio_id,
    "Desafio": d.nome,
    "Órgão": d.orgao ?? "",
    "Esfera": d.esfera ?? "",
    "UF": d.uf ?? "",
    "Área": d.area ?? "",
    "Status": d.status ?? "",
    "Inscrições até": d.inscricoes_ate ?? "",
    "Prêmio ou contrato": d.premio_ou_contrato ?? "",
    "Projetos EMBRAPII relacionados": d.projetos_embrapii_relacionados ?? "",
    "Unidades EMBRAPII": (d.unidades ?? []).join("; "),
    "Exemplos de projetos": (d.exemplos ?? []).join(" | "),
    "Startups do segmento no Brasil": d.startups_segmento_brasil ?? "",
    "Fonte": d.fonte_url ?? "",
    "Página": d.pagina_url ?? "",
  }));
  const ws = utils.json_to_sheet(linhas);
  ws["!cols"] = [{ wch: 10 }, { wch: 60 }, { wch: 30 }, { wch: 12 }, { wch: 6 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 40 }, { wch: 60 }, { wch: 14 }, { wch: 40 }, { wch: 40 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Com solução no Motor");
  writeFile(wb, `desafios-com-solucao-no-motor-${new Date().toISOString().slice(0, 10)}.xlsx`);
  return lista.length;
}

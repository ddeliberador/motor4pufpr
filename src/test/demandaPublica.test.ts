import { FILTROS_VAZIOS, contagensOportunidades, filtrarOportunidades, ordenarOportunidades, linhasExcelOportunidades, fraseLacunaOportunidades, type Oportunidade } from "@/lib/oportunidadesPublicas";
import { describe, it, expect } from "vitest";
import { contagens, destacarTermos, fraseLacuna, filtrarDesafios, rotuloCobertura, type Desafio, type LacunaArea } from "@/lib/demandaPublica";

const d = (p: Partial<Desafio>) => ({ desafio_id: "X", nome: "n", cobertura: "Sem solução catalogada no Motor", status: "Encerrado", ...p }) as Desafio;

describe("demanda pública", () => {
  it("conta abertos só com status Aberto e por cobertura", () => {
    const c = contagens([d({ status: "Aberto" }), d({ cobertura: "Possível solução relacionada no Motor" }), d({ cobertura: "Descrição insuficiente para cruzar", status: "Em andamento" })]);
    expect(c).toEqual({ total: 3, abertos: 1, com: 1, sem: 1, insuf: 1 });
  });
  it("frase usa a área com mais desafios sem solução e desconta os sem descrição", () => {
    const ls = [{ area: "Saúde", desafios: 28, sem_solucao_catalogada: 18, descricao_insuficiente: 3, startups_segmento_brasil: 336 },
      { area: "Gestão Pública", desafios: 29, sem_solucao_catalogada: 23, descricao_insuficiente: 5, startups_segmento_brasil: 401 }] as LacunaArea[];
    expect(fraseLacuna(ls)).toBe("Em Gestão Pública, 23 de 24 desafios com descrição não têm solução catalogada no Motor, embora haja 401 startups dos segmentos ligados à área.");
  });
  it("destaca palavras pelo radical, ignorando acentos", () => {
    const s = destacarTermos("Saúde mental de trabalhadores", ["mental", "saúd"]);
    expect(s.filter(x => x.marcado).map(x => x.texto)).toEqual(["Saúde", "mental"]);
  });
  it("filtra por UF e busca sem acento", () => {
    const ds = [d({ uf: "RJ", nome: "Compras Públicas" }), d({ uf: "SP", nome: "Compras" })];
    expect(filtrarDesafios(ds, { area: "", uf: "RJ", esfera: "", status: "", tipo: "", cobertura: "", busca: "publicas" })).toHaveLength(1);
  });
  it("troca só a apresentação da cobertura, mantendo o valor do banco", () => {
    expect(rotuloCobertura("Possível solução relacionada no Motor")).toBe("Possível solução encontrada no Motor");
    expect(rotuloCobertura("Sem solução catalogada no Motor")).toBe("Sem solução catalogada no Motor");
    expect(rotuloCobertura("Descrição insuficiente para cruzar")).toBe("Descrição insuficiente para cruzar");
  });
});

const o = (p: Partial<Oportunidade>) => ({ id: "DB-001", tipo_registro: "desafio", nome: "Saúde", cobertura: "Possível solução relacionada no Motor", ordem_cobertura: 0, ordem_status: 0, status: "Aberta", prazo: null, ...p }) as Oportunidade;
describe("oportunidades unificadas", () => {
  it("vigentes são Aberta e Em andamento para ambos os registros", () => {
    expect(contagensOportunidades([o({}), o({ tipo_registro: "chamada", status: "Em andamento" }), o({ status: "Recorrente", cobertura: "Sem solução catalogada no Motor" }), o({ status: "A verificar", cobertura: "Descrição insuficiente para cruzar" })])).toEqual({ total: 4, vigentes: 2, com: 2, sem: 1, insuf: 1 });
  });
  it("ordena cobertura, status e prazo, com prazo ausente no fim", () => {
    expect(ordenarOportunidades([o({ id: "sem", ordem_cobertura: 1 }), o({ id: "enc", ordem_status: 4 }), o({ id: "tarde", prazo: "2026-11-01" }), o({ id: "cedo", prazo: "2026-10-16" }), o({ id: "sem-prazo" }), o({ id: "insuf", ordem_cobertura: 2 })]).map(o => o.id)).toEqual(["cedo", "tarde", "sem-prazo", "enc", "sem", "insuf"]);
  });
  it("Registro combina com todos os filtros e busca sem acento", () => {
    const lista = [o({}), o({ id: "CH-007", tipo_registro: "chamada", uf: "PR", area: "Saúde", esfera: "Estadual", tipo: "CPSI", chamada_nome: "Inovação pública" })];
    expect(filtrarOportunidades(lista, { ...FILTROS_VAZIOS, tipo_registro: "chamada", uf: "PR", area: "Saúde", esfera: "Estadual", tipo: "CPSI", status: "Aberta", busca: "inovacao" }).map(o => o.id)).toEqual(["CH-007"]);
  });
  it("Excel inclui ambos os registros com solução e prêmio como texto", () => {
    const linhas = linhasExcelOportunidades([o({ chamada_nome: "Edital" }), o({ tipo_registro: "chamada", valor_texto: "Até R$ 50 mil" }), o({ cobertura: "Sem solução catalogada no Motor" })]);
    expect(linhas).toHaveLength(2);
    expect(linhas.map(l => l.tipo_registro)).toEqual(["desafio", "chamada"]);
    expect(linhas[0].chamada_nome).toBe("Edital");
    expect(linhas[1]["Valor ou prêmio"]).toBe("Até R$ 50 mil");
  });
  it("frase desconta descrições insuficientes do total unificado", () => {
    expect(fraseLacunaOportunidades([{ area: "Saúde", total: 10, com_solucao: 2, sem_solucao: 5, insuficiente: 3, vigentes: 1, startups_segmento_brasil: null }])).toBe("Em Saúde, 5 de 7 oportunidades com descrição não têm solução catalogada no Motor.");
  });
});

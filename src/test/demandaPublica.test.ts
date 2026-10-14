import { describe, it, expect } from "vitest";
import { contagens, destacarTermos, fraseLacuna, filtrarDesafios, type Desafio, type LacunaArea } from "@/lib/demandaPublica";

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
});

import { describe, expect, it } from "vitest";
import { agruparValores, montarSankey, totalAtores, UF_INICIAL } from "@/lib/sistemasEstaduais";

describe("Sistemas estaduais", () => {
  it("inicia em PR", () => expect(UF_INICIAL).toBe("PR"));
  it("conta atores pelo resumo de categorias, não pelas células multirrótulo", () => {
    expect(totalAtores([{ atores: 137 }, { atores: 207 }, { atores: 200 }, { atores: 7 }, { atores: 1 }])).toBe(552);
  });
  it("soma relações de todos os anos por UF", () => {
    const r = [{ uf: "SP", ano: 2020, lacos: 2 }, { uf: "SP", ano: 2024, lacos: 3 }, { uf: "PR", ano: 2024, lacos: 1 }];
    expect(agruparValores(r, x => x.uf, x => x.lacos)).toEqual([{ nome: "SP", valor: 5 }, { nome: "PR", valor: 1 }]);
  });
  it("converte reais em milhões e conserva o fluxo público em ambos os lados do Sankey", () => {
    const base = { ano: 2024, financiador: "EMBRAPII", projetos: 1, tecnologia: "IA", uf_empresa: "SP", uf_unidade: "PR", valor_empresas: 0, valor_publico: 2000000, valor_sebrae: 0, valor_unidades: 0, vinculos: 1 };
    const s = montarSankey([base, { ...base, uf_empresa: "PR", valor_publico: 1000000 }], "PR");
    expect(s.links[0].value).toBe(3);
    expect(s.links.filter(x => x.source === 1).reduce((v, x) => v + x.value, 0)).toBe(3);
  });
});
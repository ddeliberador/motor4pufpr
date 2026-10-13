import { describe, expect, it } from "vitest";
import { apontamentosInfra, energiaSemProcessamento, resumoCruzamento, type EstadoCruzamento } from "@/lib/cruzamentoInfra";

const linha = (uf: string, situacao: string | null, dc: number | null): EstadoCruzamento => ({ uf, situacao, dc, razao: null, brasil: null, cabo: null, fibra: null });
describe("cruzamento energético", () => {
  it("propõe estudo de processamento para exportadores com até dois registros", () => {
    expect(apontamentosInfra(linha("PA", "Exporta energia", 2))[2].tipo).toBe("Possibilidade");
    expect(apontamentosInfra(linha("PA", "Exporta energia", 3))[2].tipo).toBe("Atenção");
  });
  it("sinaliza dependência energética sem confundir ausência de dados", () => {
    expect(apontamentosInfra(linha("SP", "Depende de energia de outros estados", 91))[0].tipo).toBe("Atenção");
    expect(apontamentosInfra(linha("SP", null, null)).map(s => s.tipo)).toEqual(["Indisponível", "Indisponível", "Indisponível"]);
  });
  it("mantém o limiar existente de conectividade crítica abaixo de 70%", () => {
    expect(apontamentosInfra({ ...linha("RN", "Exporta energia", 1), fibra: 69 })[1].tipo).toBe("Atenção");
    expect(apontamentosInfra({ ...linha("RN", "Exporta energia", 1), fibra: 70 })[1].tipo).toBe("Possibilidade");
  });
  it("calcula parcelas dos datacenters como razão de somas, não média de estados", () => {
    const r = resumoCruzamento([linha("PA", "Exporta energia", 2), linha("RO", "Exporta energia", 1), linha("SP", "Depende de energia de outros estados", 91), linha("DF", "Perto do equilíbrio", 6)], 100);
    expect(r).toEqual({ exportadores: 2, pctExportadores: 3, pctDependentes: 91, principalDependente: "SP" });
  });
  it("marca PA com 2 datacenters e exportadores com zero ou um, mas não SP dependente", () => {
    expect(energiaSemProcessamento(linha("PA", "Exporta energia", 2))).toBe(true);
    expect(energiaSemProcessamento(linha("RO", "Exporta energia", 1))).toBe(true);
    expect(energiaSemProcessamento(linha("RN", "Exporta energia", 0))).toBe(true);
    expect(energiaSemProcessamento(linha("SP", "Depende de energia de outros estados", 1))).toBe(false);
    expect(energiaSemProcessamento(linha("PR", "Exporta energia", 3))).toBe(false);
  });
  it("não trata datacenters indisponíveis como zero nem calcula uma parcela sem balanço", () => {
    expect(energiaSemProcessamento(linha("PA", "Exporta energia", null))).toBe(false);
    expect(resumoCruzamento([linha("PA", "Exporta energia", null)], null)).toBeNull();
    expect(resumoCruzamento([linha("SP", null, 91)], 91)).toBeNull();
    expect(resumoCruzamento([linha("PA", "Exporta energia", 0)], 0)).toBeNull();
  });
});
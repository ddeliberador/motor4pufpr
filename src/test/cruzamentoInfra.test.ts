import { describe, expect, it } from "vitest";
import { energiaSemProcessamento, rankingTarifa, resumoCruzamento, type EstadoCruzamento } from "@/lib/cruzamentoInfra";

const linha = (uf: string, situacao: string | null, dc: number | null): EstadoCruzamento => ({ uf, situacao, dc, razao: null, brasil: null, cabo: null, fibra: null, tarifa: null, rankTarifa: null });
describe("cruzamento energético", () => {
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
  it("ranqueia a tarifa do mais barato (1º) ao mais caro, com empates dividindo a posição", () => {
    const r = rankingTarifa({ PR: 768.69, TO: 992.78, CE: 701.75, SP: 788.98 });
    expect(r.CE).toBe(1);
    expect(r.PR).toBe(2);
    expect(r.SP).toBe(3);
    expect(r.TO).toBe(4);
    const e = rankingTarifa({ A: 100, B: 100, C: 90 });
    expect(e.C).toBe(1);
    expect(e.A).toBe(2);
    expect(e.B).toBe(2);
  });
  it("não ranqueia tarifas indisponíveis nem divide por zero", () => {
    expect(rankingTarifa(null)).toEqual({});
    expect(rankingTarifa({ PR: null, SP: undefined })).toEqual({});
    expect(rankingTarifa({ PR: NaN })).toEqual({});
  });
});
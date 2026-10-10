import { describe, it, expect } from "vitest";
import { razaoDeSomas, razao, TEC_IA, ANO_MIN, ANO_MAX, ultimoAnoCompleto, fraseCrescimento } from "@/lib/interacao";

describe("interação EMBRAPII", () => {
  it("percentual vem da soma das linhas, não da média de percentuais", () => {
    const linhas = [{ n: 1, d: 1 }, { n: 0, d: 9 }];
    expect(razaoDeSomas(linhas, (r) => r.n, (r) => r.d)).toBeCloseTo(0.1);
  });
  it("denominador zero dá indisponível, não zero", () => {
    expect(razao(0, 0)).toBeNull();
  });
  it("filtro padrão 2014–2026 e atalho Somente IA", () => {
    expect([ANO_MIN, ANO_MAX]).toEqual([2014, 2026]);
    expect(TEC_IA).toBe("Inteligência artificial");
  });
  it("ano corrente incompleto fica fora da comparação", () => {
    expect(ultimoAnoCompleto([2014, 2025, 2026], 2026)).toBe(2025);
  });
  it("crescimento com uma casa e 'menos que em' abaixo de 1", () => {
    expect(fraseCrescimento(2025, 500, 2014, 40)).toContain("12,5 vezes o número de 2014");
    expect(fraseCrescimento(2025, 30, 2014, 40)).toContain("menos que em 2014");
  });
});

import { describe, it, expect } from "vitest";
import { razaoDeSomas, razao, TEC_IA, ANO_MIN, ANO_MAX } from "@/lib/interacao";

describe("interação EMBRAPII", () => {
  it("percentual vem da soma das linhas, não da média de percentuais", () => {
    const linhas = [{ n: 1, d: 1 }, { n: 0, d: 9 }];
    expect(razaoDeSomas(linhas, (r) => r.n, (r) => r.d)).toBeCloseTo(0.1);
  });
  it("denominador zero dá indisponível, não zero", () => {
    expect(razao(0, 0)).toBeNull();
  });
  it("filtro padrão 2015–2026 e atalho Somente IA", () => {
    expect([ANO_MIN, ANO_MAX]).toEqual([2015, 2026]);
    expect(TEC_IA).toBe("Inteligência artificial");
  });
});

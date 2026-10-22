import { describe, expect, it } from "vitest";
import { cortesQuantis, periodoAteAno, porDezMilHabitantes, postoPercentual } from "./seriesMunicipais";

describe("séries municipais", () => {
  it("posto percentual vai de 0 a 100 e dá o mesmo posto a empates", () => {
    const p = postoPercentual({ a: 1, b: 2, c: 2, d: 10 });
    expect(p.a).toBe(0);
    expect(p.d).toBe(100);
    expect(p.b).toBe(p.c);
    expect(p.b).toBeCloseTo(50);
    expect(postoPercentual({ x: 5 })).toEqual({ x: 100 });
    expect(postoPercentual({})).toEqual({});
  });

  it("escolhe o último período até o ano em foco", () => {
    const per = [
      { periodo: "2022-12-01", granularidade: "mes", municipios: 10 },
      { periodo: "2023-12-01", granularidade: "mes", municipios: 10 },
      { periodo: "2025-06-01", granularidade: "mes", municipios: 10 },
    ];
    expect(periodoAteAno(per, null)?.periodo).toBe("2025-06-01");
    expect(periodoAteAno(per, 2024)?.periodo).toBe("2023-12-01");
    expect(periodoAteAno(per, 2021)).toBeNull();
    expect(periodoAteAno([], 2024)).toBeNull();
  });

  it("normaliza por 10 mil habitantes e ignora município sem população", () => {
    expect(porDezMilHabitantes({ a: 50, b: 3 }, { a: 100_000 })).toEqual({ a: 5 });
  });

  it("cortes por quantis são crescentes e ignoram zeros", () => {
    const v: Record<string, number> = {};
    for (let i = 0; i < 100; i++) v[`m${i}`] = i % 10 === 0 ? 0 : i;
    const c = cortesQuantis(v);
    expect(c.length).toBeGreaterThan(0);
    expect([...c].sort((x, y) => x - y)).toEqual(c);
    expect(c[0]).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { agregarEnergia, ufDoPonto, aterragensBrasil, type FeatureUF } from "@/lib/infraEstados";

const quad = (uf: string, x0: number, y0: number): FeatureUF => ({ uf, poligonos: [[[[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1], [x0, y0]]]] });
const feats = [quad("AA", 0, 0), quad("BB", 2, 0)];

describe("infraestrutura por estado", () => {
  it("soma potência em MW e calcula % renovável como razão de somas", () => {
    const r = agregarEnergia([
      { nome: "a", tipo: "UHE", uf: "PR", municipio: "", potencia_kw: 3000 },
      { nome: "b", tipo: "UTE", uf: "PR", municipio: "", potencia_kw: 1000 },
      { nome: "c", tipo: "UFV", uf: "SP", municipio: "", potencia_kw: 1000 },
    ]);
    expect(r[0].uf).toBe("PR");
    expect(r[0].total_mw).toBe(4);
    expect(r[0].pct_renovavel).toBe(75);
  });
  it("atribui ponto à UF que o contém e, na costa, à mais próxima", () => {
    expect(ufDoPonto(0.5, 0.5, feats)).toEqual({ uf: "AA", aproximado: false });
    expect(ufDoPonto(3.2, 0.5, feats)).toEqual({ uf: "BB", aproximado: true });
    expect(ufDoPonto(10, 10, feats)).toBeNull();
  });
  it("conta cabos por ponto de aterragem brasileiro", () => {
    const a = aterragensBrasil({
      cables: [{ landing_point_ids: ["x-brazil", "y-us"] }, { landing_point_ids: ["x-brazil"] }],
      points: [{ id: "x-brazil", name: "X, Brazil", latitude: 0.5, longitude: 0.5 }, { id: "y-us", name: "Y", latitude: 0, longitude: 0 }],
    }, feats);
    expect(a).toEqual([{ id: "x-brazil", nome: "X", uf: "AA", cabos: 2, aproximado: false }]);
  });
});

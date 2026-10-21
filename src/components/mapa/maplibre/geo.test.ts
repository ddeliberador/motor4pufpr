import { describe, expect, it } from "vitest";
import { arcoCurvo, bboxDaFeature, bboxesIntersectam, dentroDaFeature, CODIGO_IBGE_UF } from "./geo";
import type { Feature, Polygon } from "geojson";

const quadrado: Feature<Polygon, { sigla: string }> = {
  type: "Feature",
  properties: { sigla: "XX" },
  geometry: { type: "Polygon", coordinates: [[[-50, -25], [-48, -25], [-48, -23], [-50, -23], [-50, -25]]] },
};

describe("geo", () => {
  it("calcula a bbox e ignora ilhas oceânicas distantes", () => {
    expect(bboxDaFeature(quadrado)).toEqual([-50, -25, -48, -23]);
    const comIlha: Feature<Polygon | import("geojson").MultiPolygon, { sigla: string }> = {
      ...quadrado,
      geometry: { type: "MultiPolygon", coordinates: [quadrado.geometry.coordinates, [[[-32.4, -3.9], [-32.3, -3.9], [-32.3, -3.8], [-32.4, -3.9]]]] },
    };
    expect(bboxDaFeature(comIlha)).toEqual([-50, -25, -48, -23]);
  });

  it("testa ponto dentro e fora do polígono, com pré-filtro de bbox", () => {
    expect(dentroDaFeature(-49, -24, quadrado)).toBe(true);
    expect(dentroDaFeature(-47, -24, quadrado)).toBe(false);
    expect(dentroDaFeature(-49, -24, quadrado, [-50, -25, -48, -23])).toBe(true);
    expect(dentroDaFeature(-60, -24, quadrado, [-50, -25, -48, -23])).toBe(false);
  });

  it("detecta interseção de bboxes", () => {
    expect(bboxesIntersectam([-50, -25, -48, -23], [-49, -24, -40, -20])).toBe(true);
    expect(bboxesIntersectam([-50, -25, -48, -23], [-47, -24, -40, -20])).toBe(false);
  });

  it("gera um arco que começa na origem e termina no destino", () => {
    const pts = arcoCurvo([-49, -25], [-46, -23], 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual([-49, -25]);
    expect(pts[10][0]).toBeCloseTo(-46);
    expect(pts[10][1]).toBeCloseTo(-23);
  });

  it("tem código IBGE para as 27 UFs", () => {
    expect(Object.keys(CODIGO_IBGE_UF)).toHaveLength(27);
    expect(CODIGO_IBGE_UF.PR).toBe("41");
  });
});

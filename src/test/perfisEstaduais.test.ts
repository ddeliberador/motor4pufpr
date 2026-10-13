import { describe, expect, it } from "vitest";
import { contarEstadosPorPerfil } from "@/components/analise/cenarios/MapaSistemasEstaduais";

describe("Contagem de estados na legenda de perfis", () => {
  it("conta UFs distintas apenas no perfil correspondente", () => {
    const perfis = [
      { uf: "PR", perfil: "Importador de competência" },
      { uf: "PB", perfil: "Importador de competência" },
      { uf: "PR", perfil: "Importador de competência" },
      { uf: "SP", perfil: "Exportador de competência" },
      { uf: null, perfil: "Importador de competência" },
    ];
    expect(contarEstadosPorPerfil(perfis, "Importador de competência")).toBe(2);
    expect(contarEstadosPorPerfil(perfis, "Exportador de competência")).toBe(1);
    expect(contarEstadosPorPerfil(perfis, "Sem oferta local")).toBe(0);
  });
});
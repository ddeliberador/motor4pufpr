import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { agregarPorRegiao, base100, participacao } from "./seriesRegionais";

const linha = (uf: string, ano: number, valor: number | null) => ({
  entidade_chave: uf,
  periodo_referencia: `${ano}-01-01`,
  valor,
});

describe("agregarPorRegiao", () => {
  const serie = agregarPorRegiao([
    linha("PR", 2020, 10), linha("SC", 2020, 20), linha("RS", 2020, 30),
    linha("SP", 2020, 100),
    linha("pr", 2021, 15), linha("SC", 2021, 25),
    linha("SP", 2021, "120" as unknown as number),
    linha("XX", 2021, 999),
    linha("AM", 2021, null),
  ]);

  it("soma as UFs de cada região e ordena os anos", () => {
    expect(serie.anos).toEqual([2020, 2021]);
    expect(serie.celulas[2020].Sul.valor).toBe(60);
    expect(serie.celulas[2021].Sudeste.valor).toBe(120);
  });

  it("aceita sigla em minúscula e ignora UF desconhecida", () => {
    expect(serie.celulas[2021].Sul.porUf.PR).toBe(15);
    expect(Object.values(serie.celulas[2021]).some((c) => c.porUf.XX)).toBe(false);
  });

  it("estado sem linha conta como sem dado, nunca como zero", () => {
    expect(serie.celulas[2021].Sul.ufsComDado).toBe(2);
    expect(serie.celulas[2021].Sul.ufsTotal).toBe(3);
    expect(serie.celulas[2021].Norte.valor).toBeNull();
  });

  it("guarda o maior valor regional da série para a escala fixa", () => {
    expect(serie.maximo).toBe(120);
  });

  it("participação é razão de somas entre regiões com dado", () => {
    expect(participacao(serie, 2020, "Sul")).toBeCloseTo(60 / 160);
    expect(participacao(serie, 2021, "Norte")).toBeNull();
  });

  it("base 100 parte do primeiro ano com valor positivo", () => {
    expect(base100(serie, 2021, "Sul")).toEqual({ indice: (40 / 60) * 100, anoBase: 2020 });
    expect(base100(serie, 2020, "Sul")).toBeNull();
  });

  it("base 100 de série longa usa no máximo a janela de 10 anos", () => {
    const longa = agregarPorRegiao(
      Array.from({ length: 31 }, (_, k) => linha("PR", 1990 + k, k + 1)),
    );
    expect(longa.anos.length).toBe(31);
    expect(base100(longa, 2020, "Sul")).toEqual({ indice: (31 / 21) * 100, anoBase: 2010 });
  });
});

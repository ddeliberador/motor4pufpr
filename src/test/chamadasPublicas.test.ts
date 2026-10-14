import { describe, expect, it } from "vitest";
import { diasRestantes, textoDias } from "@/lib/chamadasPublicas";

describe("dias restantes da chamada", () => {
  const hoje = new Date(2026, 9, 14);
  it("conta dias até o prazo", () => expect(diasRestantes("2026-10-24", hoje)).toBe(10));
  it("prazo hoje é zero", () => expect(textoDias(diasRestantes("2026-10-14", hoje))).toBe("termina hoje"));
  it("prazo passado fica negativo", () => expect(diasRestantes("2026-10-10", hoje)).toBe(-4));
  it("sem prazo não calcula", () => expect(diasRestantes(null, hoje)).toBeNull());
});

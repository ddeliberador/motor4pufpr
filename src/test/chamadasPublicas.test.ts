import { describe, expect, it } from "vitest";
import { diasRestantes, textoDias } from "@/lib/chamadasPublicas";

import { chamadaIdNumerico } from "@/lib/oportunidadesPublicas";

describe("dias restantes da chamada", () => {
  const hoje = new Date(2026, 9, 14);
  it("conta dias até o prazo", () => expect(diasRestantes("2026-10-24", hoje)).toBe(10));
  it("prazo hoje é zero", () => expect(textoDias(diasRestantes("2026-10-14", hoje))).toBe("termina hoje"));
  it("prazo passado fica negativo", () => expect(diasRestantes("2026-10-10", hoje)).toBe(-4));
  it("sem prazo não calcula", () => expect(diasRestantes(null, hoje)).toBeNull());
});

it("resolve CH-007 como chamada 7", () => expect(chamadaIdNumerico({ id: "CH-007", chamada_id: null })).toBe(7));
it("prioriza ID da view", () => expect(chamadaIdNumerico({ id: "DB-121", chamada_id: 16 })).toBe(16));
it("não inventa ID ausente", () => expect(chamadaIdNumerico({ id: "DB-090", chamada_id: null })).toBeNull());

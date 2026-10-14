import { beforeEach, describe, expect, it, vi } from "vitest";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ safeSupabase: { functions: { invoke } } }));
import { carregarStatusHome } from "@/lib/homeStatus";
beforeEach(() => vi.resetAllMocks());
describe("Home status rules", () => {
  it("returns the catalog count and successful-source count from the protected reader", async () => {
    invoke.mockResolvedValue({ data: { bases: 113, coletas: 13 }, error: null });
    expect(await carregarStatusHome()).toEqual({ bases: 113, coletas: 13 });
    expect(invoke).toHaveBeenCalledWith("home-status");
  });
  it("does not return default totals if a read fails", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect(carregarStatusHome()).rejects.toThrow("Contagens indisponíveis");
  });
  it("rejects incomplete totals instead of filling missing values", async () => {
    invoke.mockResolvedValue({ data: { bases: 113 }, error: null });
    await expect(carregarStatusHome()).rejects.toThrow();
  });
  it("reads again on each visit without cached results", async () => {
    invoke.mockResolvedValue({ data: { bases: 113, coletas: 13 }, error: null });
    await carregarStatusHome(); await carregarStatusHome();
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

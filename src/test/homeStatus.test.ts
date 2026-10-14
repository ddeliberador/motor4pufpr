import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, range, eq, order } = vi.hoisted(() => ({
  from: vi.fn(), range: vi.fn(), eq: vi.fn(), order: vi.fn(),
}));
vi.mock("@/lib/supabaseClient", () => ({ safeSupabase: { from } }));
import { carregarStatusHome } from "@/lib/homeStatus";

beforeEach(() => {
  vi.resetAllMocks();
  eq.mockReturnValue({ order });
  order.mockReturnValue({ range });
  from.mockImplementation((table: string) => ({ select: () => table === "catalogo_bases"
    ? Promise.resolve({ count: 113, error: null }) : { eq } }));
});
describe("Home status rules", () => {
  it("counts distinct successful collection sources, with ordered pagination", async () => {
    range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, () => ({ fonte: "aneel" })), error: null })
      .mockResolvedValueOnce({ data: [{ fonte: "ipca" }, { fonte: "aneel" }], error: null });
    expect(await carregarStatusHome()).toEqual({ bases: 113, coletas: 2 });
    expect(eq).toHaveBeenCalledWith("ok", true);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
  it("does not return default totals if a read fails", async () => {
    range.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect(carregarStatusHome()).rejects.toThrow("denied");
  });
  it("reads again on each visit without cached results", async () => {
    range.mockResolvedValue({ data: [], error: null });
    await carregarStatusHome();
    await carregarStatusHome();
    expect(from.mock.calls.filter(([table]) => table === "catalogo_bases")).toHaveLength(2);
  });
});
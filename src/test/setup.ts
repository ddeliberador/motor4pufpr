import "@testing-library/jest-dom";
import { vi } from "vitest";

// Testes de unidade não falam com o banco. O cliente do app é criado no carregamento
// do módulo e exige VITE_SUPABASE_URL, que a CI não tem; sem este mock, qualquer teste
// que importe (direta ou indiretamente) "@/integrations/supabase/client" quebra a CI.
// O teste de RLS cria o próprio cliente com createClient e não é afetado.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

/**
 * Teste de RLS — Relatório de Acompanhamento 2 · 2026-09-14
 * Verifica que um usuário autenticado sem papel admin NÃO consegue
 * escrever em tabelas protegidas por is_admin().
 *
 * Execução: vitest run src/test/rls.test.ts
 * Requer: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.
 * Usuário de teste: criar conta sem papel admin no projeto Supabase.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const testEmail = import.meta.env.VITE_TEST_USER_EMAIL ?? "";
const testPassword = import.meta.env.VITE_TEST_USER_PASSWORD ?? "";

// Tabelas protegidas por is_admin() — escrita deve ser NEGADA a usuário comum
const PROTECTED_TABLES = [
  "build_log",
  "science_specialization_index",
  "regional_institutes",
  "mapa_inovacao_fontes",
];

describe("RLS — escrita negada a usuário sem papel admin", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseAnon || !testEmail || !testPassword) {
      console.warn("Variáveis de teste não configuradas — pulando testes de RLS");
      return;
    }
    client = createClient(supabaseUrl, supabaseAnon);
    const { error } = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (error) throw new Error(`Login de teste falhou: ${error.message}`);
  });

  it.each(PROTECTED_TABLES)("INSERT em %s deve retornar erro de permissão", async (table) => {
    if (!client) return;
    const { error } = await client.from(table).insert({ _dummy: true } as any);
    expect(error).not.toBeNull();
    expect(error?.code).toMatch(/42501|insufficient_privilege|permission denied/i);
  });

  it.each(PROTECTED_TABLES)("UPDATE em %s deve retornar erro de permissão", async (table) => {
    if (!client) return;
    const { error } = await client.from(table).update({ _dummy: true } as any).eq("id", "00000000-0000-0000-0000-000000000000");
    expect(error).not.toBeNull();
    expect(error?.code).toMatch(/42501|insufficient_privilege|permission denied/i);
  });

  it.each(PROTECTED_TABLES)("DELETE em %s deve retornar erro de permissão", async (table) => {
    if (!client) return;
    const { error } = await client.from(table).delete().eq("id", "00000000-0000-0000-0000-000000000000");
    expect(error).not.toBeNull();
    expect(error?.code).toMatch(/42501|insufficient_privilege|permission denied/i);
  });
});

describe("RLS — leitura pública permitida", () => {
  it.each(["build_log", "science_specialization_index", "regional_institutes"])(
    "SELECT em %s deve funcionar sem autenticação",
    async (table) => {
      if (!supabaseUrl || !supabaseAnon) return;
      const anonClient = createClient(supabaseUrl, supabaseAnon);
      const { error } = await anonClient.from(table).select("*").limit(1);
      expect(error).toBeNull();
    }
  );
});

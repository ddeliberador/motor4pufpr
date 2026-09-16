/**
 * Teste de RLS — tabelas de referência protegidas por public.is_admin().
 *
 * Prova, contra um projeto Supabase real, que:
 *   1. leitura pública funciona onde a policy permite (sem login);
 *   2. um usuário autenticado SEM papel admin não consegue INSERT/UPDATE/DELETE;
 *   3. (opcional) um usuário admin consegue — senão a policy pode estar
 *      bloqueando todo mundo, o que também seria um bug.
 *
 * Variáveis de ambiente:
 *   VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY   (opcionais; caem no projeto padrão)
 *   VITE_TEST_USER_EMAIL / VITE_TEST_USER_PASSWORD      conta SEM papel admin (obrigatórias p/ bloco 2)
 *   VITE_TEST_ADMIN_EMAIL / VITE_TEST_ADMIN_PASSWORD    conta COM papel admin (opcionais p/ bloco 3)
 *   VITE_TEST_TELEMETRY_WRITE=1                         liga o bloco 4 (issue #11)
 *
 * Sem as credenciais os blocos 2 e 3 aparecem como SKIPPED no vitest, nunca
 * como passed. Use um projeto de teste ou uma conta descartável: o bloco 3
 * insere e apaga uma linha real, e o bloco 4 insere 31 linhas em
 * telemetry_events que só service_role consegue apagar — por isso só roda
 * quando pedido explicitamente, e num projeto de teste.
 *
 * Execução: npx vitest run src/test/rls.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://jtoeinerhvxxgoeicrif.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0b2VpbmVyaHZ4eGdvZWljcmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDc3MzEsImV4cCI6MjA4NzE4MzczMX0.YSFNqKe_eqFAxJpF_6oJoJ_ZhJD_tvHdU7boIz50h7E";

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;
const userEmail = import.meta.env.VITE_TEST_USER_EMAIL ?? "";
const userPassword = import.meta.env.VITE_TEST_USER_PASSWORD ?? "";
const adminEmail = import.meta.env.VITE_TEST_ADMIN_EMAIL ?? "";
const adminPassword = import.meta.env.VITE_TEST_ADMIN_PASSWORD ?? "";

const temUsuario = Boolean(userEmail && userPassword);
const temAdmin = Boolean(adminEmail && adminPassword);
const testaTelemetria = import.meta.env.VITE_TEST_TELEMETRY_WRITE === "1";

// Marca para reconhecer (e apagar) qualquer linha que o bloco 3 venha a criar.
const MARCA = `rls-test-${Date.now()}`;

// Uma linha válida por tabela: satisfaz NOT NULL e CHECK, para que a requisição
// chegue ao Postgres e seja o RLS — não uma constraint nem o schema cache do
// PostgREST — a recusar. Colunas conforme as migrações em supabase/migrations.
const TABELAS: Record<string, { insert: Record<string, unknown>; update: Record<string, unknown>; leituraPublica: boolean }> = {
  build_log: {
    insert: { data: "2026-01-01", categoria: "correcao_bug", titulo: MARCA },
    update: { titulo: MARCA },
    leituraPublica: true,
  },
  science_specialization_index: {
    insert: { area_en: MARCA, grande_area_en: MARCA, area_pt: MARCA, grande_area_pt: MARCA },
    update: { area_pt: MARCA },
    leituraPublica: true,
  },
  regional_institutes: {
    insert: { nome: MARCA, tipo: "outro" },
    update: { nome: MARCA },
    leituraPublica: true,
  },
  city_geocode: {
    insert: { cidade: MARCA, uf: "PR" },
    update: { nota: MARCA },
    leituraPublica: true,
  },
  mapa_inovacao_fontes: {
    insert: { pilar: MARCA, fonte: MARCA },
    update: { fonte: MARCA },
    leituraPublica: false, // SELECT só para authenticated
  },
};
const NOMES = Object.keys(TABELAS);

// PostgREST devolve o SQLSTATE do Postgres: 42501 = insufficient_privilege (RLS).
const NEGADO = /^42501$/;

function anon(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

async function login(email: string, password: string): Promise<SupabaseClient> {
  const client = anon();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login de teste falhou (${email}): ${error.message}`);
  return client;
}

describe("RLS — leitura pública (sem login)", () => {
  it.each(NOMES.filter((t) => TABELAS[t].leituraPublica))("SELECT em %s funciona para anon", async (table) => {
    const { error } = await anon().from(table).select("id").limit(1);
    expect(error).toBeNull();
  });

  it.each(NOMES.filter((t) => !TABELAS[t].leituraPublica))("SELECT em %s devolve vazio para anon", async (table) => {
    const { data, error } = await anon().from(table).select("id").limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe.skipIf(!testaTelemetria)("telemetry_events — limite de INSERT anônimo por sessão (issue #11)", () => {
  // Migração 20260916120100: o 31º evento da mesma sessão em 60 s é recusado
  // pelo trigger limit_telemetry_rate(), que sinaliza com HINT telemetry_rate_limit.
  const LIMITE = 30;
  const sessao = MARCA;

  it(`aceita ${LIMITE} eventos e recusa o seguinte`, async () => {
    const cliente = anon();
    for (let i = 0; i < LIMITE; i++) {
      const { error } = await cliente.from("telemetry_events").insert({ session_id: sessao, event_type: "pillar_view" });
      expect(error, `evento ${i + 1} deveria entrar`).toBeNull();
    }

    const { error } = await cliente.from("telemetry_events").insert({ session_id: sessao, event_type: "pillar_view" });
    expect(error).not.toBeNull();
    expect(error?.hint).toBe("telemetry_rate_limit");
  });

  it("outra sessão continua aceitando", async () => {
    const { error } = await anon().from("telemetry_events").insert({ session_id: `${sessao}-b`, event_type: "pillar_view" });
    expect(error).toBeNull();
  });
});

describe.skipIf(!temUsuario)("RLS — escrita negada a usuário autenticado sem papel admin", () => {
  let user: SupabaseClient;

  beforeAll(async () => {
    user = await login(userEmail, userPassword);
    const { data } = await user.rpc("is_admin");
    if (data === true) throw new Error(`${userEmail} tem papel admin — use uma conta comum neste bloco`);
  });

  afterAll(async () => {
    await user?.auth.signOut();
  });

  // INSERT: a policy WITH CHECK falha e o Postgres levanta erro.
  it.each(NOMES)("INSERT em %s → 42501", async (table) => {
    const { error } = await user.from(table).insert(TABELAS[table].insert);
    expect(error?.code).toMatch(NEGADO);
  });

  // UPDATE/DELETE: a policy USING age como filtro — não há erro, a linha
  // simplesmente não é alcançada. A prova é "zero linhas afetadas e nada mudou".
  it.for(NOMES)("UPDATE em %s não altera nenhuma linha", async (table, { skip }) => {
    const coluna = Object.keys(TABELAS[table].update)[0];
    const { data: antes } = await user.from(table).select("*").limit(1).maybeSingle<Record<string, unknown>>();
    if (!antes) return skip(); // tabela vazia: nada a provar

    const { data, error } = await user.from(table).update(TABELAS[table].update).eq("id", antes.id).select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: depois } = await user.from(table).select("*").eq("id", antes.id).single<Record<string, unknown>>();
    expect(depois?.[coluna]).toBe(antes[coluna]);
  });

  it.for(NOMES)("DELETE em %s não remove nenhuma linha", async (table, { skip }) => {
    const { data: antes } = await user.from(table).select("id").limit(1).maybeSingle<{ id: string }>();
    if (!antes) return skip();

    const { data, error } = await user.from(table).delete().eq("id", antes.id).select();
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: depois } = await user.from(table).select("id").eq("id", antes.id).single<{ id: string }>();
    expect(depois?.id).toBe(antes.id);
  });
});

describe.skipIf(!temAdmin)("RLS — escrita permitida a admin (e limpeza)", () => {
  let admin: SupabaseClient;

  beforeAll(async () => {
    admin = await login(adminEmail, adminPassword);
    const { data } = await admin.rpc("is_admin");
    if (data !== true) throw new Error(`${adminEmail} não tem papel admin`);
  });

  afterAll(async () => {
    // Apaga qualquer linha marcada que tenha sobrado (inclusive de execuções anteriores).
    for (const table of NOMES) {
      const coluna = Object.keys(TABELAS[table].update)[0];
      await admin.from(table).delete().like(coluna, "rls-test-%");
    }
    await admin?.auth.signOut();
  });

  it.each(NOMES)("INSERT + DELETE em %s funcionam para admin", async (table) => {
    const { data, error } = await admin.from(table).insert(TABELAS[table].insert).select("id").single<{ id: string }>();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    const { error: errorDelete } = await admin.from(table).delete().eq("id", data!.id);
    expect(errorDelete).toBeNull();
  });
});

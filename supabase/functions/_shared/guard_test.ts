// Rodar com: deno test --allow-env supabase/functions/_shared/guard_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { guardRequest } from "./guard.ts";

const cors = { "Access-Control-Allow-Origin": "*" };
const realFetch = globalThis.fetch;

function req(body: unknown): Request {
  return new Request("http://localhost/fn", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: JSON.stringify(body),
  });
}

function withEnv(on: boolean) {
  if (on) {
    Deno.env.set("SUPABASE_URL", "http://supabase.test");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  } else {
    Deno.env.delete("SUPABASE_URL");
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  }
}

// Simula a tabela ai_rate_limits: GET devolve a contagem, POST registra a chamada.
function mockFetch(opts: { count?: number; getStatus?: number; postStatus?: number; throws?: boolean }) {
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (opts.throws) throw new Error("timeout");
    const method = init?.method ?? "GET";
    if (method === "GET") {
      return new Response("[]", {
        status: opts.getStatus ?? 200,
        headers: { "content-range": `0-0/${opts.count ?? 0}` },
      });
    }
    return new Response(null, { status: method === "POST" ? opts.postStatus ?? 201 : 204 });
  }) as typeof fetch;
}

function cleanup() {
  globalThis.fetch = realFetch;
  withEnv(false);
}

Deno.test("failClosed: sem service role devolve 503", async () => {
  withEnv(false);
  const g = await guardRequest(req({ query: "grafeno" }), "motor-search", cors, { failClosed: true });
  assertEquals(g.ok, false);
  if (!g.ok) assertEquals(g.response.status, 503);
  cleanup();
});

Deno.test("failClosed: erro ao contar devolve 503", async () => {
  withEnv(true);
  mockFetch({ getStatus: 401 });
  const g = await guardRequest(req({ query: "grafeno" }), "motor-search", cors, { failClosed: true });
  assertEquals(g.ok, false);
  if (!g.ok) assertEquals(g.response.status, 503);
  cleanup();
});

Deno.test("failClosed: falha ao registrar a chamada devolve 503", async () => {
  withEnv(true);
  mockFetch({ postStatus: 500 });
  const g = await guardRequest(req({ query: "grafeno" }), "motor-search", cors, { failClosed: true });
  assertEquals(g.ok, false);
  if (!g.ok) assertEquals(g.response.status, 503);
  cleanup();
});

Deno.test("failClosed: exceção no fetch devolve 503", async () => {
  withEnv(true);
  mockFetch({ throws: true });
  const g = await guardRequest(req({ query: "grafeno" }), "motor-search", cors, { failClosed: true });
  assertEquals(g.ok, false);
  if (!g.ok) assertEquals(g.response.status, 503);
  cleanup();
});

Deno.test("failClosed: abaixo do limite libera e devolve o body", async () => {
  withEnv(true);
  mockFetch({ count: 3 });
  const g = await guardRequest<{ query: string }>(req({ query: "grafeno" }), "motor-search", cors, { limit: 20, failClosed: true });
  assertEquals(g.ok, true);
  if (g.ok) assertEquals(g.body.query, "grafeno");
  cleanup();
});

Deno.test("limite atingido devolve 429", async () => {
  withEnv(true);
  mockFetch({ count: 20 });
  const g = await guardRequest(req({ query: "grafeno" }), "motor-search", cors, { limit: 20, failClosed: true });
  assertEquals(g.ok, false);
  if (!g.ok) assertEquals(g.response.status, 429);
  cleanup();
});

Deno.test("padrão continua falhando aberto (sem service role)", async () => {
  withEnv(false);
  const g = await guardRequest(req({ query: "grafeno" }), "motor-analysis", cors);
  assertEquals(g.ok, true);
  cleanup();
});

Deno.test("padrão continua falhando aberto (erro ao contar)", async () => {
  withEnv(true);
  mockFetch({ getStatus: 401, postStatus: 401 });
  const g = await guardRequest(req({ query: "grafeno" }), "motor-analysis", cors);
  assertEquals(g.ok, true);
  cleanup();
});

Deno.test("query acima de 200 caracteres devolve 400", async () => {
  withEnv(false);
  const g = await guardRequest(req({ query: "x".repeat(201) }), "motor-search", cors, { failClosed: true });
  assertEquals(g.ok, false);
  if (!g.ok) assertEquals(g.response.status, 400);
  cleanup();
});

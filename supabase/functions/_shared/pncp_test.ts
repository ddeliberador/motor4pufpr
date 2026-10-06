// Rodar com: deno test supabase/functions/_shared/pncp_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { buscarContratosPNCP, normalizarContrato, USER_AGENT } from "./pncp.ts";

const realFetch = globalThis.fetch;

// Item no formato devolvido por /api/search (campos reais, valores reduzidos).
function item(seq: number, extra: Record<string, unknown> = {}) {
  return {
    item_url: `/contratos/46523270000188/2026/${seq}`,
    description: `Plataforma de inteligência artificial ${seq}`,
    orgao_nome: "MUNICIPIO DE MOGI DAS CRUZES",
    modalidade_licitacao_nome: "Pregão - Eletrônico",
    valor_global: 40320,
    situacao_nome: "Divulgada no PNCP",
    data_publicacao_pncp: "2026-09-15T10:00:00",
    uf: "SP",
    fornecedor_nome: "JUSTICE AI LTDA",
    fornecedor_ni: "57.027.539/0001-51",
    ...extra,
  };
}

type Resposta = { status?: number; items?: unknown[]; throws?: boolean };

// Responde em ordem; registra as URLs e o máximo de chamadas simultâneas.
function mockFetch(respostas: Resposta[]) {
  const urls: string[] = [];
  const agentes: (string | null)[] = [];
  let emCurso = 0;
  const pico = { valor: 0 };
  let i = 0;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    urls.push(String(url));
    agentes.push(new Headers(init?.headers).get("User-Agent"));
    emCurso++;
    pico.valor = Math.max(pico.valor, emCurso);
    await new Promise((r) => setTimeout(r, 1));
    emCurso--;
    const r = respostas[Math.min(i++, respostas.length - 1)];
    if (r.throws) throw new Error("connection reset");
    return new Response(JSON.stringify({ items: r.items ?? [], total: (r.items ?? []).length }), {
      status: r.status ?? 200,
    });
  }) as typeof fetch;
  return { urls, agentes, pico };
}

function restaurar() {
  globalThis.fetch = realFetch;
}

Deno.test("usa a busca textual de contratos, sem os parâmetros da API de consulta", async () => {
  const { urls } = mockFetch([{ items: [item(1)] }]);
  try {
    await buscarContratosPNCP(["inteligência artificial"]);
    const u = new URL(urls[0]);
    assertEquals(u.origin + u.pathname, "https://pncp.gov.br/api/search/");
    assertEquals(u.searchParams.get("q"), "inteligência artificial");
    assertEquals(u.searchParams.get("tipos_documento"), "contrato");
    assertEquals(u.searchParams.get("ordenacao"), "-data");
    assertEquals(u.searchParams.has("ufs"), false);
    assertEquals(u.searchParams.has("dataInicial"), false);
    assertEquals(u.searchParams.has("codigoModalidadeContratacao"), false);
  } finally {
    restaurar();
  }
});

Deno.test("identifica o projeto no User-Agent", async () => {
  const { agentes } = mockFetch([{ items: [] }]);
  try {
    await buscarContratosPNCP(["ia"]);
    assertEquals(agentes[0], USER_AGENT);
  } finally {
    restaurar();
  }
});

Deno.test("filtra por UF quando informada", async () => {
  const { urls } = mockFetch([{ items: [] }]);
  try {
    await buscarContratosPNCP(["ia"], { uf: "PR", porTermo: 7 });
    const u = new URL(urls[0]);
    assertEquals(u.searchParams.get("ufs"), "PR");
    assertEquals(u.searchParams.get("tam_pagina"), "7");
  } finally {
    restaurar();
  }
});

Deno.test("normaliza os campos do item e monta o link público", () => {
  assertEquals(normalizarContrato(item(113), "ia"), {
    objeto: "Plataforma de inteligência artificial 113",
    orgao: "MUNICIPIO DE MOGI DAS CRUZES",
    modalidade: "Pregão - Eletrônico",
    valor: 40320,
    situacao: "Divulgada no PNCP",
    data: "2026-09-15T10:00:00",
    uf: "SP",
    url: "https://pncp.gov.br/app/contratos/46523270000188/2026/113",
    fornecedor: "JUSTICE AI LTDA",
    fornecedorCnpj: "57027539000151",
    termo: "ia",
  });
});

Deno.test("campos ausentes viram valores vazios, não undefined", () => {
  const c = normalizarContrato({}, "ia");
  assertEquals(c.objeto, "");
  assertEquals(c.valor, 0);
  assertEquals(c.url, "https://pncp.gov.br/app/contratos");
});

Deno.test("remove contratos repetidos entre termos e guarda o termo que achou cada um", async () => {
  mockFetch([{ items: [item(1), item(2)] }, { items: [item(2), item(3)] }]);
  try {
    const r = await buscarContratosPNCP(["ia", "inteligência artificial"]);
    assertEquals(r.map((c) => c.url.split("/").pop()), ["1", "2", "3"]);
    assertEquals(r.map((c) => c.termo), ["ia", "ia", "inteligência artificial"]);
  } finally {
    restaurar();
  }
});

Deno.test("chama um termo por vez", async () => {
  const { urls, pico } = mockFetch([{ items: [item(1)] }]);
  try {
    await buscarContratosPNCP(["a", "b", "c"]);
    assertEquals(urls.length, 3);
    assertEquals(pico.valor, 1);
  } finally {
    restaurar();
  }
});

Deno.test("conexão derrubada: tenta de novo uma vez", async () => {
  const { urls } = mockFetch([{ throws: true }, { items: [item(1)] }]);
  try {
    const r = await buscarContratosPNCP(["ia"]);
    assertEquals(urls.length, 2);
    assertEquals(r.length, 1);
  } finally {
    restaurar();
  }
});

Deno.test("erro 4xx não repete e devolve vazio", async () => {
  const { urls } = mockFetch([{ status: 400 }]);
  try {
    assertEquals(await buscarContratosPNCP(["ia"]), []);
    assertEquals(urls.length, 1);
  } finally {
    restaurar();
  }
});

Deno.test("PNCP fora do ar: devolve vazio depois de duas tentativas", async () => {
  const { urls } = mockFetch([{ status: 503 }]);
  try {
    assertEquals(await buscarContratosPNCP(["ia"]), []);
    assertEquals(urls.length, 2);
  } finally {
    restaurar();
  }
});

Deno.test("item sem identificador é descartado", async () => {
  mockFetch([{ items: [{ description: "sem url" }, item(1)] }]);
  try {
    const r = await buscarContratosPNCP(["ia"]);
    assertEquals(r.length, 1);
  } finally {
    restaurar();
  }
});

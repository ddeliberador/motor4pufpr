// Rodar com: deno test supabase/functions/_shared/pncp_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import {
  agruparFornecedores,
  buscarContratosPNCP,
  buscarEditaisAbertosPNCP,
  normalizarContrato,
  normalizarEdital,
  USER_AGENT,
} from "./pncp.ts";

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

// Edital no formato devolvido por /api/search?tipos_documento=edital.
function edital(seq: number, extra: Record<string, unknown> = {}) {
  return {
    item_url: `/compras/18137082000186/2026/${seq}`,
    description: `Solução de inteligência artificial ${seq}`,
    orgao_nome: "AUTARQUIA MUNICIPAL DE TURISMO - GRAMADOTUR",
    modalidade_licitacao_nome: "Pregão - Eletrônico",
    valor_global: null,
    situacao_nome: "Divulgada no PNCP",
    data_publicacao_pncp: "2026-10-09T16:03:59",
    data_fim_vigencia: "2026-10-27T08:29",
    uf: "RS",
    ...extra,
  };
}

Deno.test("editais: busca só os que recebem proposta, por relevância", async () => {
  const { urls } = mockFetch([{ items: [edital(1)] }]);
  try {
    await buscarEditaisAbertosPNCP(["inovação"], { uf: "RS", porTermo: 8 });
    const u = new URL(urls[0]);
    assertEquals(u.origin + u.pathname, "https://pncp.gov.br/api/search/");
    assertEquals(u.searchParams.get("q"), "inovação");
    assertEquals(u.searchParams.get("tipos_documento"), "edital");
    assertEquals(u.searchParams.get("status"), "recebendo_proposta");
    assertEquals(u.searchParams.has("ordenacao"), false);
    assertEquals(u.searchParams.get("ufs"), "RS");
    assertEquals(u.searchParams.get("tam_pagina"), "8");
  } finally {
    restaurar();
  }
});

Deno.test("editais: normaliza campos, prazo e link da página pública", () => {
  assertEquals(normalizarEdital(edital(124), "ia"), {
    objeto: "Solução de inteligência artificial 124",
    orgao: "AUTARQUIA MUNICIPAL DE TURISMO - GRAMADOTUR",
    modalidade: "Pregão - Eletrônico",
    valor: 0,
    situacao: "Divulgada no PNCP",
    dataPublicacao: "2026-10-09T16:03:59",
    dataEncerramento: "2026-10-27T08:29",
    uf: "RS",
    url: "https://pncp.gov.br/app/editais/18137082000186/2026/124",
    termo: "ia",
  });
});

Deno.test("editais: sem prazo nem link, campos vazios", () => {
  const e = normalizarEdital({}, "ia");
  assertEquals(e.dataEncerramento, "");
  assertEquals(e.url, "https://pncp.gov.br/app/editais");
});

Deno.test("editais: remove repetidos entre termos", async () => {
  mockFetch([{ items: [edital(1), edital(2)] }, { items: [edital(2)] }]);
  try {
    const r = await buscarEditaisAbertosPNCP(["a", "b"]);
    assertEquals(r.map((e) => e.url.split("/").pop()), ["1", "2"]);
  } finally {
    restaurar();
  }
});

Deno.test("fornecedores: agrupa por CNPJ e ordena por número de contratos", () => {
  const contratos = [
    normalizarContrato(item(1, { fornecedor_ni: "11.111.111/0001-11", fornecedor_nome: "A LTDA", valor_global: 100 }), "ia"),
    normalizarContrato(item(2, { fornecedor_ni: "22222222000122", fornecedor_nome: "B LTDA", valor_global: 900 }), "ia"),
    normalizarContrato(item(3, { fornecedor_ni: "11111111000111", fornecedor_nome: "A LTDA", valor_global: 50 }), "ia"),
  ];
  assertEquals(agruparFornecedores(contratos), [
    { nome: "A LTDA", cnpj: "11111111000111", contratos: 2, valorTotal: 150 },
    { nome: "B LTDA", cnpj: "22222222000122", contratos: 1, valorTotal: 900 },
  ]);
});

Deno.test("fornecedores: empate em contratos desempata pelo valor", () => {
  const contratos = [
    normalizarContrato(item(1, { fornecedor_ni: "11111111000111", valor_global: 10 }), "ia"),
    normalizarContrato(item(2, { fornecedor_ni: "22222222000122", valor_global: 20 }), "ia"),
  ];
  assertEquals(agruparFornecedores(contratos).map((f) => f.cnpj), ["22222222000122", "11111111000111"]);
});

Deno.test("fornecedores: pessoa física (CPF) e contrato sem fornecedor ficam de fora", () => {
  const contratos = [
    normalizarContrato(item(1, { fornecedor_ni: "123.456.789-09", fornecedor_nome: "FULANO" }), "ia"),
    normalizarContrato(item(2, { fornecedor_ni: null, fornecedor_nome: null }), "ia"),
  ];
  assertEquals(agruparFornecedores(contratos), []);
});

Deno.test("fornecedores: sem nome, usa o CNPJ", () => {
  const c = normalizarContrato(item(1, { fornecedor_ni: "11111111000111", fornecedor_nome: "" }), "ia");
  assertEquals(agruparFornecedores([c])[0].nome, "11111111000111");
});

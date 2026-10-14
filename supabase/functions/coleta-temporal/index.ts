// Coletas periódicas da camada temporal, chamadas pelo pg_cron com uma chave
// guardada no Vault (cabeçalho x-coleta-key). Cada job abre coletas em
// ingest_runs e atualiza public.agenda_coletas. Nada aqui é exposto ao frontend.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  clienteServico, finalizarColeta, garantirIndicador, iniciarColeta, registrarFoto,
  registrarObservacoes, sha256, ultimaColetaOk, type LinhaObservacao,
} from "../_shared/temporal.ts";
import { fotoAneel, fotoTabela } from "../_shared/temporal_infra.ts";

const VERSAO = "coleta-temporal-v1-2026-10";
const UA = { Accept: "application/json", "User-Agent": "Motor4PUFPR/1.0 (motorinovacao.com.br)" };
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ---------------------------------------------------------------- UF
const UFS: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE", "distrito federal": "DF",
  "espirito santo": "ES", goias: "GO", maranhao: "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", para: "PA", paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};
const SIGLAS = new Set(Object.values(UFS));
function normalizarUf(v: unknown): string | null {
  const t = String(v ?? "").trim();
  if (!t) return null;
  if (SIGLAS.has(t.toUpperCase())) return t.toUpperCase();
  return UFS[t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] ?? null;
}

// ---------------------------------------------------------------- PeeringDB
async function jobPeeringdb(sb: SupabaseClient) {
  const inicio = Date.now();
  const buscar = async (u: string) => {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40_000) });
    if (!r.ok) throw new Error(`PeeringDB ${u}: HTTP ${r.status}`);
    const p = await r.json();
    return (Array.isArray(p.data) ? p.data : []) as Record<string, unknown>[];
  };
  const urlFac = "https://www.peeringdb.com/api/fac?country=BR";
  const urlIx = "https://www.peeringdb.com/api/ix?country=BR";
  const fac = await buscar(urlFac);
  await dormir(2000);
  const ix = await buscar(urlIx);
  if (fac.length === 0) throw new Error("PeeringDB devolveu lista vazia de instalações; nada gravado.");
  const hash = await sha256(JSON.stringify([fac, ix]));
  const job = "coleta-temporal:peeringdb";
  if ((await ultimaColetaOk(sb, job))?.resposta_hash === hash) return `sem mudança (${fac.length} instalações, ${ix.length} IXPs)`;
  const coletaId = await iniciarColeta(sb, {
    jobId: job, fonte: "peeringdb", versaoConector: VERSAO, respostaHash: hash,
    escopo: { urls: [urlFac, urlIx], instalacoes: fac.length, ixps: ix.length, completo: true },
  });
  try {
    await garantirIndicador(sb, {
      id: "infra.datacenters_br", nome: "Datacenters (instalações PeeringDB) no Brasil", natureza: "estoque", unidade: "unidades",
      periodicidade: "foto", camada_mapa: "datacenters",
      metodologia: "Contagem de instalações em /api/fac?country=BR do PeeringDB por UF (nome do estado normalizado para sigla); entidade BR = total.",
    });
    await garantirIndicador(sb, {
      id: "infra.ixps_br", nome: "Pontos de troca de tráfego (IXPs PeeringDB) no Brasil", natureza: "estoque", unidade: "unidades",
      periodicidade: "foto", camada_mapa: "datacenters",
      metodologia: "Contagem de registros em /api/ix?country=BR do PeeringDB. A API não informa UF dos IXPs, só a cidade; gravado o total do país.",
    });
    // Resposta 200 da API sem paginação = lista completa do Brasil.
    const fFac = await registrarFoto(sb, { tabela: "peeringdb_fac", campoChave: "id", registros: fac, completo: true, coletaId });
    const fIx = ix.length ? await registrarFoto(sb, { tabela: "peeringdb_ix", campoChave: "id", registros: ix, completo: true, coletaId }) : null;
    const hoje = new Date().toISOString().slice(0, 10);
    const porUf = new Map<string, number>();
    let semUf = 0;
    for (const f of fac) {
      const uf = normalizarUf(f.state);
      if (uf) porUf.set(uf, (porUf.get(uf) ?? 0) + 1); else semUf++;
    }
    const base = { periodo_referencia: hoje, granularidade: "foto" as const, origem_temporal: "foto_coletada" as const };
    const linhas: LinhaObservacao[] = [...porUf].map(([uf, n]) => ({
      ...base, indicador_id: "infra.datacenters_br", entidade_tipo: "uf", entidade_chave: uf, valor: n, metadados: { fonte: "PeeringDB" },
    }));
    linhas.push({ ...base, indicador_id: "infra.datacenters_br", entidade_tipo: "pais", entidade_chave: "BR", valor: fac.length, metadados: { fonte: "PeeringDB", sem_uf: semUf } });
    if (ix.length) linhas.push({ ...base, indicador_id: "infra.ixps_br", entidade_tipo: "pais", entidade_chave: "BR", valor: ix.length, metadados: { fonte: "PeeringDB" } });
    const obs = await registrarObservacoes(sb, { coletaId, linhas });
    await finalizarColeta(sb, coletaId, { ok: true, found: fac.length + ix.length, inserted: obs.inseridas, inicioMs: inicio });
    return `${fac.length} instalações (novas ${fFac.novos}, alteradas ${fFac.alterados}, removidas ${fFac.removidos}), ${ix.length} IXPs${fIx ? ` (novos ${fIx.novos})` : ""}, ${obs.inseridas} observações`;
  } catch (e) {
    await finalizarColeta(sb, coletaId, { ok: false, error: msg(e), inicioMs: inicio });
    throw e;
  }
}

// ---------------------------------------------------------------- Comex Stat
// NCMs das camadas de IA (planilha de dependência e conector comex.py).
const SH4 = ["8541", "8542", "8507", "8471", "8517", "9001"]; // posições
const SH6 = ["854143", "854470"]; // subposições: módulos fotovoltaicos, cabos de fibra
const COMEX = "https://api-comexstat.mdic.gov.br/general";

async function comexPost(body: unknown): Promise<Record<string, string>[]> {
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const r = await fetch(COMEX, {
      method: "POST", headers: { ...UA, "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    if (r.status === 429) { await dormir(15_000 + tentativa * 3000); continue; }
    if (!r.ok) throw new Error(`Comex Stat HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const p = await r.json();
    if (!p?.success) throw new Error(`Comex Stat: ${JSON.stringify(p).slice(0, 200)}`);
    return p.data?.list ?? [];
  }
  throw new Error("Comex Stat: limite de requisições (429) persistente");
}
const codigo = (l: Record<string, string>) => l.headingCode ?? l.subHeadingCode ?? "";

async function jobComex(sb: SupabaseClient, de: string, ate: string) {
  const inicio = Date.now();
  const periodo = { from: de, to: ate };
  const consultas: { flow: "import" | "export"; filtro: "heading" | "subHeading"; valores: string[]; pais: boolean }[] = [
    { flow: "import", filtro: "heading", valores: SH4, pais: true },
    { flow: "import", filtro: "subHeading", valores: SH6, pais: true },
    { flow: "export", filtro: "heading", valores: SH4, pais: false },
    { flow: "export", filtro: "subHeading", valores: SH6, pais: false },
  ];
  const respostas: Record<string, string>[][] = [];
  for (const [i, c] of consultas.entries()) {
    if (i > 0) await dormir(12_000);
    respostas.push(await comexPost({
      flow: c.flow, monthDetail: true, period: periodo,
      filters: [{ filter: c.filtro, values: c.valores }],
      details: c.pais ? [c.filtro, "country"] : [c.filtro], metrics: ["metricFOB", "metricKG"],
    }));
  }
  const hash = await sha256(JSON.stringify(respostas));
  const job = `coleta-temporal:comex:${de}_${ate}`;
  if ((await ultimaColetaOk(sb, job))?.resposta_hash === hash) return `${de} a ${ate}: sem mudança`;
  const coletaId = await iniciarColeta(sb, {
    jobId: job, fonte: "comexstat", versaoConector: VERSAO, respostaHash: hash,
    escopo: { periodo, sh4: SH4, sh6: SH6, linhas: respostas.map((r) => r.length) },
  });
  try {
    const comum = { natureza: "fluxo" as const, periodicidade: "mensal", base_preco: "nominal", camada_mapa: "dependencia", fonte_chave: null };
    await garantirIndicador(sb, { ...comum, id: "comex.importacao_usd_fob", nome: "Importações (US$ FOB)", unidade: "USD", moeda: "USD",
      metodologia: "Comex Stat (MDIC) /general, flow=import, metricFOB mensal por posição SH4 ou subposição SH6. Segmento vazio = total; pais:<nome> = 10 principais países de origem no período coletado." });
    await garantirIndicador(sb, { ...comum, id: "comex.importacao_kg", nome: "Importações (kg líquido)", unidade: "kg", moeda: null,
      metodologia: "Comex Stat (MDIC) /general, flow=import, metricKG mensal; mesmo recorte de comex.importacao_usd_fob." });
    await garantirIndicador(sb, { ...comum, id: "comex.exportacao_usd_fob", nome: "Exportações (US$ FOB)", unidade: "USD", moeda: "USD",
      metodologia: "Comex Stat (MDIC) /general, flow=export, metricFOB mensal por posição SH4 ou subposição SH6 (total, sem país)." });

    const linhas: LinhaObservacao[] = [];
    const add = (id: string, ncm: string, seg: string, mes: string, v: number, meta: Record<string, unknown>) =>
      linhas.push({ indicador_id: id, entidade_tipo: "ncm", entidade_chave: ncm, segmento: seg, periodo_referencia: `${mes}-01`,
        granularidade: "mes", valor: v, origem_temporal: "serie_da_fonte", metadados: meta });
    for (const [i, c] of consultas.entries()) {
      const nivel = c.filtro === "heading" ? "SH4" : "SH6";
      const total = new Map<string, { fob: number; kg: number }>(); // ncm|mes
      const somaPais = new Map<string, number>(); // ncm|pais -> fob no período
      for (const l of respostas[i]) {
        const k = `${codigo(l)}|${l.year}-${l.monthNumber}`;
        const t = total.get(k) ?? { fob: 0, kg: 0 };
        t.fob += Number(l.metricFOB) || 0; t.kg += Number(l.metricKG) || 0;
        total.set(k, t);
        if (c.pais) somaPais.set(`${codigo(l)}|${l.country}`, (somaPais.get(`${codigo(l)}|${l.country}`) ?? 0) + (Number(l.metricFOB) || 0));
      }
      for (const [k, t] of total) {
        const [ncm, mes] = k.split("|");
        const meta = { fonte: "Comex Stat MDIC", nivel };
        if (c.flow === "import") {
          add("comex.importacao_usd_fob", ncm, "", mes, t.fob, meta);
          add("comex.importacao_kg", ncm, "", mes, t.kg, meta);
        } else add("comex.exportacao_usd_fob", ncm, "", mes, t.fob, meta);
      }
      if (c.pais) {
        const top = new Set<string>();
        const porNcm = new Map<string, [string, number][]>();
        for (const [k, v] of somaPais) { const [n, p] = k.split("|"); porNcm.set(n, [...(porNcm.get(n) ?? []), [p, v]]); }
        for (const [n, arr] of porNcm) arr.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([p]) => top.add(`${n}|${p}`));
        for (const l of respostas[i]) {
          const ncm = codigo(l);
          if (!top.has(`${ncm}|${l.country}`)) continue;
          const mes = `${l.year}-${l.monthNumber}`;
          const meta = { fonte: "Comex Stat MDIC", nivel, recorte: `10 principais países de origem em ${de} a ${ate}` };
          add("comex.importacao_usd_fob", ncm, `pais:${l.country}`, mes, Number(l.metricFOB) || 0, meta);
          add("comex.importacao_kg", ncm, `pais:${l.country}`, mes, Number(l.metricKG) || 0, meta);
        }
      }
    }
    const obs = await registrarObservacoes(sb, { coletaId, linhas });
    await finalizarColeta(sb, coletaId, { ok: true, found: linhas.length, inserted: obs.inseridas, inicioMs: inicio });
    return `${de} a ${ate}: ${obs.inseridas} observações`;
  } catch (e) {
    await finalizarColeta(sb, coletaId, { ok: false, error: msg(e), inicioMs: inicio });
    throw e;
  }
}

async function ultimoMesComex(): Promise<string> {
  const r = await fetch(`${COMEX}/dates/updated`, { headers: UA, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`Comex Stat dates/updated: HTTP ${r.status}`);
  const d = (await r.json())?.data;
  return `${d.year}-${String(d.monthNumber).padStart(2, "0")}`;
}
function menosMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- IPCA
async function jobIpca(sb: SupabaseClient) {
  const inicio = Date.now();
  const url = "https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/all";
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`SIDRA 1737: HTTP ${r.status}`);
  const linhasApi = ((await r.json()) as Record<string, string>[]).slice(1)
    .filter((l) => Number(l.D3C) >= 201501 && l.V && Number.isFinite(Number(l.V)));
  if (!linhasApi.length) throw new Error("SIDRA 1737 sem linhas a partir de 2015");
  const hash = await sha256(JSON.stringify(linhasApi));
  const job = "coleta-temporal:ipca";
  if ((await ultimaColetaOk(sb, job))?.resposta_hash === hash) return `sem mudança (${linhasApi.length} meses)`;
  const coletaId = await iniciarColeta(sb, { jobId: job, fonte: "ibge_sidra_1737", versaoConector: VERSAO, respostaHash: hash, escopo: { url, desde: "2015-01" } });
  try {
    await garantirIndicador(sb, {
      id: "macro.ipca_indice", nome: "IPCA número-índice (dez/1993 = 100)", natureza: "indice", unidade: "número-índice",
      periodicidade: "mensal", metodologia: "IBGE/SIDRA tabela 1737, variável 2266, Brasil. Guardado como deflator; nenhum valor é deflacionado ainda.",
    });
    const linhas: LinhaObservacao[] = linhasApi.map((l) => ({
      indicador_id: "macro.ipca_indice", entidade_tipo: "pais", entidade_chave: "BR",
      periodo_referencia: `${l.D3C.slice(0, 4)}-${l.D3C.slice(4, 6)}-01`, granularidade: "mes",
      valor: Number(l.V), origem_temporal: "serie_da_fonte", metadados: { fonte: "IBGE SIDRA 1737" },
    }));
    const obs = await registrarObservacoes(sb, { coletaId, linhas });
    await finalizarColeta(sb, coletaId, { ok: true, found: linhas.length, inserted: obs.inseridas, inicioMs: inicio });
    return `${linhas.length} meses, ${obs.inseridas} observações`;
  } catch (e) {
    await finalizarColeta(sb, coletaId, { ok: false, error: msg(e), inicioMs: inicio });
    throw e;
  }
}

// ---------------------------------------------------------------- OpenAlex (total BR por ano)
async function jobOpenalex(sb: SupabaseClient) {
  const inicio = Date.now();
  const base = "https://api.openalex.org/works?filter=institutions.country_code:BR";
  const urls = {
    publicacoes: `${base}&group_by=publication_year&per_page=200&mailto=contato@motorinovacao.com.br`,
    coautorias: `${base},countries_distinct_count:>1&group_by=publication_year&per_page=200&mailto=contato@motorinovacao.com.br`,
  };
  const buscar = async (u: string) => {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(45_000) });
    if (!r.ok) throw new Error(`OpenAlex HTTP ${r.status}`);
    return ((await r.json())?.group_by ?? []) as { key: string; count: number }[];
  };
  const pub = await buscar(urls.publicacoes);
  const coa = await buscar(urls.coautorias);
  if (!pub.length) throw new Error("OpenAlex sem série anual");
  const hash = await sha256(JSON.stringify([pub, coa]));
  const job = "coleta-temporal:openalex-anual";
  const coletaId = await iniciarColeta(sb, { jobId: job, fonte: "openalex", versaoConector: VERSAO, respostaHash: hash, escopo: { tema: "total", urls } });
  try {
    const linhas: LinhaObservacao[] = [];
    const add = (id: string, g: { key: string; count: number }[]) => {
      for (const x of g) {
        const ano = Number(x.key);
        if (!Number.isInteger(ano) || ano < 1900) continue;
        linhas.push({ indicador_id: id, entidade_tipo: "tema", entidade_chave: "total", periodo_referencia: `${ano}-01-01`,
          granularidade: "ano", valor: x.count, origem_temporal: "serie_da_fonte", metadados: { fonte: "OpenAlex", recorte: "todas as publicações" } });
      }
    };
    add("openalex.publicacoes_br", pub);
    add("openalex.coautorias_internacionais_br", coa);
    const obs = await registrarObservacoes(sb, { coletaId, linhas });
    await finalizarColeta(sb, coletaId, { ok: true, found: linhas.length, inserted: obs.inseridas, inicioMs: inicio });
    return `${linhas.length} anos x indicador, ${obs.inseridas} observações`;
  } catch (e) {
    await finalizarColeta(sb, coletaId, { ok: false, error: msg(e), inicioMs: inicio });
    throw e;
  }
}

// ---------------------------------------------------------------- execução
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function executar(sb: SupabaseClient, job: string, p: Record<string, unknown>): Promise<string> {
  switch (job) {
    case "peeringdb": return await jobPeeringdb(sb);
    case "cabos":
      await fotoTabela(sb, "cabos_lista", "cabo_id,nome,tipo,fonte,snapshot,internacional", "cabo_id");
      await fotoTabela(sb, "cabos_aterragens", "ponto_id,nome,uf,municipio_proximo,latitude,longitude,distancia_km,fonte,snapshot", "ponto_id");
      return "foto de cabos_lista e cabos_aterragens conferida (grava só quando mudou)";
    case "aneel":
      await fotoAneel(sb);
      return "foto completa de aneel_usinas conferida (grava só quando mudou)";
    case "ipca": return await jobIpca(sb);
    case "openalex": return await jobOpenalex(sb);
    case "comex": {
      if (p.ano) { const a = Number(p.ano); return await jobComex(sb, `${a}-01`, `${a}-12`); }
      const ate = await ultimoMesComex();
      return await jobComex(sb, menosMeses(ate, 2), ate);
    }
    default: throw new Error(`job desconhecido: ${job}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = clienteServico();
  if (!sb) return json({ error: "configuração ausente" }, 500);
  const chave = req.headers.get("x-coleta-key") ?? "";
  const { data: esperada } = await sb.rpc("vault_read_secret_by_name", { nome: "coleta_temporal_key" });
  if (!chave || !esperada || chave !== esperada) return json({ error: "não autorizado" }, 401);

  let p: Record<string, unknown> = {};
  try { p = await req.json(); } catch { /* corpo vazio */ }
  const job = String(p.job ?? "");
  const agendaJob = String(p.agenda ?? job);
  const tarefa = (async () => {
    let status = "ok", mensagem = "";
    try { mensagem = await executar(sb, job, p); } catch (e) {
      status = "erro"; mensagem = msg(e);
      // Falha antes de abrir coleta (ex.: API fora): registra em ingest_runs mesmo assim.
      const id = await iniciarColeta(sb, { jobId: `coleta-temporal:${job}`, fonte: job, versaoConector: VERSAO, escopo: p }).catch(() => null);
      if (id) await finalizarColeta(sb, id, { ok: false, error: mensagem });
    }
    await sb.from("agenda_coletas").update({ ultima_execucao: new Date().toISOString(), ultimo_status: status, ultima_mensagem: mensagem.slice(0, 500) }).eq("job", agendaJob);
    console.log(`coleta-temporal ${job}: ${status} ${mensagem}`);
    return { status, mensagem };
  })();
  if (p.esperar) return json({ job, ...(await tarefa) });
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil?.(tarefa);
  return json({ job, aceito: true }, 202);
});

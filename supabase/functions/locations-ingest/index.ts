// Ingestão da CAMADA PERMANENTE de locais de pesquisa (public.research_locations).
// Independente de tema de busca. Cada registro grava a fonte e a URL da fonte original.
// Fontes: openalex | embrapii | inep_censo_superior | mcti_formict
//
// Regra dura: NUNCA inventar dado. Se a fonte falhar, a resposta retorna
// { failed: true, error } e nada é gravado para aquela fonte.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_KEY = Deno.env.get("LOCATIONS_INGEST_KEY") || "";
const INGEST_KEY_ADMIN = Deno.env.get("LOCATIONS_INGEST_KEY_ADMIN") || "";

type Fonte = "openalex" | "embrapii" | "inep_censo_superior" | "mcti_formict";

interface Local {
  nome: string;
  tipo: string;
  uf: string | null;
  municipio: string | null;
  latitude: number | null;
  longitude: number | null;
  fonte: Fonte;
  fonte_url: string;
  cnpj: string | null;
  raw_metadata: Record<string, unknown>;
}

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Substitui integralmente os registros de uma fonte (ingestão idempotente). */
async function replaceSource(fonte: Fonte, rows: Local[]): Promise<number> {
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (!r.nome) return false;
    const k = `${norm(r.nome)}|${r.uf || ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const del = await rest(`research_locations?fonte=eq.${fonte}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!del.ok) throw new Error(`falha ao limpar fonte ${fonte}: ${await del.text()}`);

  let inserted = 0;
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const res = await rest("research_locations", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`falha ao inserir em ${fonte}: ${await res.text()}`);
    inserted += chunk.length;
  }
  return inserted;
}

// ---------------------------------------------------------------- OpenAlex
const UF_NOMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};
const REGIAO_PARA_UF: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [uf, nome] of Object.entries(UF_NOMES)) m[norm(nome)] = uf;
  m["federal district"] = "DF";
  return m;
})();

function tipoOpenAlex(name: string, types: string[]): string {
  const n = norm(name);
  if (/universidade|university|faculdade|centro universitario/.test(n)) return "Universidade";
  if (/instituto federal|instituto de tecnologia|instituto de pesquisa|fundacao/.test(n)) return "Instituto de Pesquisa";
  if (types.includes("education")) return "Universidade";
  return "ICT";
}

async function ingestOpenAlex(): Promise<Local[]> {
  const rows: Local[] = [];
  const perPage = 200;
  for (let page = 1; page <= 12; page++) {
    const url =
      `https://api.openalex.org/institutions?filter=country_code:br` +
      `&select=id,display_name,works_count,cited_by_count,ror,type,geo` +
      `&sort=works_count:desc&per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Motor4P-UFPR/1.0 (mailto:pesquisa@ufpr.br)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
    const data = await res.json();
    const results = data?.results || [];
    for (const i of results) {
      const region = norm(i?.geo?.region || "");
      rows.push({
        nome: i.display_name,
        tipo: tipoOpenAlex(i.display_name, [i.type].filter(Boolean)),
        uf: REGIAO_PARA_UF[region] || null,
        municipio: i?.geo?.city || null,
        latitude: typeof i?.geo?.latitude === "number" ? i.geo.latitude : null,
        longitude: typeof i?.geo?.longitude === "number" ? i.geo.longitude : null,
        fonte: "openalex",
        fonte_url: i.id,
        cnpj: null,
        raw_metadata: i,
      });
    }
    if (results.length < perPage) break;
  }
  if (rows.length === 0) throw new Error("OpenAlex não retornou instituições");
  return rows;
}

// ---------------------------------------------------------------- EMBRAPII
// Fonte oficial confirmada: API pública do próprio site da EMBRAPII
// (tipo de conteúdo "units"), com cidade e UF por unidade.
const EMBRAPII_API = "https://embrapii.org.br/wp-json/wp/v2/units";

function decodeHtml(s: string): string {
  return (s || "")
    .replace(/&#8211;|&#8212;/g, "–")
    .replace(/&#8217;|&#039;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function ingestEmbrapii(): Promise<Local[]> {
  const erros: string[] = [];
  const rows: Local[] = [];
  try {
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(`${EMBRAPII_API}?per_page=100&page=${page}`, {
        headers: { "User-Agent": "Mozilla/5.0 Motor4P-UFPR/1.0" },
        signal: AbortSignal.timeout(45_000),
      });
      if (res.status === 400) break; // fim da paginação
      if (!res.ok) { erros.push(`página ${page} -> HTTP ${res.status}`); break; }
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) break;
      for (const u of items) {
        const acf = u?.acf || {};
        const uf = String(acf.uf_state || "").toUpperCase().trim();
        const nome = decodeHtml(u?.title?.rendered || "");
        if (!nome) continue;
        rows.push({
          nome,
          tipo: "Unidade EMBRAPII",
          uf: UF_NOMES[uf] ? uf : null,
          municipio: acf.city ? String(acf.city).trim() : null,
          latitude: null,
          longitude: null,
          fonte: "embrapii",
          fonte_url: u?.link || "https://embrapii.org.br/unidades/",
          cnpj: null,
          raw_metadata: {
            origem: "API pública do site oficial da EMBRAPII (post type units)",
            slug: u?.slug || null,
            institution_type: acf.institution_type || null,
            city: acf.city || null,
            uf_state: acf.uf_state || null,
            website: acf.website || null,
            sem_coordenada_exata: true,
          },
        });
      }
      if (items.length < 100) break;
    }
  } catch (e) {
    erros.push((e as Error).message);
  }
  if (rows.length === 0) {
    throw new Error(
      `Lista oficial de unidades EMBRAPII indisponível. Nenhum registro gravado (nada foi estimado). Tentativas: ${erros.join(" | ") || "API retornou vazio"}`,
    );
  }
  return rows;
}

// ---------------------------------------------------------------- INEP
const INEP_ANOS = [2024, 2023, 2022];
const inepZipUrl = (ano: number) =>
  `https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_${ano}.zip`;

async function municipiosIbge(): Promise<Map<string, { nome: string; uf: string }>> {
  const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios", {
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`IBGE municípios HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map<string, { nome: string; uf: string }>();
  for (const m of data) {
    const uf = m?.microrregiao?.mesorregiao?.UF?.sigla || m?.["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla;
    if (uf) map.set(String(m.id), { nome: m.nome, uf });
  }
  return map;
}

async function ingestInep(): Promise<Local[]> {
  const zipjs = await import("https://deno.land/x/zipjs@v2.7.32/index.js");
  zipjs.configure({ useWebWorkers: false });

  const erros: string[] = [];
  for (const ano of INEP_ANOS) {
    const url = inepZipUrl(ano);
    try {
      // Lê apenas o diretório do ZIP e extrai só o CSV de cadastro de IES (poucos MB),
      // via HTTP Range — sem baixar o pacote inteiro de microdados.
      const reader = new zipjs.ZipReader(new zipjs.HttpRangeReader(url, { useXHR: false }));
      const entries = await reader.getEntries();
      const alvo = entries.find((e: any) => /CADASTRO_IES.*\.CSV$/i.test(e.filename || ""));
      if (!alvo) {
        erros.push(`${ano}: ZIP acessível mas sem arquivo CADASTRO_IES*.CSV (${entries.length} arquivos)`);
        await reader.close();
        continue;
      }
      const csv = await alvo.getData(new zipjs.TextWriter("iso-8859-1"));
      await reader.close();

      const linhas = csv.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
      const sep = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ";" : ",";
      const head = linhas[0].split(sep).map((h: string) => h.replace(/^"|"$/g, "").trim().toUpperCase());
      const idx = (nomes: string[]) => nomes.map((n) => head.indexOf(n)).find((i) => i >= 0) ?? -1;

      const iNome = idx(["NO_IES"]);
      const iUf = idx(["SG_UF_IES", "SG_UF"]);
      const iMunCod = idx(["CO_MUNICIPIO_IES", "CO_MUNICIPIO"]);
      const iMunNome = idx(["NO_MUNICIPIO_IES", "NO_MUNICIPIO"]);
      const iCod = idx(["CO_IES"]);
      const iOrg = idx(["TP_ORGANIZACAO_ACADEMICA"]);
      if (iNome < 0) throw new Error(`coluna NO_IES não encontrada. Cabeçalho: ${head.slice(0, 15).join(",")}`);

      const ibge = iMunNome < 0 && iMunCod >= 0 ? await municipiosIbge() : null;

      const rows: Local[] = [];
      for (const linha of linhas.slice(1)) {
        const c = linha.split(sep).map((v: string) => v.replace(/^"|"$/g, "").trim());
        const nome = c[iNome];
        if (!nome) continue;
        const munCod = iMunCod >= 0 ? c[iMunCod] : "";
        const doIbge = ibge && munCod ? ibge.get(munCod) : null;
        const uf = (iUf >= 0 ? c[iUf] : "") || doIbge?.uf || "";
        const municipio = (iMunNome >= 0 ? c[iMunNome] : "") || doIbge?.nome || null;
        const org = iOrg >= 0 ? c[iOrg] : "";
        rows.push({
          nome,
          tipo: org === "1" ? "Universidade" : "Instituição de Ensino Superior",
          uf: UF_NOMES[uf] ? uf : null,
          municipio: municipio || null,
          latitude: null,
          longitude: null,
          fonte: "inep_censo_superior",
          fonte_url: url,
          cnpj: null,
          raw_metadata: {
            ano_censo: ano,
            co_ies: iCod >= 0 ? c[iCod] : null,
            co_municipio_ibge: munCod || null,
            arquivo: alvo.filename,
          },
        });
      }
      if (rows.length === 0) throw new Error(`${ano}: CSV lido mas sem linhas de IES`);
      return rows;
    } catch (e) {
      erros.push(`${ano}: ${(e as Error).message}`);
    }
  }
  throw new Error(
    `Download/parsing dos microdados do Censo da Educação Superior (INEP) falhou. Nada foi gravado. Tentativas: ${erros.join(" | ")}`,
  );
}

// ---------------------------------------------------------------- MCTI / FORMICT
// A base aberta consolidada do FORMICT traz CNPJ mascarado e SEM razão social,
// portanto a única lista nominal oficial é a de ICTs NÃO RESPONDENTES (parcial).
const FORMICT_PDFS = [
  { ano: 2024, url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/propriedade-intelectual-e-transferencia-de-tecnologia/ListadeICTAB20243doart.17doDecreton9.283181.pdf" },
  { ano: 2023, url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/propriedade-intelectual-e-transferencia-de-tecnologia/Listaem15102024dasICTSnaorespondentesFormictAB2023.pdf" },
  { ano: 2022, url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/propriedade-intelectual-e-transferencia-de-tecnologia/ListadeICTSnaorespondentesAB2022.pdf" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Consulta CNPJ na BrasilAPI com novas tentativas (a API limita requisições por minuto). */
async function cnpjLookup(cnpj: string): Promise<{ uf: string | null; municipio: string | null; razao: string | null } | null> {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(20_000) });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * tentativa);
        continue;
      }
      if (!res.ok) return null;
      const d = await res.json();
      return {
        uf: d?.uf || null,
        municipio: d?.municipio || null,
        razao: d?.razao_social || null,
      };
    } catch {
      await sleep(1000 * tentativa);
    }
  }
  return null;
}

async function ingestFormict(): Promise<Local[]> {
  const { extractText, getDocumentProxy } = await import("npm:unpdf@0.12.1");
  const erros: string[] = [];

  for (const { ano, url } of FORMICT_PDFS) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 Motor4P-UFPR/1.0" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) { erros.push(`${ano}: HTTP ${res.status}`); continue; }
      const buf = new Uint8Array(await res.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });

      // Cada registro: 14 dígitos de CNPJ seguidos da razão social até o próximo CNPJ.
      const limpo = String(text).replace(/\s+/g, " ");
      const re = /(\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+([\s\S]{5,220}?)(?=\s+(?:\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})|$)/g;
      const brutos: Array<{ cnpj: string; razao: string }> = [];
      for (const m of limpo.matchAll(re)) {
        const cnpj = m[1].replace(/\D/g, "");
        const razao = m[2].replace(/\s+/g, " ").trim();
        if (cnpj.length === 14 && razao.length > 4) brutos.push({ cnpj, razao });
      }
      if (brutos.length === 0) {
        erros.push(`${ano}: PDF baixado mas nenhum par CNPJ+razão social extraído`);
        continue;
      }

      // Enriquece com endereço via BrasilAPI (conector já usado no projeto), em lotes.
      const rows: Local[] = [];
      for (let i = 0; i < brutos.length; i += 4) {
        const lote = brutos.slice(i, i + 4);
        const infos = await Promise.all(lote.map((b) => cnpjLookup(b.cnpj)));
        if (i + 4 < brutos.length) await sleep(700);
        lote.forEach((b, k) => {
          const info = infos[k];
          rows.push({
            nome: info?.razao || b.razao,
            tipo: "ICT",
            uf: info?.uf && UF_NOMES[info.uf] ? info.uf : null,
            municipio: info?.municipio || null,
            latitude: null,
            longitude: null,
            fonte: "mcti_formict",
            fonte_url: url,
            cnpj: b.cnpj,
            raw_metadata: {
              lista_parcial: true,
              motivo: `apenas ICTs não respondentes do FORMICT, ano-base ${ano} (a base aberta consolidada do MCTI traz CNPJ mascarado e sem razão social)`,
              razao_social_pdf: b.razao,
              endereco_enriquecido_por: info ? "brasilapi_cnpj" : null,
            },
          });
        });
      }
      return rows;
    } catch (e) {
      erros.push(`${ano}: ${(e as Error).message}`);
    }
  }
  throw new Error(`PDF de ICTs do FORMICT (MCTI) não pôde ser lido. Nada foi gravado. Tentativas: ${erros.join(" | ")}`);
}

// ---------------------------------------------------------------- handler
const INGESTORES: Record<Fonte, () => Promise<Local[]>> = {
  openalex: ingestOpenAlex,
  embrapii: ingestEmbrapii,
  inep_censo_superior: ingestInep,
  mcti_formict: ingestFormict,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (!INGEST_KEY) return json({ error: "Ingestão não configurada no servidor" }, 503);
  if (req.headers.get("x-ingest-key") !== INGEST_KEY) {
    return json({ error: "Header x-ingest-key obrigatório ou inválido" }, 401);
  }

  let body: { source?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const source = body.source as Fonte;
  if (!source || !(source in INGESTORES)) {
    return json({ error: `source inválido. Use: ${Object.keys(INGESTORES).join(", ")}` }, 400);
  }

  try {
    const rows = await INGESTORES[source]();
    const inserted = await replaceSource(source, rows);
    return json({ source, failed: false, found: rows.length, inserted, data_coleta: new Date().toISOString() });
  } catch (e) {
    // Falha explícita: nada é gravado nem estimado para essa fonte.
    return json({ source, failed: true, inserted: 0, error: (e as Error).message }, 200);
  }
});

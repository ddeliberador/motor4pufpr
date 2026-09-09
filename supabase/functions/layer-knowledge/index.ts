import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function safeFetch(url: string, options?: RequestInit, timeoutMs = 20000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    if (!res.ok) {
      console.warn(`safeFetch ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`safeFetch failed for ${url}:`, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeText(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Aproxima um termo em português do seu cognato em inglês (sufixos latinos comuns). */
function ptToEnStem(s: string): string {
  return normalizeText(s)
    .replace(/logia$/, "logy").replace(/grafia$/, "graphy").replace(/metria$/, "metry")
    .replace(/nomia$/, "nomy").replace(/c[aã]o$/, "tion").replace(/s[aã]o$/, "sion")
    .replace(/dade$/, "ty").replace(/ismo$/, "ism").replace(/ico$/, "ic").replace(/ica$/, "ic")
    .replace(/ia$/, "y").replace(/ura$/, "ure").replace(/encia$/, "ence").replace(/ancia$/, "ance");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[m][n];
}

/** Similaridade 0..1 entre o termo buscado e o nome (inglês) de um conceito. */
function conceptNameSimilarity(query: string, conceptName: string): number {
  const q = normalizeText(query);
  const n = normalizeText(conceptName);
  if (!q || !n) return 0;
  if (q === n) return 1;
  // "rheology" vs "reology": ignora 'h' mudo em posições típicas de transliteração
  const strip = (s: string) => s.replace(/(?<=[rtcp])h/g, "");
  const candidates = [q, ptToEnStem(q)];
  let best = 0;
  for (const c of candidates) {
    const a = strip(c), b = strip(n);
    const sim = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
    best = Math.max(best, sim);
    if (b.startsWith(a) && a.length >= 5) best = Math.max(best, 0.8);
  }
  return best;
}

/**
 * Resolve o termo (em qualquer idioma) para um conceito canônico do OpenAlex.
 * Ex.: "Reologia" -> C200990466 "Rheology". Retorna null se não houver confiança razoável.
 *
 * Estratégia:
 *  1. /concepts?search=<query> (funciona para termos em inglês ou empréstimos).
 *  2. Se nada: busca textual em works agrupada por concepts.id e escolhe o conceito
 *     cujo nome em inglês é cognato do termo buscado (multilíngue via similaridade).
 */
async function resolveOpenAlexConcept(query: string, headers: Record<string, string>) {
  const MIN_SIM = 0.75;
  const MIN_WORKS = 100;

  // 1) Busca direta no índice de conceitos
  const direct = await safeFetch(
    `https://api.openalex.org/concepts?search=${encodeURIComponent(query)}&per_page=5&select=id,display_name,level,works_count`,
    { headers },
    8000
  );
  let best: any = null;
  let bestScore = 0;
  for (const c of (direct?.results || [])) {
    const sim = conceptNameSimilarity(query, c.display_name);
    if (sim > bestScore && (c.works_count || 0) >= MIN_WORKS) { bestScore = sim; best = c; }
  }

  // 2) Resolução multilíngue via conceitos dos works que casam com o texto
  if (!best || bestScore < MIN_SIM) {
    const grouped = await safeFetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&group_by=concepts.id&per_page=50`,
      { headers },
      8000
    );
    for (const g of (grouped?.group_by || [])) {
      if (!g.key_display_name) continue;
      const sim = conceptNameSimilarity(query, g.key_display_name);
      // leve bônus por volume relativo (evita conceitos raros com nome parecido)
      const score = sim + Math.min((g.count || 0) / 5000, 0.05);
      if (sim >= MIN_SIM && score > bestScore && (g.count || 0) >= 20) {
        bestScore = score;
        best = { id: g.key, display_name: g.key_display_name, level: null, works_count: g.count };
      }
    }
  }

  if (!best || bestScore < MIN_SIM) return null;
  return {
    id: String(best.id || "").replace("https://openalex.org/", ""),
    name: best.display_name as string,
    level: best.level as number | null,
    works_count: best.works_count as number,
    score: Math.min(bestScore, 1),
  };
}

async function searchOpenAlex(query: string) {
  const encoded = encodeURIComponent(query);
  const headers = { "User-Agent": "Motor4P-UFPR/1.0 (mailto:pesquisa@ufpr.br)" };

  // Passo 0: resolve o conceito multilíngue (amplia recall para produção em inglês)
  let resolved = await resolveOpenAlexConcept(query, headers);
  const base = resolved
    ? `https://api.openalex.org/works?filter=concepts.id:${resolved.id}`
    : `https://api.openalex.org/works?search=${encoded}`;
  const brFilter = resolved ? `,institutions.country_code:BR` : `&filter=institutions.country_code:BR`;
  if (resolved) console.log(`OpenAlex concept resolved: "${query}" -> ${resolved.id} (${resolved.name}, score ${resolved.score.toFixed(2)})`);

  const SELECT = "id,title,publication_year,cited_by_count,authorships,primary_location,open_access,concepts,doi";

  const fetchAll = (b: string, br: string) => Promise.all([
    safeFetch(`${b}${br}&per_page=15&sort=cited_by_count:desc&select=${SELECT}`, { headers }),
    safeFetch(`${b}&group_by=authorships.institutions.country_code&per_page=15`, { headers }),
    safeFetch(`${b}&group_by=concepts.id&per_page=20`, { headers }),
    safeFetch(`${b}&per_page=1`, { headers }),
    // 2ª chamada: mais recentes (pesquisa aplicada recente, pouco citada)
    safeFetch(`${b}${br}&per_page=15&sort=publication_date:desc&select=${SELECT}`, { headers }),
  ]);

  let [papersData, intlData, conceptsData, totalGlobalData, recentData] = await fetchAll(base, brFilter);

  // Fallback: se a busca por conceito não trouxe papers BR, volta à busca textual literal
  if (resolved && !(papersData?.results?.length)) {
    console.warn(`OpenAlex concept ${resolved.id} returned no BR papers, falling back to text search`);
    [papersData, intlData, conceptsData, totalGlobalData, recentData] = await fetchAll(
      `https://api.openalex.org/works?search=${encoded}`,
      `&filter=institutions.country_code:BR`
    );
    resolved = null;
  }


  // Mapeamento básico dos papers
  const mapWork = (w: any, origin: "cited" | "recent") => ({
    id: w.id?.replace("https://openalex.org/", "") || "",
    title: w.title || "",
    year: w.publication_year,
    citations: w.cited_by_count || 0,
    authors: (w.authorships || []).slice(0, 8).map((a: any) => ({
      name: a.author?.display_name || "",
      institution: a.institutions?.[0]?.display_name || "",
      country: a.institutions?.[0]?.country_code || "",
      orcid: a.author?.orcid?.replace("https://orcid.org/", "") || "",
    })),
    journal: w.primary_location?.source?.display_name || "",
    is_open_access: w.open_access?.is_oa || false,
    oa_url: w.open_access?.oa_url || "",
    url: w.primary_location?.landing_page_url || (w.doi ? `https://doi.org/${w.doi.replace("https://doi.org/", "")}` : w.id) || "",
    doi: w.doi?.replace("https://doi.org/", "") || "",
    abstract: "",
    concepts: (w.concepts || []).slice(0, 8).map((c: any) => c.display_name),
    keywords: [] as string[],
    grants: [] as any[],
    sdgs: [] as string[],
    origin,
  });

  const citedPapers = (papersData?.results || []).map((w: any) => mapWork(w, "cited"));
  const recentPapers = (recentData?.results || []).map((w: any) => mapWork(w, "recent"));

  // Lista combinada sem duplicatas (por id), mais recentes primeiro
  const seen = new Set<string>();
  const papers: any[] = [];
  for (const p of [...recentPapers, ...citedPapers]) {
    if (!p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    papers.push(p);
  }

  // Enriquecimento: top 5 mais citados + top 5 mais recentes (abstract + grants)
  if (papers.length > 0) {
    const topIds = [
      ...citedPapers.slice(0, 5).map((p: any) => p.id),
      ...recentPapers.slice(0, 5).map((p: any) => p.id),
    ].filter(Boolean);
    const uniqueIds = [...new Set(topIds)];
    const enriched = await safeFetch(
      `https://api.openalex.org/works?per_page=${uniqueIds.length}&filter=openalex_id:${uniqueIds.join("|")}&select=id,abstract_inverted_index,keywords,grants,sustainable_development_goals`,
      { headers },
      15000
    );
    if (enriched?.results) {
      const enrichMap: Record<string, any> = {};
      for (const w of enriched.results) {
        const id = w.id?.replace("https://openalex.org/", "");
        if (id) enrichMap[id] = w;
      }
      for (const p of papers) {
        const e = enrichMap[p.id];
        if (e) {
          p.abstract = decodeAbstract(e.abstract_inverted_index);
          p.keywords = (e.keywords || []).slice(0, 6).map((k: any) => k.display_name || k.keyword || "");
          p.grants = (e.grants || []).slice(0, 4).map((g: any) => ({ funder: g.funder_display_name || "", award: g.award_id || "" }));
          p.sdgs = (e.sustainable_development_goals || []).slice(0, 3).map((s: any) => s.display_name || "");
        }
      }
    }
  }


  const institutionCounts: Record<string, number> = {};
  for (const p of papers) {
    for (const a of p.authors) {
      if (a.institution) institutionCounts[a.institution] = (institutionCounts[a.institution] || 0) + 1;
    }
  }

  // Bug 2 fix: country_code pode vir como URL completa — extrair só o código ISO
  const international = (intlData?.group_by || [])
    .filter((g: any) => g.key && g.key !== "unknown")
    .slice(0, 15)
    .map((g: any) => {
      const rawKey = g.key as string;
      const countryCode = rawKey.includes("/countries/")
        ? rawKey.split("/countries/")[1]
        : rawKey.length === 2 ? rawKey : null;
      if (!countryCode) return null;
      return { country_code: countryCode.toUpperCase(), count: g.count };
    })
    .filter(Boolean);

  const concepts = (conceptsData?.group_by || [])
    .filter((g: any) => g.key_display_name)
    .slice(0, 15)
    .map((g: any) => ({ name: g.key_display_name, count: g.count }));

  return {
    papers,
    papers_cited: citedPapers,
    papers_recent: recentPapers,
    institutionCounts,
    international,
    concepts,
    totalPapersBR: papersData?.meta?.count || recentData?.meta?.count || papers.length,
    totalPapersGlobal: totalGlobalData?.meta?.count || papersData?.meta?.count || papers.length,

    resolved_concept: resolved
      ? { id: resolved.id, name: resolved.name, level: resolved.level, works_count: resolved.works_count, strategy: "concept" }
      : { id: null, name: null, strategy: "text" },
  };
}


async function searchCAPES(query: string) {
  const data = await safeFetch(`https://dadosabertos.capes.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=6`);
  if (!data?.result?.results) {
    const fallback = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CAPES pós-graduação bolsas")}&rows=5`);
    return (fallback?.result?.results || []).map((pkg: any) => ({
      title: pkg.title || "",
      description: (pkg.notes || "").slice(0, 200),
      organization: pkg.organization?.title || "CAPES",
      url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
      formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
    }));
  }
  return (data.result.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://dadosabertos.capes.gov.br/dataset/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
  }));
}

async function searchINEP(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " educação INEP")}&rows=5&fq=organization:instituto-nacional-de-estudos-e-pesquisas-educacionais-anisio-teixeira-inep`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

async function searchCNPq(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CNPq pesquisa grupos")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 150),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
  }));
}

async function searchDATASUS(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " saúde SUS DATASUS")}&rows=5&fq=organization:ministerio-da-saude-ms`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    formats: [...new Set((pkg.resources || []).map((r: any) => r.format?.toUpperCase()).filter(Boolean))],
  }));
}

async function searchBaseDosDados(query: string) {
  const data = await safeFetch(`https://basedosdados.org/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "",
    url: `https://basedosdados.org/dataset/${pkg.name}`,
    tags: (pkg.tags || []).slice(0, 5).map((t: any) => t.display_name),
  }));
}

/**
 * ENAP — Repositório Institucional (repositorio.enap.gov.br).
 * Plataforma DSpace 7 (confirmado: /server/api responde 200 e /server/api/discover/search/objects
 * aceita busca full-text por termo, retornando metadados Dublin Core).
 * OAI-PMH existe em /server/oai/request mas não faz busca por palavra-chave — por isso usamos a API REST.
 */
async function searchENAP(query: string) {
  const data = await safeFetch(
    `https://repositorio.enap.gov.br/server/api/discover/search/objects?query=${encodeURIComponent(query)}&dsoType=item&size=10`,
    { headers: { Accept: "application/json" } },
    15000
  );
  const sr = data?._embedded?.searchResult;
  const objects = sr?._embedded?.objects || [];
  const first = (md: any, key: string): string =>
    (md?.[key]?.[0]?.value as string) || "";
  const all = (md: any, key: string): string[] =>
    (md?.[key] || []).map((v: any) => v.value).filter(Boolean);

  const documents = objects.map((o: any) => {
    const io = o?._embedded?.indexableObject || {};
    const md = io.metadata || {};
    const issued = first(md, "dc.date.issued");
    const year = issued ? Number(String(issued).slice(0, 4)) || null : null;
    const uri = first(md, "dc.identifier.uri");
    return {
      title: io.name || first(md, "dc.title"),
      authors: all(md, "dc.contributor.author").slice(0, 5),
      type: first(md, "dc.type"),
      year,
      publisher: first(md, "dc.publisher"),
      subjects: all(md, "dc.subject").slice(0, 6),
      abstract: first(md, "dc.description.abstract").slice(0, 400),
      url: uri || (io.handle ? `https://repositorio.enap.gov.br/handle/${io.handle}` : "https://repositorio.enap.gov.br"),
      source: "ENAP — Repositório Institucional",
    };
  }).filter((d: any) => d.title);

  return {
    documents,
    total: sr?.page?.totalElements ?? documents.length,
    source: { name: "ENAP — Repositório Institucional", url: "https://repositorio.enap.gov.br" },
    note: "Repositório institucional da Escola Nacional de Administração Pública (DSpace 7). Acervo focado em administração pública, governo digital e inovação no setor público — buscas de temas puramente industriais podem não retornar resultados.",
  };
}

const INSTITUTION_ALIASES: Record<string, string[]> = {
  "UFPR": ["universidade federal do parana", "federal university of parana"],
  "USP": ["universidade de sao paulo", "university of sao paulo"],
  "UNICAMP": ["universidade estadual de campinas", "university of campinas"],
  "UFRJ": ["universidade federal do rio de janeiro", "federal university of rio de janeiro"],
  "UFRGS": ["universidade federal do rio grande do sul"],
  "UFMG": ["universidade federal de minas gerais"],
  "UFSC": ["universidade federal de santa catarina"],
  "EMBRAPA": ["empresa brasileira de pesquisa agropecuaria", "embrapa"],
  "FIOCRUZ": ["fundacao oswaldo cruz", "fiocruz", "oswaldo cruz foundation"],
  "INPE": ["instituto nacional de pesquisas espaciais"],
  "UNESP": ["universidade estadual paulista"],
  "UNIFESP": ["universidade federal de sao paulo"],
  "UNB": ["universidade de brasilia"],
  "UFC": ["universidade federal do ceara"],
  "UFBA": ["universidade federal da bahia"],
};

function normalizeInstitutionName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function resolveInstitution(name: string): { id: string; canonical: string } | null {
  const norm = normalizeInstitutionName(name);
  for (const [id, aliases] of Object.entries(INSTITUTION_ALIASES)) {
    if (norm.includes(id.toLowerCase()) || aliases.some(a => norm.includes(a) || a.includes(norm))) {
      return { id, canonical: id };
    }
  }
  return null;
}

function findCrossBaseMatches(institutions: Record<string, number>): Record<string, { canonical: string; count: number }> {
  const resolved: Record<string, { canonical: string; count: number }> = {};
  for (const [name, count] of Object.entries(institutions)) {
    const match = resolveInstitution(name);
    if (match) {
      if (!resolved[match.id]) resolved[match.id] = { canonical: match.canonical, count: 0 };
      resolved[match.id].count += count;
    }
  }
  return resolved;
}

function decodeAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return "";
  try {
    const words: string[] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }
    return words.filter(Boolean).join(" ").slice(0, 600);
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, location } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`Layer Knowledge: ${query}`);
    const start = Date.now();

    const [openalex, capes, inep, cnpq, datasus, basedosdados, enap] = await Promise.all([
      searchOpenAlex(query),
      searchCAPES(query),
      searchINEP(query),
      searchCNPq(query),
      searchDATASUS(query),
      searchBaseDosDados(query),
      searchENAP(query),
    ]);

    const totalPapers = openalex.totalPapersBR;
    const countriesActive = openalex.international.length;
    const density = countriesActive > 0 ? Math.round(totalPapers / countriesActive) : 0;

    const instValues = Object.values(openalex.institutionCounts).sort((a, b) => b - a).slice(0, 10);
    const instTotal = instValues.reduce((s, v) => s + v, 0) || 1;
    const hhi = instValues.reduce((s, v) => s + Math.pow(v / instTotal, 2), 0);
    const concentration = Math.round(hhi * 10000);

    const conceptCounts = openalex.concepts.map((c: any) => c.count);
    const conceptTotal = conceptCounts.reduce((s: number, v: number) => s + v, 0) || 1;
    const entropy = -conceptCounts.reduce((s: number, v: number) => { const p = v / conceptTotal; return s + (p > 0 ? p * Math.log2(p) : 0); }, 0);
    const maxEntropy = Math.log2(conceptCounts.length || 1) || 1;
    const specialization = Math.round((1 - entropy / maxEntropy) * 100);

    const resolved_institutions = findCrossBaseMatches(openalex.institutionCounts);

    // Busca instituições locais por FILTRO GEOGRÁFICO REAL (campo geo do OpenAlex),
    // não por casamento textual do nome do estado (que falhava para UFPR, UFBA, UFC, UFSC...).
    let localInstitutions: any[] = [];
    if (location?.uf) {
      const norm = (s: string) =>
        (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      // O OpenAlex expõe geo.region com o nome do estado em português, exceto o DF ("Federal District")
      const UF_NOMES: Record<string, string> = {
        AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
        DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
        MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
        PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
        RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
        SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
      };
      const regionAliases = new Set<string>();
      if (location.uf_nome) regionAliases.add(norm(location.uf_nome));
      if (UF_NOMES[location.uf]) regionAliases.add(norm(UF_NOMES[location.uf]));
      if (location.uf === "DF") {
        regionAliases.add("federal district");
        regionAliases.add("distrito federal");
      }


      const cityTarget = location.municipio ? norm(location.municipio) : "";

      // Universo de instituições brasileiras no OpenAlex é pequeno (~2 mil):
      // percorremos TODAS as páginas e filtramos por geo.region.
      // Parte dos registros vem com geo.region nulo (ex.: UFRR, UNIFAP), então
      // usamos a lista oficial de municípios da UF (IBGE) como segundo critério.
      const [pages, municipiosResp] = await Promise.all([
        Promise.all(
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((page) =>
            safeFetch(
              `https://api.openalex.org/institutions?filter=country_code:br&select=id,display_name,works_count,cited_by_count,ror,geo&sort=works_count:desc&per_page=200&page=${page}`,
              { headers: { "User-Agent": "Motor4P-UFPR/1.0 (mailto:pesquisa@ufpr.br)" } }
            )
          )
        ),
        safeFetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${location.uf}/municipios`
        ),
      ]);

      const municipiosUf = new Set<string>(
        (Array.isArray(municipiosResp) ? municipiosResp : []).map((m: any) => norm(m?.nome))
      );

      const all = pages.flatMap((p: any) => p?.results || []);
      const inUf = all.filter((i: any) => {
        const region = norm(i?.geo?.region || "");
        if (region.length > 0) return regionAliases.has(region);
        const city = norm(i?.geo?.city || "");
        return city.length > 0 && municipiosUf.has(city);
      });


      const ranked = cityTarget
        ? [
            ...inUf.filter((i: any) => norm(i?.geo?.city || "") === cityTarget),
            ...inUf.filter((i: any) => norm(i?.geo?.city || "") !== cityTarget),
          ]
        : inUf;

      localInstitutions = ranked.slice(0, 12).map((i: any) => ({
        id: i.id,
        name: i.display_name,
        works_count: i.works_count,
        cited_by_count: i.cited_by_count,
        ror: i.ror,
        city: i.geo?.city || null,
        region: i.geo?.region || null,
        match: "geo",
      }));
    }


    const sources: string[] = [];
    if (openalex.papers.length > 0) sources.push("OpenAlex");
    if (capes.length > 0) sources.push("CAPES");
    if (inep.length > 0) sources.push("INEP");
    if (cnpq.length > 0) sources.push("CNPq");
    if (datasus.length > 0) sources.push("DATASUS");
    if (basedosdados.length > 0) sources.push("Base dos Dados");
    if (enap.documents.length > 0) sources.push("ENAP — Repositório Institucional");

    return new Response(JSON.stringify({
      papers: openalex.papers,
      papers_cited: openalex.papers_cited,
      papers_recent: openalex.papers_recent,

      total_papers: totalPapers,
      total_papers_global: openalex.totalPapersGlobal,
      institutions: openalex.institutionCounts,
      resolved_institutions,
      local_institutions: localInstitutions,
      international: openalex.international,
      concepts: openalex.concepts,
      capes_datasets: capes,
      inep_datasets: inep,
      cnpq_datasets: cnpq,
      datasus_datasets: datasus,
      basedosdados_datasets: basedosdados,
      enap,
      density,
      concentration,
      specialization,
      sources,
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Layer Knowledge error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

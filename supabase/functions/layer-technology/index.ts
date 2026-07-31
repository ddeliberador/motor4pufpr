import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CBO local — fallback quando o Railway não retorna cbo_codes
// Referência: CBO 2002 (MTE)
const CBO_KEYWORD_MAP: Record<string, Array<{ code: string; description: string; area: string }>> = {
  "bateria": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em eletrotécnica", area: "Técnico" },
    { code: "2112-10", description: "Físico", area: "Pesquisa" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
  ],
  "litio": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
    { code: "3141-05", description: "Técnico em eletrotécnica", area: "Técnico" },
  ],
  "sodio": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
  ],
  "energia": [
    { code: "2143-30", description: "Engenheiro eletricista", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em eletrotécnica", area: "Técnico" },
    { code: "3141-30", description: "Técnico em energias renováveis", area: "Técnico" },
    { code: "2122-30", description: "Engenheiro de energias renováveis", area: "Engenharia" },
  ],
  "solar": [
    { code: "2122-30", description: "Engenheiro de energias renováveis", area: "Engenharia" },
    { code: "3141-30", description: "Técnico em energias renováveis", area: "Técnico" },
    { code: "2112-20", description: "Físico (energia solar)", area: "Pesquisa" },
  ],
  "hidrogenio": [
    { code: "2143-15", description: "Engenheiro químico", area: "Engenharia" },
    { code: "2113-10", description: "Químico industrial", area: "Química" },
    { code: "2122-30", description: "Engenheiro de energias renováveis", area: "Engenharia" },
  ],
  "inteligencia": [
    { code: "2124-05", description: "Analista de sistemas computacionais", area: "TI" },
    { code: "2124-20", description: "Engenheiro de software", area: "TI" },
    { code: "2523-10", description: "Cientista de dados", area: "TI" },
    { code: "2124-10", description: "Analista de desenvolvimento de sistemas", area: "TI" },
  ],
  "artificial": [
    { code: "2124-05", description: "Analista de sistemas computacionais", area: "TI" },
    { code: "2124-20", description: "Engenheiro de software", area: "TI" },
    { code: "2523-10", description: "Cientista de dados", area: "TI" },
  ],
  "software": [
    { code: "2124-20", description: "Engenheiro de software", area: "TI" },
    { code: "2124-10", description: "Analista de desenvolvimento de sistemas", area: "TI" },
    { code: "3172-20", description: "Técnico em informática", area: "Técnico" },
  ],
  "semicondutor": [
    { code: "2122-05", description: "Engenheiro eletrônico", area: "Engenharia" },
    { code: "3172-10", description: "Técnico em eletrônica", area: "Técnico" },
    { code: "2112-05", description: "Físico", area: "Pesquisa" },
  ],
  "chip": [
    { code: "2122-05", description: "Engenheiro eletrônico", area: "Engenharia" },
    { code: "3172-10", description: "Técnico em eletrônica", area: "Técnico" },
  ],
  "robotica": [
    { code: "2122-10", description: "Engenheiro de controle e automação", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em mecatrônica", area: "Técnico" },
    { code: "7843-10", description: "Operador de robótica industrial", area: "Operacional" },
  ],
  "automacao": [
    { code: "2122-10", description: "Engenheiro de controle e automação", area: "Engenharia" },
    { code: "3141-05", description: "Técnico em mecatrônica", area: "Técnico" },
    { code: "2143-05", description: "Engenheiro mecânico", area: "Engenharia" },
  ],
  "biotecnologia": [
    { code: "2234-05", description: "Biólogo", area: "Ciências biológicas" },
    { code: "3222-10", description: "Técnico em biotecnologia", area: "Técnico" },
    { code: "2112-15", description: "Biofísico", area: "Pesquisa" },
  ],
  "crispr": [
    { code: "2234-05", description: "Biólogo", area: "Ciências biológicas" },
    { code: "3222-10", description: "Técnico em biotecnologia", area: "Técnico" },
  ],
  "grafeno": [
    { code: "2112-10", description: "Físico (nanomateriais)", area: "Pesquisa" },
    { code: "2113-15", description: "Químico (nanoquímica)", area: "Química" },
    { code: "2122-25", description: "Engenheiro de materiais", area: "Engenharia" },
  ],
  "nanotecnologia": [
    { code: "2112-10", description: "Físico (nanomateriais)", area: "Pesquisa" },
    { code: "2113-15", description: "Químico (nanoquímica)", area: "Química" },
    { code: "2122-25", description: "Engenheiro de materiais", area: "Engenharia" },
    { code: "3131-35", description: "Técnico em nanotecnologia", area: "Técnico" },
  ],
  "farmaco": [
    { code: "2236-05", description: "Farmacêutico", area: "Saúde" },
    { code: "2236-25", description: "Farmacêutico industrial", area: "Saúde" },
    { code: "3222-20", description: "Técnico em farmácia", area: "Técnico" },
  ],
  "medicamento": [
    { code: "2236-05", description: "Farmacêutico", area: "Saúde" },
    { code: "2236-25", description: "Farmacêutico industrial", area: "Saúde" },
    { code: "3222-20", description: "Técnico em farmácia", area: "Técnico" },
  ],
  "biomaterial": [
    { code: "2236-10", description: "Biomédico", area: "Saúde" },
    { code: "2234-15", description: "Engenheiro biomédico", area: "Engenharia" },
    { code: "3222-05", description: "Técnico de laboratório", area: "Técnico" },
  ],
  "telecomunicacao": [
    { code: "2122-15", description: "Engenheiro de telecomunicações", area: "Engenharia" },
    { code: "3172-05", description: "Técnico em telecomunicações", area: "Técnico" },
    { code: "2523-05", description: "Analista de redes", area: "TI" },
  ],
  "iot": [
    { code: "2122-15", description: "Engenheiro de telecomunicações", area: "Engenharia" },
    { code: "3172-15", description: "Técnico em redes de computadores", area: "Técnico" },
    { code: "2124-05", description: "Analista de sistemas computacionais", area: "TI" },
  ],
  "aeronave": [
    { code: "2143-20", description: "Engenheiro aeronáutico", area: "Engenharia" },
    { code: "3143-10", description: "Técnico em mecânica aeronáutica", area: "Técnico" },
    { code: "3143-05", description: "Técnico em aviônica", area: "Técnico" },
  ],
  "drone": [
    { code: "2143-20", description: "Engenheiro aeronáutico", area: "Engenharia" },
    { code: "3143-05", description: "Técnico em aviônica", area: "Técnico" },
    { code: "2122-10", description: "Engenheiro de controle e automação", area: "Engenharia" },
  ],
  "mineracao": [
    { code: "2143-10", description: "Engenheiro de minas", area: "Engenharia" },
    { code: "3132-05", description: "Técnico em mineração", area: "Técnico" },
    { code: "7121-05", description: "Operador de mineração", area: "Operacional" },
  ],
  "aco": [
    { code: "2143-25", description: "Engenheiro metalúrgico", area: "Engenharia" },
    { code: "3131-25", description: "Técnico em metalurgia", area: "Técnico" },
    { code: "7231-25", description: "Operador de processos metalúrgicos", area: "Operacional" },
  ],
  "quimico": [
    { code: "2113-10", description: "Químico industrial", area: "Química" },
    { code: "3131-10", description: "Técnico em química", area: "Técnico" },
    { code: "2143-15", description: "Engenheiro químico", area: "Engenharia" },
  ],
};

// Cache em memória das subclasses CNAE (carregado uma vez por instância da edge function)
let CNAE_CACHE: Array<{
  id: string;
  descricao: string;
  classe_id: string;
  classe_desc: string;
  grupo_id: string;
  grupo_desc: string;
  divisao_id: string;
  divisao_desc: string;
  secao_id: string;
  secao_desc: string;
}> | null = null;

async function loadCnaeCache(): Promise<typeof CNAE_CACHE> {
  if (CNAE_CACHE) return CNAE_CACHE;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(
      "https://servicodados.ibge.gov.br/api/v2/cnae/subclasses",
      { signal: ctrl.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(t);
    if (!res.ok) { console.warn(`CNAE API ${res.status}`); return null; }
    const data: any[] = await res.json();
    CNAE_CACHE = data.map((s: any) => ({
      id: s.id || "",
      descricao: s.descricao || "",
      classe_id: s.classe?.id || "",
      classe_desc: s.classe?.descricao || "",
      grupo_id: s.classe?.grupo?.id || "",
      grupo_desc: s.classe?.grupo?.descricao || "",
      divisao_id: s.classe?.grupo?.divisao?.id || "",
      divisao_desc: s.classe?.grupo?.divisao?.descricao || "",
      secao_id: s.classe?.grupo?.divisao?.secao?.id || "",
      secao_desc: s.classe?.grupo?.divisao?.secao?.descricao || "",
    }));
    console.log(`CNAE cache: ${CNAE_CACHE.length} subclasses carregadas`);
    return CNAE_CACHE;
  } catch (e) {
    console.warn("CNAE load error:", e instanceof Error ? e.message : e);
    return null;
  }
}

function normStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
}

function scoreCnae(subclasse: typeof CNAE_CACHE extends Array<infer T> ? T : never, terms: string[]): number {
  const haystack = normStr(
    `${subclasse.descricao} ${subclasse.classe_desc} ${subclasse.grupo_desc} ${subclasse.divisao_desc}`
  );
  let score = 0;
  for (const term of terms) {
    if (term.length < 3) continue;
    if (normStr(subclasse.descricao).includes(term)) score += 10;
    else if (normStr(subclasse.classe_desc).includes(term)) score += 6;
    else if (normStr(subclasse.grupo_desc).includes(term)) score += 4;
    else if (normStr(subclasse.divisao_desc).includes(term)) score += 2;
    else if (haystack.includes(term)) score += 1;
  }
  return score;
}

async function fetchCnaeFromIbge(query: string, searchTerms: string[] = []): Promise<{
  subclasses: Array<{ id: string; descricao: string; divisao_id: string; divisao_desc: string; secao_id: string; secao_desc: string; score: number }>;
  divisoes: Array<{ id: string; descricao: string; secao_id: string }>;
  secoes: string[];
  fallback: boolean;
}> {
  const cache = await loadCnaeCache();
  if (!cache || cache.length === 0) {
    return { subclasses: [], divisoes: [], secoes: [], fallback: true };
  }

  const allTerms = [query, ...searchTerms]
    .flatMap(t => normStr(t).split(/\s+/))
    .filter((t, i, arr) => t.length >= 3 && arr.indexOf(t) === i)
    .slice(0, 12);

  const scored = cache
    .map(s => ({ ...s, score: scoreCnae(s, allTerms) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const topSubs = scored.slice(0, 10).map(s => ({
    id: s.id,
    descricao: s.descricao,
    divisao_id: s.divisao_id,
    divisao_desc: s.divisao_desc,
    secao_id: s.secao_id,
    secao_desc: s.secao_desc,
    score: s.score,
  }));

  const divMap = new Map<string, { id: string; descricao: string; secao_id: string }>();
  for (const s of scored.slice(0, 20)) {
    if (s.divisao_id && !divMap.has(s.divisao_id)) {
      divMap.set(s.divisao_id, { id: s.divisao_id, descricao: s.divisao_desc, secao_id: s.secao_id });
    }
  }

  const secoes = [...new Set(scored.slice(0, 20).map(s => s.secao_id).filter(Boolean))];

  return {
    subclasses: topSubs,
    divisoes: [...divMap.values()].slice(0, 6),
    secoes: secoes.slice(0, 4),
    fallback: false,
  };
}

// Busca NCM via API MDIC/ComexStat — retorna códigos NCM do produto
async function fetchNcmFromMdic(query: string): Promise<Array<{ code: string; description: string }>> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(
      "https://api-comexstat.mdic.gov.br/tables/ncm?language=pt",
      { signal: ctrl.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(t);
    if (!res.ok) { console.warn(`NCM API ${res.status}`); return []; }
    const data: any = await res.json();
    const items: any[] = Array.isArray(data) ? data : (data?.data || data?.items || []);
    if (!items.length) return [];

    const terms = normStr(query).split(/\s+/).filter(t => t.length >= 3);
    const scored = items
      .map((item: any) => {
        const desc = normStr(item.text || item.description || item.no_ncm_por || "");
        const code = String(item.id || item.co_ncm || item.code || "");
        const s = terms.reduce((acc, t) => acc + (desc.includes(t) ? 1 : 0), 0);
        return { code, description: item.text || item.no_ncm_por || "", score: s };
      })
      .filter(i => i.score > 0 && i.code)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return scored.map(i => ({ code: i.code, description: i.description }));
  } catch (e) {
    console.warn("NCM fetch error:", e instanceof Error ? e.message : e);
    return [];
  }
}

function resolveCboFromQuery(query: string): Array<{ code: string; description: string; area: string }> {
  const terms = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
  const seen = new Set<string>();
  const result: Array<{ code: string; description: string; area: string }> = [];
  for (const term of terms) {
    for (const [keyword, cbos] of Object.entries(CBO_KEYWORD_MAP)) {
      if (term.includes(keyword) || keyword.includes(term)) {
        for (const cbo of cbos) {
          if (!seen.has(cbo.code)) {
            seen.add(cbo.code);
            result.push(cbo);
          }
        }
      }
    }
  }
  return result.slice(0, 6);
}

async function safeFetch(url: string, options?: RequestInit, timeoutMs = 20000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    if (!res.ok) { console.warn(`safeFetch ${res.status} for ${url}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`safeFetch failed for ${url}:`, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchGitHub(query: string, searchTerms: string[]) {
  const ghToken = Deno.env.get("GITHUB_TOKEN") || "";
  const ghHeaders: Record<string, string> = { "User-Agent": "Motor4P-UFPR" };
  if (ghToken) ghHeaders["Authorization"] = `token ${ghToken}`;

  // GitHub funciona melhor com termos em inglês
  // Os search_terms do ontology_engine já incluem a versão em inglês
  const allRepos: any[] = [];
  const seenNames = new Set<string>();

  const termsToTry = [query, ...searchTerms.filter((t) => t !== query)].slice(0, 3);

  for (const term of termsToTry) {
    const data = await safeFetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(term + " Brazil OR Brasil")}&sort=stars&per_page=8`,
      { headers: ghHeaders }
    );
    for (const r of (data?.items || [])) {
      if (!seenNames.has(r.full_name)) {
        seenNames.add(r.full_name);
        allRepos.push({
          name: r.full_name || "",
          description: (r.description || "").slice(0, 150),
          stars: r.stargazers_count || 0,
          language: r.language || "",
          url: r.html_url || "",
          updated: r.updated_at?.split("T")[0] || "",
          forks: r.forks_count || 0,
        });
      }
    }
  }

  // Segundo passo: busca sem filtro Brasil para comparação global
  const globalData = await safeFetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(termsToTry[0])}&sort=stars&per_page=5`,
    { headers: ghHeaders }
  );
  const globalRepos = (globalData?.items || [])
    .filter((r: any) => !seenNames.has(r.full_name))
    .map((r: any) => ({
      name: r.full_name || "",
      description: (r.description || "").slice(0, 150),
      stars: r.stargazers_count || 0,
      language: r.language || "",
      url: r.html_url || "",
      updated: r.updated_at?.split("T")[0] || "",
      forks: r.forks_count || 0,
      is_global: true,
    }));

  return { br_repos: allRepos.slice(0, 10), global_repos: globalRepos.slice(0, 5) };
}

async function searchINPI(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " patente INPI propriedade industrial")}&rows=8`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchRAIS(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " RAIS CAGED emprego trabalho")}&rows=6`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchEmbrapiiFinep(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " Embrapii Finep inovação")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchCNPJQSA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CNPJ empresa cadastro societário")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchTransportes(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " transporte infraestrutura rodovia aviação")}&rows=5`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    organization: pkg.organization?.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

async function searchANVISA(query: string) {
  const data = await safeFetch(`https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " ANVISA medicamento registro saúde")}&rows=4`);
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "", description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`, structured: false,
  }));
}

// Mapeamento tema → seções CNAE (letra) para filtrar o CAGED
// IPEAData tem séries por seção: CAGED12_ADMIS_{LETRA} e CAGED12_DESLIG_{LETRA}
const CNAE_MAP: Record<string, { secoes: string[]; label: string }> = {
  "software": { secoes: ["J", "M"], label: "Tecnologia da Informação e Comunicação (J) + Atividades científicas (M)" },
  "artificial": { secoes: ["J", "M"], label: "TIC (J) + P&D (M)" },
  "inteligencia": { secoes: ["J", "M"], label: "TIC (J) + P&D (M)" },
  "dado": { secoes: ["J", "M"], label: "TIC (J) + P&D (M)" },
  "tecnologia": { secoes: ["J", "M"], label: "TIC (J) + P&D (M)" },
  "informatica": { secoes: ["J"], label: "Tecnologia da Informação e Comunicação (J)" },
  "semicondutor": { secoes: ["C", "J"], label: "Indústria de transformação (C) + TIC (J)" },
  "chip": { secoes: ["C", "J"], label: "Indústria de transformação (C) + TIC (J)" },
  "eletronico": { secoes: ["C"], label: "Indústria de transformação (C)" },
  "bateria": { secoes: ["C", "D"], label: "Indústria de transformação (C) + Energia (D)" },
  "energia": { secoes: ["D", "C", "M"], label: "Energia (D) + Indústria (C) + P&D (M)" },
  "solar": { secoes: ["D", "C"], label: "Energia (D) + Indústria (C)" },
  "eolica": { secoes: ["D", "C"], label: "Energia (D) + Indústria (C)" },
  "hidrogenio": { secoes: ["D", "C", "M"], label: "Energia (D) + Indústria (C) + P&D (M)" },
  "farmaco": { secoes: ["C", "M", "Q"], label: "Indústria farmacêutica (C) + P&D (M) + Saúde (Q)" },
  "medicamento": { secoes: ["C", "Q"], label: "Indústria farmacêutica (C) + Saúde (Q)" },
  "biotecnologia": { secoes: ["M", "C", "Q"], label: "P&D (M) + Indústria (C) + Saúde (Q)" },
  "saude": { secoes: ["Q", "M", "C"], label: "Saúde (Q) + P&D (M) + Indústria (C)" },
  "robotica": { secoes: ["C", "J", "M"], label: "Indústria (C) + TIC (J) + P&D (M)" },
  "automacao": { secoes: ["C", "J"], label: "Indústria (C) + TIC (J)" },
  "aeronave": { secoes: ["C", "H"], label: "Indústria aeronáutica (C) + Transporte (H)" },
  "drone": { secoes: ["C", "J"], label: "Indústria (C) + TIC (J)" },
  "mineracao": { secoes: ["B", "C"], label: "Mineração (B) + Indústria (C)" },
  "telecomunicacao": { secoes: ["J"], label: "Telecomunicações (J)" },
  "agro": { secoes: ["A", "C", "M"], label: "Agropecuária (A) + Agroindústria (C) + P&D (M)" },
  "agricola": { secoes: ["A", "C"], label: "Agropecuária (A) + Agroindústria (C)" },
  "quimico": { secoes: ["C", "M"], label: "Indústria química (C) + P&D (M)" },
  "nanotecnologia": { secoes: ["M", "C"], label: "P&D (M) + Indústria (C)" },
  "grafeno": { secoes: ["M", "C"], label: "P&D (M) + Indústria (C)" },
  "construcao": { secoes: ["F", "C"], label: "Construção (F) + Indústria (C)" },
  "logistica": { secoes: ["H", "G"], label: "Transporte/Logística (H) + Comércio (G)" },
  "financeiro": { secoes: ["K", "J"], label: "Financeiro (K) + TIC (J)" },
  "fintech": { secoes: ["K", "J"], label: "Financeiro (K) + TIC (J)" },
  "educacao": { secoes: ["P", "J"], label: "Educação (P) + TIC (J)" },
  "pesquisa": { secoes: ["M"], label: "Atividades científicas e de P&D (M)" },
};

// Nomes das seções CNAE para exibição
const CNAE_SECTION_NAMES: Record<string, string> = {
  A: "Agropecuária", B: "Mineração", C: "Indústria de Transformação",
  D: "Eletricidade/Energia", E: "Água/Saneamento", F: "Construção",
  G: "Comércio", H: "Transporte/Logística", I: "Hospedagem/Alimentação",
  J: "TIC / Informação", K: "Financeiro", L: "Imobiliário",
  M: "P&D / Atividades Profissionais", N: "Serviços Administrativos",
  O: "Administração Pública", P: "Educação", Q: "Saúde",
  R: "Cultura/Lazer", S: "Outros Serviços",
};

function resolveSecoesFromQuery(query: string): { secoes: string[]; label: string } {
  const norm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const terms = norm.split(/\s+/);
  for (const term of terms) {
    for (const [kw, mapping] of Object.entries(CNAE_MAP)) {
      if (term.includes(kw) || kw.includes(term)) return mapping;
    }
  }
  // fallback genérico: M (P&D) + J (TIC)
  return { secoes: ["M", "J"], label: "P&D / Atividades Profissionais (M) + TIC (J)" };
}

async function fetchCaged(
  cboCodes: Array<{ code: string; description: string; area?: string }>,
  query: string
): Promise<any> {
  const { secoes, label: setorLabel } = resolveSecoesFromQuery(query);

  const fetchSerie = async (code: string) => {
    const data = await safeFetch(
      `http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='${code}')`,
      { headers: { Accept: "application/json" } },
      20000
    );
    const rows: any[] = data?.value || [];
    return rows
      .filter((r) => r.VALVALOR != null)
      .map((r) => ({ data: String(r.VALDATA).slice(0, 7), valor: Number(r.VALVALOR) }))
      .slice(-12);
  };

  // O IPEAData NÃO possui séries do CAGED por seção CNAE (apenas o agregado nacional).
  // Para o recorte setorial usamos a PNAD Contínua/IBGE — tabela 4362:
  // pessoas ocupadas por grupamento de atividade (série anual, em mil pessoas).
  const SECAO_TO_GRUPAMENTO: Record<string, { id: number; nome: string }> = {
    A: { id: 47947, nome: "Agropecuária, produção florestal e pesca" },
    B: { id: 47948, nome: "Indústria geral" },
    C: { id: 47948, nome: "Indústria geral" },
    D: { id: 47948, nome: "Indústria geral" },
    E: { id: 47948, nome: "Indústria geral" },
    F: { id: 47949, nome: "Construção" },
    G: { id: 47950, nome: "Comércio e reparação de veículos" },
    H: { id: 56622, nome: "Transporte, armazenagem e correio" },
    I: { id: 56623, nome: "Alojamento e alimentação" },
    J: { id: 56624, nome: "Informação, comunicação e atividades profissionais" },
    K: { id: 56624, nome: "Informação, comunicação e atividades profissionais" },
    L: { id: 56624, nome: "Informação, comunicação e atividades profissionais" },
    M: { id: 56624, nome: "Informação, comunicação e atividades profissionais" },
    N: { id: 56624, nome: "Informação, comunicação e atividades profissionais" },
    O: { id: 60032, nome: "Administração pública, educação e saúde" },
    P: { id: 60032, nome: "Administração pública, educação e saúde" },
    Q: { id: 60032, nome: "Administração pública, educação e saúde" },
    R: { id: 56627, nome: "Outros serviços" },
    S: { id: 56627, nome: "Outros serviços" },
  };

  const setoralResults: Array<{
    secao: string; nome: string; grupamento: string;
    ocupados_mil: number | null; variacao_pessoas: number | null;
    admissoes: number; demissoes: number; saldo: number; serie_saldo: any[];
  }> = [];

  try {
    const grupamentos = Array.from(
      new Map(
        secoes.slice(0, 3)
          .map((s) => SECAO_TO_GRUPAMENTO[s])
          .filter(Boolean)
          .map((g) => [g.id, g])
      ).values()
    );

    if (grupamentos.length > 0) {
      const ids = grupamentos.map((g) => g.id).join(",");
      const url = `https://servicodados.ibge.gov.br/api/v3/agregados/4362/periodos/-5/variaveis/4090?localidades=N1%5B1%5D&classificacao=888%5B${ids}%5D`;
      const data = await safeFetch(url, { headers: { Accept: "application/json" } }, 20000);
      const resultados: any[] = data?.[0]?.resultados || [];

      for (const res of resultados) {
        const catObj = res?.classificacoes?.[0]?.categoria || {};
        const catId = Object.keys(catObj)[0];
        const catNome = catObj[catId] || "";
        const serieObj = res?.series?.[0]?.serie || {};
        const anos = Object.keys(serieObj).sort();
        const pontos = anos
          .map((ano) => ({ ano, valor: Number(serieObj[ano]) }))
          .filter((p) => Number.isFinite(p.valor));
        if (pontos.length === 0) continue;

        // variação anual em pessoas (série em mil pessoas)
        const serieVariacao = pontos.slice(1).map((p, i) => ({
          data: p.ano,
          valor: Math.round((p.valor - pontos[i].valor) * 1000),
        }));
        const ultimo = pontos[pontos.length - 1];
        const variacao = serieVariacao.length > 0 ? serieVariacao[serieVariacao.length - 1].valor : 0;
        const secaoLetra = secoes.find((s) => SECAO_TO_GRUPAMENTO[s]?.id === Number(catId)) || "";

        setoralResults.push({
          secao: secaoLetra,
          nome: catNome || CNAE_SECTION_NAMES[secaoLetra] || `Seção ${secaoLetra}`,
          grupamento: catNome,
          ocupados_mil: ultimo.valor,
          variacao_pessoas: variacao,
          admissoes: 0,
          demissoes: 0,
          saldo: variacao,
          serie_saldo: serieVariacao,
        });
      }
    }
  } catch (e) {
    console.warn("Setorial IBGE/PNADC falhou:", e instanceof Error ? e.message : e);
  }


  // Nacional como fallback e contexto comparativo
  let saldoNacional: any[] = [];
  let admNacional: any[] = [];
  let desNacional: any[] = [];
  try {
    [admNacional, desNacional, saldoNacional] = await Promise.all([
      fetchSerie("CAGED12_ADMISN12"),
      fetchSerie("CAGED12_DESLIGN12"),
      fetchSerie("CAGED12_SALDON12"),
    ]);
  } catch (e) {
    console.warn("CAGED nacional falhou:", e instanceof Error ? e.message : e);
  }

  const sumArr = (arr: any[]) => Math.round(arr.reduce((s, r) => s + r.valor, 0));
  const totalSaldoNacional = saldoNacional.length > 0 ? sumArr(saldoNacional) : 0;
  const ultimos3 = saldoNacional.slice(-3).reduce((s: number, r: any) => s + r.valor, 0);

  // Série principal: usa o primeiro setor encontrado, senão nacional
  const seriePrincipal = setoralResults.length > 0
    ? setoralResults[0].serie_saldo
    : saldoNacional;

  const saldoSetorial = setoralResults.reduce((s, r) => s + r.saldo, 0);
  const ocupadosSetorial = setoralResults.reduce((s, r) => s + (r.ocupados_mil || 0), 0);
  const anoSetorial = setoralResults[0]?.serie_saldo?.slice(-1)?.[0]?.data || "";

  return {
    setor_foco: {
      label: setorLabel,
      secoes_cnae: secoes,
      grupamentos: setoralResults.map((r) => r.grupamento),
      ano_referencia: anoSetorial,
      ocupados_mil: ocupadosSetorial || null,
      total_admissoes: null,
      total_demissoes: null,
      total_saldo: setoralResults.length > 0 ? saldoSetorial : null,
      detalhes: setoralResults,
      serie_saldo: seriePrincipal,
      disponivel: setoralResults.length > 0,
      metrica: "variação anual do total de ocupados (PNAD Contínua/IBGE)",
    },
    nacional: {
      periodo: saldoNacional.length > 0 ? `${saldoNacional[0].data} a ${saldoNacional[saldoNacional.length - 1].data}` : "",
      total_admissoes: admNacional.length > 0 ? sumArr(admNacional) : null,
      total_demissoes: desNacional.length > 0 ? sumArr(desNacional) : null,
      total_saldo: totalSaldoNacional,
      tendencia_geral: ultimos3 > 0 ? "crescimento" : ultimos3 < 0 ? "retração" : "estável",
      serie_saldo: saldoNacional,
    },
    ocupacoes: cboCodes.slice(0, 6),
    escopo: setoralResults.length > 0
      ? `Recorte setorial: ${setoralResults.map((r) => r.grupamento).join(", ")} — total de ocupados e variação anual (PNAD Contínua/IBGE, tabela 4362). Admissões e desligamentos são do Novo CAGED nacional, pois o MTE não publica séries por seção CNAE em API aberta.`
      : `Série nacional agregada do Novo CAGED. Seções CNAE tentadas: ${secoes.join(", ")}.`,
    source: "Novo CAGED — MTE/IPEAData (nacional) + PNAD Contínua/IBGE tabela 4362 (setorial)",
    url: "http://www.ipeadata.gov.br/",
  };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, knowledge_papers, knowledge_total_papers, search_terms, ipc_codes, cbo_codes } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const searchTerms: string[] = Array.isArray(search_terms) && search_terms.length > 0 ? search_terms : [query];
    const ipcCodes: string[] = Array.isArray(ipc_codes) ? ipc_codes : [];

    // Resolve CBOs: prioridade para os vindos da ontologia Railway, fallback para mapeamento local
    const cbosFromOntology: Array<{ code: string; description: string; area?: string }> =
      Array.isArray(cbo_codes) && cbo_codes.length > 0 ? cbo_codes : resolveCboFromQuery(query);

    console.log(`Layer Technology: ${query} | termos: ${searchTerms.join(", ")} | IPC: ${ipcCodes.length}`);
    const start = Date.now();

    const [githubResult, inpi, rais, embrapii, cnpj_qsa, transportes, anvisa] = await Promise.all([
      searchGitHub(query, searchTerms), searchINPI(query), searchRAIS(query), searchEmbrapiiFinep(query),
      searchCNPJQSA(query), searchTransportes(query), searchANVISA(query),
    ]);

    const github = githubResult.br_repos;
    const globalRepos = githubResult.global_repos;

    const totalRepos = github.length;
    const totalStars = github.reduce((s: number, r: any) => s + (r.stars || 0), 0);
    const globalStars = globalRepos.reduce((s: number, r: any) => s + (r.stars || 0), 0);
    const patentDatasets = inpi.length;
    const employmentDatasets = rais.length;
    const tech_density = totalRepos + patentDatasets;
    const papersCount = knowledge_total_papers || 0;

    // ─────────────────────────────────────────────────────────────────
    // TRL — Technology Readiness Level (adaptado para dados públicos BR)
    // Referência: NASA TRL / EMBRAPII / ISO 16290:2013
    // Dados abertos permitem distinguir 3 faixas, não 9 níveis.
    // ─────────────────────────────────────────────────────────────────

    const hasScientificBase = papersCount > 0;

    const hasStructuredPatents = ipcCodes.length > 0;
    const hasRepoTraction = totalStars > 50;
    const hasHighRepoTraction = totalStars > 500;
    const hasMeaningfulRepos = totalRepos >= 3;
    const hasInnovationFunding = embrapii.length > 0 && embrapii.some((d: any) =>
      d.title?.toLowerCase().includes(query.toLowerCase().split(" ")[0])
    );
    const hasPublicContracts = (knowledge_papers || 0) > 0;
    const hasEmploymentSignal = employmentDatasets > 0 && rais.some((d: any) =>
      d.title?.toLowerCase().includes(query.toLowerCase().split(" ")[0])
    );

    let trl_estimate: number;
    let trl_label: string;
    let trl_confidence: "high" | "medium" | "low";
    let trl_faixa: 1 | 2 | 3;
    let trl_rationale: string;

    if (hasHighRepoTraction && hasEmploymentSignal) {
      trl_estimate = 8;
      trl_label = "Demonstração / Mercado (TRL 7–9)";
      trl_faixa = 3;
      trl_confidence = "medium";
      trl_rationale = `Alta tração open source (${totalStars} stars) + emprego formal identificado`;
    } else if (hasHighRepoTraction || (hasMeaningfulRepos && hasEmploymentSignal)) {
      trl_estimate = 7;
      trl_label = "Demonstração / Mercado (TRL 7–9)";
      trl_faixa = 3;
      trl_confidence = "low";
      trl_rationale = hasHighRepoTraction
        ? `Tração open source alta (${totalStars} stars) — mercado em formação`
        : `Repos + emprego formal — aplicação emergindo`;
    } else if (hasStructuredPatents && (hasRepoTraction || hasMeaningfulRepos)) {
      trl_estimate = 6;
      trl_label = "Desenvolvimento / Validação (TRL 4–6)";
      trl_faixa = 2;
      trl_confidence = "medium";
      trl_rationale = `Patentes IPC identificadas (${ipcCodes.length}) + código aberto com tração`;
    } else if (hasStructuredPatents || (hasRepoTraction && hasScientificBase)) {
      trl_estimate = 5;
      trl_label = "Desenvolvimento / Validação (TRL 4–6)";
      trl_faixa = 2;
      trl_confidence = "medium";
      trl_rationale = hasStructuredPatents
        ? `Patentes identificadas via IPC (${ipcCodes.length} códigos) — campo em P&D aplicado`
        : `Repos com tração (${totalStars} stars) + ${papersCount} papers científicos`;
    } else if (hasInnovationFunding || (hasMeaningfulRepos && hasScientificBase)) {
      trl_estimate = 4;
      trl_label = "Desenvolvimento / Validação (TRL 4–6)";
      trl_faixa = 2;
      trl_confidence = "low";
      trl_rationale = hasInnovationFunding
        ? "Financiamento de inovação (Embrapii/Finep) identificado"
        : `${totalRepos} repos + base científica — prototipagem em curso`;
    } else if (hasScientificBase) {
      trl_estimate = 3;
      trl_label = "Pesquisa Básica (TRL 1–3)";
      trl_faixa = 1;
      trl_confidence = papersCount > 100 ? "high" : "medium";
      trl_rationale = `${papersCount} papers científicos — campo em fase de pesquisa básica`;
    } else {
      trl_estimate = 1;
      trl_label = "Pesquisa Básica (TRL 1–3)";
      trl_faixa = 1;
      trl_confidence = "low";
      trl_rationale = "Dados insuficientes para classificação — campo muito específico ou emergente";
    }

    const signals = {
      has_papers: hasScientificBase,
      has_repos: hasMeaningfulRepos,
      has_patents: hasStructuredPatents,
      has_employment: hasEmploymentSignal,
      high_stars: hasHighRepoTraction,
      has_innovation_funding: hasInnovationFunding,
    };

    const science_to_patent = hasStructuredPatents && papersCount > 0
      ? Math.round(papersCount / Math.max(ipcCodes.length, 1))
      : null;

    const languageDistribution: Record<string, number> = {};
    for (const r of github) {
      if (r.language) languageDistribution[r.language] = (languageDistribution[r.language] || 0) + 1;
    }

    const sources: string[] = [];
    if (github.length > 0) sources.push("GitHub");
    if (inpi.length > 0) sources.push("INPI/dados.gov");
    if (rais.length > 0) sources.push("RAIS/CAGED");
    if (embrapii.length > 0) sources.push("Embrapii/Finep");
    if (cnpj_qsa.length > 0) sources.push("CNPJ/QSA");
    if (transportes.length > 0) sources.push("Transportes");
    if (anvisa.length > 0) sources.push("ANVISA");

    // Novo CAGED — série nacional (IPEAData), sem dependência de API key
    let cagedData = null;
    try {
      cagedData = await fetchCaged(cbosFromOntology, query);
      if (cagedData) console.log(`CAGED: saldo 12m ${cagedData.nacional?.total_saldo}`);
    } catch (e) {
      console.warn("CAGED falhou:", e instanceof Error ? e.message : e);
    }

    if (cagedData) sources.push("Novo CAGED/MTE");

    return new Response(JSON.stringify({
      github_repos: github,
      caged_data: cagedData,
      cbo_codes_used: cbosFromOntology,
      github_global_repos: globalRepos, patent_datasets: inpi, employment_datasets: rais,
      innovation_datasets: embrapii, cnpj_qsa_datasets: cnpj_qsa,
      transport_datasets: transportes, anvisa_datasets: anvisa,
      tech_density, trl_estimate, trl_label, trl_faixa, trl_confidence, trl_rationale,
      trl_signals: signals, science_to_patent, language_distribution: languageDistribution,
      total_stars: totalStars, global_total_stars: globalStars,
      ipc_codes: ipcCodes, search_terms_used: searchTerms,
      sources, processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Layer Technology error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

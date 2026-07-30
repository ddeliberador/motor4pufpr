import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeFetch(url: string, options?: RequestInit, ms = 20000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...options });
    if (!res.ok) { console.warn(`safeFetch ${res.status}: ${url}`); return null; }
    return await res.json();
  } catch (e) { console.warn(`safeFetch err: ${e instanceof Error ? e.message : e}`); return null; }
  finally { clearTimeout(t); }
}

const MISSOES_NIB = [
  { id: 1, nome: "Saúde", cnaes: ["21","32"], icone: "🏥", meta: "R$ 60bi", descricao: "Complexo industrial da saúde, fármacos, equipamentos médicos" },
  { id: 2, nome: "Defesa e Segurança", cnaes: ["30","25"], icone: "🛡️", meta: "R$ 40bi", descricao: "Indústria de defesa, sistemas embarcados, aeroespacial" },
  { id: 3, nome: "Infraestrutura", cnaes: ["41","42","43"], icone: "🏗️", meta: "R$ 60bi", descricao: "Construção, mobilidade, saneamento, telecomunicações" },
  { id: 4, nome: "Energia Limpa", cnaes: ["35","27"], icone: "⚡", meta: "R$ 55bi", descricao: "Eólica, solar, hidrogênio verde, baterias, biocombustíveis" },
  { id: 5, nome: "Agronegócio Digital", cnaes: ["10","11","01"], icone: "🌱", meta: "R$ 45bi", descricao: "Bioeconomia, agricultura de precisão, alimentos funcionais" },
  { id: 6, nome: "Bioeconomia", cnaes: ["20","21","72"], icone: "🧬", meta: "R$ 40bi", descricao: "Produtos da biodiversidade, insumos biológicos, biotecnologia" },
];

const EIXOS_PBIA = [
  { id: 1, nome: "Infraestrutura de Dados e Computação", icone: "🖥️", valor: "R$ 4,5bi", descricao: "Datacenters, supercomputadores (Santos Dumont/LNCC), redes de alta velocidade." },
  { id: 2, nome: "Formação de Capital Humano", icone: "🎓", valor: "R$ 3,2bi", descricao: "Bolsas de IA, residências tecnológicas, capacitação MCTI/CAPES." },
  { id: 3, nome: "Marco Regulatório", icone: "⚖️", valor: "—", descricao: "PL 2338/2023 em tramitação no Senado. Transparência, responsabilidade, direitos fundamentais." },
  { id: 4, nome: "Aplicações Estratégicas", icone: "🎯", valor: "R$ 8bi", descricao: "IA em saúde, educação, segurança pública, agricultura e setor produtivo." },
  { id: 5, nome: "Bioeconomia e Ambiente", icone: "🌿", valor: "R$ 3bi", descricao: "IA aplicada à biodiversidade, monitoramento ambiental, Amazônia Legal." },
  { id: 6, nome: "Indústria e Inovação", icone: "🏭", valor: "R$ 4,3bi", descricao: "IA para manufatura avançada, automação, integração com Nova Indústria Brasil." },
];

const INST_FOMENTO = [
  { sigla: "CNPq", nome: "Conselho Nacional de Desenvolvimento Científico e Tecnológico", url: "https://www.gov.br/cnpq", orgao: "24202" },
  { sigla: "CAPES", nome: "Coordenação de Aperfeiçoamento de Pessoal de Nível Superior", url: "https://www.gov.br/capes", orgao: "26101" },
  { sigla: "FINEP", nome: "Financiadora de Estudos e Projetos", url: "https://www.finep.gov.br", orgao: "24105" },
  { sigla: "BNDES", nome: "Banco Nacional de Desenvolvimento Econômico e Social", url: "https://www.bndes.gov.br", orgao: null },
  { sigla: "EMBRAPII", nome: "Empresa Brasileira de Pesquisa e Inovação Industrial", url: "https://embrapii.org.br", orgao: null },
];

function isIndustrial(query: string, cnaes: string[]): boolean {
  const ind = ["industria","industrial","manufatura","fabricacao","producao","fabrica","metalurgia","quimica","farmaceutico","automotivo","eletronico","maquina","componente","semiconductor","semicondutor"];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if (ind.some(k => q.includes(k))) return true;
  const divs = cnaes.map(c => parseInt(c.replace(/\D/g,"").slice(0,2)));
  return divs.some(n => n >= 10 && n <= 33);
}

function isIA(query: string): boolean {
  const terms = ["inteligencia artificial","machine learning","deep learning","llm","gpt","nlp","visao computacional","aprendizado de maquina","chatbot","generativa","transformer","bert","redes neurais"];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return terms.some(t => q.includes(t.normalize("NFD").replace(/[\u0300-\u036f]/g,"")));
}

async function fetchNovaIndustria(query: string, cnaeCodes: string[], transp: string) {
  const cnae2 = cnaeCodes.map(c => c.replace(/\D/g,"").slice(0,2));
  const relevantes = MISSOES_NIB.filter(m => m.cnaes.some(mc => cnae2.includes(mc)));

  let execucao: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    const data = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao?ano=2024&codigoFuncao=22&pagina=1`,
      { headers: h }, 25000
    );
    execucao = (Array.isArray(data) ? data : []).slice(0, 8).map((d: any) => ({
      orgao: d.orgao || d.orgaoSuperior || "",
      empenhado: Number(d.empenhado) || 0,
      pago: Number(d.pago) || 0,
    }));
  }

  const bndesRaw = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent("BNDES Nova Industria Brasil operacoes credito")}&rows=5`
  );
  const bndesSets = (bndesRaw?.result?.results || []).map((p: any) => ({
    titulo: p.title || "", url: `https://dados.gov.br/dados/conjuntos-dados/${p.name}`,
  }));

  const supra = await safeFetch(`https://apisidra.ibge.gov.br/values/t/1744/n1/all/v/allxp/p/last%201`);
  const pia = Array.isArray(supra) ? supra.slice(1,8).map((r: any) => ({
    atividade: r.D2N||"", valor: r.V||"", unidade: r.MN||"",
  })).filter((r: any) => r.valor && r.valor !== "...") : [];

  return {
    disponivel: true, missoes: MISSOES_NIB, missoes_relevantes: relevantes.map(m => m.id),
    execucao_orcamentaria: execucao, bndes_datasets: bndesSets, pia_pessoal: pia,
    meta_total: "R$ 300 bilhões", prazo: "2024–2026",
    fonte_oficial: "https://www.gov.br/mdic/pt-br/assuntos/nova-industria-brasil",
    sources: ["MDIC/Transparência","BNDES/dados.gov.br","PIA/IBGE"],
  };
}

async function fetchPbia(query: string, transp: string) {
  let mctiExec: any[] = [];
  let conveniosTI: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    const execData = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao?ano=2024&codigoOrgaoSuperior=24000&pagina=1`,
      { headers: h }, 25000
    );
    mctiExec = (Array.isArray(execData) ? execData : []).slice(0,8).map((d: any) => ({
      orgao: d.orgao||"", empenhado: Number(d.empenhado)||0, pago: Number(d.pago)||0,
    }));

    const now = new Date();
    const df = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    const convData = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/convenios?dataInicial=01%2F01%2F2024&dataFinal=${encodeURIComponent(df)}&pagina=1&tamanhoPagina=100`,
      { headers: h }, 25000
    );
    const norm = (s: string) => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const aiTerms = ["inteligencia artificial","machine learning","ia ","algoritmo","dados","computacao","neural","visao computacional"];
    conveniosTI = (Array.isArray(convData) ? convData : [])
      .filter((c: any) => aiTerms.some(t => norm(c?.dimConvenio?.objeto||"").includes(t)))
      .slice(0,8)
      .map((c: any) => ({
        objeto: (c?.dimConvenio?.objeto||"").slice(0,200),
        convenente: c?.convenente?.nome||"",
        valor: c?.valor||0,
        uf: c?.municipioConvenente?.uf?.sigla||"",
      }));
  }

  return {
    disponivel: true, eixos: EIXOS_PBIA, meta_total: "R$ 23 bilhões", prazo: "2024–2028",
    convenios_ti: conveniosTI, mcti_execucao: mctiExec,
    regulacao: { pl: "PL 2338/2023", status: "Em tramitação no Senado Federal", url: "https://www25.senado.leg.br/web/atividade/materias/-/materia/157233" },
    infraestrutura: { nome: "Santos Dumont (LNCC)", capacidade: "5,1 petaflops", localizacao: "Petrópolis/RJ", url: "https://sdumont.lncc.br" },
    fonte_oficial: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/noticias/2024/08/brasil-lanca-plano-de-ia-com-investimento-de-r-23-bilhoes",
    sources: ["MCTI/Transparência","PBIA/MCTI"],
  };
}

async function fetchFomento(query: string, transp: string) {
  const execByOrg: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    for (const inst of INST_FOMENTO.filter(i => i.orgao)) {
      const data = await safeFetch(
        `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao?ano=2024&codigoOrgaoSuperior=${inst.orgao}&pagina=1`,
        { headers: h }, 20000
      );
      const rows = Array.isArray(data) ? data : [];
      const total = rows.reduce((s: number, d: any) => s + (Number(d.pago)||0), 0);
      execByOrg.push({ sigla: inst.sigla, nome: inst.nome, url: inst.url, pago_2024: total });
    }
  }

  let conveniosFomento: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    const now = new Date();
    const df = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    const data = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/convenios?dataInicial=01%2F01%2F2023&dataFinal=${encodeURIComponent(df)}&pagina=1&tamanhoPagina=100`,
      { headers: h }, 25000
    );
    const norm = (s: string) => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const terms = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/\s+/).filter(w => w.length > 3);
    const fomentOrgs = ["cnpq","capes","finep","mcti","mec","embrapii","ciencia","tecnologia","inovacao","pesquisa"];
    conveniosFomento = (Array.isArray(data) ? data : [])
      .filter((c: any) => {
        const hay = norm(`${c?.dimConvenio?.objeto||""} ${c?.orgao?.orgaoMaximo?.nome||""}`);
        const isFom = fomentOrgs.some(ag => hay.includes(ag));
        const matchTema = terms.length === 0 || terms.some(t => hay.includes(t));
        return isFom && matchTema;
      })
      .slice(0,10)
      .map((c: any) => ({
        objeto: (c?.dimConvenio?.objeto||"").slice(0,200),
        concedente: c?.orgao?.orgaoMaximo?.nome||"",
        convenente: c?.convenente?.nome||"",
        valor: c?.valor||0,
        uf: c?.municipioConvenente?.uf?.sigla||"",
      }));
  }

  return {
    disponivel: true,
    instituicoes: INST_FOMENTO,
    execucao_2024: execByOrg,
    convenios_fomento: conveniosFomento,
    links_uteis: [
      { nome: "Chamadas CNPq abertas", url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/editais" },
      { nome: "Editais FINEP", url: "https://www.finep.gov.br/chamadas-publicas" },
      { nome: "Bolsas CAPES", url: "https://www.gov.br/capes/pt-br/acesso-a-informacao/acoes-e-programas" },
      { nome: "EMBRAPII dados abertos", url: "https://embrapii.org.br/dados-abertos" },
      { nome: "BNDES financiamento", url: "https://www.bndes.gov.br/wps/portal/site/home/financiamento" },
    ],
    sources: ["Portal da Transparência","CNPq","CAPES","FINEP","dados.gov.br"],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, cnae_codes } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const cnaeCodes: string[] = Array.isArray(cnae_codes) ? cnae_codes : [];
    const transp = Deno.env.get("TRANSPARENCIA_API_KEY") || "";
    const start = Date.now();
    const industrial = isIndustrial(query, cnaeCodes);
    const ia = isIA(query);

    const [novaIndustria, pbia, fomento] = await Promise.all([
      industrial ? fetchNovaIndustria(query, cnaeCodes, transp) : Promise.resolve({ disponivel: false }),
      ia ? fetchPbia(query, transp) : Promise.resolve({ disponivel: false }),
      fetchFomento(query, transp),
    ]);

    return new Response(JSON.stringify({
      nova_industria: novaIndustria, pbia, fomento,
      context: { industrial, ia },
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("layer-programs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

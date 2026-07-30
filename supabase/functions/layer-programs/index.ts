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
  } catch (e) {
    console.warn(`safeFetch err: ${e instanceof Error ? e.message : e}`);
    return null;
  } finally { clearTimeout(t); }
}

// ─── Nova Indústria Brasil ────────────────────────────────────────────────────
// Dados: execução orçamentária MDIC (função 22 Indústria) + BNDES operações + SIDRA PIA

async function fetchNovaIndustria(query: string, cnaeCodes: string[], transp: string) {
  const MISSOES = [
    { id: 1, nome: "Saúde", cnaes: ["21", "32"], icone: "🏥", meta: "R$ 60bi", descricao: "Complexo industrial da saúde, fármacos, equipamentos médicos" },
    { id: 2, nome: "Defesa e Segurança", cnaes: ["30", "25"], icone: "🛡️", meta: "R$ 40bi", descricao: "Indústria de defesa, sistemas embarcados, aeroespacial" },
    { id: 3, nome: "Infraestrutura", cnaes: ["41", "42", "43"], icone: "🏗️", meta: "R$ 60bi", descricao: "Construção, mobilidade urbana, saneamento, telecomunicações" },
    { id: 4, nome: "Energia Limpa", cnaes: ["35", "27"], icone: "⚡", meta: "R$ 55bi", descricao: "Eólica, solar, hidrogênio verde, baterias, biocombustíveis" },
    { id: 5, nome: "Agronegócio Digital", cnaes: ["10", "11", "01"], icone: "🌱", meta: "R$ 45bi", descricao: "Bioeconomia, agricultura de precisão, alimentos funcionais" },
    { id: 6, nome: "Bioeconomia", cnaes: ["20", "21", "72"], icone: "🧬", meta: "R$ 40bi", descricao: "Produtos da biodiversidade, insumos biológicos, biotecnologia" },
  ];

  // Identifica missões relevantes para o tema
  const cnae2 = cnaeCodes.map(c => c.replace(/\D/g, "").slice(0, 2));
  const relevantes = MISSOES.filter(m => m.cnaes.some(mc => cnae2.includes(mc)));
  const missoesFinal = relevantes.length > 0 ? relevantes : MISSOES;

  // Execução orçamentária MDIC — função 22 (Indústria)
  let execucao: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    const data = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao?ano=2024&codigoFuncao=22&pagina=1`,
      { headers: h }, 25000
    );
    execucao = (Array.isArray(data) ? data : []).slice(0, 10).map((d: any) => ({
      orgao: d.orgao || d.orgaoSuperior || "",
      empenhado: d.empenhado || 0,
      liquidado: d.liquidado || 0,
      pago: d.pago || 0,
    }));
  }

  // BNDES — datasets públicos no dados.gov.br
  const bndesData = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent("BNDES Nova Indústria Brasil operações crédito")}&rows=6`
  );
  const bndesSets = (bndesData?.result?.results || []).map((p: any) => ({
    titulo: p.title || "",
    descricao: (p.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${p.name}`,
    org: p.organization?.title || "",
  }));

  // SIDRA PIA — pessoal ocupado na indústria (tabela 1744)
  const supra = await safeFetch(`https://apisidra.ibge.gov.br/values/t/1744/n1/all/v/allxp/p/last%201`);
  const piaRows = Array.isArray(supra) ? supra.slice(1, 8).map((r: any) => ({
    atividade: r.D2N || "",
    valor: r.V || "",
    unidade: r.MN || "",
  })).filter((r: any) => r.valor && r.valor !== "...") : [];

  return {
    disponivel: true,
    missoes: missoesFinal,
    missoes_relevantes: relevantes.map(m => m.id),
    execucao_orcamentaria: execucao,
    bndes_datasets: bndesSets,
    pia_pessoal: piaRows,
    meta_total: "R$ 300 bilhões",
    prazo: "2024–2026",
    fonte_oficial: "https://www.gov.br/mdic/pt-br/assuntos/nova-industria-brasil",
    sources: ["MDIC/Transparência", "BNDES/dados.gov.br", "PIA/IBGE"],
  };
}

// ─── PBIA — Plano Brasileiro de Inteligência Artificial ──────────────────────
async function fetchPbia(query: string, transp: string) {
  const EIXOS = [
    { id: 1, nome: "Infraestrutura de Dados e Computação", icone: "🖥️", valor: "R$ 4,5bi", descricao: "Datacenters, supercomputadores, redes de alta velocidade. LNCC/Santos Dumont." },
    { id: 2, nome: "Formação de Capital Humano", icone: "🎓", valor: "R$ 3,2bi", descricao: "Bolsas de IA, residências tecnológicas, programas de capacitação MCTI/CAPES." },
    { id: 3, nome: "Marco Regulatório", icone: "⚖️", valor: "—", descricao: "PL 2338/2023 em tramitação. Princípios: transparência, responsabilidade, direitos fundamentais." },
    { id: 4, nome: "Aplicações Estratégicas", icone: "🎯", valor: "R$ 8bi", descricao: "IA em saúde, educação, segurança pública, agricultura e setor produtivo." },
    { id: 5, nome: "Bioeconomia e Ambiente", icone: "🌿", valor: "R$ 3bi", descricao: "IA aplicada à biodiversidade, monitoramento ambiental, Amazônia Legal." },
    { id: 6, nome: "Indústria e Inovação", icone: "🏭", valor: "R$ 4,3bi", descricao: "IA para manufatura avançada, automação, integração com Nova Indústria Brasil." },
  ];

  // Execução MCTI — Função 19 (Ciência e Tecnologia), órgão 24000
  let mctiExec: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    const data = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao?ano=2024&codigoOrgaoSuperior=24000&pagina=1`,
      { headers: h }, 25000
    );
    mctiExec = (Array.isArray(data) ? data : []).slice(0, 8).map((d: any) => ({
      orgao: d.orgao || "",
      empenhado: d.empenhado || 0,
      pago: d.pago || 0,
    }));
  }

  // Convênios MCTI relacionados à IA
  let conveniosTI: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    const now = new Date();
    const di = `01/01/2024`;
    const df = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    const data = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/convenios?dataInicial=${encodeURIComponent(di)}&dataFinal=${encodeURIComponent(df)}&pagina=1&tamanhoPagina=100`,
      { headers: h }, 25000
    );
    const norm = (s: string) => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const terms = ["inteligencia artificial","machine learning","aprendizado de maquina","ia","nlp","visao computacional","dados","algoritmo"].map(norm);
    conveniosTI = (Array.isArray(data) ? data : [])
      .filter((c: any) => {
        const hay = norm(`${c?.dimConvenio?.objeto||""} ${c?.subfuncao?.descricaoSubfuncap||""}`);
        return terms.some(t => hay.includes(t));
      })
      .slice(0, 8)
      .map((c: any) => ({
        objeto: (c?.dimConvenio?.objeto||"").slice(0,200),
        convenente: c?.convenente?.nome||"",
        valor: c?.valor||0,
        uf: c?.municipioConvenente?.uf?.sigla||"",
      }));
  }

  // Datasets MCTI no dados.gov.br
  const mctiDs = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent("inteligência artificial MCTI PBIA computação")}&rows=6`
  );
  const mctSets = (mctiDs?.result?.results || []).map((p: any) => ({
    titulo: p.title || "",
    url: `https://dados.gov.br/dados/conjuntos-dados/${p.name}`,
  }));

  return {
    disponivel: true,
    eixos: EIXOS,
    meta_total: "R$ 23 bilhões",
    prazo: "2024–2028",
    convenios_ti: conveniosTI,
    mcti_execucao: mctiExec,
    datasets: mctSets,
    regulacao: {
      pl: "PL 2338/2023",
      status: "Em tramitação no Senado Federal",
      url: "https://www25.senado.leg.br/web/atividade/materias/-/materia/157233",
    },
    infraestrutura: {
      nome: "Santos Dumont (LNCC)",
      capacidade: "5,1 petaflops",
      localizacao: "Petrópolis/RJ",
      url: "https://sdumont.lncc.br",
    },
    fonte_oficial: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/noticias/2024/08/brasil-lanca-plano-de-ia-com-investimento-de-r-23-bilhoes",
    sources: ["MCTI/Transparência", "PBIA/MCTI", "dados.gov.br"],
  };
}

// ─── Fomento à Pesquisa ───────────────────────────────────────────────────────
async function fetchFomento(query: string, transp: string) {
  const INST = [
    { sigla: "CNPq", nome: "Conselho Nacional de Desenvolvimento Científico e Tecnológico", url: "https://www.gov.br/cnpq", orgao: "24202" },
    { sigla: "CAPES", nome: "Coordenação de Aperfeiçoamento de Pessoal de Nível Superior", url: "https://www.gov.br/capes", orgao: "26101" },
    { sigla: "FINEP", nome: "Financiadora de Estudos e Projetos", url: "https://www.finep.gov.br", orgao: "24105" },
    { sigla: "BNDES", nome: "Banco Nacional de Desenvolvimento Econômico e Social", url: "https://www.bndes.gov.br", orgao: null },
    { sigla: "EMBRAPII", nome: "Empresa Brasileira de Pesquisa e Inovação Industrial", url: "https://embrapii.org.br", orgao: null },
  ];

  // Execução por órgão de fomento — Transparência
  const execByOrg: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    for (const inst of INST.filter(i => i.orgao)) {
      const data = await safeFetch(
        `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/por-orgao?ano=2024&codigoOrgaoSuperior=${inst.orgao}&pagina=1`,
        { headers: h }, 20000
      );
      const rows = Array.isArray(data) ? data : [];
      const total = rows.reduce((s: number, d: any) => s + (Number(d.pago) || 0), 0);
      if (total > 0 || rows.length > 0) {
        execByOrg.push({
          sigla: inst.sigla,
          nome: inst.nome,
          url: inst.url,
          pago_2024: total,
          orgao: inst.orgao,
        });
      }
    }
  }

  // Convênios relacionados ao tema — todos os órgãos de fomento
  let conveniosFomento: any[] = [];
  if (transp) {
    const h = { "chave-api-dados": transp, "Accept": "application/json" };
    const now = new Date();
    const di = `01/01/2023`;
    const df = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
    const data = await safeFetch(
      `https://api.portaldatransparencia.gov.br/api-de-dados/convenios?dataInicial=${encodeURIComponent(di)}&dataFinal=${encodeURIComponent(df)}&pagina=1&tamanhoPagina=100`,
      { headers: h }, 25000
    );
    const norm = (s: string) => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const terms = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").split(/\s+/).filter(w => w.length > 3);
    conveniosFomento = (Array.isArray(data) ? data : [])
      .filter((c: any) => {
        const hay = norm(`${c?.dimConvenio?.objeto||""} ${c?.orgao?.orgaoMaximo?.nome||""}`);
        const isAgFomento = ["cnpq","capes","finep","mcti","mec","embrapii"].some(ag => hay.includes(ag));
        const matchTema = terms.length === 0 || terms.some(t => hay.includes(t));
        return isAgFomento && matchTema;
      })
      .slice(0, 12)
      .map((c: any) => ({
        objeto: (c?.dimConvenio?.objeto||"").slice(0,200),
        concedente: c?.orgao?.orgaoMaximo?.nome||"",
        convenente: c?.convenente?.nome||"",
        valor: c?.valor||0,
        liberado: c?.valorLiberado||0,
        uf: c?.municipioConvenente?.uf?.sigla||"",
        situacao: c?.situacao||"",
      }));
  }

  // Datasets de fomento no dados.gov.br
  const fomentoDsRaw = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent(query + " CNPq FINEP fomento bolsa pesquisa")}&rows=8`
  );
  const fomentoDs = (fomentoDsRaw?.result?.results || []).map((p: any) => ({
    titulo: p.title || "",
    org: p.organization?.title || "",
    url: `https://dados.gov.br/dados/conjuntos-dados/${p.name}`,
  }));

  // Editais abertos — FINEP
  const finepDs = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent("FINEP edital chamada pública inovação")}&rows=4`
  );
  const finepSets = (finepDs?.result?.results || []).map((p: any) => ({
    titulo: p.title || "",
    url: `https://dados.gov.br/dados/conjuntos-dados/${p.name}`,
  }));

  return {
    disponivel: true,
    instituicoes: INST,
    execucao_2024: execByOrg,
    convenios_fomento: conveniosFomento,
    datasets_fomento: fomentoDs,
    finep_editais: finepSets,
    links_uteis: [
      { nome: "Chamadas CNPq abertas", url: "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/editais" },
      { nome: "Editais FINEP", url: "https://www.finep.gov.br/chamadas-publicas" },
      { nome: "Bolsas CAPES", url: "https://www.gov.br/capes/pt-br/acesso-a-informacao/acoes-e-programas" },
      { nome: "EMBRAPII dados abertos", url: "https://embrapii.org.br/dados-abertos" },
      { nome: "BNDES produtos de apoio", url: "https://www.bndes.gov.br/wps/portal/site/home/financiamento" },
    ],
    sources: ["Portal da Transparência", "CNPq", "CAPES", "FINEP", "dados.gov.br"],
  };
}

// ─── Detectores de contexto ───────────────────────────────────────────────────
function isIndustrial(query: string, cnaes: string[]): boolean {
  const ind = ["industria","industrial","manufatura","fabricacao","producao","fabrica","metalurgia","quimica","farmaceutico","automotivo","eletronico","maquina","componente"];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if (ind.some(k => q.includes(k))) return true;
  const cnaeDivs = cnaes.map(c => c.replace(/\D/g,"").slice(0,2));
  // CNAE divisões industriais: 10-33
  return cnaeDivs.some(d => { const n = parseInt(d); return n >= 10 && n <= 33; });
}

function isIA(query: string): boolean {
  const terms = ["inteligencia artificial","ia","machine learning","deep learning","llm","gpt","nlp","visao computacional","reconhecimento","algoritmo","modelo linguistico","aprendizado de maquina","chatbot","generativa"];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return terms.some(t => q.includes(t.normalize("NFD").replace(/[\u0300-\u036f]/g,"")));
}

// ─── Orquestrador ─────────────────────────────────────────────────────────────
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
      nova_industria: novaIndustria,
      pbia,
      fomento,
      context: { industrial, ia },
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-programs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

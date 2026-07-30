import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeFetch(url: string, options?: RequestInit, timeoutMs = 15000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, ...options });
    if (!res.ok) { console.warn(`${res.status}: ${url}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`fetch error: ${e instanceof Error ? e.message : e}`);
    return null;
  } finally { clearTimeout(t); }
}

// Políticas de inovação mapeadas — base estática curada
function getPolticasCuradas() {
  return {
    federal: [
      {
        sigla: "NIB",
        nome: "Nova Indústria Brasil",
        tipo: "Política industrial federal",
        orgao: "MDIC · Ministério do Desenvolvimento, Indústria, Comércio e Serviços",
        vigencia: "2024–2033",
        descricao: "Política industrial lançada em janeiro de 2024 com R$ 300 bilhões previstos para financiamento. Seis missões setoriais: saúde, transição energética, transformação digital, agropecuária, bioeconomia e defesa. Editais Finep de R$ 2,1 bilhões para P&D em ICTs.",
        relevancia: { pesquisador: "Editais Finep e BNDES para P&D em temas prioritários", universidade: "Missões setoriais orientam pesquisa aplicada e parcerias ICT-empresa", empresa: "R$ 300bi em crédito e subvenção para inovação industrial", governo: "Compras públicas como instrumento de política tecnológica" },
        url: "https://www.gov.br/mdic/pt-br/assuntos/nova-industria-brasil",
        instrumento: "Decreto + Resolução CNDI",
      },
      {
        sigla: "PBIA",
        nome: "Plano Brasileiro de Inteligência Artificial",
        tipo: "Plano nacional",
        orgao: "MCTI · Ministério da Ciência, Tecnologia e Inovação",
        vigencia: "2024–2028",
        descricao: "R$ 23 bilhões previstos até 2028. Foco em infraestrutura computacional, capacitação de profissionais, IA aplicada ao setor público e desenvolvimento soberano de tecnologia nacional. Ações de impacto imediato e ações estruturantes.",
        relevancia: { pesquisador: "Bolsas e editais para pesquisa em IA e suas aplicações setoriais", universidade: "Laboratórios e grupos de pesquisa em IA como âncoras de ecossistema", empresa: "Startups de IA com acesso preferencial a crédito e compras públicas", governo: "IA como instrumento de modernização e governo digital" },
        url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/noticias/2025/06/plano-brasileiro-de-inteligencia-artificial-pbia",
        instrumento: "Resolução CCT",
      },
      {
        sigla: "MLCTI",
        nome: "Marco Legal de CT&I",
        tipo: "Marco legal",
        orgao: "MCTI · CNPq · CAPES · FINEP",
        vigencia: "2004–vigente (Lei 10.973 + Lei 13.243/2016 + Dec. 9.283/2018)",
        descricao: "Base jurídica das parcerias ICT-empresa no Brasil. Regulamenta transferência de tecnologia, uso de laboratórios públicos por empresas, participação de pesquisadores em startups, encomenda tecnológica e convênios. Decreto 9.283/2018 detalha os instrumentos.",
        relevancia: { pesquisador: "Ampara bolsas DTI, participação em empresas derivadas e royalties de PI", universidade: "Habilita NIT, TIB, contrato de parceria e licenciamento", empresa: "Acesso a infraestrutura pública de pesquisa e pesquisadores", governo: "Encomenda tecnológica e poder de compra para inovação" },
        url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/legislacao/leis/lei-n-10-973-de-2-de-dezembro-de-2004",
        instrumento: "Lei federal + Decreto regulamentador",
      },
      {
        sigla: "LGP",
        nome: "Nova Lei Geral da Gestão Pública",
        tipo: "Marco legal municipal/federal",
        orgao: "Ministério da Gestão e Inovação em Serviços Públicos",
        vigencia: "2025–vigente (Lei 5.874/2025, em vigor 2026)",
        descricao: "Maior transformação da administração municipal em décadas. Contratos de até R$ 200 mil para soluções tecnológicas por dispensa de licitação. Digitalização obrigatória de processos e metas mensuráveis por secretaria. Permite consórcios intermunicipais para soluções de inovação.",
        relevancia: { pesquisador: "Facilita contratação de pesquisadores para projetos municipais", universidade: "Simplifica parcerias com prefeituras para extensão e pesquisa aplicada", empresa: "Dispensa de licitação para contratos de tecnologia até R$ 200k", governo: "Obrigatoriedade de digitalização e metas de desempenho por secretaria" },
        url: "https://www.gov.br/gestao/pt-br/noticias/2026",
        instrumento: "Lei federal",
      },
    ],
    estadual_sp: [
      {
        sigla: "PEDI-SP",
        nome: "Política Estadual de Distritos de Inovação — SP",
        tipo: "Decreto estadual",
        orgao: "Secretaria de Ciência, Tecnologia e Inovação — SP",
        vigencia: "2026–vigente (Decreto 70.683 de 16/06/2026)",
        descricao: "Institui distritos de inovação como áreas urbanas delimitadas com governança descentralizada. Exige mínimo de 2 organizações-âncora para reconhecimento formal. Cria o Conselho de Orientação com 13 membros e o Selo Paulista para Distritos de Inovação — credencial para acesso a venture capital e agências de fomento. Art. 5º: reconhecimento independe do estágio de maturidade.",
        relevancia: { pesquisador: "ICTs e universidades como âncoras elegíveis — amplia papel institucional", universidade: "Universidade como âncora obrigatória — abre novos fluxos de financiamento e parcerias", empresa: "Sede em distrito = acesso ao Selo Paulista e facilidade para VC e fomento", governo: "Instrumento territorial de política de inovação — integra planejamento urbano e CT&I" },
        url: "https://doe.sp.gov.br/",
        instrumento: "Decreto estadual (SP)",
        abrangencia: "Estado de São Paulo",
      },
      {
        sigla: "LC-1049",
        nome: "Lei Paulista de Inovação",
        tipo: "Lei complementar estadual",
        orgao: "Secretaria de Ciência, Tecnologia e Inovação — SP",
        vigencia: "2008–vigente (LC 1.049/2008)",
        descricao: "Dispõe sobre medidas de incentivo à inovação tecnológica, pesquisa científica, desenvolvimento tecnológico, engenharia não-rotineira e extensão tecnológica em ambiente produtivo no Estado de São Paulo.",
        relevancia: { pesquisador: "Incentivos fiscais e acesso a infraestrutura de pesquisa estadual", universidade: "Parceria com ambiente produtivo amparada em lei estadual", empresa: "Incentivos tributários para empresas inovadoras em SP", governo: "Base legal para programas estaduais de fomento à inovação" },
        url: "http://www.legislacao.sp.gov.br",
        instrumento: "Lei complementar",
        abrangencia: "Estado de São Paulo",
      },
    ],
    municipal: [
      {
        sigla: "LI-MSP",
        nome: "Lei de Inovação do Município de São Paulo",
        tipo: "Decreto municipal",
        orgao: "Prefeitura de São Paulo",
        vigencia: "Decreto 64.062 — vigente",
        descricao: "Regulamenta a aplicação da Lei Federal 10.973/2004 no município de São Paulo. Estabelece diretrizes para parcerias universidade-empresa-governo, fomento à pesquisa científica e desenvolvimento tecnológico na cidade.",
        relevancia: { pesquisador: "Ampara parcerias com USP, UNIFESP e outras IES municipais", universidade: "Base para convênios com a prefeitura de SP em P&D aplicado", empresa: "Facilita acesso a laboratórios e pesquisadores municipais", governo: "Modelo replicável para outros municípios regulamentarem a Lei Federal" },
        url: "https://www.abdi.com.br/decreto-regulamenta-lei-de-inovacao-na-cidade-de-sao-paulo/",
        instrumento: "Decreto municipal",
        abrangencia: "Município de São Paulo",
      },
    ],
  };
}

// Busca menções às políticas no Querido Diário
async function fetchMencoesQueridoDiario(query: string, politica: string) {
  const searchQuery = `${politica} ${query}`.slice(0, 100);
  const data = await safeFetch(
    `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent(searchQuery)}&size=5&sort_by=relevance`
  );
  return (data?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "",
    state: g.state_code || "",
    date: g.date || "",
    excerpts: (g.excerpts || []).slice(0, 1),
    url: g.file_url || "",
  }));
}

// Busca editais relacionados no PNCP
async function fetchEditaisRelacionados(query: string) {
  const termos = ["inovação", "P&D", "pesquisa", "tecnologia", query.split(" ")[0]];
  const allResults: any[] = [];
  const seen = new Set<string>();

  for (const termo of termos.slice(0, 3)) {
    const data = await safeFetch(
      `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?tamanhoPagina=5&pagina=1&q=${encodeURIComponent(termo)}`
    );
    const items = Array.isArray(data) ? data : (data?.data || data?.content || []);
    for (const item of items) {
      const id = item.id || item.numeroCompra || item.objetoCompra?.slice(0, 30);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      allResults.push({
        objeto: (item.objetoCompra || item.objeto || "").slice(0, 200),
        orgao: item.orgaoEntidade?.razaoSocial || "",
        valor: item.valorTotalEstimado || 0,
        data: item.dataPublicacao || "",
        uf: item.unidadeOrgao?.ufSigla || "",
        url: item.linkSistemaOrigem || `https://pncp.gov.br/app/editais?q=${encodeURIComponent(termo)}`,
      });
    }
  }
  return allResults.slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, cnpq_areas } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    console.log(`Layer Policies: ${query}`);
    const start = Date.now();

    const politicas = getPolticasCuradas();

    // Busca em paralelo: menções no Querido Diário e editais no PNCP
    const [gazettesMencoes, editaisPNCP] = await Promise.all([
      fetchMencoesQueridoDiario(query, "inovação"),
      fetchEditaisRelacionados(query),
    ]);

    return new Response(JSON.stringify({
      politicas,
      gazettes_mencoes: gazettesMencoes,
      editais_inovacao: editaisPNCP,
      sources: ["Políticas públicas curadas", "Querido Diário", "PNCP"],
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-policies error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

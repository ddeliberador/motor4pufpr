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

/** Detecta se o tema pesquisado tem relação com data center / infraestrutura digital. */
function isTemaDataCenter(query: string): boolean {
  const q = (query || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const termos = [
    "data center", "datacenter", "centro de dados", "nuvem", "cloud", "computacao em nuvem",
    "infraestrutura digital", "hiperescala", "hyperscale", "colocation", "hospedagem de dados",
    "supercomputador", "computacao de alto desempenho", "hpc", "gpu", "inteligencia artificial",
    "soberania digital", "armazenamento de dados", "servidor", "redata",
  ];
  return termos.some((t) => q.includes(t));
}

/** ReData — só entra quando o tema pesquisado é de data center/infraestrutura digital. */
function getReDataEntry() {
  return {
    sigla: "REDATA",
    nome: "ReData — Regime Especial de Tributação para Serviços de Data Center",
    tipo: "Incentivo fiscal federal",
    orgao: "MDIC · MCTI · Ministério da Fazenda · Receita Federal",
    vigencia: "2026 — Medida Provisória nº 1.318/2026 (em tramitação no Congresso)",
    descricao:
      "Regime especial que suspende/desonera tributos federais (PIS/Pasep, Cofins, IPI, Imposto de Importação) na aquisição de bens e serviços destinados à implantação e operação de data centers no Brasil, dentro da Política Nacional de Data Centers. Requisitos declarados: uso exclusivo de energia elétrica de fontes limpas/renováveis; cumprimento de patamar mínimo de eficiência no uso de água; destinação de pelo menos 10% da capacidade computacional ao mercado interno brasileiro (ou investimento equivalente em P&D no país); aplicação de 2% do valor dos bens adquiridos com o benefício em pesquisa, desenvolvimento e inovação no Brasil. Projetos instalados nas regiões Norte, Nordeste e Centro-Oeste têm condições e benefícios adicionais, como instrumento de desconcentração regional da infraestrutura digital.",
    relevancia: {
      pesquisador:
        "Os 2% obrigatórios em P&D e a contrapartida de capacidade computacional criam demanda concreta por parceria com ICTs — inclusive acesso a GPU para pesquisa.",
      universidade:
        "ICTs podem ser receptoras dos investimentos obrigatórios em P&D e dos 10% de capacidade destinada ao mercado interno — caminho para computação de alto desempenho sem investimento próprio.",
      empresa:
        "Desoneração de tributos federais na compra de equipamentos de data center, condicionada a energia limpa, eficiência hídrica, 10% de capacidade ao mercado interno e 2% em P&D.",
      governo:
        "Instrumento de política industrial para atrair infraestrutura digital com contrapartidas ambientais, de soberania de dados e de desconcentração regional (N/NE/CO).",
    },
    url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/mpv/mpv1318.htm",
    instrumento: "Medida Provisória nº 1.318/2026 · Política Nacional de Data Centers",
    condicional: "Exibido porque o tema pesquisado tem relação com data center / infraestrutura digital.",
    links_diretos: [
      { label: "Texto oficial da MP 1.318/2026 — Planalto", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/mpv/mpv1318.htm" },
      { label: "Diário Oficial da União — publicação da MP", url: "https://www.in.gov.br/consulta/-/buscar/dou?q=%22Medida+Provis%C3%B3ria+n%C2%BA+1.318%22" },
      { label: "Tramitação no Congresso Nacional", url: "https://www.congressonacional.leg.br/materias/medidas-provisorias" },
      { label: "Política Nacional de Data Centers — MDIC", url: "https://www.gov.br/mdic/pt-br" },
    ],
  };
}

function getPoliticasCuradas() {
  return {
    federal: [
      {
        sigla: "NIB",
        nome: "Nova Indústria Brasil",
        tipo: "Política industrial federal",
        orgao: "MDIC · Ministério do Desenvolvimento, Indústria, Comércio e Serviços",
        vigencia: "2024–2033",
        descricao: "Política industrial com R$ 300 bilhões previstos. Seis missões setoriais: saúde, transição energética, transformação digital, agropecuária, bioeconomia e defesa. Editais Finep de R$ 2,1 bilhões para P&D em ICTs.",
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
        descricao: "R$ 23 bilhões previstos até 2028. Infraestrutura computacional, capacitação de profissionais, IA aplicada ao setor público e desenvolvimento soberano de tecnologia nacional.",
        relevancia: { pesquisador: "Bolsas e editais para pesquisa em IA e aplicações setoriais", universidade: "Labs e grupos de pesquisa em IA como âncoras do ecossistema", empresa: "Startups de IA com acesso preferencial a crédito e compras públicas", governo: "IA como instrumento de modernização e governo digital" },
        url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/noticias/2025/06/plano-brasileiro-de-inteligencia-artificial-pbia",
        instrumento: "Resolução CCT",
      },
      {
        sigla: "MLCTI",
        nome: "Marco Legal de CT&I",
        tipo: "Marco legal",
        orgao: "MCTI · CNPq · CAPES · FINEP",
        vigencia: "2004–vigente (Lei 10.973 + Lei 13.243/2016 + Dec. 9.283/2018)",
        descricao: "Base jurídica das parcerias ICT-empresa. Regulamenta TT, uso de laboratórios públicos por empresas, participação de pesquisadores em startups, encomenda tecnológica e convênios.",
        relevancia: { pesquisador: "Ampara bolsas DTI, participação em empresas derivadas e royalties de PI", universidade: "Habilita NIT, TIB, contrato de parceria e licenciamento", empresa: "Acesso a infraestrutura pública de pesquisa e pesquisadores", governo: "Encomenda tecnológica e poder de compra para inovação" },
        url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/legislacao/leis/lei-n-10-973-de-2-de-dezembro-de-2004",
        instrumento: "Lei federal + Decreto regulamentador",
      },
      {
        sigla: "LEI-BEM",
        nome: "Lei do Bem — Incentivos Fiscais a P&D",
        tipo: "Incentivo fiscal federal",
        orgao: "MCTI · Receita Federal do Brasil",
        vigencia: "2005–vigente (Lei 11.196/2005 · Cap. III · Dec. 5.798/2006)",
        descricao: "Principal instrumento público de estímulo às atividades de P&D nas empresas brasileiras. No ano-base 2024, 4.252 empresas foram beneficiadas com R$ 51,59 bilhões em P&D e renúncia fiscal estimada de R$ 11,98 bilhões. Automático — sem aprovação prévia. Exige Lucro Real e entrega do FORMP&D ao MCTI até 31/08 de cada ano. Setores líderes: software, mecânica, eletroeletrônico, química e alimentos.",
        relevancia: { pesquisador: "Empresas do setor que usam a Lei do Bem são potenciais financiadoras de P&D — identifique parceiros com projetos ativos", universidade: "ICTs podem atuar como parceiras em projetos de P&D das beneficiárias — via contrato de parceria do Marco Legal CT&I", empresa: "Deduza 60–80% dos gastos com P&D do IRPJ/CSLL. Qualquer setor, regime Lucro Real. Acesse o FORMP&D no portal MCTI", governo: "R$ 51,6bi/ano em P&D privado induzido por renúncia fiscal de R$ 11,98bi — principal alavanca de política industrial brasileira" },
        url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem",
        instrumento: "Lei 11.196/2005 · Cap. III + Dec. 5.798/2006",
        metricas: { empresas_2024: 4252, investimento_bi: 51.59, renuncia_bi: 11.98, projetos: 14000 },
        links_diretos: [
          { label: "Portal Lei do Bem — MCTI", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem" },
          { label: "Beneficiários por empresa (dados abertos)", url: "https://www.gov.br/mcti/pt-br/acesso-a-informacao/dados-abertos/dados-abertos/paginas/beneficiarios-dos-incentivos-fiscais-da-lei-do-bem" },
          { label: "FORMP&D — Formulário eletrônico", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem/paginas/formulario-eletronico-formp-d" },
          { label: "Relatórios estatísticos MCTI", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem/paginas/informacoes-estatisticas" },
        ],
      },
      {
        sigla: "LEI-INFO",
        nome: "Lei da Informática — Incentivos Fiscais TIC",
        tipo: "Incentivo fiscal federal + política industrial",
        orgao: "MCTI · SEPIN · MDIC",
        vigencia: "1991–2029 (Lei 8.248/1991 · Lei 13.969/2019 · Lei 14.968/2024)",
        descricao: "Redução de IPI para empresas de TIC que invistam em P&D no Brasil. Exige fabricação com PPB (Processo Produtivo Básico) e investimento mínimo de 5% do faturamento em P&D. Das obrigações, parcela mínima deve ser aplicada em convênios com ICTs credenciadas pelo MCTI. Vigente até 31/12/2029. Setores: informática, automação, telecomunicações, bens de TIC.",
        relevancia: { pesquisador: "ICTs credenciadas pelo MCTI recebem investimentos P&D obrigatórios das beneficiárias — identifique fluxos financeiros no setor TIC", universidade: "Credenciamento como ICT receptora de projetos conveniados — acesso a P&D de grandes fabricantes de TIC", empresa: "Redução de IPI para fabricantes de TIC com PPB + crédito financeiro de P&D. Habilitação via portaria interministerial MCTIC/MDIC", governo: "Política industrial que induziu R$ bilhões em fábricas TIC no Brasil — instrumento para ZFM e polos tecnológicos regionais" },
        url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sepin/lei-de-informatica",
        instrumento: "Lei 8.248/1991 + Lei 13.969/2019 + Lei 14.968/2024",
        links_diretos: [
          { label: "Empresas habilitadas MCTI/SEPIN", url: "https://antigo.mctic.gov.br/mctic/opencms/tecnologia/incentivo_desenvolvimento/lei_informatica/concessao/consulta_empresas_habilitadas.html" },
          { label: "Relatório anual Lei da Informática", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sepin/lei-de-informatica" },
          { label: "Portarias habilitadoras MCTIC/MDIC", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/sepin/lei-de-informatica/portarias" },
        ],
      },
      {
        sigla: "LGP",
        nome: "Nova Lei Geral da Gestão Pública",
        tipo: "Marco legal",
        orgao: "Ministério da Gestão e Inovação em Serviços Públicos",
        vigencia: "2025–vigente (Lei 5.874/2025)",
        descricao: "Contratos de até R$ 200 mil para soluções tecnológicas por dispensa de licitação. Digitalização obrigatória de processos e metas mensuráveis por secretaria. Permite consórcios intermunicipais para soluções de inovação.",
        relevancia: { pesquisador: "Facilita contratação de pesquisadores para projetos municipais", universidade: "Simplifica parcerias com prefeituras para extensão e pesquisa aplicada", empresa: "Dispensa de licitação para contratos tech até R$ 200k com governo", governo: "Digitalização obrigatória e metas de desempenho por secretaria" },
        url: "https://www.gov.br/gestao/pt-br",
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
        descricao: "Institui distritos de inovação como áreas urbanas com governança descentralizada. Mínimo de 2 organizações-âncora para reconhecimento formal. Conselho de Orientação com 13 membros e Selo Paulista para Distritos de Inovação — credencial para VC e fomento. Art. 5º: reconhecimento independe de maturidade.",
        relevancia: { pesquisador: "ICTs e universidades como âncoras elegíveis — amplia papel institucional", universidade: "Universidade como âncora obrigatória — abre novos fluxos de financiamento", empresa: "Sede em distrito = Selo Paulista e acesso facilitado a VC e fomento", governo: "Instrumento territorial de CT&I — integra planejamento urbano e inovação" },
        url: "https://doe.sp.gov.br/",
        instrumento: "Decreto estadual",
        abrangencia: "Estado de São Paulo",
      },
      {
        sigla: "LC-1049",
        nome: "Lei Paulista de Inovação",
        tipo: "Lei complementar estadual",
        orgao: "Secretaria de Ciência, Tecnologia e Inovação — SP",
        vigencia: "2008–vigente (LC 1.049/2008)",
        descricao: "Incentivo à inovação tecnológica, pesquisa científica, desenvolvimento tecnológico, engenharia não-rotineira e extensão tecnológica em ambiente produtivo no Estado de São Paulo.",
        relevancia: { pesquisador: "Incentivos fiscais e acesso a infraestrutura de pesquisa estadual", universidade: "Parceria com ambiente produtivo amparada em lei estadual", empresa: "Incentivos tributários para empresas inovadoras em SP", governo: "Base legal para programas estaduais de fomento à inovação" },
        url: "http://www.legislacao.sp.gov.br",
        instrumento: "Lei complementar",
        abrangencia: "Estado de São Paulo",
      },
    ],
    municipal: [
      {
        sigla: "LI-MSP",
        nome: "Lei de Inovação — Município de São Paulo",
        tipo: "Decreto municipal",
        orgao: "Prefeitura de São Paulo",
        vigencia: "Decreto 64.062 — vigente",
        descricao: "Regulamenta a Lei Federal 10.973/2004 no município de SP. Diretrizes para parcerias universidade-empresa-governo e fomento à P&D na cidade.",
        relevancia: { pesquisador: "Ampara parcerias com USP, UNIFESP e IES municipais em SP", universidade: "Base para convênios com a prefeitura de SP em P&D aplicado", empresa: "Acesso a laboratórios e pesquisadores municipais facilitado", governo: "Modelo replicável — outros municípios podem regulamentar a Lei Federal" },
        url: "https://www.abdi.com.br/decreto-regulamenta-lei-de-inovacao-na-cidade-de-sao-paulo/",
        instrumento: "Decreto municipal",
        abrangencia: "Município de São Paulo",
      },
    ],
  };
}

function getEcossistemaInovacao() {
  return {
    programas_aceleracao: [
      {
        sigla: "STARTUP-BR",
        nome: "Start-Up Brasil",
        tipo: "Programa federal de aceleração",
        orgao: "MCTI · Softex",
        descricao: "Programa nacional de aceleração de startups de base tecnológica. Seleciona empresas em estágio inicial e conecta com aceleradoras credenciadas, mentores e investidores. Rodadas periódicas de seleção com apoio financeiro e de infraestrutura.",
        relevancia: { pesquisador: "Startup derivada de pesquisa pode ser acelerada — conexão pesquisa-mercado via programa federal", universidade: "Incubadoras vinculadas à IES podem se credenciar como aceleradoras parceiras do programa", empresa: "Aceleração com aporte de até R$ 200k + mentoria + conexão com investidores", governo: "Instrumento federal de política de inovação — pode ser replicado em nível estadual/municipal" },
        url: "https://www.startupbrasil.org.br",
        instrumento: "Programa MCTI",
      },
      {
        sigla: "INOVATIVA",
        nome: "InovAtiva Brasil",
        tipo: "Programa federal de aceleração",
        orgao: "MDIC · SEBRAE",
        descricao: "Maior programa de aceleração de startups do Brasil. Gratuito, online, com mentoria de especialistas, conexão com investidores e acesso ao mercado. Mais de 15.000 startups aceleradas desde 2013. Etapas: candidatura → imersão → Demo Day.",
        relevancia: { pesquisador: "Spin-off de pesquisa — caminho estruturado para validação comercial", universidade: "Parceria institucional com InovAtiva para criar trilha startup vinculada à IES", empresa: "Startup de qualquer setor — validação de modelo de negócio com mentoria intensiva gratuita", governo: "Programa replicável em nível estadual/municipal para ecossistemas locais" },
        url: "https://www.inovativabrasil.com.br",
        instrumento: "Programa MDIC/SEBRAE",
      },
      {
        sigla: "PIPE-FAPESP",
        nome: "PIPE — Pesquisa Inovativa em Pequenas Empresas",
        tipo: "Programa estadual SP — financiamento",
        orgao: "FAPESP",
        descricao: "Fomenta P&D em pequenas empresas inovadoras de SP. Fase 1: até R$ 300k para prova de conceito. Fase 2: até R$ 2M para desenvolvimento. Fase 3: até R$ 1M para escalonamento. FAPESP abriu credenciamento de incubadoras para apoiar empresas PIPE (edital mar/2026).",
        relevancia: { pesquisador: "Pesquisador pode atuar como responsável técnico em empresa PIPE — remuneração + vínculo com ICT", universidade: "Incubadoras universitárias credenciadas apoiam empresas PIPE — fomento FAPESP + infraestrutura IES", empresa: "Startup em SP com P&D: até R$ 2M por fase sem contrapartida financeira", governo: "Modelo de fomento P&D empresarial — referência para outros estados" },
        url: "https://fapesp.br/pipe",
        instrumento: "Programa FAPESP · Lei 10.973/2004",
        abrangencia: "Estado de São Paulo",
      },
      {
        sigla: "INOVA-INVEST",
        nome: "Inova+Invest — ABVCAP/ApexBrasil",
        tipo: "Programa de aceleração regional",
        orgao: "ABVCAP · ApexBrasil",
        descricao: "Conecta startups, empresas e investidores em regiões fora do eixo SP-RJ. Primeira edição no Nordeste (2026). Startups de tecnologia escalável com CNPJ ativo. Aceleração com foco em captação de investimento e internacionalização.",
        relevancia: { pesquisador: "Startup regional derivada de pesquisa — acesso a investidores fora dos grandes centros", universidade: "IES de regiões Norte/Nordeste como ecossistema de origem das startups selecionadas", empresa: "Startup tech fora de SP/RJ: acesso a VC qualificado e internacionalização via ApexBrasil", governo: "Descentralização do ecossistema de inovação — modelo de política regional de CT&I" },
        url: "https://www.abvcap.com.br",
        instrumento: "Convênio técnico-financeiro",
      },
    ],
    redes_habitats: [
      {
        sigla: "ANPROTEC",
        nome: "Associação Nacional de Entidades Promotoras de Empreendimentos Inovadores",
        tipo: "Rede nacional",
        orgao: "ANPROTEC",
        descricao: "363 incubadoras e 57 aceleradoras mapeadas no Brasil. 3.694 empresas incubadas, 6.143 graduadas e 2.239 startups em portfólio. Maior rede de habitats de inovação do país — inclui parques tecnológicos, incubadoras universitárias e aceleradoras privadas.",
        url: "https://anprotec.org.br",
        instrumento: "Associação representativa",
        links_diretos: [
          { label: "Mapa de habitats de inovação", url: "https://anprotec.org.br/site/publicacoes/" },
          { label: "Mapeamento incubadoras/aceleradoras", url: "https://informativo.anprotec.org.br/mapeamento-dos-mecanismos-de-geracao-de-empreendimentos-inovadores" },
        ],
      },
      {
        sigla: "SEBRAE-INOVACAO",
        nome: "SEBRAE — Programas de Inovação para Pequenas Empresas",
        tipo: "Rede nacional",
        orgao: "SEBRAE",
        descricao: "Acesso a programas de inovação, financiamento e mercado para micro e pequenas empresas. Inclui: Sebraetec (consultorias técnicas), ALI (Agentes Locais de Inovação), StartupSC e parceria com InovAtiva. Presença em todos os estados.",
        url: "https://www.sebrae.com.br/sites/PortalSebrae/sebraetec",
        instrumento: "Serviço autônomo federal",
      },
    ],
    links_busca: [
      { label: "Mapa de Startups — ABSTARTUPS", url: "https://abstartups.com.br" },
      { label: "Crunchbase Brasil — startups e investimentos", url: "https://www.crunchbase.com/hub/brazil-startups" },
      { label: "Cubo — ecossistema de startups SP", url: "https://cubo.network" },
      { label: "ABVCAP — venture capital e PE", url: "https://www.abvcap.com.br" },
      { label: "Anjos do Brasil — investidores-anjo", url: "https://www.anjosdobrasil.net" },
      { label: "FAPESP PIPE — startups SP", url: "https://fapesp.br/pipe" },
      { label: "InovAtiva Brasil — aceleração gratuita", url: "https://www.inovativabrasil.com.br" },
    ],
  };
}

async function fetchMencoesQueridoDiario(query: string) {
  const data = await safeFetch(
    `https://queridodiario.ok.org.br/api/gazettes?querystring=${encodeURIComponent("inovação " + query)}&size=5&sort_by=relevance`
  );
  return (data?.gazettes || []).map((g: any) => ({
    territory: g.territory_name || "",
    state: g.state_code || "",
    date: g.date || "",
    excerpts: (g.excerpts || []).slice(0, 1),
    url: g.file_url || "",
  }));
}

async function fetchEditaisRelacionados(query: string) {
  const termos = ["inovação", "incubadora", query.split(" ")[0]];
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

// --- Câmara dos Deputados — Dados Abertos ---
// API pública, sem autenticação: https://dadosabertos.camara.leg.br/swagger/api.html
async function fetchTramitacaoCamara(query: string) {
  const data = await safeFetch(
    `https://dadosabertos.camara.leg.br/api/v2/proposicoes?keywords=${encodeURIComponent(query)}&ordem=DESC&ordenarPor=id&itens=10`
  );
  return (data?.dados || []).map((p: any) => ({
    id: p.id,
    casa: "Câmara dos Deputados",
    identificacao: `${p.siglaTipo} ${p.numero}/${p.ano}`,
    siglaTipo: p.siglaTipo || "",
    numero: p.numero || null,
    ano: p.ano || null,
    ementa: p.ementa || "",
    url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
  }));
}

// --- Senado Federal — Dados Abertos ---
// Endpoint documentado em https://legis.senado.leg.br/dadosabertos/docs (OpenAPI):
// GET /dadosabertos/processo?termo=... — serviço substituto do antigo /materia/pesquisa/lista,
// que foi descontinuado (desativação completa em 2026-02-01, segundo metadados da própria API).
// Obs.: a busca por termo é por palavras-chave indexadas e funciona melhor com termos simples.
async function fetchTramitacaoSenado(query: string) {
  // Tenta a query completa; se vazia, tenta o primeiro termo significativo
  const tentativas = [query, query.split(" ")[0]].filter((t, i, a) => t && a.indexOf(t) === i);
  for (const termo of tentativas) {
    const data = await safeFetch(
      `https://legis.senado.leg.br/dadosabertos/processo?termo=${encodeURIComponent(termo)}`,
      { headers: { Accept: "application/json" } }
    );
    const itens = Array.isArray(data) ? data : [];
    if (itens.length === 0) continue;
    return itens.slice(0, 10).map((p: any) => ({
      id: p.id,
      casa: "Senado Federal",
      identificacao: p.identificacao || "",
      siglaTipo: (p.identificacao || "").split(" ")[0] || "",
      numero: null,
      ano: null,
      ementa: p.ementa || "",
      situacao: p.situacaoAtual || "",
      tramitando: p.tramitando === "Sim",
      autor: p.autoria || "",
      url: p.codigoMateria
        ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${p.codigoMateria}`
        : (p.urlDocumento || ""),
    }));
  }
  return [];
}

async function fetchDatasetsEcossistema(query: string) {
  const data = await safeFetch(
    `https://dados.gov.br/api/3/action/package_search?q=${encodeURIComponent("incubadora aceleradora startup inovação " + query)}&rows=5`
  );
  return (data?.result?.results || []).map((pkg: any) => ({
    title: pkg.title || "",
    description: (pkg.notes || "").slice(0, 200),
    url: `https://dados.gov.br/dados/conjuntos-dados/${pkg.name}`,
    organization: pkg.organization?.title || "",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "query required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    console.log(`Layer Policies: ${query}`);
    const start = Date.now();

    const [gazettesMencoes, editaisPNCP, datasetsEco, camara, senado] = await Promise.all([
      fetchMencoesQueridoDiario(query),
      fetchEditaisRelacionados(query),
      fetchDatasetsEcossistema(query),
      fetchTramitacaoCamara(query),
      fetchTramitacaoSenado(query),
    ]);

    const proposicoes = [...camara, ...senado];

    return new Response(JSON.stringify({
      politicas: getPoliticasCuradas(),
      ecossistema: getEcossistemaInovacao(),
      gazettes_mencoes: gazettesMencoes,
      editais_inovacao: editaisPNCP,
      datasets_ecossistema: datasetsEco,
      tramitacao_legislativa: {
        proposicoes,
        total: proposicoes.length,
        total_camara: camara.length,
        total_senado: senado.length,
        fontes: [
          { fonte: "Câmara dos Deputados — Dados Abertos", url: "https://dadosabertos.camara.leg.br/api/v2/proposicoes", total: camara.length },
          { fonte: "Senado Federal — Dados Abertos", url: "https://legis.senado.leg.br/dadosabertos/processo", total: senado.length },
        ],
      },
      sources: ["Políticas públicas curadas", "Lei do Bem/MCTI", "Lei da Informática/SEPIN", "ANPROTEC", "Querido Diário", "PNCP", "Câmara dos Deputados", "Senado Federal"],
      processing_time_ms: Date.now() - start,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("layer-policies error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

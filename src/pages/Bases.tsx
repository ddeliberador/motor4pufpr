import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Cpu, Database, ExternalLink, Globe2, Map as MapIcon, Microscope } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" as const },
  }),
};

type Recurso = {
  fonte: string;
  mantenedor: string;
  nacionalidade: "Nacional" | "Estrangeiro";
  uso: string;
  nota?: string;
};

const RECURSOS: Recurso[] = [
  // --- Estatística e território ---
  { fonte: "IBGE — SIDRA e Localidades", mantenedor: "Instituto Brasileiro de Geografia e Estatística", nacionalidade: "Nacional", uso: "PIB municipal e estadual, PINTEC, composição industrial (VTI e pessoal ocupado), lista de UFs e municípios." },
  { fonte: "IPEAData", mantenedor: "Instituto de Pesquisa Econômica Aplicada (Ipea)", nacionalidade: "Nacional", uso: "Séries históricas de emprego (CAGED) nacionais e por estado." },
  { fonte: "Base dos Dados", mantenedor: "Base dos Dados (organização brasileira sem fins lucrativos)", nacionalidade: "Nacional", uso: "Conjuntos de dados públicos tratados usados como apoio na camada de conhecimento." },
  { fonte: "dados.gov.br", mantenedor: "Governo Federal do Brasil", nacionalidade: "Nacional", uso: "Catálogo de conjuntos de dados abertos ligados ao tema pesquisado." },

  // --- Ciência, pesquisa e ensino ---
  { fonte: "OpenAlex", mantenedor: "OurResearch (Estados Unidos)", nacionalidade: "Estrangeiro", uso: "Publicações científicas, instituições, autores, conceitos e comparação Brasil x mundo." },
  { fonte: "CAPES — Dados Abertos e Sucupira", mantenedor: "CAPES / MEC", nacionalidade: "Nacional", uso: "Programas de pós-graduação e produção acadêmica brasileira." },
  { fonte: "CNPq — Dados Abertos e Diretório de Grupos", mantenedor: "Conselho Nacional de Desenvolvimento Científico e Tecnológico", nacionalidade: "Nacional", uso: "Bolsas e fomento por instituição, grupos de pesquisa e áreas do conhecimento." },
  { fonte: "INEP — Dados Abertos", mantenedor: "INEP / MEC", nacionalidade: "Nacional", uso: "Censo da educação superior e capacidade de formação por região." },
  { fonte: "ENAP — Repositório Institucional", mantenedor: "Escola Nacional de Administração Pública", nacionalidade: "Nacional", uso: "Documentos, relatórios e cadernos sobre gestão pública, governo digital e inovação no setor público." },
  { fonte: "EMBRAPII", mantenedor: "Associação Brasileira de Pesquisa e Inovação Industrial", nacionalidade: "Nacional", uso: "Unidades credenciadas e financiamento de projetos de inovação com empresas." },
  { fonte: "FINEP", mantenedor: "Financiadora de Estudos e Projetos", nacionalidade: "Nacional", uso: "Linhas de financiamento à inovação apresentadas como oportunidades." },
  { fonte: "Bolsas e programas internacionais", mantenedor: "DAAD, Chevening, Fulbright, Erasmus+, UNESCO e outros", nacionalidade: "Estrangeiro", uso: "Oportunidades de formação e cooperação no exterior na camada de inserção internacional.", nota: "conjunto de programas estrangeiros" },

  // --- Compras públicas, orçamento e controle ---
  { fonte: "PNCP — Portal Nacional de Contratações Públicas", mantenedor: "Governo Federal do Brasil", nacionalidade: "Nacional", uso: "Contratos e editais públicos ligados ao tema, consultados por período oficial de publicação, modalidade, estado e órgão, com filtragem do assunto feita depois no próprio sistema." },
  { fonte: "Transferegov", mantenedor: "Ministério da Gestão e da Inovação em Serviços Públicos", nacionalidade: "Nacional", uso: "Planos de trabalho, convênios e transferências voluntárias da União para estados e municípios.", nota: "acesso público sujeito a bloqueio automático de tráfego" },
  { fonte: "Portal da Transparência", mantenedor: "Controladoria-Geral da União (CGU)", nacionalidade: "Nacional", uso: "Emendas parlamentares, contratos federais, convênios e execução orçamentária." },
  { fonte: "SICONFI", mantenedor: "Secretaria do Tesouro Nacional", nacionalidade: "Nacional", uso: "Receitas e despesas municipais e estaduais na Visão Regional." },
  { fonte: "SIOP", mantenedor: "Ministério do Planejamento e Orçamento", nacionalidade: "Nacional", uso: "Orçamento federal por programa e ação." },
  { fonte: "TCU", mantenedor: "Tribunal de Contas da União", nacionalidade: "Nacional", uso: "Acórdãos e fiscalizações relacionados a políticas de inovação." },
  { fonte: "FNDE", mantenedor: "Fundo Nacional de Desenvolvimento da Educação", nacionalidade: "Nacional", uso: "Transferências e programas educacionais como contexto territorial." },
  { fonte: "BNDES", mantenedor: "Banco Nacional de Desenvolvimento Econômico e Social", nacionalidade: "Nacional", uso: "Referência de linhas de crédito e apoio a projetos industriais." },

  // --- Legislação, atos e imprensa oficial ---
  { fonte: "Câmara dos Deputados — Dados Abertos", mantenedor: "Câmara dos Deputados", nacionalidade: "Nacional", uso: "Proposições legislativas em tramitação sobre o tema." },
  { fonte: "Senado Federal — Dados Abertos", mantenedor: "Senado Federal", nacionalidade: "Nacional", uso: "Processos e matérias legislativas relacionadas." },
  { fonte: "Diário Oficial da União (DOU / Imprensa Nacional)", mantenedor: "Imprensa Nacional", nacionalidade: "Nacional", uso: "Publicação oficial de atos, medidas provisórias e portarias citadas." },
  { fonte: "Planalto — Legislação", mantenedor: "Presidência da República", nacionalidade: "Nacional", uso: "Texto oficial de leis e medidas provisórias (Lei do Bem, Lei da Informática, ReData)." },
  { fonte: "Querido Diário", mantenedor: "Open Knowledge Brasil", nacionalidade: "Nacional", uso: "Menções ao tema em diários oficiais de municípios." },

  // --- Empresas, mercado e comércio exterior ---
  { fonte: "CVM — Dados Abertos (FCA e DFP)", mantenedor: "Comissão de Valores Mobiliários", nacionalidade: "Nacional", uso: "Maiores empresas de capital aberto do setor, ranqueadas por receita declarada." },
  { fonte: "B3", mantenedor: "B3 — Brasil, Bolsa, Balcão", nacionalidade: "Nacional", uso: "Companhias listadas e referência de mercado de capitais." },
  { fonte: "BrasilAPI / Receita Federal (CNPJ)", mantenedor: "BrasilAPI (comunidade brasileira) sobre dados da Receita Federal", nacionalidade: "Nacional", uso: "Consulta de CNPJ, CNAE e quadro societário das empresas." },
  { fonte: "Banco Central do Brasil (SGS e Olinda)", mantenedor: "Banco Central do Brasil", nacionalidade: "Nacional", uso: "Indicadores macroeconômicos, câmbio e crédito usados no contexto econômico." },
  { fonte: "Comex Stat", mantenedor: "Ministério do Desenvolvimento, Indústria, Comércio e Serviços (MDIC)", nacionalidade: "Nacional", uso: "Importações e exportações por NCM, indicando dependência externa." },
  { fonte: "Novo CAGED / RAIS (PDET)", mantenedor: "Ministério do Trabalho e Emprego", nacionalidade: "Nacional", uso: "Emprego formal e movimentação de mão de obra por setor e estado." },
  { fonte: "Previdência / Dataprev", mantenedor: "Dataprev e Ministério da Previdência Social", nacionalidade: "Nacional", uso: "Dados de vínculos e contexto social do mercado de trabalho." },

  // --- Tecnologia, patentes e código ---
  { fonte: "EPO OPS", mantenedor: "European Patent Office (Europa)", nacionalidade: "Estrangeiro", uso: "Patentes internacionais, classificação IPC e soberania tecnológica brasileira." },
  { fonte: "INPI — Revista da Propriedade Industrial (RPI)", mantenedor: "Instituto Nacional da Propriedade Industrial", nacionalidade: "Nacional", uso: "Despachos oficiais de patentes e de programas de computador, lidos direto dos arquivos XML semanais da RPI, com contagem por classificação IPC (inclusive as classes de inteligência artificial)." },
  { fonte: "GitHub API", mantenedor: "GitHub / Microsoft (Estados Unidos)", nacionalidade: "Estrangeiro", uso: "Repositórios e atividade de desenvolvimento como sinal de maturidade tecnológica (TRL)." },
  { fonte: "Santos Dumont (LNCC)", mantenedor: "Laboratório Nacional de Computação Científica", nacionalidade: "Nacional", uso: "Referência nacional de infraestrutura de computação de alto desempenho." },

  // --- Agências reguladoras e setoriais ---
  { fonte: "ANEEL — Dados Abertos", mantenedor: "Agência Nacional de Energia Elétrica", nacionalidade: "Nacional", uso: "Dados de geração e P&D regulado do setor elétrico." },
  { fonte: "ANP", mantenedor: "Agência Nacional do Petróleo, Gás Natural e Biocombustíveis", nacionalidade: "Nacional", uso: "Produção, refino e investimentos regulados em P&D de óleo e gás." },
  { fonte: "ANATEL", mantenedor: "Agência Nacional de Telecomunicações", nacionalidade: "Nacional", uso: "Infraestrutura de telecomunicações e conectividade." },
  { fonte: "ANVISA", mantenedor: "Agência Nacional de Vigilância Sanitária", nacionalidade: "Nacional", uso: "Registros sanitários de produtos, insumos e dispositivos." },
  { fonte: "ANS", mantenedor: "Agência Nacional de Saúde Suplementar", nacionalidade: "Nacional", uso: "Dados do setor de saúde suplementar." },
  { fonte: "ANA", mantenedor: "Agência Nacional de Águas e Saneamento Básico", nacionalidade: "Nacional", uso: "Recursos hídricos e saneamento (inclusive eficiência no uso de água)." },
  { fonte: "IBAMA", mantenedor: "Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis", nacionalidade: "Nacional", uso: "Licenciamento e autuações ambientais como restrição ao investimento." },
  { fonte: "INPE / TerraBrasilis", mantenedor: "Instituto Nacional de Pesquisas Espaciais", nacionalidade: "Nacional", uso: "Dados ambientais e territoriais de satélite." },
  { fonte: "Transportes / Infraestrutura", mantenedor: "Ministério dos Transportes e órgãos vinculados", nacionalidade: "Nacional", uso: "Logística e infraestrutura de transporte no contexto regional." },

  // --- Saúde, justiça e eleições ---
  { fonte: "DATASUS", mantenedor: "Ministério da Saúde", nacionalidade: "Nacional", uso: "Indicadores de saúde e demanda pública por soluções tecnológicas." },
  { fonte: "SISAB — Atenção Primária", mantenedor: "Ministério da Saúde", nacionalidade: "Nacional", uso: "Cobertura da atenção primária, saúde bucal e agentes comunitários por país, região, estado e município, mês a mês." },
  { fonte: "DataJud", mantenedor: "Conselho Nacional de Justiça (CNJ)", nacionalidade: "Nacional", uso: "Processos judiciais como sinal de litígio e risco regulatório." },
  { fonte: "TSE — Dados Abertos", mantenedor: "Tribunal Superior Eleitoral", nacionalidade: "Nacional", uso: "Dados eleitorais usados como contexto político-territorial." },

  // --- Ecossistema de inovação ---
  { fonte: "ANPROTEC", mantenedor: "Associação Nacional de Entidades Promotoras de Empreendimentos Inovadores", nacionalidade: "Nacional", uso: "Parques tecnológicos e incubadoras (conteúdo curado)." },
  { fonte: "SEBRAE", mantenedor: "Serviço Brasileiro de Apoio às Micro e Pequenas Empresas", nacionalidade: "Nacional", uso: "Programas de apoio a pequenas empresas inovadoras." },
  { fonte: "ABDI", mantenedor: "Agência Brasileira de Desenvolvimento Industrial", nacionalidade: "Nacional", uso: "Referência de programas de política industrial." },
  { fonte: "Fundações estaduais de amparo à pesquisa (FAPs)", mantenedor: "FAPESP, Fundação Araucária, FAPERJ, FAPEMIG e demais FAPs estaduais", nacionalidade: "Nacional", uso: "Editais e fomento estadual à pesquisa e inovação.", nota: "conjunto de fundações estaduais" },
  { fonte: "Ecossistema de startups e investimento", mantenedor: "ABStartups, ABVCAP, Anjos do Brasil, Cubo, InovAtiva, Startup Brasil", nacionalidade: "Nacional", uso: "Referências de aceleração, capital de risco e comunidades de startups.", nota: "conjunto de entidades brasileiras" },
  { fonte: "Crunchbase", mantenedor: "Crunchbase (Estados Unidos)", nacionalidade: "Estrangeiro", uso: "Referência de empresas e investimentos no comparativo internacional." },
  { fonte: "Banco Mundial", mantenedor: "World Bank (organismo multilateral)", nacionalidade: "Estrangeiro", uso: "Indicadores comparativos entre países." },
  { fonte: "ORCID / DOI (Crossref)", mantenedor: "ORCID e Crossref (Estados Unidos)", nacionalidade: "Estrangeiro", uso: "Identificação persistente de autores e publicações." },

  // --- Modelos de IA ---
  { fonte: "Tucano 2 (via Ollama)", mantenedor: "Tucano / comunidade brasileira de PLN — modelo aberto em português", nacionalidade: "Nacional", uso: "Análise estratégica e resumo de ICTs, auto-hospedado no próprio backend.", nota: "em adoção — substituto dos modelos pagos" },
  { fonte: "Gemini (via gateway)", mantenedor: "Google (Estados Unidos)", nacionalidade: "Estrangeiro", uso: "Gerava a análise estratégica das personas.", nota: "em descontinuação" },
  { fonte: "Claude / Anthropic API", mantenedor: "Anthropic (Estados Unidos)", nacionalidade: "Estrangeiro", uso: "Alternativa de análise textual das personas.", nota: "em descontinuação" },
  { fonte: "FNDCT", mantenedor: "Ministério da Ciência, Tecnologia e Inovação / FINEP", nacionalidade: "Nacional", uso: "Fomento federal à ciência, tecnologia e inovação na camada de políticas públicas." },
  { fonte: "PREVIC", mantenedor: "Superintendência Nacional de Previdência Complementar", nacionalidade: "Nacional", uso: "Dados de fundos de pensão usados no contexto econômico e institucional." },
];


type Camada = "Conhecimento" | "Tecnologia" | "Política" | "Internacional" | "Outras bases e modelos";

type FonteMotor = Recurso & {
  camada: Camada;
  url?: string;
};

const CAMADAS: Array<{ nome: Camada; titulo: string; descricao: string; icon: typeof Microscope }> = [
  { nome: "Conhecimento", titulo: "Camada do Conhecimento", descricao: "Ciência, formação, pesquisa e capacidade institucional.", icon: Microscope },
  { nome: "Tecnologia", titulo: "Camada da Tecnologia", descricao: "Patentes, emprego, empresas, código e maturidade tecnológica.", icon: Cpu },
  { nome: "Política", titulo: "Camada da Política", descricao: "Compras, orçamento, legislação, controle e instrumentos públicos.", icon: Building2 },
  { nome: "Internacional", titulo: "Camada Internacional", descricao: "Comércio exterior, dependência, capitais e referências globais.", icon: Globe2 },
  { nome: "Outras bases e modelos", titulo: "Fontes complementares e modelos", descricao: "Bases transversais, ecossistema de inovação e modelos usados pelo Motor.", icon: Database },
];

const CLASSIFICACAO: Array<{ teste: RegExp; camada: Exclude<Camada, "Outras bases e modelos">; url?: string }> = [
  { teste: /^OpenAlex$/, camada: "Conhecimento", url: "https://openalex.org/" },
  { teste: /^CAPES/, camada: "Conhecimento", url: "https://dadosabertos.capes.gov.br/" },
  { teste: /^CNPq/, camada: "Conhecimento", url: "http://dadosabertos.cnpq.br/" },
  { teste: /^INEP/, camada: "Conhecimento", url: "https://www.gov.br/inep/" },
  { teste: /^DATASUS$/, camada: "Conhecimento", url: "https://datasus.saude.gov.br/" },
  { teste: /^Base dos Dados$/, camada: "Conhecimento", url: "https://basedosdados.org/" },
  { teste: /^INPI/, camada: "Tecnologia", url: "https://www.gov.br/inpi/" },
  { teste: /^EPO OPS$/, camada: "Tecnologia", url: "https://www.epo.org/en/searching-for-patents/data/web-services/ops" },
  { teste: /^Novo CAGED/, camada: "Tecnologia", url: "https://pdet.mte.gov.br/" },
  { teste: /^GitHub API$/, camada: "Tecnologia", url: "https://api.github.com/" },
  { teste: /^EMBRAPII$/, camada: "Tecnologia", url: "https://embrapii.org.br/" },
  { teste: /^FINEP$/, camada: "Tecnologia", url: "https://www.finep.gov.br/" },
  { teste: /^BrasilAPI/, camada: "Tecnologia", url: "https://brasilapi.com.br/" },
  { teste: /^ANVISA$/, camada: "Tecnologia", url: "https://www.gov.br/anvisa/" },
  { teste: /^Transportes/, camada: "Tecnologia", url: "https://dados.gov.br/" },
  { teste: /^PNCP/, camada: "Política", url: "https://pncp.gov.br/" },
  { teste: /^Portal da Transparência$/, camada: "Política", url: "https://portaldatransparencia.gov.br/" },
  { teste: /^SICONFI$/, camada: "Política", url: "https://siconfi.tesouro.gov.br/" },
  { teste: /^FNDE$/, camada: "Política", url: "https://www.gov.br/fnde/" },
  { teste: /^FNDCT$/, camada: "Política", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/fndct" },
  { teste: /^Diário Oficial/, camada: "Política", url: "https://www.in.gov.br/" },
  { teste: /^Querido Diário$/, camada: "Política", url: "https://queridodiario.ok.org.br/" },
  { teste: /^TSE/, camada: "Política", url: "https://dadosabertos.tse.jus.br/" },
  { teste: /^SIOP$/, camada: "Política", url: "https://siop.planejamento.gov.br/" },
  { teste: /^DataJud$/, camada: "Política", url: "https://datajud.cnj.jus.br/" },
  { teste: /^IBAMA$/, camada: "Política", url: "https://dados.gov.br/" },
  { teste: /^Comex Stat$/, camada: "Internacional", url: "https://comexstat.mdic.gov.br/" },
  { teste: /^Banco Central/, camada: "Internacional", url: "https://dadosabertos.bcb.gov.br/" },
  { teste: /^B3$/, camada: "Internacional", url: "https://www.b3.com.br/" },
  { teste: /^CVM/, camada: "Internacional", url: "https://dados.cvm.gov.br/" },
  { teste: /^Previdência/, camada: "Internacional", url: "https://dadosabertos.dataprev.gov.br/" },
  { teste: /^PREVIC$/, camada: "Internacional", url: "https://www.gov.br/previc/" },
  { teste: /^ANS$/, camada: "Internacional", url: "https://www.ans.gov.br/" },
  { teste: /^ANA$/, camada: "Internacional", url: "https://dadosabertos.ana.gov.br/" },
];

const FONTES_MOTOR: FonteMotor[] = RECURSOS.map((recurso) => {
  const classificacao = CLASSIFICACAO.find(({ teste }) => teste.test(recurso.fonte));
  return {
    ...recurso,
    camada: classificacao?.camada ?? "Outras bases e modelos",
    url: classificacao?.url,
  };
});

const BASES_MAPA = [
  {
    nome: "OpenAlex",
    responsavel: "OurResearch (EUA)",
    url: "https://openalex.org",
    registros: "1.971",
    vinculo: "Compartilhada",
    origem: "API REST pública; instituições de pesquisa brasileiras.",
    limitacoes: "Sem CNPJ; tipo ICT é um fallback genérico; pequenas instituições sem produção científica indexada podem não aparecer.",
  },
  {
    nome: "ABStartups / StartupBase",
    responsavel: "Associação Brasileira de Startups",
    url: "https://startupbase.abstartups.com.br",
    registros: "3.310",
    vinculo: "Compartilhada",
    origem: "Mapeamento do Ecossistema Brasileiro de Startups 2025, ingerido manualmente.",
    limitacoes: "Sem CNPJ ou URL individual; 2.921 registros (88%) usam o centroide do município e a cobertura depende de cadastro voluntário.",
  },
  {
    nome: "MCTI / FORMICT",
    responsavel: "Ministério da Ciência, Tecnologia e Inovação",
    url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/propriedade-intelectual-e-transferencia-de-tecnologia",
    registros: "121",
    vinculo: "Compartilhada",
    origem: "PDF anual de ICTs não respondentes ao FORMICT, enriquecido por CNPJ.",
    limitacoes: "Lista parcial, apenas de não respondentes; sem coordenadas; a extração por expressão regular pode falhar com mudanças no PDF.",
  },
  {
    nome: "OTD / CGEE",
    responsavel: "Centro de Gestão e Estudos Estratégicos (CGEE/MCTI)",
    url: "https://octi.cgee.org.br",
    registros: "393",
    vinculo: "Exclusiva do Mapa",
    origem: "Dataset estruturado de laboratórios, ICTs e unidades de pesquisa fornecido pelo CGEE.",
    limitacoes: "Sem CNPJ para a maioria; INATEL e Instituto Atlântico também aparecem na base EMBRAPII.",
  },
  {
    nome: "LISP Brasil",
    responsavel: "Enap / CGU",
    url: "https://www.enap.gov.br/pt/lisp",
    registros: "108 laboratórios",
    vinculo: "Exclusiva do Mapa",
    origem: "Mapeamento de laboratórios de inovação do setor público publicado em PDF/planilha.",
    limitacoes: "Somente 18 de 108 têm URL individual; coordenadas são centroides de município.",
  },
  {
    nome: "EMBRAPII",
    responsavel: "Empresa Brasileira de Pesquisa e Inovação Industrial",
    url: "https://embrapii.org.br/unidades/",
    registros: "96",
    vinculo: "Exclusiva do Mapa",
    origem: "API REST pública das unidades credenciadas.",
    limitacoes: "A API não fornece coordenadas nem CNPJ; há sobreposição com OTD/CGEE e o campo de tipo institucional nem sempre é preenchido.",
  },
  {
    nome: "SINAPAD",
    responsavel: "MCTI / RNP",
    url: "https://www.sinapad.rnp.br",
    registros: "10 centros",
    vinculo: "Exclusiva do Mapa",
    origem: "Dados curados manualmente do portal do Sistema Nacional de Processamento de Alto Desempenho.",
    limitacoes: "Base estática, com atualização manual, e sem CNPJ para a maioria dos centros.",
  },
  {
    nome: "INEP — Censo da Educação Superior",
    responsavel: "INEP / MEC",
    url: "https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior",
    registros: "parte de 515 universidades/IES",
    vinculo: "Exclusiva do Mapa",
    origem: "Microdados anuais do cadastro de instituições de ensino superior.",
    limitacoes: "Sem coordenadas e sem CNPJ; arquivo de cerca de 500 MB e coleta dependente de suporte a HTTP Range; dados têm defasagem anual.",
  },
] as const;

type BaseMapaComplementar = {
  nome: string;
  responsavel: string;
  pilar: "P,D&I" | "Atores" | "Financiamento" | "Infraestrutura" | "Transversal" | "Camadas de IA";
  medicao: string;
  situacao: "Ativa" | "Falha registrada";
  url: string;
};

// Integrações do Mapa já comprovadas no inventário de extração e nas Camadas de IA.
// As oito bases territoriais acima não são repetidas aqui.
const BASES_MAPA_COMPLEMENTARES: BaseMapaComplementar[] = [
  { nome: "MCTI — Indicadores Nacionais de CT&I", responsavel: "MCTI", pilar: "P,D&I", medicao: "21 registros na extração documentada", situacao: "Ativa", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/indicadores" },
  { nome: "IBGE — SIDRA", responsavel: "IBGE", pilar: "P,D&I", medicao: "1.224 registros na extração documentada", situacao: "Ativa", url: "https://servicodados.ibge.gov.br/api/v3/agregados" },
  { nome: "INPI — RPI", responsavel: "INPI", pilar: "P,D&I", medicao: "1.442 classificações IPC na edição medida", situacao: "Ativa", url: "https://revistas.inpi.gov.br/" },
  { nome: "CAPES — Plataforma Sucupira", responsavel: "CAPES / MEC", pilar: "Atores", medicao: "80 conjuntos documentados", situacao: "Ativa", url: "https://dadosabertos.capes.gov.br/" },
  { nome: "Receita Federal — Dados Abertos CNPJ", responsavel: "Receita Federal", pilar: "Atores", medicao: "Conexão recusada na medição; apoio via BrasilAPI", situacao: "Falha registrada", url: "https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/" },
  { nome: "CNPq — Lattes / LattesData", responsavel: "CNPq / Ibict", pilar: "Atores", medicao: "HTTP 503 na medição documentada", situacao: "Falha registrada", url: "https://lattesdata.cnpq.br/" },
  { nome: "Finep / CNPq — Editais de fomento", responsavel: "Finep / CNPq", pilar: "Financiamento", medicao: "28 categorias na extração documentada", situacao: "Ativa", url: "https://www.finep.gov.br/chamadas-publicas" },
  { nome: "FAPs estaduais — BV-FAPESP", responsavel: "FAPESP e FAPs", pilar: "Financiamento", medicao: "24 auxílios e bolsas na medição", situacao: "Ativa", url: "https://bv.fapesp.br/pt/" },
  { nome: "CVM — Dados Abertos", responsavel: "CVM", pilar: "Financiamento", medicao: "10 conjuntos documentados", situacao: "Ativa", url: "https://dados.cvm.gov.br/" },
  { nome: "ABVCAP", responsavel: "ABVCAP", pilar: "Financiamento", medicao: "18 itens na extração documentada", situacao: "Ativa", url: "https://www.abvcap.com.br/" },
  { nome: "Lei do Bem", responsavel: "MCTI / Receita Federal", pilar: "Financiamento", medicao: "199 registros na extração documentada", situacao: "Ativa", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/lei-do-bem" },
  { nome: "PNCP — Contratações Públicas", responsavel: "Governo Federal", pilar: "Financiamento", medicao: "7.771 pregões na janela documentada", situacao: "Ativa", url: "https://pncp.gov.br/" },
  { nome: "ANATEL — Dados Abertos", responsavel: "ANATEL", pilar: "Infraestrutura", medicao: "61 conjuntos; ERBs e backhaul no Mapa", situacao: "Ativa", url: "https://www.gov.br/anatel/pt-br/dados/dados-abertos" },
  { nome: "DATASUS / SISAB", responsavel: "Ministério da Saúde", pilar: "Infraestrutura", medicao: "398 municípios do Paraná na medição", situacao: "Ativa", url: "https://relatorioaps-prd.saude.gov.br/" },
  { nome: "ANTT / ANAC", responsavel: "ANTT / ANAC", pilar: "Infraestrutura", medicao: "117 conjuntos documentados", situacao: "Ativa", url: "https://dados.antt.gov.br/" },
  { nome: "IBGE — PNAD Contínua", responsavel: "IBGE", pilar: "Infraestrutura", medicao: "4 trimestres na medição documentada", situacao: "Ativa", url: "https://sidra.ibge.gov.br/" },
  { nome: "IpeaData", responsavel: "Ipea", pilar: "Infraestrutura", medicao: "3.605 séries documentadas", situacao: "Ativa", url: "http://www.ipeadata.gov.br/" },
  { nome: "Portal da Transparência", responsavel: "CGU", pilar: "Infraestrutura", medicao: "11 convênios na janela documentada", situacao: "Ativa", url: "https://portaldatransparencia.gov.br/" },
  { nome: "dados.gov.br", responsavel: "Governo Federal", pilar: "Transversal", medicao: "HTTP 401 na medição documentada", situacao: "Falha registrada", url: "https://dados.gov.br/" },
  { nome: "BrasilAPI — CNPJ", responsavel: "Comunidade BrasilAPI / Receita Federal", pilar: "Transversal", medicao: "5 consultas validadas na medição", situacao: "Ativa", url: "https://brasilapi.com.br/" },
  { nome: "ANEEL — SIGA", responsavel: "ANEEL", pilar: "Camadas de IA", medicao: "Usinas em operação georreferenciadas", situacao: "Ativa", url: "https://dadosabertos.aneel.gov.br/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel" },
  { nome: "TeleGeography — Submarine Cable Map", responsavel: "TeleGeography", pilar: "Camadas de IA", medicao: "Cabos e pontos de aterragem ligados ao Brasil", situacao: "Ativa", url: "https://www.submarinecablemap.com/" },
  { nome: "OpenCelliD", responsavel: "Unwired Labs", pilar: "Camadas de IA", medicao: "62.517 células no snapshot nacional documentado", situacao: "Ativa", url: "https://opencellid.org/" },
  { nome: "PeeringDB", responsavel: "PeeringDB", pilar: "Camadas de IA", medicao: "Datacenters brasileiros; snapshot validado como contingência", situacao: "Ativa", url: "https://www.peeringdb.com/" },
  { nome: "Hugging Face", responsavel: "Hugging Face", pilar: "Camadas de IA", medicao: "Modelos vinculados aos atores por autoria", situacao: "Ativa", url: "https://huggingface.co/models" },
];

const TOTAL_BASES_MAPA = BASES_MAPA.length + BASES_MAPA_COMPLEMENTARES.length;

type Visao = "tudo" | "motor" | "mapa";

const OPCOES_VISAO: Array<{ valor: Visao; rotulo: string; icon: typeof Microscope }> = [
  { valor: "tudo", rotulo: "Tudo", icon: Database },
  { valor: "motor", rotulo: "Motor", icon: Microscope },
  { valor: "mapa", rotulo: "Mapa", icon: MapIcon },
];

const Bases = () => {
  const [visao, setVisao] = useState<Visao>("tudo");

  return (
  <div className="min-h-screen bg-background text-foreground">
    <Header />

    <main className="pt-24 pb-20">
      <section className="pb-14">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Database className="w-4 h-4" />
              Catálogo de dados
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Bases</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              Fontes públicas consultadas pelo Motor e bases territoriais que alimentam o Mapa da Inovação.
            </p>
            <div className="inline-flex items-center gap-1 p-1 bg-card border border-border rounded-full" role="tablist" aria-label="Selecionar catálogo">
              {OPCOES_VISAO.map(({ valor, rotulo, icon: Icon }) => (
                <button
                  key={valor}
                  role="tab"
                  aria-selected={visao === valor}
                  onClick={() => setVisao(valor)}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors ${visao === valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                >
                  <Icon className="w-4 h-4" />
                  {rotulo}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {visao !== "mapa" && (
      <section className="py-16 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">Bases do Motor</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
              Catálogo consolidado das fontes e modelos usados nas quatro camadas analíticas, sem repetir entradas equivalentes.
            </motion.p>

            <div className="space-y-8">
              {CAMADAS.map((camada, indice) => {
                const fontes = FONTES_MOTOR.filter((fonte) => fonte.camada === camada.nome);
                return (
                  <motion.section key={camada.nome} variants={fadeUp} custom={indice + 2} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-start gap-3 p-5 border-b border-border bg-muted/30">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <camada.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{camada.titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{camada.descricao}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left bg-muted/20">
                            <th scope="col" className="px-4 py-3 font-semibold">Fonte</th>
                            <th scope="col" className="px-4 py-3 font-semibold">Mantenedor</th>
                            <th scope="col" className="px-4 py-3 font-semibold">Nacionalidade</th>
                            <th scope="col" className="px-4 py-3 font-semibold min-w-[280px]">Uso no Motor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fontes.map((fonte) => (
                            <tr key={fonte.fonte} className="border-t border-border align-top">
                              <td className="px-4 py-3 font-medium whitespace-nowrap">
                                {fonte.url ? (
                                  <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                                    {fonte.fonte}<ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : fonte.fonte}
                                {fonte.nota && <span className="block text-[10px] font-normal text-muted-foreground mt-1">{fonte.nota}</span>}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{fonte.mantenedor}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${fonte.nacionalidade === "Nacional" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                  {fonte.nacionalidade}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground leading-relaxed">{fonte.uso}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.section>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">Bases do Mapa ({TOTAL_BASES_MAPA})</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-3xl mx-auto">
              Catálogo completo das fontes territoriais, integrações analíticas e Camadas de IA. As medições históricas mantêm falhas explícitas.
            </motion.p>

            <h3 className="text-xl font-semibold mb-4">Bases territoriais de atores</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {BASES_MAPA.map((base, indice) => (
                <motion.article key={base.nome} variants={fadeUp} custom={indice + 2} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <a href={base.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-primary transition-colors">
                        {base.nome}<ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <p className="text-xs text-muted-foreground mt-1">{base.responsavel}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${base.vinculo === "Compartilhada" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {base.vinculo}
                    </span>
                  </div>
                  <div className="border-y border-border py-3 mb-3">
                    <p className="text-2xl font-bold">{base.registros}</p>
                    <p className="text-xs text-muted-foreground">registros ativos documentados</p>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-medium mb-1">Origem</dt>
                      <dd className="text-muted-foreground leading-relaxed">{base.origem}</dd>
                    </div>
                    <div>
                      <dt className="font-medium mb-1">Limitações conhecidas</dt>
                      <dd className="text-muted-foreground leading-relaxed">{base.limitacoes}</dd>
                    </div>
                  </dl>
                </motion.article>
              ))}
            </div>

            <div className="mt-12">
              <h3 className="text-xl font-semibold mb-2">Integrações complementares do Mapa</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Indicadores, financiamento, infraestrutura e enriquecimentos que complementam os atores territoriais sem duplicar as bases acima.
              </p>
              <div className="overflow-x-auto bg-card border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-muted/30">
                      <th scope="col" className="px-4 py-3 font-semibold">Fonte</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Pilar</th>
                      <th scope="col" className="px-4 py-3 font-semibold min-w-[260px]">Medição documentada</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BASES_MAPA_COMPLEMENTARES.map((base) => (
                      <tr key={base.nome} className="border-t border-border align-top">
                        <td className="px-4 py-3">
                          <a href={base.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium hover:text-primary transition-colors">
                            {base.nome}<ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="block text-xs text-muted-foreground mt-1">{base.responsavel}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{base.pilar}</td>
                        <td className="px-4 py-3 text-muted-foreground">{base.medicao}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${base.situacao === "Ativa" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                            {base.situacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default Bases;

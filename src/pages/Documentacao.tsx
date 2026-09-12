import { motion } from "framer-motion";
import { 
  Code2, Database, Globe, Server, Shield, GitBranch, 
  Cpu, Layers, FileCode, ExternalLink, Terminal,
  BookOpen, Microscope, Factory, Building2, Zap
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const techStack = [
  { name: "React 18 + TypeScript", desc: "SPA com tipagem estática e componentes reutilizáveis", icon: Code2 },
  { name: "Vite", desc: "Build tool ultrarrápido com HMR e tree-shaking", icon: Zap },
  { name: "Tailwind CSS", desc: "Design system com tokens semânticos e dark mode", icon: FileCode },
  { name: "Three.js / R3F", desc: "Cena 3D interativa na landing page", icon: Globe },
  { name: "Framer Motion", desc: "Animações declarativas e transições fluidas", icon: Layers },
  { name: "Supabase Edge Functions", desc: "Backend serverless em Deno/TypeScript", icon: Server },
  { name: "Recharts", desc: "Visualização de dados e gráficos interativos", icon: Database },
  { name: "React Force Graph", desc: "Grafos relacionais de incidência", icon: GitBranch },
];

const apis = [
  {
    category: "Camada do Conhecimento",
    icon: Microscope,
    color: "from-blue-500 to-cyan-500",
    sources: [
      { name: "OpenAlex", url: "https://openalex.org/", desc: "Artigos, autores, instituições — grafo acadêmico aberto" },
      { name: "CAPES / Sucupira", url: "https://dadosabertos.capes.gov.br/", desc: "Programas de pós-graduação, bolsas, produção" },
      { name: "CNPq / Lattes", url: "http://dadosabertos.cnpq.br/", desc: "Bolsas, projetos de pesquisa, distribuição regional" },
      { name: "INEP", url: "https://www.gov.br/inep/", desc: "Censo da educação superior, indicadores institucionais" },
      { name: "DATASUS", url: "https://datasus.saude.gov.br/", desc: "SIH, SIM, SINASC, CNES, SINAN — dados de saúde pública" },
      { name: "Base dos Dados", url: "https://basedosdados.org/", desc: "Agregador com datasets tratados e normalizados" },
    ],
  },
  {
    category: "Camada da Tecnologia",
    icon: Cpu,
    color: "from-violet-500 to-purple-500",
    sources: [
      { name: "INPI (via WIPO)", url: "https://www.gov.br/inpi/", desc: "Patentes, marcas, transferência de tecnologia" },
      { name: "RAIS / CAGED", url: "https://pdet.mte.gov.br/", desc: "Emprego formal por ocupação, setor e região" },
      { name: "GitHub API", url: "https://api.github.com/", desc: "Repositórios de código aberto por tema" },
      { name: "Embrapii / Finep", url: "https://embrapii.org.br/", desc: "Projetos de inovação em parceria ICT-empresa" },
      { name: "CNPJ/QSA", url: "https://arquivos.receitafederal.gov.br/dados/cnpj/", desc: "Quadro societário, CNAE, porte — cruzamento corporativo" },
      { name: "ANVISA", url: "https://www.gov.br/anvisa/", desc: "Registro de medicamentos, insumos, cosméticos" },
      { name: "Transportes", url: "https://dados.gov.br/", desc: "ANTT, ANAC, DNIT, DENATRAN — infraestrutura e mobilidade" },
    ],
  },
  {
    category: "Camada da Política",
    icon: Building2,
    color: "from-amber-500 to-orange-500",
    sources: [
      { name: "PNCP", url: "https://pncp.gov.br/", desc: "Compras públicas e contratos governamentais" },
      { name: "Portal da Transparência", url: "https://portaldatransparencia.gov.br/", desc: "Convênios, despesas, sanções (CEIS/CNEP/CEPIM/CEAF)" },
      { name: "SICONFI", url: "https://siconfi.tesouro.gov.br/", desc: "Finanças públicas municipais e estaduais" },
      { name: "FNDE / FNDCT", url: "https://www.gov.br/fnde/", desc: "Fomento à ciência e tecnologia" },
      { name: "Diário Oficial (DOU)", url: "https://queridodiario.ok.org.br/", desc: "Publicações oficiais via Querido Diário" },
      { name: "TSE", url: "https://dadosabertos.tse.jus.br/", desc: "Candidaturas, prestação de contas, emendas parlamentares" },
      { name: "SIOP", url: "https://siop.planejamento.gov.br/", desc: "Orçamento federal, LOA, execução orçamentária" },
      { name: "DataJud/CNJ", url: "https://datajud.cnj.jus.br/", desc: "Processos judiciais, decisões, Justiça em Números" },
      { name: "IBAMA", url: "https://dados.gov.br/", desc: "Embargos ambientais, licenciamento, SINAFLOR" },
    ],
  },
  {
    category: "Camada Internacional",
    icon: Globe,
    color: "from-emerald-500 to-teal-500",
    sources: [
      { name: "COMEX Stat", url: "https://comexstat.mdic.gov.br/", desc: "Exportação e importação por NCM, país, UF" },
      { name: "BCB (Banco Central)", url: "https://dadosabertos.bcb.gov.br/", desc: "Selic, câmbio, PIX, crédito, reservas, IBC-Br" },
      { name: "OpenAlex (internacional)", url: "https://openalex.org/", desc: "Colaborações internacionais e co-autorias" },
      { name: "B3/CVM", url: "https://dados.cvm.gov.br/", desc: "Mercado de capitais, companhias abertas, fundos" },
      { name: "INSS/PREVIC", url: "https://dadosabertos.dataprev.gov.br/", desc: "Benefícios previdenciários, fundos de pensão" },
      { name: "ANS", url: "https://www.ans.gov.br/", desc: "Saúde suplementar — operadoras, beneficiários" },
      { name: "ANA", url: "https://dadosabertos.ana.gov.br/", desc: "Recursos hídricos — outorgas, bacias, reservatórios" },
    ],
  },
];

const edgeFunctions = [
  { name: "motor-search", desc: "Orquestra a busca inicial: traduz CNAE → objeto tecnológico e dispara chamadas paralelas às 4 camadas" },
  { name: "motor-analysis", desc: "IA generativa (Gemini/GPT) que sintetiza os dados brutos em diagnóstico estrutural personalizado por persona" },
  { name: "layer-knowledge", desc: "Consulta OpenAlex, CAPES, CNPq — calcula densidade científica e concentração institucional" },
  { name: "layer-technology", desc: "Consulta INPI, RAIS/CAGED, GitHub — estima TRL e maturidade tecnológica" },
  { name: "layer-policy", desc: "Consulta PNCP, Transparência, SICONFI — avalia intensidade instrumental e capacidade fiscal" },
  { name: "layer-international", desc: "Consulta COMEX, BCB — mede dependência externa e inserção global" },
  { name: "market-analysis", desc: "Análise de mercado e demanda produtiva por setor" },
  { name: "ict-search", desc: "Identifica ICTs e redes de pesquisa brasileiras atuantes no tema" },
  { name: "competitor-search", desc: "Empresas e referências nacionais e internacionais do setor" },
];

/**
 * Catálogo de fontes e modelos — levantado enumerando os conectores reais em
 * backend/app/connectors/*.py e as edge functions supabase/functions/layer-*, competitor-search,
 * ict-search e motor-analysis.
 */
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
];

const RESUMO = (() => {
  const nacional = RECURSOS.filter((r) => r.nacionalidade === "Nacional").length;
  const estrangeiro = RECURSOS.length - nacional;
  return {
    nacional,
    estrangeiro,
    pctNacional: Math.round((nacional / RECURSOS.length) * 100),
    pctEstrangeiro: Math.round((estrangeiro / RECURSOS.length) * 100),
  };
})();


const Documentacao = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Terminal className="w-4 h-4" />
              Documentação Técnica
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Arquitetura & APIs
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Infraestrutura computacional pública e aberta para diagnóstico estrutural 
              do Sistema Nacional de Inovação — 40+ bases públicas, 11 edge functions, 4 camadas analíticas, entity resolution.
            </p>
          </motion.div>
        </div>
      </section>

      {/* PESQUISA COLABORATIVA DO MAPA DE INOVAÇÃO */}
      <section className="py-12 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
            <h2 className="text-2xl font-bold mb-3">Pesquisa Colaborativa do Mapa de Inovação</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              O levantamento e o teste de cada fonte oficial fazem parte da Pesquisa Colaborativa do Mapa de Inovação,
              desenvolvida no doutorado em Políticas Públicas da UFPR. Cada fonte é registrada com pilar, dados-chave,
              forma de acesso, situação do teste e próximo passo — e todo teste real, obstáculo e solução fica registrado
              no <Link to="/conceito" className="text-primary hover:underline">Diário de Pesquisa</Link>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Base territorial construída nessa pesquisa: quase 6 mil registros de instituições, laboratórios,
              parques, unidades de pesquisa e startups brasileiras, reunidos a partir de fontes oficiais
              (Mapa da Inovação/MCTI, EMBRAPII, FORMICT, SINAPAD, LISP, OTD/CGEE) e do Mapeamento Nacional de
              Startups da ABStartups, com localização geográfica conferida cidade por cidade.
            </p>
          </div>
        </div>
      </section>

      {/* OPEN SOURCE COMMITMENT */}
      <section className="py-12 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="bg-card border border-primary/20 rounded-2xl p-8 md:p-10"
          >
            <motion.div variants={fadeUp} custom={0} className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-3">Compromisso Open Source</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  O Motor da Inovação é um projeto <strong className="text-foreground">100% open source</strong>, 
                  desenvolvido como parte de uma tese de doutorado em Políticas Públicas na UFPR. 
                  Toda a infraestrutura — frontend, backend, conectores de dados e modelos analíticos — 
                  é pública e auditável.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://github.com/ddeliberador/motor4pufpr.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <GitBranch className="w-4 h-4" />
                    GitHub Repository
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    Licença MIT
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="py-16 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              Stack Tecnológico
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              Frontend React moderno com backend serverless — sem servidor dedicado, sem custos fixos de infraestrutura.
            </motion.p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {techStack.map((tech, i) => (
                <motion.div
                  key={tech.name}
                  variants={fadeUp}
                  custom={i + 2}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
                >
                  <tech.icon className="w-5 h-5 text-primary mb-3" />
                  <h3 className="font-semibold text-sm mb-1">{tech.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tech.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ARQUITETURA / EDGE FUNCTIONS */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              Edge Functions (Backend)
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              {edgeFunctions.length} funções serverless em TypeScript/Deno que orquestram toda a lógica de busca, 
              análise e síntese do Motor da Inovação.
            </motion.p>

            <div className="space-y-3">
              {edgeFunctions.map((fn, i) => (
                <motion.div
                  key={fn.name}
                  variants={fadeUp}
                  custom={i + 2}
                  className="flex items-start gap-4 bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/30 transition-colors"
                >
                  <code className="text-primary font-mono text-sm font-semibold whitespace-nowrap pt-0.5">
                    {fn.name}
                  </code>
                  <p className="text-sm text-muted-foreground">{fn.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* APIs POR CAMADA */}
      <section className="py-16 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              APIs & Fontes de Dados
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              40+ bases públicas organizadas nas 4 camadas analíticas, com entity resolution entre bases. 
              Todas as fontes são abertas, gratuitas e verificáveis. Inspirado na matriz do BR/ACC (World Open Graph).
            </motion.p>

            <div className="space-y-8">
              {apis.map((api, i) => (
                <motion.div key={api.category} variants={fadeUp} custom={i + 2}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${api.color} flex items-center justify-center`}>
                      <api.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">{api.category}</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 ml-0 sm:ml-[52px]">
                    {api.sources.map((src) => (
                      <a
                        key={src.name}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {src.name}
                          </h4>
                          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{src.desc}</p>
                      </a>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FLUXO DE DADOS */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-8 text-center">
              Fluxo de Processamento
            </motion.h2>

            <motion.div variants={fadeUp} custom={1} className="space-y-4">
              {[
                { step: "1", title: "Input", desc: "Usuário informa CNAE, objeto tecnológico ou termo livre + contexto institucional (universidade, empresa, ente federativo)" },
                { step: "2", title: "Tradução Ontológica", desc: "motor-search traduz o input em palavras-chave normalizadas para cada camada analítica" },
                { step: "3", title: "Consulta Paralela", desc: "4 edge functions consultam simultaneamente as bases públicas de cada camada (conhecimento, tecnologia, política, internacional)" },
                { step: "4", title: "Cálculo de Índices", desc: "Dados brutos são normalizados e cruzados para gerar índices estruturais: Gargalo de Tradução, Dependência Externa, Articulação U-E, Efetividade Instrumental" },
                { step: "5", title: "Síntese por IA", desc: "motor-analysis recebe dados + contexto institucional e gera diagnóstico prescritivo personalizado à persona e entidade informada" },
                { step: "6", title: "Entrega", desc: "Dashboard interativo com grafos relacionais, indicadores visuais, agendas estratégicas e recomendações concretas" },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 bg-card border border-border rounded-xl p-5">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* METODOLOGIA DOS ÍNDICES */}
      <section id="metodologia-indices" className="py-16 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-4 text-center">
              Metodologia dos Índices Estratégicos
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Cada busca calcula quatro índices a partir dos dados brutos retornados pelas camadas analíticas.
              No painel de resultados, clique em qualquer card de índice para ver a fórmula e os números exatos
              usados naquele cálculo específico, além do nível de confiança (alta, média ou baixa) conforme a
              disponibilidade de dados.
            </motion.p>

            <div className="space-y-4">
              {[
                {
                  sigla: "GT — Gargalo de Tradução",
                  formula: "GT = min(100, (papers_BR / sinais_aplicação) × fator_log)",
                  desc: "Compara o volume de publicações científicas brasileiras com sinais de aplicação prática (contratos públicos, patentes, empresas ativas, empregos). Escala logarítmica evita distorções em campos muito grandes. Valores altos indicam produção científica que não está virando produto ou serviço. Confiança alta quando há dados de aplicação; média/baixa quando estimado por proxies.",
                },
                {
                  sigla: "CD — Concentração de Dependência",
                  formula: "CD = (papers_com_coautoria_internacional / papers_BR) × 100",
                  desc: "Percentual de papers brasileiros escritos em coautoria com pesquisadores estrangeiros, conforme metadados do OpenAlex. Dependência alta pode indicar fragilidade da capacidade científica nacional no tema. Confiança alta quando há coautorias de mais de 3 países distintos.",
                },
                {
                  sigla: "AUE — Articulação Universidade-Empresa",
                  formula: "AUE = min(100, Σ sinais de articulação × peso)",
                  desc: "Soma ponderada de sinais de conexão entre pesquisa e setor produtivo: contratos e convênios públicos, repositórios de código aberto, redes internacionais e financiamento empresarial de pesquisa (grants). Confiança alta quando há instrumentos públicos identificados; baixa quando apenas sinais alternativos.",
                },
                {
                  sigla: "EI — Efetividade Instrumental",
                  formula: "EI = min(100, TRL_normalizado × cobertura_instrumentos)",
                  desc: "Cruza o nível de maturidade tecnológica (TRL 1–9) com a cobertura de instrumentos públicos disponíveis (editais, convênios, contratos, programas). Valores baixos indicam que as políticas existentes não estão alcançando o potencial do campo. Confiança varia conforme a disponibilidade de dados de instrumentos e de maturidade.",
                },
              ].map((m, i) => (
                <motion.div
                  key={m.sigla}
                  variants={fadeUp}
                  custom={i + 2}
                  className="bg-card border border-border rounded-xl p-5"
                >
                  <h3 className="font-semibold mb-2">{m.sigla}</h3>
                  <code className="block bg-muted rounded-md px-3 py-2 font-mono text-xs mb-3 break-all">
                    {m.formula}
                  </code>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} custom={6} className="mt-8 text-center">
              <a
                href="https://github.com/ddeliberador/motor4pufpr/blob/main/supabase/functions/motor-search/index.ts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
              >
                Ver código-fonte da função computeCrossLayerIndices
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* RECURSOS E FONTES UTILIZADAS */}
      <section id="recursos-fontes" className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              Recursos e Fontes Utilizadas
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-8 max-w-3xl mx-auto">
              Todas as bases de dados e modelos de inteligência artificial que o Motor da Inovação consulta,
              classificados pela nacionalidade da instituição que os mantém.
            </motion.p>

            {/* Resumo */}
            <motion.div variants={fadeUp} custom={2} className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{RECURSOS.length}</p>
                <p className="text-xs text-muted-foreground mt-1">fontes e modelos catalogados</p>
              </div>
              <div className="bg-card border border-emerald-500/30 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {RESUMO.nacional} <span className="text-base font-medium">({RESUMO.pctNacional}%)</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">nacionais (instituições brasileiras)</p>
              </div>
              <div className="bg-card border border-amber-500/30 rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {RESUMO.estrangeiro} <span className="text-base font-medium">({RESUMO.pctEstrangeiro}%)</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">estrangeiras</p>
              </div>
            </motion.div>

            {/* Tabela */}
            <motion.div variants={fadeUp} custom={3} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Fontes de dados e modelos de IA usados pelo Motor da Inovação</caption>
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold">Fonte</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Mantenedor</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Nacionalidade</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Uso no Motor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECURSOS.map((r) => (
                      <tr key={r.fonte} className="border-t border-border align-top">
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          {r.fonte}
                          {r.nota && <span className="block text-[10px] font-normal text-muted-foreground">{r.nota}</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.mantenedor}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                              r.nacionalidade === "Nacional"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {r.nacionalidade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.uso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.p variants={fadeUp} custom={4} className="text-xs text-muted-foreground mt-4 leading-relaxed">
              Classificação por nacionalidade da instituição mantenedora da fonte de dados ou do modelo,
              não por onde os servidores estão hospedados.
            </motion.p>
          </motion.div>
        </div>
      </section>


      {/* PRINCÍPIOS */}
      <section className="py-16 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-8 text-center">
              Princípios de Projeto
            </motion.h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "Dados Públicos", desc: "100% das fontes são bases abertas mantidas por órgãos do governo brasileiro ou organizações internacionais." },
                { title: "Reprodutibilidade", desc: "Qualquer resultado pode ser verificado e reproduzido — toda chamada de API é rastreável." },
                { title: "Sem Vendor Lock-in", desc: "Stack aberta: React, TypeScript, Deno. Deploy possível em qualquer provedor cloud." },
                { title: "Privacidade e Transparência", desc: "Sem cookies de rastreamento e sem login para pesquisar. Os termos de busca são registrados junto dos indicadores do tema, sem qualquer vínculo com quem pesquisou. Ao enviar uma sugestão ou dúvida, a mensagem é armazenada e o e-mail, se informado, também — visível apenas ao mantenedor." },
                { title: "Extensível", desc: "Novos conectores de dados podem ser adicionados como módulos independentes." },
                { title: "Acadêmico + Prático", desc: "Fundamentação teórica sólida (SNI, Mazzucato, Nelson & Winter) com entrega computacional real." },
              ].map((p, i) => (
                <motion.div
                  key={p.title}
                  variants={fadeUp}
                  custom={i + 1}
                  className="bg-card border border-border rounded-xl p-5"
                >
                  <h3 className="font-semibold mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Documentacao;

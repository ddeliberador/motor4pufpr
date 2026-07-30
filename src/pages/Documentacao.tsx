import { motion } from "framer-motion";
import { 
  Code2, Database, Globe, Server, Shield, GitBranch, 
  Cpu, Layers, FileCode, ExternalLink, Terminal,
  BookOpen, Microscope, Factory, Zap
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
  { name: "enrichment-search", desc: "Enriquecimento semântico via IBGE, BrasilAPI e bases complementares" },
  { name: "smart-insights", desc: "Gera insights prescritivos cruzando índices entre camadas" },
  { name: "research-agent", desc: "Agente de pesquisa que aprofunda análise sob demanda do usuário" },
  { name: "research-gaps", desc: "Identifica lacunas de pesquisa e oportunidades de agenda científica" },
  { name: "policy-simulator", desc: "Simula cenários de política industrial com base nos dados coletados" },
];

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
                    href="https://github.com/ddeliberador/motor4pufpr"
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
                { title: "Privacidade por Design", desc: "Nenhum dado pessoal é coletado. Buscas não são armazenadas. Sem cookies de rastreamento." },
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

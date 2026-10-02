
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Code2, Database, Globe, Server, Shield, GitBranch,
  Layers, FileCode, ExternalLink, Terminal, BookOpen, Zap
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

// Conteúdo temporariamente oculto durante o defeso eleitoral.
const EXIBIR_PESQUISA_COLABORATIVA = false;

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

const edgeFunctions = [
  { name: "motor-search", desc: "Orquestra a busca inicial: traduz CNAE → objeto tecnológico e dispara chamadas paralelas às 4 camadas" },
  { name: "motor-analysis", desc: "IA generativa em modelo aberto brasileiro (Tucano 2), auto-hospedado — sintetiza os dados brutos em diagnóstico estrutural personalizado por persona" },
  { name: "layer-knowledge", desc: "Consulta OpenAlex, CAPES, CNPq — calcula densidade científica e concentração institucional" },
  { name: "layer-technology", desc: "Consulta INPI, RAIS/CAGED, GitHub — estima TRL e maturidade tecnológica" },
  { name: "layer-policy", desc: "Consulta PNCP, Transparência, SICONFI — avalia intensidade instrumental e capacidade fiscal" },
  { name: "layer-international", desc: "Consulta COMEX, BCB — mede dependência externa e inserção global" },
  { name: "market-analysis", desc: "Análise de mercado e demanda produtiva por setor" },
  { name: "ict-search", desc: "Identifica ICTs e redes de pesquisa brasileiras atuantes no tema" },
  { name: "competitor-search", desc: "Empresas e referências nacionais e internacionais do setor" },
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

      {/* PESQUISA COLABORATIVA DO MAPA DE INOVAÇÃO */}
      {EXIBIR_PESQUISA_COLABORATIVA && (
        <section className="py-12 border-t border-border">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
              <h2 className="text-2xl font-bold mb-3">Pesquisa Colaborativa do Mapa de Inovação</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O levantamento e o teste de cada fonte oficial fazem parte da Pesquisa Colaborativa do Mapa de Inovação,
                desenvolvida no doutorado em Políticas Públicas da UFPR. Cada fonte é registrada com pilar, dados-chave,
                forma de acesso, situação do teste e próximo passo — e esta documentação é atualizada a cada nova base integrada.
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
      )}

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

      {/* CATÁLOGO DE BASES */}
      <section className="py-12 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
            className="bg-card border border-border rounded-xl p-6 text-center"
          >
            <p className="text-muted-foreground">
              Veja o catálogo completo de fontes consultadas pelo Motor e pelo Mapa da Inovação em{" "}
              <Link to="/bases" className="font-medium text-primary hover:underline">Bases</Link>.
            </p>
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
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center mb-4 max-w-2xl mx-auto">
              Cada busca calcula quatro índices a partir dos dados brutos retornados pelas camadas analíticas.
              No painel de resultados, clique em qualquer card de índice para ver a fórmula e os números exatos
              usados naquele cálculo específico, além do nível de confiança (alta, média ou baixa) conforme a
              disponibilidade de dados.
            </motion.p>

            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Os quatro índices abaixo foram auditados quanto à fundamentação em literatura da área.
              Nem todos têm precedente direto: onde isso ocorre, o índice é tratado explicitamente como contribuição
              metodológica original desta pesquisa de doutorado, não como aplicação de método já publicado.
            </motion.p>

            <div className="space-y-4">
              {[
                {
                  sigla: "GT — Gargalo de Tradução",
                  formula: "GT = min(100, (papers_BR / sinais_aplicação) × fator_log)",
                  desc: "Compara o volume de publicações científicas brasileiras com sinais de aplicação prática (contratos públicos, patentes, empresas ativas, empregos). Escala logarítmica evita distorções em campos muito grandes. Valores altos indicam produção científica que não está virando produto ou serviço. Confiança alta quando há dados de aplicação; média/baixa quando estimado por proxies.",
                  lit: "Índice original desta pesquisa. Conceitualmente relacionado à tradição de ligação ciência-tecnologia via citação de artigo em patente (Narin, 1997), mas a fórmula não replica esse método — é uma operacionalização própria, adaptada aos dados abertos brasileiros disponíveis.",
                },
                {
                  sigla: "CD — Concentração de Dependência",
                  formula: "CD = ((coautorias_internacionais_totais − coautorias_BR) / coautorias_internacionais_totais) × 100",
                  desc: "Percentual de participações estrangeiras dentro do conjunto de papers já internacionalizados do tema, conforme metadados do OpenAlex. Dependência alta pode indicar fragilidade da capacidade científica nacional no tema. Confiança alta quando há coautorias de mais de 3 países distintos.",
                  lit: "Mede a proporção de participações estrangeiras dentro do conjunto de papers já internacionalizados do tema, não a fração do total de papers. Inspirado na literatura sobre coautoria internacional como marcador de relações centro-periferia em ciência (Kim, 2006, Scientometrics) e na família de indicadores do Leiden Ranking sobre proporção de publicações internacionais colaborativas.",
                },
                {
                  sigla: "AUE — Articulação Universidade-Empresa",
                  formula: "AUE = min(100, Σ sinais de articulação × peso)",
                  desc: "Soma ponderada de sinais de conexão entre pesquisa e setor produtivo: contratos e convênios públicos, repositórios de código aberto, redes internacionais e financiamento empresarial de pesquisa (grants). Confiança alta quando há instrumentos públicos identificados; baixa quando apenas sinais alternativos.",
                  lit: "Os cinco sinais somados (base científica, instrumentos públicos, código aberto, rede internacional, financiamento empresarial) seguem a lógica de múltiplos canais de engajamento acadêmico descrita em Perkmann et al. (2013), revisão de literatura sobre engajamento acadêmico e comercialização publicada na Research Policy. Os pesos específicos de cada sinal (20/25/20/20/15) são escolha original desta pesquisa, não derivados dessa fonte.",
                },
                {
                  sigla: "EI — Efetividade Instrumental",
                  formula: "EI = min(100, TRL_normalizado × cobertura_instrumentos)",
                  desc: "Cruza o nível de maturidade tecnológica (TRL 1–9) com a cobertura de instrumentos públicos disponíveis (editais, convênios, contratos, programas). Valores baixos indicam que as políticas existentes não estão alcançando o potencial do campo. Confiança varia conforme a disponibilidade de dados de instrumentos e de maturidade.",
                  lit: "TRL (Nível de Maturidade Tecnológica) tem base consolidada, com origem na NASA e padronização internacional pela ISO 16290:2013. O fator de alinhamento aplicado quando o TRL está distante de 5 é uma heurística desta pesquisa, sem fonte na literatura — é o componente mais frágil dos quatro índices nesse quesito.",
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

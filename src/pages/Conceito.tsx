import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Zap, BookOpen, Microscope, Factory, Building2, Globe, 
  ArrowRight, Database, BarChart3, Network, Target,
  AlertTriangle, TrendingUp, Layers, GitBranch,
  Calendar, ChevronDown, ChevronUp, Code2, Wrench, Brain, MessageSquare
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UfprLogo from "@/components/UfprLogo";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const layers = [
  {
    icon: Microscope,
    title: "Conhecimento",
    color: "from-blue-500 to-cyan-500",
    sources: ["OpenAlex", "CAPES", "CNPq", "Scielo"],
    outputs: ["Densidade científica", "Concentração institucional", "Especialização temática"],
  },
  {
    icon: GitBranch,
    title: "Tecnologia",
    color: "from-violet-500 to-purple-500",
    sources: ["INPI", "RAIS/CAGED", "GitHub", "Embrapii"],
    outputs: ["TRL estimado", "Ciência → Patente", "Base produtiva associada"],
  },
  {
    icon: Building2,
    title: "Política",
    color: "from-amber-500 to-orange-500",
    sources: ["PNCP", "Transparência", "SICONFI", "FNDCT"],
    outputs: ["Intensidade instrumental", "Capacidade fiscal", "Efetividade do gasto"],
  },
  {
    icon: Globe,
    title: "Internacional",
    color: "from-emerald-500 to-teal-500",
    sources: ["COMEX", "OpenAlex", "WIPO", "BCB"],
    outputs: ["Dependência externa", "Competitividade", "Inserção global"],
  },
];

const indices = [
  { code: "GT", name: "Gargalo de Tradução", desc: "Ciência sem aplicação prática", layers: "1 × 2 × 3", icon: AlertTriangle, alert: "critical" },
  { code: "CD", name: "Dependência Externa", desc: "Produção científica estrangeira dominante", layers: "4 × 1", icon: TrendingUp, alert: "warning" },
  { code: "AUE", name: "Articulação U-E", desc: "Instituições de pesquisa presentes em contratos", layers: "1 × 3", icon: Network, alert: "normal" },
  { code: "EI", name: "Efetividade Instrumental", desc: "Relação gasto público vs output", layers: "3 × 1", icon: Target, alert: "warning" },
];

const personas = [
  { key: "pesquisador", icon: Microscope, label: "Pesquisador", deliverables: ["3 agendas estratégicas", "3 parceiros potenciais", "3 fontes de financiamento"] },
  { key: "universidade", icon: BookOpen, label: "Universidade", deliverables: ["Índice de Conversão Estrutural", "Áreas fortes e frágeis", "3 parcerias estratégicas"] },
  { key: "empresa", icon: Factory, label: "Empresa", deliverables: ["3 parceiros acadêmicos", "3 instrumentos disponíveis", "Diagnóstico de dependência"] },
  { key: "governo", icon: Building2, label: "Governo", deliverables: ["Investir / Reestruturar / Criar / Reduzir", "Setores críticos", "Alavancas prioritárias"] },
];

const ENTRADAS_DIARIO = [
  {
    data: "31 jul 2026",
    tag: "Infraestrutura",
    tagColor: "bg-blue-500/10 text-blue-400",
    titulo: "Arquitetura inicial — 8 edge functions em paralelo",
    resumo: "Deploy das primeiras camadas analíticas do Motor: layer-knowledge (OpenAlex), layer-technology (GitHub + CAGED + CNAE + NCM), layer-policy (PNCP + Transparência), layer-international (BCB + COMEX), layer-sidra (PINTEC + CEMPRE + PIB), layer-patents (EPO OPS), layer-cnpq (bolsas + convênios MCTI) e motor-search como orquestrador com Promise.all.",
    detalhe: "Problema crítico identificado: fetchCaged chamava PNADC/IBGE (20s+) + loadCnaeCache (20s) em sequência — estourava o limite de 60s das edge functions do Supabase. Solução: CNAE offline por dicionário semântico estático, CAGED simplificado via IPEAData (3 séries nacionais, ~3s), NCM com Promise.race de 8s. Tempo total da layer-technology: de 80s para 8–12s.",
    icone: Code2,
  },
  {
    data: "31 jul 2026",
    tag: "Epistemologia",
    tagColor: "bg-violet-500/10 text-violet-400",
    titulo: "Problema de matching semântico CNAE: terminologia técnica vs. linguagem jurídica",
    resumo: "Descoberta estrutural: a CNAE usa linguagem jurídica oficial ('horticultura', 'cultivo') enquanto usuários usam termos técnicos/comerciais ('hidropônico', 'aquaponia', 'fotovoltaico'). Nenhum algoritmo de busca textual resolve isso.",
    detalhe: "Exemplo concreto: 0121-1/01 se chama 'Horticultura, exceto morango' — a palavra 'hidropônico' não existe nas descrições CNAE. Solução: dicionário semântico curado com ~120 termos técnicos mapeados diretamente às subclasses CNAE corretas (fonte: CONCLA 2.3). Mesma limitação identificada para 'fotovoltaico' → 'captação de energia solar', 'bateria de lítio' → 'acumuladores elétricos', 'drone' → 'construção de aeronaves'. O dicionário semântico resolve o gap entre a linguagem do mercado e a linguagem do Estado.",
    icone: Brain,
  },
  {
    data: "31 jul 2026",
    tag: "Decisão técnica",
    tagColor: "bg-amber-500/10 text-amber-400",
    titulo: "CAGED por CNAE: limitação estrutural dos dados públicos brasileiros",
    resumo: "Dado por CNAE específico (ex: empregos em 'horticultura hidropônica') não está disponível em API pública aberta. Os microdados CAGED por CNAE exigem acesso especial aos arquivos RAIS/MTE — sigilosos para pessoa física.",
    detalhe: "O IPEAData tem séries por seção CNAE (letra A, B, C...) mas não por divisão/subclasse. Para granularidade estadual, as séries ADMISNC e DESLIGNC permitem filtrar por TERCODIGO (código IBGE da UF). Decisão: exibir dado estadual quando há localização configurada + nota honesta de limitação ('Dado por setor específico não disponível em API pública — requer acesso aos microdados RAIS/MTE'). Transparência epistemológica como princípio metodológico.",
    icone: Wrench,
  },
  {
    data: "31 jul 2026",
    tag: "UX/Acessibilidade",
    tagColor: "bg-emerald-500/10 text-emerald-400",
    titulo: "Redesenho completo para linguagem acessível a leigos",
    resumo: "Análise: o Motor usava jargão técnico em toda a interface ('saldo líquido', 'seção CNAE B', 'série nacional agregada', 'CBO', 'ICT', 'TRL'). Reestruturação completa para perguntas diretas em linguagem humana.",
    detalhe: "Princípio implementado: cada aba abre com um card de contexto — título em pergunta direta + parágrafo explicando o que é a fonte, de onde vem o dado e por que importa para aquele perfil. Exemplos: 'Gap de Tradução' → '🔬 Ciência vira produto?', 'Dependência Científica' → '🌍 Pesquisa própria ou importada?', 'Articulação U-E' → '🤝 Universidade e empresa conversam?'. Países exibidos com nome completo + bandeira (MX → 🇲🇽 México). Números CAGED com labels descritivos ('pessoas contratadas com carteira', 'empregos criados no saldo final'). Objetivo: qualquer cidadão sem formação técnica deve entender os dados.",
    icone: MessageSquare,
  },
  {
    data: "31 jul 2026",
    tag: "Políticas públicas",
    tagColor: "bg-orange-500/10 text-orange-400",
    titulo: "Camada de políticas: Decreto 70.683/SP e mapeamento do ecossistema de inovação",
    resumo: "Incorporação do Decreto 70.683 de 16/06/2026 (Política Estadual de Distritos de Inovação de SP), lei nova não indexada em treinamentos de IA. Mapeamento de 7 instrumentos de política de inovação com relevância diferenciada por perfil.",
    detalhe: "Fontes integradas: NIB (R$300bi), PBIA (R$23bi), Marco Legal CT&I, Nova Lei Geral da Gestão Pública, Decreto 70.683/SP, LC-1049/SP, Lei de Inovação Município SP. Ecossistema: ANPROTEC (363 incubadoras, 57 aceleradoras, 3.694 empresas incubadas), InovAtiva Brasil, PIPE-FAPESP, Startup Brasil. Lei do Bem com dados reais ano-base 2024: 4.252 empresas, R$51,59bi P&D, R$11,98bi renúncia — dados publicados pelo MCTI em 16/07/2026.",
    icone: Brain,
  },
  {
    data: "01 ago 2026",
    tag: "Perfil Empresa",
    tagColor: "bg-rose-500/10 text-rose-400",
    titulo: "Redesenho conceitual do painel da empresa — do dado para a decisão",
    resumo: "Diagnóstico: o painel da empresa tinha 8+ abas fragmentadas com indicadores nacionais vazios. Elementos valiosos (calculadora Lei do Bem, parceria ICT) estavam escondidos. Reestruturação para 3 perguntas de negócio em scroll linear.",
    detalhe: "Nova estrutura: (1) 'Vale entrar nesse mercado?' — TRL como decisor make-or-buy com linguagem direta ('✅ Tecnologia madura — comprar ou licenciar' / '🤝 Co-desenvolver com ICT' / '🔬 Investir em P&D próprio'), métricas de mercado, contratos públicos locais, mão de obra; (2) 'Quanto custa inovar?' — Calculadora Lei do Bem embutida + 3 outros incentivos (BNDES, Finep, EMBRAPII); (3) 'Quem pode ajudar?' — ICTs com pesquisadores nominados, modal passo a passo Marco Legal CT&I. Análise IA colapsada por padrão. Princípio: o empresário não sabe o que é CNAE, TRL ou ICT — e não precisa saber.",
    icone: Wrench,
  },
  {
    data: "01 ago 2026",
    tag: "Localização geográfica",
    tagColor: "bg-teal-500/10 text-teal-400",
    titulo: "Localização do usuário como variável de contexto transversal",
    resumo: "Implementação de Estado + Município na tela de busca, propagado como filtro geográfico para todas as 4 layers e os 4 painéis. Municípios via API IBGE em tempo real (lista de ~5.570 municípios).",
    detalhe: "Impacto por layer: layer-policy filtra PNCP por ufSigla + esfera E/M (estadual/municipal); layer-sidra usa nível N3 (UF) no SIDRA para empresas do setor no estado; layer-knowledge faz busca paralela no OpenAlex por instituições na cidade/estado; layer-technology usa séries regionais ADMISNC/DESLIGNC do IPEAData com TERCODIGO (código IBGE da UF). Badge '📍 Curitiba · PR' no topo de cada painel com contextualização por perfil: 'Filtrando mercado, concorrentes e contratos públicos locais' (empresa) vs. 'Priorizando grupos de pesquisa e editais da sua região' (pesquisador). Botão ✕ para remover filtro.",
    icone: Code2,
  },
  {
    data: "01 ago 2026",
    tag: "Mural de Oportunidades",
    tagColor: "bg-primary/10 text-primary",
    titulo: "Mural de Oportunidades: R$3,6bi+ em subvenção visível ao empresário",
    resumo: "Criação da layer-oportunidades e componente MuralOportunidades. Premissa: a maioria dos empresários não sabe que R$3,6bi em subvenção Finep estão disponíveis em 2026 — e o governo não comunica isso de forma acessível.",
    detalhe: "Fontes: PNCP (pregões abertos com prazo real, classificados por urgência: 🔴 ≤15 dias, 🟡 ≤60 dias, 🟢 aberto), curadoria de 10 instrumentos federais com verbas concretas (Finep Tecnologias Digitais R$300M prazo 30/09/2026, Finep NIB R$3,3bi em 10 editais, BNDES+Finep Centros P&D, Finep Startups IA, BNDES Inovação 6%a.a., EMBRAPII 1/3 sem devolução, Lei do Bem R$11,98bi deduzidos em 2024, Encomenda Tecnológica), 12 FAPs estaduais mapeadas com chamadas próprias. Cada card mostra verba disponível em destaque, critérios de elegibilidade e CTA direto. Decisão de design: verba é a primeira informação visível ao expandir — não o nome do programa.",
    icone: Brain,
  },
  {
    data: "Set 2026",
    tag: "Próximos passos",
    tagColor: "bg-muted text-muted-foreground",
    titulo: "Agenda de desenvolvimento — versão beta pública",
    resumo: "Itens identificados para a próxima fase: microdados RAIS via acesso especial MTE, mapa de coautoria interativo (pesquisador), calculadora de incentivos empilhados (empresa), benchmarking internacional por tema (governo), posicionamento relativo de ICTs por campo (universidade).",
    detalhe: "Pendências técnicas: correlação NCM→CNAE curada (não existe como dataset público — requer construção própria); série CAGED por CNAE em nível de subclasse (exige microdados RAIS); API Querido Diário com filtro por tema + município em escala; índice de concentração geográfica de pesquisa por tema. Tese: documentar como cada limitação técnica revela uma limitação estrutural do sistema de dados públicos brasileiro — a opacidade dos dados é, ela mesma, um dado sobre o sistema de inovação.",
    icone: MessageSquare,
  },
];

function DiarioEntrada({ entrada, index }: { entrada: typeof ENTRADAS_DIARIO[0]; index: number }) {
  const [aberto, setAberto] = useState(index === 0);
  const Icon = entrada.icone;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-4"
    >
      {/* Linha do tempo */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {index < ENTRADAS_DIARIO.length - 1 && (
          <div className="w-px flex-1 bg-border/50 my-2" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 pb-6 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />{entrada.data}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${entrada.tagColor}`}>
            {entrada.tag}
          </span>
        </div>

        <button
          onClick={() => setAberto(a => !a)}
          className="w-full text-left group"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
              {entrada.titulo}
            </h3>
            {aberto
              ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            }
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{entrada.resumo}</p>
        </button>

        {aberto && (
          <div className="mt-3 pl-3 border-l-2 border-primary/20">
            <p className="text-xs text-muted-foreground leading-relaxed">{entrada.detalhe}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DiarioEntradas() {
  return (
    <div className="space-y-0">
      {ENTRADAS_DIARIO.map((entrada, i) => (
        <DiarioEntrada key={i} entrada={entrada} index={i} />
      ))}
    </div>
  );
}

const Conceito = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/3 blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <UfprLogo className="w-20 h-20 mx-auto mb-8 opacity-80" />
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Motor da Inovação
            <span className="block text-2xl md:text-3xl font-normal text-muted-foreground mt-3">
              Diagnóstico Estrutural do Sistema Nacional de Inovação
            </span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Uma infraestrutura computacional pública que traduz objetos tecnológicos 
            em redes verificáveis de incidência, cruzando <strong className="text-foreground">ciência</strong>, 
            {" "}<strong className="text-foreground">tecnologia</strong>, <strong className="text-foreground">política</strong> e 
            {" "}<strong className="text-foreground">inserção internacional</strong> para gerar diagnósticos estruturais orientados à decisão.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Acessar o Motor
            </Link>
            <a
              href="#arquitetura"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Ver arquitetura
            </a>
          </motion.div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-6">
              O problema estrutural
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-muted-foreground leading-relaxed mb-8">
              O Brasil possui dados sobre ciência (CNPq, CAPES), patentes (INPI), indústria (IBGE), 
              comércio exterior (COMEX) e fomento (Finep, BNDES). Mas <strong className="text-foreground">não existe 
              uma infraestrutura pública</strong> capaz de cruzar essas bases a partir de um objeto tecnológico 
              e gerar diagnóstico de sistema.
            </motion.p>

            <motion.div variants={fadeUp} custom={2} className="bg-card border border-border rounded-2xl p-8">
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                {["Objeto tecnológico", "Tradução", "Rede de incidência", "Gargalos", "Instrumentos", "Decisão"].map((step, i) => (
                  <span key={i} className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : i === 5 ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'}`}>
                      {step}
                    </span>
                    {i < 5 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 4 CAMADAS */}
      <section id="arquitetura" className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              4 Camadas Analíticas
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Cada camada consulta bases públicas reais, normaliza os dados e calcula outputs estruturados. 
              Os índices são cruzados entre camadas.
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6">
              {layers.map((layer, i) => (
                <motion.div
                  key={layer.title}
                  variants={fadeUp}
                  custom={i + 2}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center`}>
                      <layer.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">{layer.title}</h3>
                  </div>

                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Fontes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {layer.sources.map((s) => (
                        <span key={s} className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Outputs calculados</p>
                    <ul className="space-y-1">
                      {layer.outputs.map((o) => (
                        <li key={o} className="text-sm text-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ÍNDICES CRUZADOS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              Índices Cruzados
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Calculados cruzando múltiplas camadas — não apenas uma base isolada. 
              Permitem uma leitura computacional da política industrial.
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-4">
              {indices.map((idx, i) => (
                <motion.div
                  key={idx.code}
                  variants={fadeUp}
                  custom={i + 2}
                  className="bg-card border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      idx.alert === "critical" ? "bg-red-500/10 text-red-500" :
                      idx.alert === "warning" ? "bg-amber-500/10 text-amber-500" :
                      "bg-primary/10 text-primary"
                    }`}>
                      <idx.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono text-lg font-bold text-foreground">{idx.code}</p>
                      <p className="text-xs text-muted-foreground">{idx.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{idx.desc}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Camadas: <span className="font-mono">{idx.layers}</span>
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PERSONAS */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-3 text-center">
              Entrega por Persona
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              O mesmo diagnóstico estrutural, com trilhas prescritivas diferentes. 
              Cada persona recebe entregas concretas orientadas à sua decisão.
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-6">
              {personas.map((p, i) => (
                <motion.div key={p.key} variants={fadeUp} custom={i + 2}>
                  <Link
                    to={`/${p.key}`}
                    className="block bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <p.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{p.label}</h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                    <ul className="space-y-2">
                      {p.deliverables.map((d) => (
                        <li key={d} className="text-sm text-muted-foreground flex items-center gap-2">
                          <BarChart3 className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PERGUNTA CENTRAL */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-10 md:p-16">
              <Database className="w-10 h-10 text-primary mx-auto mb-6" />
              <p className="text-xl md:text-2xl text-foreground leading-relaxed font-serif italic">
                "Como infraestruturas computacionais públicas podem ampliar a capacidade do Brasil 
                de coordenar ciência, tecnologia e política industrial?"
              </p>
              <p className="text-sm text-muted-foreground mt-6">
                Tese de Doutorado em Políticas Públicas — UFPR
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* REFERÊNCIAS TEÓRICAS */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <h3 className="text-lg font-semibold text-center mb-8">Fundamento Teórico</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Sistemas Nacionais de Inovação (Lundvall)",
              "Trajetórias tecnológicas (Nelson & Winter)",
              "Capacidade estatal e coordenação (Evans)",
              "Missões e Estado empreendedor (Mazzucato)",
            ].map((ref) => (
              <div key={ref} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{ref}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-foreground font-medium mt-8">
            O Motor da Inovação operacionaliza teoria econômica como infraestrutura pública.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Conceito;

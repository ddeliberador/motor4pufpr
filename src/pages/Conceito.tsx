import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Zap, BookOpen, Microscope, Factory, Landmark, Globe, 
  ArrowRight, Database, BarChart3, Network, Target,
  AlertTriangle, TrendingUp, Layers, GitBranch
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

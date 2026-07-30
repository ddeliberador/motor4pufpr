import { Link } from "react-router-dom";
import { BookOpen, GitBranch, Globe, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PersonaSelector from "@/components/mvp/PersonaSelector";

const LAYERS = [
  { icon: BookOpen, label: "Conhecimento", sources: "OpenAlex · CAPES · CNPq · INEP" },
  { icon: GitBranch, label: "Tecnologia", sources: "INPI · GitHub · RAIS · ANVISA" },
  { icon: Landmark, label: "Política", sources: "PNCP · Transparência · TCU · SIOP" },
  { icon: Globe, label: "Internacional", sources: "COMEX · BCB · OpenAlex intl." },
];

const Index = () => (
  <div className="min-h-screen flex flex-col bg-[#07101c]">
    <Header />

    <main className="flex-1 pt-16">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24">

        {/* Layout duas colunas */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Coluna esquerda — apresentação */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-10"
          >
            {/* Identificação acadêmica */}
            <div>
              <p className="text-xs text-blue-600 font-mono tracking-widest uppercase mb-6">
                PPGPP-UFPR · Políticas Públicas e Inovação
              </p>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                Diagnóstico do<br />
                <span className="text-blue-500">Sistema de<br />Inovação Brasileiro</span>
              </h1>
              <p className="text-slate-400 text-base leading-relaxed">
                Conecta 40+ bases públicas e cruza quatro camadas analíticas para gerar diagnósticos verificáveis por tema tecnológico.
              </p>
            </div>

            {/* As 4 camadas */}
            <div className="space-y-3">
              <p className="text-xs text-slate-600 uppercase tracking-widest font-mono">4 camadas analíticas</p>
              {LAYERS.map((layer, i) => {
                const Icon = layer.icon;
                return (
                  <div key={i} className="flex items-start gap-4 py-3 border-b border-slate-800/60">
                    <div className="w-8 h-8 rounded bg-blue-950 border border-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{layer.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{layer.sources}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Índices */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {[
                { code: "GT", name: "Gap de Tradução" },
                { code: "CD", name: "Dependência Externa" },
                { code: "AUE", name: "Articulação U-E" },
                { code: "EI", name: "Efetividade Instrumental" },
              ].map(idx => (
                <div key={idx.code} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-500">{idx.code}</span>
                  <span className="text-xs text-slate-500">{idx.name}</span>
                </div>
              ))}
            </div>

            {/* Link conceito */}
            <Link
              to="/conceito"
              className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Nelson &amp; Winter · Mazzucato · Freeman
            </Link>

            {/* Selo institucional — Banco Brasileiro de Soluções de IA */}
            <div className="border border-slate-800 rounded-lg px-4 py-3 flex items-start gap-3">
              <div className="w-1.5 h-full min-h-[2rem] bg-blue-600 rounded-full flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Registro acadêmico</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Submetido ao{" "}
                  <span className="text-blue-400 font-medium">Banco Brasileiro de Soluções de IA</span>
                  {" "}em 28/07/2026 como protótipo de pesquisa de doutorado acadêmico.
                </p>
                <p className="text-[10px] text-slate-600 mt-1">PPGPP · UFPR · Políticas Públicas e Inovação</p>
              </div>
            </div>
          </motion.div>

          {/* Coluna direita — busca */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="bg-[#0c1929] border border-slate-800 rounded-2xl p-8">
              <p className="text-xs text-slate-600 uppercase tracking-widest font-mono mb-6">
                Consulta ao sistema
              </p>
              <PersonaSelector />
            </div>
          </motion.div>

        </div>
      </div>
    </main>

    <Footer />
  </div>
);

export default Index;

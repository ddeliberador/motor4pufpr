import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PersonaSelector from "@/components/mvp/PersonaSelector";

const LayerDiagram = () => (
  <svg viewBox="0 0 640 220" className="w-full max-w-2xl mx-auto opacity-60" aria-hidden="true">
    {/* Linhas de conexão entre camadas */}
    <line x1="160" y1="110" x2="213" y2="110" stroke="#334155" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="267" y1="110" x2="320" y2="110" stroke="#334155" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="373" y1="110" x2="427" y2="110" stroke="#334155" strokeWidth="1" strokeDasharray="3 3"/>
    {/* Linhas verticais internas */}
    <line x1="80" y1="75" x2="80" y2="85" stroke="#1e40af" strokeWidth="1"/>
    <line x1="80" y1="135" x2="80" y2="145" stroke="#1e40af" strokeWidth="1"/>
    <line x1="240" y1="75" x2="240" y2="85" stroke="#1e40af" strokeWidth="1"/>
    <line x1="240" y1="135" x2="240" y2="145" stroke="#1e40af" strokeWidth="1"/>
    <line x1="400" y1="75" x2="400" y2="85" stroke="#1e40af" strokeWidth="1"/>
    <line x1="400" y1="135" x2="400" y2="145" stroke="#1e40af" strokeWidth="1"/>
    <line x1="560" y1="75" x2="560" y2="85" stroke="#1e40af" strokeWidth="1"/>
    <line x1="560" y1="135" x2="560" y2="145" stroke="#1e40af" strokeWidth="1"/>

    {/* Camada 1 — Conhecimento */}
    <rect x="20" y="70" width="120" height="80" rx="4" fill="none" stroke="#1e3a5f" strokeWidth="1"/>
    <rect x="20" y="70" width="120" height="18" rx="4" fill="#0f172a"/>
    <text x="80" y="82" textAnchor="middle" fill="#60a5fa" fontSize="9" fontFamily="monospace">CAMADA 1</text>
    <text x="80" y="102" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">Conhecimento</text>
    <text x="80" y="118" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">OpenAlex · CAPES</text>
    <text x="80" y="132" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">CNPq · INEP</text>

    {/* Camada 2 — Tecnologia */}
    <rect x="180" y="70" width="120" height="80" rx="4" fill="none" stroke="#1e3a5f" strokeWidth="1"/>
    <rect x="180" y="70" width="120" height="18" rx="4" fill="#0f172a"/>
    <text x="240" y="82" textAnchor="middle" fill="#60a5fa" fontSize="9" fontFamily="monospace">CAMADA 2</text>
    <text x="240" y="102" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">Tecnologia</text>
    <text x="240" y="118" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">INPI · GitHub</text>
    <text x="240" y="132" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">RAIS · ANVISA</text>

    {/* Camada 3 — Política */}
    <rect x="340" y="70" width="120" height="80" rx="4" fill="none" stroke="#1e3a5f" strokeWidth="1"/>
    <rect x="340" y="70" width="120" height="18" rx="4" fill="#0f172a"/>
    <text x="400" y="82" textAnchor="middle" fill="#60a5fa" fontSize="9" fontFamily="monospace">CAMADA 3</text>
    <text x="400" y="102" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">Política</text>
    <text x="400" y="118" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">PNCP · TCU</text>
    <text x="400" y="132" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">Transparência</text>

    {/* Camada 4 — Internacional */}
    <rect x="500" y="70" width="120" height="80" rx="4" fill="none" stroke="#1e3a5f" strokeWidth="1"/>
    <rect x="500" y="70" width="120" height="18" rx="4" fill="#0f172a"/>
    <text x="560" y="82" textAnchor="middle" fill="#60a5fa" fontSize="9" fontFamily="monospace">CAMADA 4</text>
    <text x="560" y="102" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">Internacional</text>
    <text x="560" y="118" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">COMEX · BCB</text>
    <text x="560" y="132" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">OpenAlex intl.</text>

    {/* Índices cruzados — barra inferior */}
    <rect x="60" y="170" width="520" height="28" rx="3" fill="#0a1628" stroke="#1e3a5f" strokeWidth="1"/>
    <text x="80" y="188" fill="#334155" fontSize="8" fontFamily="monospace">ÍNDICES CRUZADOS</text>
    <text x="210" y="188" fill="#1e40af" fontSize="8" fontFamily="monospace">GT</text>
    <text x="238" y="188" fill="#475569" fontSize="8" fontFamily="monospace">Gap de Tradução</text>
    <text x="345" y="188" fill="#1e40af" fontSize="8" fontFamily="monospace">CD</text>
    <text x="373" y="188" fill="#475569" fontSize="8" fontFamily="monospace">Dependência Ext.</text>
    <text x="475" y="188" fill="#1e40af" fontSize="8" fontFamily="monospace">AUE · EI</text>

    {/* Seta de input */}
    <text x="320" y="30" textAnchor="middle" fill="#334155" fontSize="9" fontFamily="monospace">objeto tecnológico</text>
    <line x1="320" y1="35" x2="320" y2="55" stroke="#1e3a5f" strokeWidth="1" markerEnd="url(#arr)"/>
    <defs>
      <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0 0 L6 3 L0 6 Z" fill="#1e3a5f"/>
      </marker>
    </defs>
    <line x1="160" y1="55" x2="480" y2="55" stroke="#1e3a5f" strokeWidth="1"/>
    <line x1="80" y1="55" x2="80" y2="70" stroke="#1e3a5f" strokeWidth="1"/>
    <line x1="240" y1="55" x2="240" y2="70" stroke="#1e3a5f" strokeWidth="1"/>
    <line x1="400" y1="55" x2="400" y2="70" stroke="#1e3a5f" strokeWidth="1"/>
    <line x1="560" y1="55" x2="560" y2="70" stroke="#1e3a5f" strokeWidth="1"/>
  </svg>
);

const STATS = [
  { value: "40+", label: "bases públicas" },
  { value: "4", label: "camadas analíticas" },
  { value: "11", label: "edge functions" },
  { value: "4", label: "índices cruzados" },
];

const Index = () => (
  <div className="min-h-screen flex flex-col bg-[#080f1a]">
    <Header />

    <main className="flex-1 flex flex-col pt-16">

      {/* Cabeçalho institucional */}
      <section className="border-b border-[#0f2040] px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#1e40af] tracking-widest uppercase">
            Motor 4P · PPGPP-UFPR · Laboratório de Políticas Públicas e Inovação
          </span>
          <span className="text-[10px] font-mono text-[#1e3a5f]">
            v0.1 — pesquisa aberta · licença MIT
          </span>
        </div>
      </section>

      {/* Hero — tipográfico */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[11px] font-mono text-[#1e40af] tracking-widest uppercase mb-5">
            Infraestrutura computacional pública · Sistema Nacional de Inovação
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6 tracking-tight">
            Diagnóstico estrutural do<br />
            <span className="text-[#3b82f6]">ecossistema de inovação brasileiro</span>
          </h1>
          <p className="text-[#64748b] max-w-2xl text-base leading-relaxed mb-10">
            O Motor 4P conecta 40+ bases públicas — OpenAlex, PNCP, Portal da Transparência, COMEX, BCB —
            e gera análises cruzadas por camada: conhecimento científico, tecnologia, instrumentos de política
            e inserção internacional. Uma busca. Quatro perspectivas. Dados verificáveis.
          </p>

          {/* Métricas institucionais */}
          <div className="flex flex-wrap gap-6 mb-12">
            {STATS.map((s) => (
              <div key={s.label} className="border-l border-[#1e3a5f] pl-4">
                <p className="text-2xl font-bold text-[#3b82f6] font-mono">{s.value}</p>
                <p className="text-[11px] text-[#475569] uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Diagrama de arquitetura */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mb-14"
        >
          <p className="text-[10px] font-mono text-[#1e3a5f] uppercase tracking-widest mb-4">
            Arquitetura analítica
          </p>
          <LayerDiagram />
        </motion.div>

        {/* Busca unificada */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="border-t border-[#0f2040] pt-10">
            <p className="text-[10px] font-mono text-[#1e3a5f] uppercase tracking-widest mb-6">
              Consulta ao sistema
            </p>
            <PersonaSelector />
          </div>
        </motion.div>
      </section>

      {/* Rodapé de referências */}
      <section className="border-t border-[#0f2040] mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            to="/conceito"
            className="inline-flex items-center gap-2 text-xs text-[#334155] hover:text-[#64748b] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Fundamentação teórica — Nelson &amp; Winter · Mazzucato · Freeman
          </Link>
          <Link
            to="/documentacao"
            className="text-xs text-[#334155] hover:text-[#64748b] transition-colors font-mono"
          >
            documentação técnica →
          </Link>
        </div>
      </section>

    </main>

    <Footer />
  </div>
);

export default Index;

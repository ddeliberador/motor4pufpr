import { useState } from "react";
import Header from "@/components/Header";
import Cenario1Infraestrutura from "@/components/analise/cenarios/Cenario1Infraestrutura";
import Cenario2Capacidade from "@/components/analise/cenarios/Cenario2Capacidade";
import Cenario3Governanca from "@/components/analise/cenarios/Cenario3Governanca";
import Cenario4Maturidade from "@/components/analise/cenarios/Cenario4Maturidade";

const CENARIOS = [
  { id: 1, titulo: "Infraestrutura de IA", icone: "bolt", cor: "#f472b6",
    descricao: "Energia, conectividade e datacenters são os alicerces de qualquer ecossistema de IA. Este cenário mapeia o que existe — e onde falta." },
  { id: 2, titulo: "Capacidade Científica", icone: "science", cor: "#34d399",
    descricao: "O Brasil produz ciência de qualidade. Mas entre a publicação e o produto existe um vale da morte. Este cenário mostra onde o SNI está integrado — e onde está quebrado." },
  { id: 3, titulo: "Governança e Investimento", icone: "policy", cor: "#a78bfa",
    descricao: "Políticas públicas curadas e seus investimentos declarados. Este cenário mostra quem investiu, em quê, e em qual camada." },
  { id: 4, titulo: "Diagnóstico de Maturidade", icone: "radar", cor: "#facc15",
    descricao: "A síntese: indicadores calculados a partir dos dados reais das camadas anteriores, camada por camada." },
] as const;

type CenarioId = 1 | 2 | 3 | 4;

export default function Analise() {
  const [cenarioAtivo, setCenarioAtivo] = useState<CenarioId>(1);
  const cfg = CENARIOS.find(c => c.id === cenarioAtivo)!;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-0 border-b border-border"
        style={{ background: `linear-gradient(135deg, ${cfg.cor}10 0%, transparent 60%)` }}>
        <div className="px-6 max-w-7xl mx-auto">
          <div className="flex gap-2 overflow-x-auto">
            {CENARIOS.map(c => (
              <button key={c.id} onClick={() => setCenarioAtivo(c.id as CenarioId)}
                className={`flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                  cenarioAtivo === c.id
                    ? "border-b-transparent bg-card text-foreground shadow-sm -mb-px relative z-10"
                    : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <span className="material-symbols-outlined text-base leading-none"
                  style={{ fontVariationSettings: '"FILL" 1', color: c.cor }}>{c.icone}</span>
                <span className="hidden sm:inline">{c.titulo}</span>
                <span className="sm:hidden">C{c.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-start gap-4 flex-wrap">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: cfg.cor + "20" }}>
            <span className="material-symbols-outlined text-xl leading-none"
              style={{ fontVariationSettings: '"FILL" 1', color: cfg.cor }}>{cfg.icone}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cfg.cor }}>Cenário {cenarioAtivo} de 4</span>
            <h1 className="text-xl font-bold text-foreground mt-0.5">{cfg.titulo}</h1>
            <p className="text-sm text-muted-foreground mt-1">{cfg.descricao}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {cenarioAtivo > 1 && (
              <button onClick={() => setCenarioAtivo((cenarioAtivo - 1) as CenarioId)}
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                <span className="material-symbols-outlined text-sm leading-none">arrow_back</span>Anterior
              </button>
            )}
            {cenarioAtivo < 4 && (
              <button onClick={() => setCenarioAtivo((cenarioAtivo + 1) as CenarioId)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors"
                style={{ backgroundColor: cfg.cor }}>
                Próximo<span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {cenarioAtivo === 1 && <Cenario1Infraestrutura />}
        {cenarioAtivo === 2 && <Cenario2Capacidade />}
        {cenarioAtivo === 3 && <Cenario3Governanca />}
        {cenarioAtivo === 4 && <Cenario4Maturidade />}
      </div>
    </div>
  );
}

import { useState } from "react";
import Header from "@/components/Header";
import Cenario1Infraestrutura from "@/components/analise/cenarios/Cenario1Infraestrutura";
import Cenario2Capacidade from "@/components/analise/cenarios/Cenario2Capacidade";
import Cenario3Governanca from "@/components/analise/cenarios/Cenario3Governanca";
import Cenario4Maturidade from "@/components/analise/cenarios/Cenario4Maturidade";
import Cenario5Dependencia from "@/components/analise/cenarios/Cenario5Dependencia";

const CENARIOS = [
  { id: 1, titulo: "Infraestrutura de IA", subtitulo: "O Brasil tem a base física para sustentar IA?", icone: "bolt", cor: "#f472b6",
    descricao: "Energia, conectividade e datacenters são os alicerces de qualquer ecossistema de IA. Este cenário mapeia o que existe — e onde falta." },
  { id: 2, titulo: "Capacidade Científica", subtitulo: "Onde está o conhecimento e quem o aplica?", icone: "science", cor: "#34d399",
    descricao: "O Brasil produz ciência de qualidade. Mas entre a publicação e o produto existe um vale da morte. Este cenário mostra onde o SNI está integrado — e onde está quebrado." },
  { id: 3, titulo: "Governança e Investimento", subtitulo: "O dinheiro público chegou onde o SNI precisa?", icone: "policy", cor: "#a78bfa",
    descricao: "R$ 374 bilhões em 17 políticas públicas mapeadas. Este cenário mostra quem investiu, em quê, e se o investimento chegou onde havia demanda real." },
  { id: 4, titulo: "Diagnóstico de Maturidade", subtitulo: "Em que nível está o Brasil nas 7 Camadas de IA?", icone: "radar", cor: "#facc15",
    descricao: "A síntese. Com base nos dados dos três cenários anteriores, este cenário pontua a maturidade do SNI brasileiro layer por layer, usando o framework OECD.AI Index." },
  { id: 5, titulo: "Dependência Tecnológica", subtitulo: "Quem controla cada camada da IA no Brasil?", icone: "hub", cor: "#38bdf8",
    descricao: "Setor por setor, quem são os atores internacionais e nacionais em cada uma das 7 camadas — com percentual só onde há dado oficial." },
] as const;

type CenarioId = 1 | 2 | 3 | 4 | 5;

export default function Analise() {
  const [cenarioAtivo, setCenarioAtivo] = useState<CenarioId>(1);
  const cfg = CENARIOS.find(c => c.id === cenarioAtivo)!;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Abas de navegação */}
      <div className="pt-20 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="px-4 max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {CENARIOS.map(c => (
            <button key={c.id} onClick={() => setCenarioAtivo(c.id as CenarioId)}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all ${
                cenarioAtivo === c.id
                  ? "border-current text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={cenarioAtivo === c.id ? { borderColor: c.cor, color: c.cor } : {}}>
              <span className="material-symbols-outlined text-base leading-none" style={{ fontVariationSettings: '"FILL" 1', color: c.cor }}>{c.icone}</span>
              <span className="hidden sm:inline">C{c.id} — {c.titulo}</span>
              <span className="sm:hidden">C{c.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero narrativo */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-start gap-4 flex-wrap">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: cfg.cor + "20" }}>
            <span className="material-symbols-outlined text-xl leading-none" style={{ fontVariationSettings: '"FILL" 1', color: cfg.cor }}>{cfg.icone}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cfg.cor }}>Cenário {cenarioAtivo} de 5</p>
            <h1 className="text-xl font-bold text-foreground mt-0.5">{cfg.titulo}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{cfg.descricao}</p>
          </div>
          <div className="flex gap-2 shrink-0 self-center">
            {cenarioAtivo > 1 && (
              <button onClick={() => setCenarioAtivo((cenarioAtivo - 1) as CenarioId)}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                <span className="material-symbols-outlined text-sm leading-none">arrow_back</span> Anterior
              </button>
            )}
            {cenarioAtivo < 5 && (
              <button onClick={() => setCenarioAtivo((cenarioAtivo + 1) as CenarioId)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
                style={{ backgroundColor: cfg.cor }}>
                Próximo <span className="material-symbols-outlined text-sm leading-none">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {cenarioAtivo === 1 && <Cenario1Infraestrutura />}
        {cenarioAtivo === 2 && <Cenario2Capacidade />}
        {cenarioAtivo === 3 && <Cenario3Governanca />}
        {cenarioAtivo === 4 && <Cenario4Maturidade />}
        {cenarioAtivo === 5 && <Cenario5Dependencia />}
      </div>
    </div>
  );
}

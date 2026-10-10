import { useState } from "react";
import Header from "@/components/Header";
import Cenario1Infraestrutura from "@/components/analise/cenarios/Cenario1Infraestrutura";
import Cenario2Capacidade from "@/components/analise/cenarios/Cenario2Capacidade";
import Cenario3Governanca from "@/components/analise/cenarios/Cenario3Governanca";
import Cenario5Dependencia from "@/components/analise/cenarios/Cenario5Dependencia";
import CenarioInteracao from "@/components/analise/cenarios/CenarioInteracao";
import Cenario6SistemasEstaduais from "@/components/analise/cenarios/Cenario6SistemasEstaduais";
import { Button } from "@/components/ui/button";

const CENARIOS = [
  { id: 1, titulo: "Infraestrutura de IA", subtitulo: "O Brasil tem a base física para sustentar IA?", icone: "bolt", cor: "#f472b6",
    descricao: "Energia, conectividade e datacenters são os alicerces de qualquer ecossistema de IA. Este cenário mapeia o que existe — e onde falta." },
  { id: 2, titulo: "Capacidade Científica", subtitulo: "Onde está o conhecimento e quem o aplica?", icone: "science", cor: "#34d399",
    descricao: "O Brasil produz ciência de qualidade. Mas entre a publicação e o produto existe um vale da morte. Este cenário mostra onde o SNI está integrado — e onde está quebrado." },
  { id: 3, titulo: "Governança e Investimento", subtitulo: "O dinheiro público chegou onde o SNI precisa?", icone: "policy", cor: "#a78bfa",
    descricao: "Relaciona os cinco eixos, investimentos e entregas reais do PBIA às sete camadas de IA, com classificação curada pelo Motor." },
  { id: 4, titulo: "Dependência Tecnológica", subtitulo: "Quem controla cada camada da IA no Brasil?", icone: "hub", cor: "#38bdf8",
    descricao: "Setor por setor, quem são os atores internacionais e nacionais em cada uma das 7 camadas — com percentual só onde há dado oficial." },
  { id: 5, titulo: "Interação", subtitulo: "Como universidades, institutos e empresas cooperam?", icone: "share", cor: "#f59e0b",
    descricao: "Laços de cooperação ICT–empresa mediados pela EMBRAPII: quem coopera, com quem, com que dinheiro e com que resultado." },
  { id: 6, titulo: "Sistemas Estaduais", subtitulo: "Como se forma e se conecta o sistema de inovação de cada estado?", icone: "map", cor: "hsl(var(--sistema-local))",
    descricao: "Atores nas sete camadas de IA, relações entre estados, caminhos do fomento e limitações dos sistemas estaduais de inovação." },
] as const;

type CenarioId = 1 | 2 | 3 | 4 | 5 | 6;

export default function Analise() {
  const [cenarioAtivo, setCenarioAtivo] = useState<CenarioId>(1);
  const cfg = CENARIOS.find(c => c.id === cenarioAtivo) ?? CENARIOS[0];
  const corFundo = (cor: string, alpha: string) => cor.startsWith("hsl") ? `hsl(var(--sistema-local) / ${parseInt(alpha, 16) / 255})` : cor + alpha;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Menu de cenários em botões */}
      <div className="pt-20 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="px-4 py-3 max-w-7xl mx-auto grid grid-cols-2 gap-2 lg:grid-cols-6">
          {CENARIOS.map(c => {
            const ativo = cenarioAtivo === c.id;
            return (
              <Button variant="ghost" key={c.id} onClick={() => setCenarioAtivo(c.id as CenarioId)}
                className={`flex h-auto whitespace-normal items-center justify-start gap-2 rounded-xl border-2 px-2 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  ativo ? "shadow-md" : "border-border bg-card"}`}
                style={ativo ? { borderColor: c.cor, background: corFundo(c.cor, "1a") } : {}}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: corFundo(c.cor, ativo ? "40" : "20") }}>
                  <span className="material-symbols-outlined text-xl leading-none" style={{ fontVariationSettings: '"FILL" 1', color: c.cor }}>{c.icone}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: c.cor }}>Cenário {c.id}</span>
                  <span className={`block text-sm font-bold leading-tight ${ativo ? "text-foreground" : "text-muted-foreground"}`}>{c.titulo}</span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Hero narrativo: pergunta + resposta curta */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-start gap-4 flex-wrap">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: corFundo(cfg.cor, "20") }}>
            <span className="material-symbols-outlined text-2xl leading-none" style={{ fontVariationSettings: '"FILL" 1', color: cfg.cor }}>{cfg.icone}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.cor }}>Cenário {cenarioAtivo} de {CENARIOS.length} · {cfg.titulo}</p>
            <h1 className="text-3xl font-extrabold text-foreground mt-1">{cfg.subtitulo}</h1>
            <p className="text-base text-muted-foreground mt-2 max-w-3xl">{cfg.descricao}</p>
          </div>
          <div className="flex gap-2 shrink-0 self-center">
            {cenarioAtivo > 1 && (
              <button onClick={() => setCenarioAtivo((cenarioAtivo - 1) as CenarioId)}
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                <span className="material-symbols-outlined text-sm leading-none">arrow_back</span> Anterior
              </button>
            )}
            {cenarioAtivo < CENARIOS.length && (
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
      <div className="max-w-7xl px-4 mx-auto py-8">
        {cenarioAtivo === 1 && <Cenario1Infraestrutura />}
        {cenarioAtivo === 2 && <Cenario2Capacidade />}
        {cenarioAtivo === 3 && <Cenario3Governanca />}
        {cenarioAtivo === 4 && <Cenario5Dependencia />}
        {cenarioAtivo === 5 && <CenarioInteracao />}
        {cenarioAtivo === 6 && <Cenario6SistemasEstaduais />}
      </div>
    </div>
  );
}

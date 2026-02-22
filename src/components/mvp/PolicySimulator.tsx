import { useState } from "react";
import { Building2, Play, RefreshCw, AlertCircle, ChevronRight } from "lucide-react";
import { usePolicySimulator } from "@/hooks/useSmartInsights";
import { Button } from "@/components/ui/button";

interface PolicySimulatorProps {
  query: string;
  searchData: Record<string, unknown>;
}

const scenarioPresets = [
  {
    label: "Ampliar subvenção econômica",
    scenario: "E se o governo ampliar em 50% a subvenção econômica (Finep) para este objeto tecnológico nos próximos 3 anos? Qual seria o impacto em patentes, startups e empregos?",
  },
  {
    label: "Focar em startups deep tech",
    scenario: "E se o governo criar um programa específico de R$ 500M para startups deep tech neste setor? Qual seria o impacto em inovação, competitividade internacional e geração de emprego qualificado?",
  },
  {
    label: "Reduzir dependência externa",
    scenario: "E se o governo implementar uma política de substituição de importações tecnológicas neste setor, com incentivos fiscais e encomendas tecnológicas? Quanto custaria e em quanto tempo haveria resultados?",
  },
  {
    label: "Descentralização regional",
    scenario: "E se o governo criar polos regionais de inovação neste setor fora do eixo Sul-Sudeste, com investimento de R$ 200M distribuídos entre Norte, Nordeste e Centro-Oeste? Qual o impacto?",
  },
  {
    label: "Parceria universidade-empresa",
    scenario: "E se o governo criar um instrumento que exija co-investimento empresa-universidade (50/50) para projetos neste setor? Qual seria o impacto na transferência de tecnologia e na geração de patentes?",
  },
];

const PolicySimulator = ({ query, searchData }: PolicySimulatorProps) => {
  const { simulation, isSimulating, error, simulate, reset } = usePolicySimulator();
  const [customScenario, setCustomScenario] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (index: number) => {
    setActivePreset(index);
    setShowCustom(false);
    simulate(query, scenarioPresets[index].scenario, searchData);
  };

  const handleCustom = () => {
    if (!customScenario.trim()) return;
    setActivePreset(null);
    simulate(query, customScenario, searchData);
  };

  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={i} className="text-lg font-bold text-foreground mt-6 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-violet-500 inline-block" />
            {line.slice(3)}
          </h3>
        );
      }
      if (line.startsWith("### ")) return <h4 key={i} className="text-base font-semibold text-foreground mt-4 mb-1">{line.slice(4)}</h4>;
      if (line.startsWith("- ")) {
        const parts = line.slice(2).split(/\*\*(.*?)\*\*/g);
        return (
          <li key={i} className="text-sm text-muted-foreground ml-4 list-disc">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{part}</strong> : part)}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{part}</strong> : part)}</p>;
    });
  };

  // Not started
  if (!simulation && !isSimulating && !error) {
    return (
      <div className="card-modern p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Simulador de Política Pública</h3>
            <p className="text-sm text-muted-foreground">Simule cenários "E se...?" para "{query}"</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cenários pré-definidos</p>
          {scenarioPresets.map((preset, i) => (
            <button
              key={i}
              onClick={() => handlePreset(i)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/50 hover:bg-muted hover:border-violet-300 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                <Play className="w-4 h-4 text-violet-600" />
              </div>
              <span className="text-sm font-medium text-foreground">{preset.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
          >
            {showCustom ? "Fechar" : "Criar cenário personalizado →"}
          </button>
          {showCustom && (
            <div className="mt-3 space-y-3">
              <textarea
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="E se o governo..."
                className="input-modern min-h-[100px] resize-none"
              />
              <Button onClick={handleCustom} disabled={!customScenario.trim()} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white gap-2">
                <Play className="w-4 h-4" />
                Simular
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card-modern p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Simulação de Política Pública</h3>
            {isSimulating && <p className="text-xs text-violet-600 animate-pulse">Simulando cenário...</p>}
            {activePreset !== null && !isSimulating && (
              <p className="text-xs text-muted-foreground">{scenarioPresets[activePreset].label}</p>
            )}
          </div>
        </div>
        {!isSimulating && (
          <Button variant="ghost" size="sm" onClick={() => { reset(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Novo cenário
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {(simulation || isSimulating) && (
        <div className="prose-sm max-w-none">
          {simulation ? renderMarkdown(simulation) : (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          )}
          {isSimulating && (
            <span className="inline-block w-2 h-5 bg-violet-500 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          )}
        </div>
      )}
    </div>
  );
};

export default PolicySimulator;

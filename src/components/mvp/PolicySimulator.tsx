import { useState } from "react";
import { Building2, Play, RefreshCw, AlertCircle, ChevronRight, MapPin } from "lucide-react";
import { usePolicySimulator } from "@/hooks/useSmartInsights";
import { Button } from "@/components/ui/button";

interface PolicySimulatorProps {
  query: string;
  searchData: Record<string, unknown>;
}

const countries = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "Estados Unidos" },
  { value: "DE", label: "Alemanha" },
  { value: "CN", label: "China" },
  { value: "KR", label: "Coreia do Sul" },
  { value: "JP", label: "Japão" },
  { value: "IL", label: "Israel" },
  { value: "UK", label: "Reino Unido" },
];

const brazilStates = [
  { value: "AC", label: "Acre" }, { value: "AL", label: "Alagoas" }, { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" }, { value: "BA", label: "Bahia" }, { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" }, { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" }, { value: "MA", label: "Maranhão" }, { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" }, { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" }, { value: "PB", label: "Paraíba" }, { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" }, { value: "PI", label: "Piauí" }, { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" }, { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" }, { value: "RR", label: "Roraima" }, { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" }, { value: "SE", label: "Sergipe" }, { value: "TO", label: "Tocantins" },
];

const majorCities: Record<string, { value: string; label: string }[]> = {
  SP: [{ value: "São Paulo", label: "São Paulo" }, { value: "Campinas", label: "Campinas" }, { value: "São José dos Campos", label: "São José dos Campos" }],
  RJ: [{ value: "Rio de Janeiro", label: "Rio de Janeiro" }, { value: "Niterói", label: "Niterói" }],
  MG: [{ value: "Belo Horizonte", label: "Belo Horizonte" }, { value: "Uberlândia", label: "Uberlândia" }],
  PR: [{ value: "Curitiba", label: "Curitiba" }, { value: "Londrina", label: "Londrina" }, { value: "Maringá", label: "Maringá" }],
  RS: [{ value: "Porto Alegre", label: "Porto Alegre" }, { value: "Caxias do Sul", label: "Caxias do Sul" }],
  SC: [{ value: "Florianópolis", label: "Florianópolis" }, { value: "Joinville", label: "Joinville" }],
  BA: [{ value: "Salvador", label: "Salvador" }],
  PE: [{ value: "Recife", label: "Recife" }],
  CE: [{ value: "Fortaleza", label: "Fortaleza" }],
  DF: [{ value: "Brasília", label: "Brasília" }],
  AM: [{ value: "Manaus", label: "Manaus" }],
  PA: [{ value: "Belém", label: "Belém" }],
  GO: [{ value: "Goiânia", label: "Goiânia" }],
};

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
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const locationLabel = [
    selectedCity,
    selectedState && brazilStates.find(s => s.value === selectedState)?.label,
    countries.find(c => c.value === selectedCountry)?.label,
  ].filter(Boolean).join(", ");

  const locationContext = locationLabel
    ? `\n\n**RECORTE GEOGRÁFICO:** ${locationLabel}. Considere as especificidades regionais desta localidade na análise.`
    : "";

  const handlePreset = (index: number) => {
    setActivePreset(index);
    setShowCustom(false);
    simulate(query, scenarioPresets[index].scenario + locationContext, searchData);
  };

  const handleCustom = () => {
    if (!customScenario.trim()) return;
    setActivePreset(null);
    simulate(query, customScenario + locationContext, searchData);
  };

  const availableCities = selectedState ? (majorCities[selectedState] || []) : [];

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

  // Location selection step
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

        {/* Location Selection */}
        {!locationConfirmed ? (
          <div className="mb-6 p-4 rounded-xl border border-border bg-muted/30 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-violet-500" />
              <p className="text-sm font-semibold text-foreground">Recorte Geográfico</p>
            </div>
            <p className="text-xs text-muted-foreground">Selecione a localidade para contextualizar a simulação.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">País *</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(""); setSelectedCity(""); }}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione...</option>
                  {countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {selectedCountry === "BR" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Estado</label>
                  <select
                    value={selectedState}
                    onChange={(e) => { setSelectedState(e.target.value); setSelectedCity(""); }}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Todos</option>
                    {brazilStates.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}

              {selectedCountry === "BR" && selectedState && availableCities.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Todas</option>
                    {availableCities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <Button
              onClick={() => { if (selectedCountry) setLocationConfirmed(true); }}
              disabled={!selectedCountry}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white gap-2"
              size="sm"
            >
              <MapPin className="w-4 h-4" />
              Confirmar localidade
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between p-3 rounded-xl border border-violet-500/30 bg-violet-500/5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium text-foreground">{locationLabel}</span>
              </div>
              <button
                onClick={() => { setLocationConfirmed(false); setSelectedCountry(""); setSelectedState(""); setSelectedCity(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Alterar
              </button>
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
          </>
        )}
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
            {locationLabel && !isSimulating && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {locationLabel}
              </p>
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

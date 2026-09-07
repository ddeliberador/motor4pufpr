import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

interface IndexData {
  value: number;
  label: string;
  description: string;
  formula: string;
  basis: string;
  confidence: "high" | "medium" | "low";
  layers_used?: string[];
  alert_level?: "normal" | "warning" | "critical";
}

interface StrategicIndicesProps {
  indices: {
    gt: IndexData;
    cd: IndexData;
    aue: IndexData;
    ei: IndexData;
  };
}

const confidenceConfig = {
  high: { label: "alta", className: "text-emerald-500" },
  medium: { label: "média", className: "text-amber-500" },
  low: { label: "baixa", className: "text-red-500" },
} as const;

const indexConfig = [
  {
    key: "gt" as const,
    emoji: "🔬",
    titulo: "Ciência vira produto?",
    pergunta: "O quanto a pesquisa está sendo aplicada na prática",
    boa: "Sim — pesquisa está sendo usada",
    ruim: "Não — muita teoria, pouca aplicação",
    limiarAlerta: 70,
    invertido: false,
    explica: "Compara o volume de publicações científicas com sinais de aplicação real (patentes, empresas, empregos). Quando muito alto, indica que o Brasil publica bastante mas não transforma isso em produtos ou serviços.",
  },
  {
    key: "cd" as const,
    emoji: "🌍",
    titulo: "Pesquisa própria ou importada?",
    pergunta: "O quanto a pesquisa nacional depende de parceiros estrangeiros",
    boa: "Produção nacional forte",
    ruim: "Muito dependente do exterior",
    limiarAlerta: 60,
    invertido: false,
    explica: "Mede a proporção de papers científicos que foram escritos em coautoria com pesquisadores estrangeiros. Alta dependência pode indicar fragilidade na capacidade científica própria do país no tema.",
  },
  {
    key: "aue" as const,
    emoji: "🤝",
    titulo: "Universidade e empresa conversam?",
    pergunta: "O quanto há conexão entre pesquisa e indústria neste campo",
    boa: "Boa conexão",
    ruim: "Desconectadas — oportunidade de parceria",
    limiarAlerta: 20,
    invertido: true,
    explica: "Avalia sinais de colaboração entre universidades/ICTs e o setor produtivo: contratos públicos, código aberto, redes internacionais e financiamento de pesquisa por empresas.",
  },
  {
    key: "ei" as const,
    emoji: "🎯",
    titulo: "Os instrumentos públicos funcionam?",
    pergunta: "O quanto as políticas e programas governamentais estão gerando resultado",
    boa: "Políticas com impacto real",
    ruim: "Instrumentos com baixo resultado",
    limiarAlerta: 40,
    invertido: true,
    explica: "Cruza o nível de maturidade tecnológica (TRL) com os instrumentos disponíveis — editais, convênios, contratos públicos. Quando baixo, indica que existem políticas mas elas não estão alcançando o potencial do campo.",
  },
];

export default function StrategicIndices({ indices }: StrategicIndicesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground">Diagnóstico do campo</p>
        <span className="text-[10px] text-muted-foreground">— 4 perguntas-chave sobre este tema no Brasil</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {indexConfig.map(({ key, emoji, titulo, pergunta, boa, ruim, limiarAlerta, invertido, explica }) => {
          const idx = indices[key];
          if (!idx) return null;
          const isAlert = invertido ? idx.value < limiarAlerta : idx.value > limiarAlerta;
          const isGood = invertido ? idx.value >= limiarAlerta : idx.value <= limiarAlerta;
          const statusLabel = isGood ? boa : ruim;
          const statusColor = isGood ? "text-emerald-500" : isAlert ? "text-red-500" : "text-amber-500";
          const barColor = isGood ? "bg-emerald-500" : isAlert ? "bg-red-500" : "bg-amber-500";
          const borderColor = isAlert ? "border-red-400/30 bg-red-500/5" : "border-border";
          const confidence = confidenceConfig[idx.confidence] ?? confidenceConfig.low;

          return (
            <Popover key={key}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`relative text-left w-full bg-card border rounded-2xl p-5 cursor-help transition-all hover:shadow-md ${borderColor}`}
                >
                  {isAlert && (
                    <span className="absolute top-3 right-3 text-[9px] px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full font-semibold uppercase tracking-wider">
                      Atenção
                    </span>
                  )}
                  {!isAlert && (
                    <Info className="absolute top-4 right-4 h-3.5 w-3.5 text-muted-foreground/50" />
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{emoji}</span>
                    <p className="text-sm font-semibold text-foreground leading-tight">{titulo}</p>
                  </div>

                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{pergunta}</p>

                  <p className="text-4xl font-bold text-foreground mb-1">
                    {idx.value}
                    <span className="text-base font-normal text-muted-foreground ml-1">
                      {key === "cd" || key === "aue" ? "%" : "/100"}
                    </span>
                  </p>

                  <p className={`text-sm font-medium mt-1 ${statusColor}`}>{statusLabel}</p>

                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, idx.value)}%` }}
                    />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" className="w-80 text-xs leading-relaxed space-y-3">
                <div>
                  <p className="font-semibold text-sm mb-1">{titulo}</p>
                  <p className="text-muted-foreground">{explica}</p>
                </div>

                {idx.formula && (
                  <div>
                    <p className="font-semibold mb-1">Fórmula</p>
                    <code className="block bg-muted rounded-md px-2 py-1.5 font-mono text-[11px] break-all">
                      {idx.formula}
                    </code>
                  </div>
                )}

                {idx.basis && (
                  <div>
                    <p className="font-semibold mb-1">Números desta busca</p>
                    <p className="text-muted-foreground">{idx.basis}</p>
                  </div>
                )}

                <p className={`font-semibold ${confidence.className}`}>
                  Confiança: {confidence.label}
                </p>

                {idx.layers_used && idx.layers_used.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1">Camadas utilizadas</p>
                    <div className="flex flex-wrap gap-1">
                      {idx.layers_used.map((layer) => (
                        <span
                          key={layer}
                          className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-[10px] font-medium"
                        >
                          {layer}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <a
                    href="/documentacao#metodologia-indices"
                    className="text-primary font-medium hover:underline"
                  >
                    Ver metodologia completa →
                  </a>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        💡 Clique em cada card para ver a fórmula e os números exatos usados neste cálculo
      </p>
    </div>
  );
}

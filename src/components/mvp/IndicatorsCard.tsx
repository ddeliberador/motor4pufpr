import { TrendingUp, AlertTriangle, Target, Link2, Info, LucideIcon } from "lucide-react";

interface IndicatorData {
  value: number;
  label: string;
  description: string;
}

interface IndicatorsCardProps {
  c2t: IndicatorData;
  gt: IndicatorData;
  p2c: IndicatorData;
  cd: IndicatorData;
}

interface SingleIndicatorProps {
  icon: LucideIcon;
  label: string;
  code: string;
  value: number;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  hoverBorder: string;
}

const SingleIndicator = ({
  icon: Icon,
  label,
  code,
  value,
  description,
  gradientFrom,
  gradientTo,
  hoverBorder,
}: SingleIndicatorProps) => (
  <div className={`card-modern p-4 hover:${hoverBorder} transition-all duration-300`}>
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-foreground">{code}</p>
      </div>
      <span className="text-lg font-bold text-foreground">{value}%</span>
    </div>
    <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
      <div 
        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
    <p className="text-[10px] text-muted-foreground leading-relaxed">{description}</p>
  </div>
);

const IndicatorsCard = ({ c2t, gt, p2c, cd }: IndicatorsCardProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Indicadores de Tradução
      </h3>
      
      <div className="space-y-3">
        <SingleIndicator
          icon={TrendingUp}
          label="Maturidade"
          code="C2T"
          value={c2t.value}
          description={c2t.description}
          gradientFrom="from-cyan-500"
          gradientTo="to-blue-600"
          hoverBorder="border-cyan-300"
        />

        <SingleIndicator
          icon={AlertTriangle}
          label="Gargalo"
          code="GT"
          value={gt.value}
          description={gt.description}
          gradientFrom="from-amber-500"
          gradientTo="to-orange-600"
          hoverBorder="border-amber-300"
        />

        <SingleIndicator
          icon={Target}
          label="Aderência"
          code="P2C"
          value={p2c.value}
          description={p2c.description}
          gradientFrom="from-emerald-500"
          gradientTo="to-teal-600"
          hoverBorder="border-emerald-300"
        />

        <SingleIndicator
          icon={Link2}
          label="Dependência"
          code="CD"
          value={cd.value}
          description={cd.description}
          gradientFrom="from-violet-500"
          gradientTo="to-purple-600"
          hoverBorder="border-violet-300"
        />
      </div>

      {/* Conceituação */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mt-4">
        <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info className="w-3 h-3" />
          Conceituação
        </h4>
        <div className="space-y-2 text-[10px] leading-relaxed text-muted-foreground">
          <p><span className="font-medium text-foreground">C2T</span> — Mede conversão de produção científica em outputs tecnológicos.</p>
          <p><span className="font-medium text-foreground">GT</span> — Identifica obstáculos na cadeia de tradução tecnológica.</p>
          <p><span className="font-medium text-foreground">P2C</span> — Avalia alinhamento entre políticas e capacidade instalada.</p>
          <p><span className="font-medium text-foreground">CD</span> — Mede dependência de fontes externas e vulnerabilidade estratégica.</p>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsCard;

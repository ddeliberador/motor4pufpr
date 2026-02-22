import { Target } from "lucide-react";
import type { PersonaConfig } from "@/config/personas";

interface StrategicQuestionProps {
  config: PersonaConfig;
}

const StrategicQuestion = ({ config }: StrategicQuestionProps) => {
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-r ${config.gradient} border border-border`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
          <Target className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pergunta estratégica</p>
          <p className="text-sm font-semibold text-foreground">{config.strategicQuestion}</p>
        </div>
      </div>
    </div>
  );
};

export default StrategicQuestion;

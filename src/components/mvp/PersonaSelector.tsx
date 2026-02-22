import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { personaConfigs } from "@/config/personas";
import type { Persona } from "@/types/persona";

const personas: Persona[] = ["pesquisador", "universidade", "empresa", "governo"];

const PersonaSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {personas.map((key) => {
        const config = personaConfigs[key];
        const Icon = config.icon;
        return (
          <button
            key={key}
            onClick={() => navigate(`/${key}`)}
            className="group card-modern p-6 md:p-8 text-left hover:border-primary/40 transition-all duration-300 cursor-pointer"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {config.label}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {config.subtitle}
            </p>
            <ul className="space-y-1.5 mb-5">
              {config.questions.slice(0, 3).map((q, i) => (
                <li key={i} className="text-xs text-muted-foreground/80 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {q}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Acessar <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default PersonaSelector;

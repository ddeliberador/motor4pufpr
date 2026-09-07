import { useNavigate } from "react-router-dom";
import { personaConfigs } from "@/config/personas";
import type { Persona } from "@/types/persona";
import { getLastSearch } from "@/hooks/useMotorSearch";
import { cn } from "@/lib/utils";

const ORDER: Persona[] = ["pesquisador", "universidade", "empresa", "governo"];

interface Props {
  current: Persona;
  query: string;
  size?: "default" | "lg";
}

/**
 * Exibe a perspectiva ativa e permite alternar entre as 4 personas
 * reaproveitando os dados já coletados (sem nova consulta às bases).
 */
const PerspectiveSwitcher = ({ current, query, size = "default" }: Props) => {
  const navigate = useNavigate();
  const CurrentIcon = personaConfigs[current].icon;
  const isLarge = size === "lg";

  const switchTo = (persona: Persona) => {
    if (persona === current) return;
    const last = getLastSearch();
    const q = last?.query || query;
    const cnaes = (last?.cnaeCodes || []).map((code) => ({ code, description: "" }));
    sessionStorage.setItem("motor4p_query", q);
    sessionStorage.setItem("motor4p_persona", persona);
    sessionStorage.setItem("motor4p_cnaes", JSON.stringify(cnaes));
    navigate(`/${persona}`);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isLarge && "gap-3"
      )}
      role="group"
      aria-label="Perspectiva de análise"
    >
      <span
        className={cn(
          "hidden md:inline-flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground font-mono",
          isLarge ? "text-[11px] font-semibold" : "text-[10px]"
        )}
      >
        <CurrentIcon className={cn("text-primary", isLarge ? "w-4 h-4" : "w-3.5 h-3.5")} />
        Perspectiva
      </span>
      <div
        className={cn(
          "flex items-center rounded-lg border border-border bg-muted/40 p-0.5",
          isLarge && "p-1 bg-muted/60 border-border/80 shadow-sm"
        )}
      >
        {ORDER.map((p) => {
          const cfg = personaConfigs[p];
          const Icon = cfg.icon;
          const active = p === current;
          return (
            <button
              key={p}
              type="button"
              onClick={() => switchTo(p)}
              aria-pressed={active}
              title={`Ver como ${cfg.label}`}
              className={cn(
                "flex items-center gap-1.5 rounded-md transition-all duration-200",
                isLarge ? "px-3 py-2 text-[13px]" : "px-2 py-1 text-[11px]",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn(isLarge ? "w-4 h-4" : "w-3.5 h-3.5")} />
              <span className={active || isLarge ? "inline" : "hidden lg:inline"}>{cfg.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PerspectiveSwitcher;

import { MapPin, X } from "lucide-react";
import { useMotorLocation } from "@/hooks/useLocation";

interface LocalContextBadgeProps {
  persona: "pesquisador" | "universidade" | "empresa" | "governo";
}

const PERSONA_CONTEXT: Record<string, string> = {
  pesquisador: "Priorizando grupos de pesquisa e editais da sua região",
  universidade: "Mostrando posicionamento e recursos captados no seu estado",
  empresa: "Filtrando mercado, concorrentes e contratos públicos locais",
  governo: "Comparando sua região com os demais estados",
};

export default function LocalContextBadge({ persona }: LocalContextBadgeProps) {
  const { label, hasLocation } = useMotorLocation();
  if (!hasLocation) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border border-primary/15 rounded-xl mb-2">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            📍 {label}
          </p>
          <p className="text-xs text-muted-foreground">{PERSONA_CONTEXT[persona]}</p>
        </div>
      </div>
      <button
        onClick={() => {
          sessionStorage.removeItem("motor4p_uf");
          sessionStorage.removeItem("motor4p_uf_nome");
          sessionStorage.removeItem("motor4p_municipio");
          window.location.reload();
        }}
        className="flex-shrink-0 ml-3 text-muted-foreground hover:text-foreground transition-colors"
        title="Remover filtro de localização"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

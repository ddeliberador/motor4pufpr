/**
 * MOTOR 4P UFPR - API Status Indicator
 * Indicador visual do status da conexão com a API
 */
import { Database, Wifi, WifiOff, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ApiStatusIndicatorProps {
  isUsingMock: boolean;
  backendAvailable: boolean;
  processingTimeMs?: number;
  dataSources?: string[];
  className?: string;
}

const ApiStatusIndicator = ({
  isUsingMock,
  backendAvailable,
  processingTimeMs,
  dataSources = [],
  className = "",
}: ApiStatusIndicatorProps) => {
  const getStatusConfig = () => {
    if (isUsingMock) {
      return {
        icon: WifiOff,
        label: "Dados Simulados",
        description: "Backend indisponível. Exibindo dados mock para demonstração.",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        textColor: "text-amber-600",
        iconColor: "text-amber-500",
      };
    }
    
    if (backendAvailable) {
      return {
        icon: CheckCircle2,
        label: "Dados Reais",
        description: "Conectado ao backend. Exibindo dados de bases públicas oficiais.",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        textColor: "text-emerald-600",
        iconColor: "text-emerald-500",
      };
    }

    return {
      icon: AlertCircle,
      label: "Verificando...",
      description: "Verificando conexão com o backend.",
      bgColor: "bg-muted",
      borderColor: "border-border",
      textColor: "text-muted-foreground",
      iconColor: "text-muted-foreground",
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <TooltipProvider>
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor} cursor-help transition-all hover:scale-105`}
            >
              <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
              <span className={`text-sm font-medium ${config.textColor}`}>
                {config.label}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
              
              {processingTimeMs && !isUsingMock && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
                  <Clock className="w-3 h-3" />
                  <span>Tempo de resposta: {processingTimeMs}ms</span>
                </div>
              )}
              
              {dataSources.length > 0 && !isUsingMock && (
                <div className="pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Database className="w-3 h-3" />
                    <span>Fontes de dados:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dataSources.map((source) => (
                      <span
                        key={source}
                        className="inline-block px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Connection indicator dot */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              {backendAvailable ? (
                <Wifi className="w-4 h-4 text-emerald-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-500" />
              )}
              <span
                className={`w-2 h-2 rounded-full ${
                  backendAvailable ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {backendAvailable ? "API conectada" : "API desconectada"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default ApiStatusIndicator;

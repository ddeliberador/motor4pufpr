import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PerspectiveSwitcher from "@/components/shared/PerspectiveSwitcher";
import { personaConfigs } from "@/config/personas";
import type { Persona } from "@/types/persona";

interface DiagnosticHeaderProps {
  query: string;
  current: Persona;
  onNewSearch: () => void;
  sourceCount: number;
  processingTimeMs?: number;
  context?: string;
}

export default function DiagnosticHeader({
  query,
  current,
  onNewSearch,
  sourceCount,
  processingTimeMs,
  context,
}: DiagnosticHeaderProps) {
  const currentConfig = personaConfigs[current];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="sticky top-16 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 border-b border-border shadow-sm">
      <div className="panel-container py-4 md:py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: back + title */}
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onNewSearch}
              className="flex-shrink-0 mt-1 h-9 px-3 rounded-lg border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Nova busca</span>
              <span className="sm:hidden">Voltar</span>
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground tracking-tight leading-tight">
                Diagnóstico:{' '}
                <span className="text-primary">&ldquo;{query}&rdquo;</span>
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CurrentIcon className="w-3.5 h-3.5 text-primary" />
                  Visto como <strong className="text-foreground">{currentConfig.label}</strong>
                </span>
                {context && (
                  <>
                    <span className="hidden sm:inline text-border">·</span>
                    <span className="truncate max-w-[16rem] sm:max-w-[24rem]">{context}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: perspective switcher + source badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-shrink-0">
            <PerspectiveSwitcher current={current} query={query} size="lg" />

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="h-8 px-2.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10"
              >
                <Sparkles className="w-3 h-3 mr-1.5" />
                {sourceCount} fontes
              </Badge>
              {typeof processingTimeMs === "number" && (
                <span className="text-[10px] text-muted-foreground tabular-nums hidden lg:inline">
                  {processingTimeMs.toLocaleString('pt-BR')}ms
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

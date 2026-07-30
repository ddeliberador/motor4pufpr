import { AlertTriangle, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PatentsTabProps {
  patents: any;
  persona: "governo" | "empresa";
}

export default function PatentsTab({ patents, persona }: PatentsTabProps) {
  if (!patents?.available) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
        <p className="text-2xl">🔏</p>
        <p className="text-sm text-muted-foreground">
          {patents?.message || "Dados de patentes não disponíveis para este tema."}
        </p>
        <a href="https://worldwide.espacenet.com" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="w-3 h-3" /> Consultar Espacenet diretamente
        </a>
      </div>
    );
  }

  const br = patents.br_share;
  const isHighDependency = br?.dependencia_externa_pct > 70;
  const isMediumDependency = br?.dependencia_externa_pct > 50 && br?.dependencia_externa_pct <= 70;

  // Tendência: compara último ano com penúltimo
  const trend = patents.trend || [];
  const lastTwo = trend.slice(-2);
  const trendDir = lastTwo.length === 2
    ? lastTwo[1].total > lastTwo[0].total ? "up"
      : lastTwo[1].total < lastTwo[0].total ? "down" : "flat"
    : "flat";

  return (
    <div className="space-y-4">
      {/* Métricas de soberania */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Patentes mundiais (5 anos)",
            value: patents.total_patents_5y?.toLocaleString("pt-BR") || "0",
            sub: `IPC: ${patents.primary_ipc || "—"}`,
          },
          {
            label: "Depósitos brasileiros",
            value: br?.total_br?.toLocaleString("pt-BR") || "0",
            sub: "residentes no BR",
          },
          {
            label: "Share BR",
            value: `${br?.share_br_pct || 0}%`,
            sub: "da produção global",
            highlight: (br?.share_br_pct || 0) > 5,
          },
          {
            label: persona === "governo" ? "Dependência externa" : "Risco concorrencial externo",
            value: `${br?.dependencia_externa_pct || 0}%`,
            sub: "patentes estrangeiras",
            alert: isHighDependency,
          },
        ].map((m, i) => (
          <div key={i} className={`bg-card border rounded-xl p-4 text-center ${m.alert ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
            <p className={`text-2xl font-bold font-mono ${m.alert ? "text-red-500" : m.highlight ? "text-emerald-500" : "text-foreground"}`}>
              {m.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerta de soberania / risco */}
      {isHighDependency && (
        <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {persona === "governo" ? "Risco crítico de soberania tecnológica" : "Alta concentração de propriedade intelectual estrangeira"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {br?.dependencia_externa_pct}% das patentes neste campo pertencem a depositantes estrangeiros.{" "}
              {persona === "governo"
                ? "Recomenda-se política de fomento a P&D nacional e criação de instrumentos de licenciamento compulsório para campos estratégicos."
                : "Avalie cuidadosamente liberdade de uso (freedom-to-operate) antes de investir em P&D neste campo."}
            </p>
          </div>
        </div>
      )}
      {isMediumDependency && !isHighDependency && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Dependência moderada ({br?.dependencia_externa_pct}%). Monitorar concentração de PI e identificar parceiros nacionais com patentes no campo.
          </p>
        </div>
      )}

      {/* TRL real via EPO */}
      {patents.trl_from_patents && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-2">TRL — dado real via EPO OPS</p>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold font-mono text-foreground">
              {patents.trl_from_patents.estimate}
              <span className="text-lg text-muted-foreground">/9</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{patents.trl_from_patents.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{patents.trl_from_patents.rationale}</p>
              <p className={`text-[10px] mt-1 ${patents.trl_from_patents.confidence === "high" ? "text-emerald-500" : patents.trl_from_patents.confidence === "medium" ? "text-muted-foreground" : "text-amber-500"}`}>
                confiança: {patents.trl_from_patents.confidence === "high" ? "alta" : patents.trl_from_patents.confidence === "medium" ? "média" : "baixa"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tendência anual */}
      {trend.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Tendência de depósitos (5 anos)</h3>
            <div className="flex items-center gap-1 text-xs">
              {trendDir === "up" && <><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">crescimento</span></>}
              {trendDir === "down" && <><TrendingDown className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">retração</span></>}
              {trendDir === "flat" && <><Minus className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">estável</span></>}
            </div>
          </div>
          <div className="flex items-end gap-2 h-28">
            {(() => {
              const max = Math.max(...trend.map((t: any) => t.total), 1);
              return trend.map((t: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/50 rounded-t transition-all"
                    style={{ height: `${Math.max(4, (t.total / max) * 88)}px` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{t.year}</span>
                  <span className="text-[9px] font-mono text-foreground">{t.total.toLocaleString("pt-BR")}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Top depositantes */}
      {patents.applicants?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {persona === "governo" ? "Principais depositantes globais" : "Concorrentes por propriedade intelectual"}
          </h3>
          <div className="space-y-1.5">
            {patents.applicants.slice(0, 8).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-[10px] font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                <span className="text-xs text-foreground flex-1 truncate">{a.name}</span>
                {a.country && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${a.country === "BR" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {a.country}
                  </span>
                )}
                <span className="text-xs font-bold text-primary flex-shrink-0">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patentes recentes */}
      {patents.patents?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Patentes recentes no campo</h3>
          <div className="space-y-2">
            {patents.patents.slice(0, 6).map((p: any, i: number) => (
              <div key={i} className="p-3 border border-border/50 rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-medium text-foreground flex-1 leading-snug">
                    {p.title || `Patente ${p.number}`}
                  </p>
                  <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0 bg-muted px-1.5 py-0.5 rounded">
                    {p.number}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.applicant && <span className="text-[10px] text-muted-foreground">{p.applicant}</span>}
                  {p.country && <span className={`text-[10px] font-mono px-1 rounded ${p.country === "BR" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{p.country}</span>}
                  {p.pubDate && <span className="text-[10px] text-muted-foreground">{p.pubDate}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground text-center pt-1">
        Fonte: EPO OPS — Open Patent Services · Classificação {patents.primary_ipc} · Últimos 5 anos
      </p>
    </div>
  );
}

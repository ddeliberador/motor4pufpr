import { AlertTriangle } from "lucide-react";

interface PatentsPanelProps {
  patents: any;
}

const PatentsPanel = ({ patents }: PatentsPanelProps) => {
  if (!patents?.available) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {patents?.message || "Dados de patentes não disponíveis para este tema."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo de soberania */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Patentes 5 anos", value: patents.total_patents_5y?.toLocaleString("pt-BR") || "0", sub: "mundiais no campo" },
          { label: "Depósitos BR", value: patents.br_share?.total_br || 0, sub: "depositantes brasileiros" },
          { label: "Share BR", value: `${patents.br_share?.share_br_pct || 0}%`, sub: "da produção global" },
          { label: "Dep. Externo", value: `${patents.br_share?.dependencia_externa_pct || 0}%`, sub: "risco de dependência" },
        ].map((m, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-foreground font-mono">{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerta de soberania */}
      {patents.br_share?.dependencia_externa_pct > 70 && (
        <div className="flex items-start gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Risco de soberania tecnológica</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {patents.br_share.dependencia_externa_pct}% das patentes neste campo pertencem a depositantes estrangeiros.
              Campo estratégico com alta dependência externa — recomenda-se política de fomento a P&D nacional.
            </p>
          </div>
        </div>
      )}

      {/* Tendência anual */}
      {patents.trend?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Tendência de depósitos (últimos 5 anos)</h3>
          <div className="flex items-end gap-2 h-24">
            {(() => {
              const trend = patents.trend;
              const max = Math.max(...trend.map((t: any) => t.total), 1);
              return trend.map((t: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/60 rounded-t"
                    style={{ height: `${Math.max(4, (t.total / max) * 80)}px` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{t.year}</span>
                  <span className="text-[9px] font-mono text-foreground">{t.total}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Top depositantes */}
      {patents.applicants?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Principais depositantes globais</h3>
          <div className="space-y-2">
            {patents.applicants.slice(0, 8).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
                <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                <span className="text-xs text-foreground flex-1 truncate">{a.name}</span>
                {a.country && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">{a.country}</span>
                )}
                <span className="text-xs font-bold text-primary">{a.count}</span>
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
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground flex-1">{p.title || p.number}</p>
                  <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">{p.number}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  {p.applicant && <span className="text-[10px] text-muted-foreground">{p.applicant}</span>}
                  {p.country && <span className="text-[10px] px-1 bg-muted rounded font-mono">{p.country}</span>}
                  {p.pubDate && <span className="text-[10px] text-muted-foreground">{p.pubDate}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-3 text-center">
            Fonte: EPO OPS — Open Patent Services · IPC {patents.primary_ipc}
          </p>
        </div>
      )}
    </div>
  );
};

export default PatentsPanel;

import type { ReactNode } from "react";

export function Drawer({ onClose, header, children }: { onClose: () => void; header: ReactNode; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-foreground/40" />
      <div className="w-full max-w-sm bg-card border-l border-border flex flex-col h-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
          <div className="min-w-0">{header}</div>
          <button onClick={onClose} aria-label="Fechar" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">{children}</div>
      </div>
    </div>
  );
}

export const Spinner = ({ h = "h-48" }: { h?: string }) => (
  <div className={`flex ${h} items-center justify-center`}>
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

export const Erro = ({ msg }: { msg: string }) => (
  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Falha ao carregar dados reais: {msg}</div>
);

export const TOOLTIP_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };

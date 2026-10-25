// Gaveta inferior (bottom sheet) do Motor: o mesmo componente para menus,
// painéis de lugar do Mapa e detalhes da Análise em tela estreita. Alça para
// arrastar, até três alturas (espia, metade, inteira) e fechamento por gesto;
// `modal={false}` deixa o mapa atrás continuar respondendo ao toque.
// Em tela larga quem decide é `PainelOuGaveta`: lateral no desktop, gaveta no celular.

import { useState, type ReactNode } from "react";
import { Drawer as Vaul } from "vaul";
import { useIsMobile } from "@/hooks/use-mobile";

export interface GavetaInferiorProps {
  aberta: boolean;
  onAberta: (v: boolean) => void;
  titulo?: ReactNode;
  descricao?: ReactNode;
  /** Cabeçalho livre (substitui titulo/descricao), ex.: nome do estado com setas. */
  cabecalho?: ReactNode;
  children: ReactNode;
  /** Frações da altura da tela em que a gaveta para; a primeira é a "espia". */
  alturas?: (number | string)[];
  /** Sem escurecer o fundo nem travar o toque atrás (painéis sobre o mapa). */
  semBloqueio?: boolean;
  className?: string;
}

export function GavetaInferior({ aberta, onAberta, titulo, descricao, cabecalho, children, alturas, semBloqueio, className = "" }: GavetaInferiorProps) {
  const [alvo, setAlvo] = useState<number | string | null>(alturas ? alturas[alturas.length > 1 ? 1 : 0] : null);
  return (
    <Vaul.Root
      open={aberta}
      onOpenChange={onAberta}
      modal={!semBloqueio}
      shouldScaleBackground={false}
      {...(alturas ? { snapPoints: alturas, activeSnapPoint: alvo, setActiveSnapPoint: setAlvo } : {})}
    >
      <Vaul.Portal>
        {!semBloqueio && <Vaul.Overlay className="fixed inset-0 z-[60] bg-black/50" />}
        <Vaul.Content
          aria-label={typeof titulo === "string" ? titulo : undefined}
          className={`fixed inset-x-0 bottom-0 z-[70] flex max-h-[96vh] flex-col rounded-t-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none ${alturas ? "h-full" : ""} ${className}`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
          {cabecalho ?? ((titulo || descricao) && (
            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-2">
              <div className="min-w-0">
                {titulo && <Vaul.Title className="text-base font-bold leading-tight">{titulo}</Vaul.Title>}
                {descricao && <Vaul.Description className="text-xs text-muted-foreground">{descricao}</Vaul.Description>}
              </div>
              <Vaul.Close aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">✕</Vaul.Close>
            </div>
          ))}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}

/**
 * Painel lateral no desktop, gaveta no celular. O conteúdo é o mesmo; só o
 * recipiente muda. `lateral` recebe as classes do recipiente de tela larga.
 */
export function PainelOuGaveta({ lateral, gaveta, children }: { lateral: { className: string; ariaLabel?: string }; gaveta: Omit<GavetaInferiorProps, "children">; children: ReactNode }) {
  const movel = useIsMobile();
  if (movel) return <GavetaInferior {...gaveta}>{children}</GavetaInferior>;
  if (!gaveta.aberta) return null;
  return <aside className={lateral.className} aria-label={lateral.ariaLabel}>{children}</aside>;
}


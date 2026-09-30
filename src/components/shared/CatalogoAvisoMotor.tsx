import type { MotorSearchResult } from "@/hooks/useMotorSearch";

/** Mostra as fontes desativadas no Catálogo de Bases que ficaram fora desta busca. */
export function CatalogoAvisoMotor({ data }: { data: MotorSearchResult | null }) {
  const cat = data?.catalogo;
  if (!cat || cat.desativadas.length === 0) return null;
  return (
    <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
      Desativadas no Catálogo de Bases: {cat.desativadas.join(", ")}.
      {cat.camadas_nao_consultadas.length > 0 &&
        ` Não consultado nesta busca: ${cat.camadas_nao_consultadas.map((c) => c.base).join(", ")}.`}
    </p>
  );
}

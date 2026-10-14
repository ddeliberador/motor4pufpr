import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { fraseBalanco } from "@/lib/cruzamentoInfra";

export function valorBalanco(razao: number | null) {
  const frase = fraseBalanco(razao);
  return frase === "indisponível" ? null : frase.replace(/^gera /, "").replace(/ do que consome$| o que consome$/, "");
}

export default function MetricaCartao({ icon: Icon, valor, rotulo, children, className = "" }: {
  icon: LucideIcon; valor: string | number | null | undefined; rotulo: string;
  children?: ReactNode; className?: string;
}) {
  const indisponivel = valor == null || valor === "indisponível" || (typeof valor === "number" && !Number.isFinite(valor));
  return <div className={`min-w-0 ${className}`} data-metrica={rotulo}>
    <div className="flex min-h-6 items-start gap-1">
      <Icon aria-hidden="true" size={16} className="mt-1 shrink-0 text-muted-foreground" />
      <strong className="min-w-0 whitespace-normal break-words text-xl font-bold leading-6 text-foreground" data-valor-metrica>{indisponivel ? "—" : valor}</strong>
    </div>
    <p className="mt-1 whitespace-normal break-words text-[10px] font-normal leading-snug text-muted-foreground">{indisponivel ? "indisponível" : rotulo}</p>
    {!indisponivel && children}
  </div>;
}
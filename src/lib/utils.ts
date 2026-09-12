import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valida esquema de URL vinda de banco/API antes de ir para um href.
 * Aceita apenas http/https; qualquer outro valor (javascript:, data:, etc.) é descartado.
 */
export function safeHttpUrl(url?: string | null, fallback?: string | null): string | undefined {
  const candidate = typeof url === "string" ? url.trim() : "";
  if (/^https?:\/\/\S+$/i.test(candidate)) return candidate;
  if (fallback && /^https?:\/\/\S+$/i.test(fallback.trim())) return fallback.trim();
  return undefined;
}

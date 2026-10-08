// Regras compartilhadas da camada de interação (EMBRAPII).
export const ANO_MIN = 2015;
export const ANO_MAX = 2026;
export const TEC_IA = "Inteligência artificial";

/** Razão calculada sobre somas (nunca média de percentuais); null quando o denominador é zero. */
export const razao = (num: number, den: number): number | null => (den > 0 ? num / den : null);

/** Soma linhas filtradas antes de dividir. */
export function razaoDeSomas<T>(linhas: T[], num: (r: T) => number, den: (r: T) => number): number | null {
  let a = 0, b = 0;
  for (const r of linhas) { a += num(r); b += den(r); }
  return razao(a, b);
}

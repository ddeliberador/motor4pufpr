// Regras compartilhadas da camada de interação (EMBRAPII).
export const ANO_MIN = 2014;
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

/** Último ano completo entre os anos com dado: o ano corrente nunca entra na comparação. */
export function ultimoAnoCompleto(anos: number[], anoCorrente: number): number | null {
  const completos = anos.filter((a) => a < anoCorrente);
  return completos.length ? Math.max(...completos) : null;
}

/** Primeiro ano da série com volume mínimo de dados; opcionalmente exclui um ano (ex.: 2014, início da série). */
export function primeiroAnoComVolume<T>(serie: T[], valor: (r: T) => number, minimo: number, excluirAno?: number, ano?: (r: T) => number): T | null {
  for (const r of serie) {
    if (excluirAno != null && ano && ano(r) === excluirAno) continue;
    if (valor(r) >= minimo) return r;
  }
  return null;
}

/** "{x} vezes" com uma casa; abaixo de 1 vira "menos que em". */
export function fraseCrescimento(ultimo: number, n: number, primeiro: number, n0: number): string {
  const nf = n.toLocaleString("pt-BR");
  if (n0 <= 0) return `Em ${ultimo} foram ${nf} projetos.`;
  const x = n / n0;
  if (x < 1) return `Em ${ultimo} foram ${nf} projetos, menos que em ${primeiro} (${n0.toLocaleString("pt-BR")}).`;
  return `Em ${ultimo} foram ${nf} projetos, ${x.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} vezes o número de ${primeiro}.`;
}

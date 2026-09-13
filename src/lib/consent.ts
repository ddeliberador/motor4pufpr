/**
 * Consentimento para coleta anônima de dados de uso.
 *
 * O banner de consentimento ainda NÃO foi publicado (texto em revisão no
 * CEP/UFPR). Este módulo existe apenas para que a telemetria já consulte a
 * decisão do usuário quando ela passar a ser coletada.
 */

const CONSENT_KEY = "motor_inovacao_consent_v1";

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function setConsent(accepted: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, accepted ? "accepted" : "declined");
  } catch {
    /* armazenamento indisponível — segue sem consentimento */
  }
}

export function consentDecision(): "accepted" | "declined" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

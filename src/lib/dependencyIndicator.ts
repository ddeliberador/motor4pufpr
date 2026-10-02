export type DependencyLevel = "low" | "moderate" | "critical";

export interface DependencyReading {
  value: number;
  level: DependencyLevel;
  label: string;
  description: string;
}

export function normalizeDependency(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

/** Mesmas faixas de alerta do índice CD calculado pelo Motor. */
export function getDependencyReading(value: number): DependencyReading {
  const normalized = normalizeDependency(value);

  if (normalized > 70) {
    return {
      value: normalized,
      level: "critical",
      label: "Dependência crítica",
      description: "Mais de 70% de dependência externa",
    };
  }

  if (normalized > 50) {
    return {
      value: normalized,
      level: "moderate",
      label: "Dependência moderada",
      description: "Entre 50% e 70% de dependência externa",
    };
  }

  return {
    value: normalized,
    level: "low",
    label: "Baixa dependência",
    description: "Até 50% de dependência externa",
  };
}
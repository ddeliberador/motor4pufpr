import { getDependencyReading } from "@/lib/dependencyIndicator";

interface DependencyThermometerProps {
  value: number;
  title?: string;
  detail?: string;
  compact?: boolean;
  className?: string;
}

const LEVEL_STYLES = {
  low: {
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    background: "bg-emerald-500/5",
    marker: "bg-emerald-500",
  },
  moderate: {
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    background: "bg-amber-500/5",
    marker: "bg-amber-500",
  },
  critical: {
    text: "text-destructive",
    border: "border-destructive/30",
    background: "bg-destructive/5",
    marker: "bg-destructive",
  },
} as const;

export default function DependencyThermometer({
  value,
  title = "Termômetro de dependência",
  detail,
  compact = false,
  className = "",
}: DependencyThermometerProps) {
  const reading = getDependencyReading(value);
  const styles = LEVEL_STYLES[reading.level];
  const formatted = reading.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.background} ${compact ? "p-2.5" : "p-4"} ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{title}</p>
          <p className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${styles.text}`}>{reading.label}</p>
        </div>
        <p className={`font-bold tabular-nums ${compact ? "text-xl" : "text-3xl"} ${styles.text}`}>
          {formatted}<span className="ml-0.5 text-xs font-medium">%</span>
        </p>
      </div>

      <div
        className={`relative mt-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-destructive ${compact ? "h-2" : "h-3"}`}
        role="meter"
        aria-label={`${title}: ${formatted}%, ${reading.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={reading.value}
      >
        <span
          className={`absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background ${styles.marker}`}
          style={{ left: `${reading.value}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>0 · autonomia</span>
        <span>100 · dependência total</span>
      </div>
      {detail && <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>}
    </div>
  );
}
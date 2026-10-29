// Barra de série histórica, fixa sob as abas do Mapa. Sempre visível: quando a
// visão atual tem dimensão temporal (visão regional, coroplético municipal,
// cooperação EMBRAPII por ano, usinas por ano de operação), mostra a régua com
// play; quando não tem, diz isso em vez de sumir, para o usuário saber que a
// evolução existe em outras visões.

import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";

export interface SerieTempo {
  /** Rótulos dos períodos, em ordem (anos ou meses "12/2024"). */
  rotulos: (number | string)[];
  indice: number;
  onIndice: (i: number) => void;
  /** O que está sendo percorrido (ex.: "Capacidade elétrica instalada por região"). */
  titulo: string;
  /** Opcional: modo acumulado (todos os períodos somados), como na cooperação EMBRAPII. */
  acumulado?: { ativo: boolean; onAlternar: (v: boolean) => void };
}

interface Props {
  serie: SerieTempo | null;
  /** Explica por que a visão atual não tem série (aparece quando serie é null). */
  motivoSemSerie?: string;
}

export default function BarraTempo({ serie, motivoSemSerie }: Props) {
  const [tocando, setTocando] = useState(false);
  const n = serie?.rotulos.length ?? 0;
  const ultimo = Math.max(0, n - 1);
  const indice = Math.min(serie?.indice ?? 0, ultimo);
  const passoMs = Math.max(120, Math.min(900, Math.round(8000 / Math.max(1, n))));
  const acumulado = !!serie?.acumulado?.ativo;

  useEffect(() => {
    if (!tocando || !serie) return;
    if (indice >= ultimo) { setTocando(false); return; }
    const t = setTimeout(() => serie.onIndice(indice + 1), passoMs);
    return () => clearTimeout(t);
  }, [tocando, indice, ultimo, passoMs, serie]);

  // Troca de visão ou de série: pausa.
  const chave = `${serie?.titulo ?? ""}|${n}`;
  useEffect(() => { setTocando(false); }, [chave]);

  const marcas = useMemo(() => {
    if (!serie) return [];
    if (n <= 8) return serie.rotulos.map((a, i) => ({ a, i }));
    const k = 6;
    return Array.from({ length: k + 1 }, (_, j) => { const i = Math.round((j / k) * ultimo); return { a: serie.rotulos[i], i }; });
  }, [serie, n, ultimo]);

  const base = "flex h-9 items-center gap-2.5 rounded-lg border border-border bg-card px-2.5";

  if (!serie || n === 0) {
    return (
      <div className={`${base} text-[11px] text-muted-foreground`} role="status">
        <span className="material-symbols-outlined text-base leading-none" aria-hidden>timeline</span>
        <span className="truncate">Série histórica · {motivoSemSerie ?? "esta visão não tem evolução no tempo"}</span>
      </div>
    );
  }

  return (
    <div className={base} role="group" aria-label="Série histórica">
      <span className="material-symbols-outlined text-base leading-none text-muted-foreground" aria-hidden>timeline</span>
      {/* O que a barra percorre, sempre visível: o mesmo texto da série escolhida na coluna. */}
      <span className="max-w-[45%] truncate text-[11px] font-medium text-foreground/80" title={serie.titulo}>{serie.titulo}</span>
      <button
        type="button"
        disabled={n < 2 || acumulado}
        onClick={() => {
          if (tocando) { setTocando(false); return; }
          if (indice >= ultimo) serie.onIndice(0);
          setTocando(true);
        }}
        aria-label={tocando ? "Pausar" : "Reproduzir a evolução"}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40"
      >
        {tocando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <div className={`relative min-w-0 flex-1 ${acumulado ? "opacity-40" : ""}`}>
        <input
          type="range" min={0} max={ultimo} step={1} value={indice} disabled={n < 2 || acumulado}
          onChange={(e) => { setTocando(false); serie.onIndice(Number(e.target.value)); }}
          aria-label="Período" aria-valuetext={String(serie.rotulos[indice])}
          className="w-full accent-primary"
        />
        <div className="relative mx-1 -mt-0.5 h-3">
          {marcas.map(({ a, i }) => (
            <span key={i} className="absolute -translate-x-1/2 font-mono text-[9px] text-muted-foreground" style={{ left: `${ultimo ? (i / ultimo) * 100 : 0}%` }}>{a}</span>
          ))}
        </div>
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums">{acumulado ? "todos" : serie.rotulos[indice]}</span>
      {serie.acumulado && (
        <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
          <input type="checkbox" checked={acumulado} onChange={(e) => serie.acumulado?.onAlternar(e.target.checked)} className="h-3 w-3 accent-primary" />
          acumulado
        </label>
      )}
    </div>
  );
}

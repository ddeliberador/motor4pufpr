// Visão regional do Mapa: ficha lateral com as cinco macrorregiões e régua do
// tempo que percorre a série histórica. Os números vêm de `v_series_validas`
// somados por região (ver lib/seriesRegionais); nada é estimado na tela.

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Pause, Play, X } from "lucide-react";
import { REGIOES, type Regiao } from "@/lib/regioes";
import {
  INDICADORES_REGIONAIS,
  base100,
  formatarValorRegional,
  participacao,
  type IndicadorRegional,
  type DadosSerieRegional,
} from "@/lib/seriesRegionais";
import { safeHttpUrl } from "@/lib/utils";

const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: n < 0.1 ? 1 : 0 })}%`;

interface FichaProps {
  indicador: IndicadorRegional;
  onIndicador: (id: string) => void;
  dados: DadosSerieRegional | undefined;
  carregando: boolean;
  erro: unknown;
  ano: number | null;
  regiaoFoco: Regiao | null;
  onRegiaoFoco: (r: Regiao | null) => void;
  onFechar: () => void;
}

export function FichaRegional({
  indicador, onIndicador, dados, carregando, erro, ano, regiaoFoco, onRegiaoFoco, onFechar,
}: FichaProps) {
  const serie = dados?.serie;
  const linha = serie && ano != null ? serie.celulas[ano] : null;
  const foco = regiaoFoco && linha ? linha[regiaoFoco] : null;
  const fonteUrl = safeHttpUrl(dados?.fonte?.fonte_url);

  const ufsFoco = useMemo(() => {
    if (!foco || foco.valor == null) return [];
    return Object.entries(foco.porUf).sort((a, b) => b[1] - a[1]);
  }, [foco]);

  return (
    <aside
      className="flex max-h-[48%] w-full shrink-0 flex-col overflow-y-auto border-t border-border bg-background p-4 sm:max-h-none sm:w-80 sm:border-l sm:border-t-0"
      aria-label="Visão regional"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Visão regional</p>
          <p className="text-[11px] text-muted-foreground">Cinco macrorregiões do IBGE, ano a ano</p>
        </div>
        <button onClick={onFechar} aria-label="Fechar visão regional" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1" role="radiogroup" aria-label="Indicador">
        {INDICADORES_REGIONAIS.map((i) => (
          <button
            key={i.id}
            role="radio"
            aria-checked={i.id === indicador.id}
            onClick={() => onIndicador(i.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
              i.id === indicador.id
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-transparent bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="truncate">{i.rotulo}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{i.camada}</span>
          </button>
        ))}
      </div>

      {carregando && (
        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando a série…
        </p>
      )}
      {!!erro && !carregando && (
        <p className="mt-6 text-xs text-destructive">Série indisponível no momento. Tente de novo em instantes.</p>
      )}
      {serie && serie.anos.length === 0 && !carregando && (
        <p className="mt-6 text-xs text-muted-foreground">Ainda não há série por estado para este indicador.</p>
      )}

      {serie && linha && ano != null && (
        <>
          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-2xl font-bold leading-none">{ano}</p>
            <p className="text-[11px] text-muted-foreground">{indicador.unidade}</p>
          </div>

          <ul className="mt-3 space-y-1.5">
            {REGIOES.map((r) => {
              const c = linha[r];
              const p = participacao(serie, ano, r);
              const b = base100(serie, ano, r);
              const ativa = regiaoFoco === r;
              return (
                <li key={r}>
                  <button
                    onClick={() => onRegiaoFoco(ativa ? null : r)}
                    aria-pressed={ativa}
                    className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                      ativa ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium">{r}</span>
                      <span className="font-mono font-semibold">{formatarValorRegional(c.valor)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${c.valor == null || serie.maximo <= 0 ? 0 : (c.valor / serie.maximo) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>{p == null ? "sem dado" : `${pct(p)} do Brasil`}</span>
                      <span>
                        {b ? `base 100 em ${b.anoBase}: ${fmt(b.indice)}` : ""}
                        {c.ufsComDado < c.ufsTotal && (
                          <span title="Estados sem linha neste ano ficam fora da soma">
                            {b ? " · " : ""}{c.ufsComDado}/{c.ufsTotal} UFs
                          </span>
                        )}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {regiaoFoco && foco && (
            <div className="mt-4 rounded-md border border-border bg-card p-3">
              <p className="text-xs font-semibold">Estados no {regiaoFoco}</p>
              {foco.valor == null || foco.valor <= 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">Sem dado para esta região em {ano}.</p>
              ) : (
                <>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {ufsFoco[0][0]} concentra {pct(ufsFoco[0][1] / foco.valor)} da região
                  </p>
                  <ul className="mt-2 space-y-1">
                    {ufsFoco.map(([uf, v]) => (
                      <li key={uf} className="grid grid-cols-[2rem_1fr_4.5rem] items-center gap-2 text-[11px]">
                        <span className="font-mono">{uf}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(v / foco.valor!) * 100}%` }} />
                        </span>
                        <span className="text-right font-mono">{fmt(v)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {!regiaoFoco && (
            <p className="mt-3 text-[11px] text-muted-foreground">Clique numa região, aqui ou no mapa, para ver os estados por trás do número.</p>
          )}

          <div className="mt-4 space-y-2 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
            {(indicador.limitacao || dados?.fonte?.limitacao) && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-amber-700 dark:text-amber-300">
                {indicador.limitacao ?? dados?.fonte?.limitacao}
              </p>
            )}
            <p>
              Percentual é a fatia do Brasil no ano (razão de somas). Base 100 compara com o primeiro ano em que a região tem valor. Estados sem linha no ano ficam fora da soma, nunca contam como zero.
            </p>
            {dados?.fonte?.fonte && (
              <p>
                Fonte:{" "}
                {fonteUrl ? (
                  <a href={fonteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {dados.fonte.fonte} <ExternalLink className="inline h-3 w-3" />
                  </a>
                ) : (
                  dados.fonte.fonte
                )}
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

interface ReguaProps {
  anos: number[];
  indice: number;
  onIndice: (i: number) => void;
}

/** Régua do tempo com play: percorre a série inteira em cerca de 8 segundos. */
export function ReguaTempo({ anos, indice, onIndice }: ReguaProps) {
  const [tocando, setTocando] = useState(false);
  const ultimo = anos.length - 1;
  const passoMs = Math.max(120, Math.min(900, Math.round(8000 / Math.max(1, anos.length))));

  useEffect(() => {
    if (!tocando) return;
    if (indice >= ultimo) { setTocando(false); return; }
    const t = setTimeout(() => onIndice(indice + 1), passoMs);
    return () => clearTimeout(t);
  }, [tocando, indice, ultimo, passoMs, onIndice]);

  useEffect(() => { setTocando(false); }, [anos]);

  const marcas = useMemo(() => {
    if (anos.length <= 8) return anos.map((a, i) => ({ a, i }));
    const n = 6;
    return Array.from({ length: n + 1 }, (_, k) => {
      const i = Math.round((k / n) * ultimo);
      return { a: anos[i], i };
    });
  }, [anos, ultimo]);

  if (anos.length < 2) {
    return (
      <div className="absolute inset-x-3 bottom-3 z-10 rounded-lg border border-border bg-background/95 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        {anos.length === 1 ? `Só há o ano ${anos[0]} para este indicador, ainda sem evolução para mostrar.` : "Sem série para mostrar."}
      </div>
    );
  }

  return (
    <div className="absolute inset-x-3 bottom-3 z-10 rounded-lg border border-border bg-background/95 px-3 pb-2 pt-2.5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (tocando) { setTocando(false); return; }
            if (indice >= ultimo) onIndice(0);
            setTocando(true);
          }}
          aria-label={tocando ? "Pausar" : "Reproduzir a evolução"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border hover:bg-muted"
        >
          {tocando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={ultimo}
            step={1}
            value={indice}
            onChange={(e) => { setTocando(false); onIndice(Number(e.target.value)); }}
            aria-label="Ano"
            aria-valuetext={String(anos[indice])}
            className="w-full accent-primary"
          />
          <div className="relative mx-2 mt-0.5 h-3">
            {marcas.map(({ a, i }) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                style={{ left: `${(i / ultimo) * 100}%` }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
        <span className="w-12 shrink-0 text-right text-lg font-bold tabular-nums">{anos[indice]}</span>
      </div>
    </div>
  );
}

// Controle do coroplético municipal (aba Camadas de IA): escolhe o indicador
// das séries municipais, o segmento, a normalização por população e o
// período; devolve ao Mapa o objeto pronto para pintar os 5.570 municípios.

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { CORES_COROPLETICO, type CoropleticoMunicipal as Coro } from "@/components/mapa/MapaBrasil";
import {
  INDICADORES_MUNICIPAIS, ROTULO_CAMADA, type CamadaIa, cortesQuantis, formatarValor, porDezMilHabitantes, rotuloPeriodo,
  usePeriodosMunicipais, usePopulacaoMunicipal, useValoresMunicipais,
} from "@/lib/seriesMunicipais";

export interface EstadoCoropletico {
  indicador: string | null;
  segmento: string;
  normalizar: boolean;
  /** Índice do período na lista de períodos disponíveis (null = o mais recente). */
  indicePeriodo: number | null;
}

export const ESTADO_COROPLETICO_INICIAL: EstadoCoropletico = { indicador: null, segmento: "", normalizar: false, indicePeriodo: null };

interface Props {
  estado: EstadoCoropletico;
  onEstado: (e: EstadoCoropletico) => void;
  /** Recebe o coroplético pronto (ou null) e a régua de períodos. */
  onCoropletico: (c: Coro | null, regua: { rotulos: string[]; indice: number } | null) => void;
}

export default function CoropleticoMunicipal({ estado, onEstado, onCoropletico }: Props) {
  const def = INDICADORES_MUNICIPAIS.find((i) => i.id === estado.indicador) ?? null;
  const periodosQ = usePeriodosMunicipais(def?.id ?? null, estado.segmento);
  const periodos = useMemo(() => periodosQ.data ?? [], [periodosQ.data]);
  const indice = estado.indicePeriodo == null ? Math.max(0, periodos.length - 1) : Math.min(estado.indicePeriodo, Math.max(0, periodos.length - 1));
  const periodo = periodos[indice]?.periodo ?? null;
  const valoresQ = useValoresMunicipais(def?.id ?? null, estado.segmento, periodo);
  const popQ = usePopulacaoMunicipal(!!def && estado.normalizar);
  const [erroPop, setErroPop] = useState(false);

  useEffect(() => { setErroPop(!!(estado.normalizar && popQ.isFetched && !popQ.data)); }, [estado.normalizar, popQ.isFetched, popQ.data]);

  // Monta o coroplético sempre que dado/segmento/período/normalização mudam.
  useEffect(() => {
    if (!def || !periodo || !valoresQ.data) { onCoropletico(null, null); return; }
    const normalizado = estado.normalizar && !!popQ.data;
    const valores = normalizado ? porDezMilHabitantes(valoresQ.data, popQ.data!.valores) : valoresQ.data;
    const cortes = cortesQuantis(valores);
    const cores = CORES_COROPLETICO.slice(0, cortes.length + 1);
    const seg = def.segmentos.find((s) => s.id === estado.segmento)?.rotulo;
    const gran = periodos[indice]?.granularidade ?? "ano";
    onCoropletico(
      {
        valores, cortes, cores,
        rotulo: `${def.rotulo}${seg && estado.segmento ? ` · ${seg}` : ""} · ${rotuloPeriodo(periodo, gran)}${normalizado ? " · por 10 mil hab." : ""}`,
        formatar: (v) => formatarValor(v, def.unidade, normalizado),
      },
      { rotulos: periodos.map((p) => rotuloPeriodo(p.periodo, p.granularidade)), indice },
    );
    // onCoropletico é estável por useCallback no pai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, periodo, valoresQ.data, popQ.data, estado.normalizar, estado.segmento, indice, periodos]);

  const porCamada = useMemo(() => {
    const m = new Map<CamadaIa, typeof INDICADORES_MUNICIPAIS>();
    for (const i of INDICADORES_MUNICIPAIS) m.set(i.camada, [...(m.get(i.camada) ?? []), i]);
    return [...m.entries()];
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card/60 p-2">
      <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coroplético municipal</p>
      <p className="px-1 pb-2 text-[11px] text-muted-foreground">Pinta os 5.570 municípios com um indicador público de cada camada. Os dados vêm das coletas mensais e anuais (ver Bases).</p>
      <select
        value={estado.indicador ?? ""}
        onChange={(e) => onEstado({ ...ESTADO_COROPLETICO_INICIAL, indicador: e.target.value || null })}
        aria-label="Indicador municipal"
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      >
        <option value="">Nenhum (só os marcadores)</option>
        {porCamada.map(([camada, lista]) => (
          <optgroup key={camada} label={ROTULO_CAMADA[camada]}>
            {lista.map((i) => (
              <option key={i.id} value={i.id} disabled={!!i.indisponivel}>{i.rotulo}{i.indisponivel ? " (sem base municipal)" : ""}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {def && (
        <div className="mt-2 space-y-2 px-1 text-[11px]">
          {def.segmentos.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {def.segmentos.map((s) => (
                <button key={s.id} type="button" onClick={() => onEstado({ ...estado, segmento: s.id, indicePeriodo: null })}
                  className={`rounded-full border px-2 py-0.5 ${estado.segmento === s.id ? "border-foreground/40 bg-muted text-foreground" : "border-border text-muted-foreground"}`}>
                  {s.rotulo}
                </button>
              ))}
            </div>
          )}
          {def.normalizavel && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={estado.normalizar} onChange={(e) => onEstado({ ...estado, normalizar: e.target.checked })} className="h-3 w-3 accent-primary" />
              por 10 mil habitantes (IBGE)
            </label>
          )}
          {erroPop && <p className="text-destructive">População ainda não coletada; mostrando valores absolutos.</p>}
          <p className="text-muted-foreground">
            {periodosQ.isLoading || valoresQ.isLoading ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> carregando…</span>
            ) : periodosQ.error || valoresQ.error ? (
              <span className="text-destructive">Falha: {String((periodosQ.error ?? valoresQ.error as Error)?.message ?? "")}</span>
            ) : periodos.length === 0 ? (
              <span>Esta série ainda não foi coletada. Dispare a coleta no backend (<code>POST /api/v1/coletas/municipal/…</code>) ou aguarde a rodada agendada.</span>
            ) : (
              <span>
                Fonte: {def.fonte} · {periodos.length} período{periodos.length > 1 ? "s" : ""} · {periodos[indice]?.municipios.toLocaleString("pt-BR")} municípios com dado
                {valoresQ.data ? ` · ${Object.keys(valoresQ.data).length.toLocaleString("pt-BR")} valores` : ""}
              </span>
            )}
          </p>
          {def.limitacao && <p className="rounded bg-muted px-2 py-1 text-muted-foreground">{def.limitacao}</p>}
        </div>
      )}
      {INDICADORES_MUNICIPAIS.filter((i) => i.indisponivel).length > 0 && !def && (
        <details className="mt-2 px-1 text-[11px] text-muted-foreground">
          <summary className="cursor-pointer">Por que L4 e L7 não têm coroplético</summary>
          {INDICADORES_MUNICIPAIS.filter((i) => i.indisponivel).map((i) => (
            <p key={i.id} className="mt-1"><b className="text-foreground">{ROTULO_CAMADA[i.camada]}:</b> {i.indisponivel}</p>
          ))}
        </details>
      )}
    </div>
  );
}

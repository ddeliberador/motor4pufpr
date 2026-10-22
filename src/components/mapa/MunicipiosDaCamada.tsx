// Nível municipal de uma camada de IA: aparece indentado sob a camada, na
// coluna lateral. Escolher um indicador pinta os 5.570 municípios com ele;
// só um indicador pinta o mapa por vez (os demais ficam como marcadores).

import { indicadoresDaCamada, type CamadaIa } from "@/lib/seriesMunicipais";

export interface SelecaoMunicipal { indicador: string; segmento: string }

interface Props {
  camada: CamadaIa;
  selecao: SelecaoMunicipal | null;
  onSelecionar: (s: SelecaoMunicipal | null) => void;
  /** Cobertura do indicador selecionado (municípios com dado no período), para o rodapé. */
  cobertura?: { municipios: number; periodo: string } | null;
  carregando?: boolean;
}

export default function MunicipiosDaCamada({ camada, selecao, onSelecionar, cobertura, carregando }: Props) {
  const lista = indicadoresDaCamada(camada);
  if (!lista.length) return null;
  const indisponivel = lista.find((i) => i.indisponivel);
  return (
    <div className="ml-6 mt-0.5 space-y-1 border-l border-border pl-2 text-[11px]">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Municípios</p>
      {indisponivel ? (
        <p className="text-muted-foreground">{indisponivel.indisponivel}</p>
      ) : (
        lista.map((i) => {
          const ativo = selecao?.indicador === i.id;
          return (
            <div key={i.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
                <input type="radio" name="municipios" checked={ativo} onChange={() => onSelecionar({ indicador: i.id, segmento: "" })}
                  onClick={() => { if (ativo) onSelecionar(null); }} className="h-3 w-3 accent-primary" />
                <span className="flex-1">{i.rotulo}</span>
                <span className="text-[10px] text-muted-foreground">{i.fonte}</span>
              </label>
              {ativo && (
                <div className="ml-5 space-y-1 pb-1">
                  {i.segmentos.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {i.segmentos.map((s) => (
                        <button key={s.id} type="button" onClick={() => onSelecionar({ indicador: i.id, segmento: s.id })}
                          className={`rounded-full border px-2 py-0.5 ${selecao?.segmento === s.id ? "border-foreground/40 bg-muted text-foreground" : "border-border text-muted-foreground"}`}>
                          {s.rotulo}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-muted-foreground">
                    {carregando ? "carregando…" : cobertura
                      ? `${cobertura.municipios.toLocaleString("pt-BR")} municípios com dado · ${cobertura.periodo}`
                      : "série ainda não coletada (ver Gestão da Pesquisa → Coletas)"}
                  </p>
                  {i.limitacao && <p className="rounded bg-muted px-2 py-1 text-muted-foreground">{i.limitacao}</p>}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

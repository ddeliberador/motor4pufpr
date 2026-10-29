// Modo Evolução do Mapa: uma lista só de séries históricas, montada a partir do
// que existe no banco (catalogoSeries), em três recortes (regiões, estados,
// municípios). Cada série se explica numa linha (o que é, unidade, período,
// fonte); a escolhida fica aberta e pinta o mapa; a barra de tempo no rodapé
// do mapa repete o mesmo contexto. Nada aqui é estimado: sem linha, não entra.

import { useMemo } from "react";
import { REGIOES, type Regiao, UFS_POR_REGIAO } from "@/lib/regioes";
import { INDICADORES_REGIONAIS, base100, formatarValorRegional, participacao, type DadosSerieRegional, type IndicadorRegional } from "@/lib/seriesRegionais";
import { INDICADORES_MUNICIPAIS, ROTULO_CAMADA, type IndicadorMunicipal } from "@/lib/seriesMunicipais";
import { ESTADOS } from "@/lib/sistemasEstaduais";
import { serieDisponivel, type SerieCatalogada } from "@/lib/catalogoSeries";

export type Recorte = "regioes" | "estados" | "municipios";
export const RECORTES: { id: Recorte; rotulo: string }[] = [
  { id: "regioes", rotulo: "Regiões" }, { id: "estados", rotulo: "Estados" }, { id: "municipios", rotulo: "Municípios" },
];

/** Frase curta do que a série mede, por indicador (o catálogo só tem o rótulo). */
const O_QUE_E: Record<string, string> = {
  "energia.capacidade_acumulada_mw": "potência das usinas em operação ao fim de cada ano",
  "uf.doutores_titulados": "doutores titulados no ano, por estado da instituição",
  "uf.mestres_titulados": "mestres titulados no ano, por estado da instituição",
  "uf.patentes_residentes": "pedidos de patente de residentes no ano",
  "uf.porto_toneladas": "toneladas movimentadas nos portos da UF no ano",
  "uf.aero_passageiros": "passageiros embarcados nos aeroportos da UF no ano",
  "uf.ferro_tu": "carga ferroviária originada na UF, em toneladas úteis",
  "uf.rodo_veiculos": "veículos nas praças de pedágio das concessões federais",
  "mun.gd_potencia_kw": "potência de geração distribuída acumulada no município",
  "mun.gd_unidades": "unidades de geração distribuída acumuladas",
  "mun.bl_acessos": "acessos de banda larga fixa no município",
  "mun.estab_dados": "estabelecimentos de hospedagem e dados ativos",
  "mun.estab_ti": "estabelecimentos de serviços de TI ativos",
  "mun.ppg": "programas de pós-graduação no município",
};
const FONTE_REGIONAL: Record<string, string> = {
  "energia.capacidade_acumulada_mw": "ANEEL, série reconstruída", "uf.doutores_titulados": "CAPES", "uf.mestres_titulados": "CAPES", "uf.patentes_residentes": "INPI",
  "uf.porto_toneladas": "ANTAQ", "uf.aero_passageiros": "ANAC", "uf.ferro_tu": "ANTT", "uf.rodo_veiculos": "ANTT",
};

const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: n < 0.1 ? 1 : 0 })}%`;

function Cartao({ aberto, titulo, oQueE, meta, onClick }: { aberto: boolean; titulo: string; oQueE: string; meta: string; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={aberto} onClick={onClick}
      className={`block w-full rounded-md border px-2.5 py-1.5 text-left transition-colors ${aberto ? "border-primary/50 bg-primary/10" : "border-transparent bg-card hover:bg-muted"}`}>
      <span className={`block text-xs ${aberto ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{titulo}</span>
      {aberto && (<>
        <span className="mt-0.5 block text-[11px] leading-snug text-foreground/90">{oQueE}</span>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">{meta}</span>
      </>)}
    </button>
  );
}

export interface EvolucaoProps {
  recorte: Recorte;
  onRecorte: (r: Recorte) => void;
  catalogo: SerieCatalogada[] | undefined;
  catalogoCarregando: boolean;
  // Regiões e estados
  indicador: IndicadorRegional;
  onIndicador: (id: string) => void;
  dados: DadosSerieRegional | undefined;
  carregando: boolean;
  ano: number | null;
  regiaoFoco: Regiao | null;
  onRegiaoFoco: (r: Regiao | null) => void;
  ufFoco: string | null;
  onUfFoco: (uf: string | null) => void;
  // Municípios
  munModo: "sintese" | "indicador" | "nenhum";
  munSel: { indicador: string; segmento: string } | null;
  onMunicipios: (modo: "sintese" | "indicador", sel: { indicador: string; segmento: string } | null) => void;
  normalizar: boolean;
  onNormalizar: (v: boolean) => void;
  sinteseCamadas: string[];
  sinteseCarregando: boolean;
  admin?: boolean;
}

export default function Evolucao(p: EvolucaoProps) {
  const regionais = useMemo(() => INDICADORES_REGIONAIS.map((i) => ({ i, c: serieDisponivel(p.catalogo, i.id, "uf") })).filter((x) => x.c) as { i: IndicadorRegional; c: SerieCatalogada }[], [p.catalogo]);
  const municipais = useMemo(() => INDICADORES_MUNICIPAIS.filter((i) => !i.indisponivel).map((i) => ({ i, c: serieDisponivel(p.catalogo, i.id, "municipio") })).filter((x) => x.c) as { i: IndicadorMunicipal; c: SerieCatalogada }[], [p.catalogo]);
  const serie = p.dados?.serie;
  const linha = serie && p.ano != null ? serie.celulas[p.ano] : null;

  const ranking = useMemo(() => {
    if (!linha) return [];
    if (p.recorte === "regioes") return REGIOES.map((r) => ({ id: r as string, nome: r as string, valor: linha[r].valor, parcial: linha[r].ufsComDado < linha[r].ufsTotal ? `${linha[r].ufsComDado}/${linha[r].ufsTotal} UFs` : "" }));
    const ufs = REGIOES.flatMap((r) => UFS_POR_REGIAO[r].map((uf) => ({ id: uf, nome: ESTADOS[uf] ?? uf, valor: linha[r].porUf[uf] ?? null, parcial: "" })));
    return ufs.sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
  }, [linha, p.recorte]);
  const maximo = useMemo(() => Math.max(1, ...ranking.map((r) => r.valor ?? 0)), [ranking]);

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="Recorte">
        {RECORTES.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={p.recorte === r.id} onClick={() => p.onRecorte(r.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${p.recorte === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"} ${r.id === "municipios" && !municipais.length && p.recorte !== r.id ? "opacity-50" : ""}`}
            title={r.id === "municipios" && !municipais.length ? "ainda sem série municipal coletada" : undefined}>{r.rotulo}</button>
        ))}
      </div>

      {p.catalogoCarregando && <p className="text-xs text-muted-foreground">conferindo quais séries existem…</p>}

      {p.recorte !== "municipios" && (<>
        <div className="space-y-1" role="radiogroup" aria-label="Série">
          {regionais.map(({ i, c }) => (
            <Cartao key={i.id} aberto={i.id === p.indicador.id} titulo={i.rotulo} onClick={() => p.onIndicador(i.id)}
              oQueE={O_QUE_E[i.id] ?? i.rotulo}
              meta={`${i.unidade} · ${c.ano_min === c.ano_max ? c.ano_min : `${c.ano_min} a ${c.ano_max}`} · ${FONTE_REGIONAL[i.id] ?? "fonte oficial"} · ${i.camada}`} />
          ))}
          {!p.catalogoCarregando && regionais.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma série por estado coletada ainda.</p>}
        </div>
        {p.indicador.limitacao && p.indicador.id === p.indicador.id && regionais.some((r) => r.i.id === p.indicador.id) && (
          <p className="text-[10px] leading-snug text-muted-foreground">{p.indicador.limitacao}</p>
        )}
        {p.carregando && <p className="text-xs text-muted-foreground">carregando a série…</p>}
        {serie && linha && p.ano != null && (
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold leading-none">{p.ano}</p>
              <p className="text-[11px] text-muted-foreground">{p.indicador.unidade}</p>
            </div>
            <ul className="mt-2 space-y-1">
              {ranking.map((r) => {
                const ativo = p.recorte === "regioes" ? p.regiaoFoco === r.id : p.ufFoco === r.id;
                const part = p.recorte === "regioes" ? participacao(serie, p.ano!, r.id as Regiao) : null;
                const b = p.recorte === "regioes" ? base100(serie, p.ano!, r.id as Regiao) : null;
                return (
                  <li key={r.id}>
                    <button type="button" aria-pressed={ativo}
                      onClick={() => (p.recorte === "regioes" ? p.onRegiaoFoco(ativo ? null : (r.id as Regiao)) : p.onUfFoco(ativo ? null : r.id))}
                      className={`w-full rounded-md border px-2 py-1.5 text-left ${ativo ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-muted"}`}>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate font-medium">{r.nome}</span>
                        <span className="font-mono font-semibold">{formatarValorRegional(r.valor)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${r.valor == null ? 0 : (r.valor / maximo) * 100}%` }} />
                      </div>
                      {(part != null || b || r.parcial) && (
                        <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
                          <span>{part == null ? "" : `${pct(part)} do Brasil`}</span>
                          <span>{b ? `base 100 em ${b.anoBase}: ${fmt(b.indice)}` : ""}{r.parcial ? ` · ${r.parcial}` : ""}</span>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </>)}

      {p.recorte === "municipios" && (<>
        {municipais.length > 0 && <label className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
          <input type="checkbox" checked={p.normalizar} onChange={(e) => p.onNormalizar(e.target.checked)} className="h-3 w-3 accent-primary" /> por 10 mil habitantes
        </label>}
        <div className="space-y-1" role="radiogroup" aria-label="Série municipal">
          {municipais.length > 0 && (
            <Cartao aberto={p.munModo === "sintese"} titulo="Síntese das camadas" onClick={() => p.onMunicipios("sintese", null)}
              oQueE="posição média (0 a 100) de cada município nas camadas que têm série"
              meta={p.sinteseCarregando ? "carregando…" : p.sinteseCamadas.length ? `camadas com dado: ${p.sinteseCamadas.join(", ")}` : "nenhuma camada com dado"} />
          )}
          {municipais.map(({ i, c }) => (
            <Cartao key={i.id} aberto={p.munModo === "indicador" && p.munSel?.indicador === i.id} titulo={i.rotulo} onClick={() => p.onMunicipios("indicador", { indicador: i.id, segmento: "" })}
              oQueE={O_QUE_E[i.id] ?? i.rotulo}
              meta={`${i.unidade} · ${c.ano_min === c.ano_max ? c.ano_min : `${c.ano_min} a ${c.ano_max}`} · ${i.fonte} · ${ROTULO_CAMADA[i.camada]}`} />
          ))}
          {!p.catalogoCarregando && municipais.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma série municipal coletada ainda.{p.admin ? " Dispare as coletas em Gestão da Pesquisa → Coletas." : ""}</p>
          )}
        </div>
        {p.munModo === "indicador" && p.munSel && (() => { const def = INDICADORES_MUNICIPAIS.find((i) => i.id === p.munSel!.indicador); const segs = def?.segmentos.filter((sg) => serieDisponivel(p.catalogo, def.id, "municipio", sg.id)) ?? []; return segs.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            {segs.map((sg) => (
              <button key={sg.id} type="button" onClick={() => p.onMunicipios("indicador", { indicador: def!.id, segmento: sg.id })} aria-pressed={p.munSel!.segmento === sg.id}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${p.munSel!.segmento === sg.id ? "border-foreground/40 bg-muted text-foreground" : "border-border text-muted-foreground"}`}>{sg.rotulo}</button>
            ))}
          </div>
        ) : null; })()}
      </>)}

      <p className="text-[10px] leading-snug text-muted-foreground">Só aparecem séries com dado no banco; as demais entram quando a coleta rodar.</p>
    </div>
  );
}

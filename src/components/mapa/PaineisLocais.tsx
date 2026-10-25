// Painéis de estado e de município do Mapa: abrem ao clicar na malha (UF no
// zoom nacional, município a partir do zoom municipal) e resumem, para aquele
// lugar, o que o mapa já carregou (atores, usinas, datacenters, backhaul,
// síntese das camadas) mais as leituras de src/lib/paineisLocais.ts. Tudo lê o
// ano em foco da barra de tempo. Sem dado, o painel diz "sem dado", não estima.

import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CATEGORIAS, CATEGORIA_MAP, type CategoriaKey } from "./tipos";
import type { UsinaAneel, Datacenter, BackhaulMunicipio } from "./caboSubmarino";
import { TIPOS_INTERACAO, HELICE_ROTULO } from "./CamadaInteracao";
import { CODIGO_IBGE_UF, carregarGeojson } from "./maplibre/geo";
import { ESTADOS, corPerfil } from "@/lib/sistemasEstaduais";
import { INDICADORES_REGIONAIS } from "@/lib/seriesRegionais";
import { INDICADORES_MUNICIPAIS, INDICADOR_POPULACAO, ROTULO_CAMADA, formatarValor, rotuloPeriodo, type CamadaIa } from "@/lib/seriesMunicipais";
import {
  agruparSeriesMunicipio, normalizarNome, periodoAteAnoSerie, pontoAteAno, resumirInteracoesUf,
  usePainelEstado, usePainelMunicipio, type PontoSerie,
} from "@/lib/paineisLocais";
import { useQuery } from "@tanstack/react-query";
import { GavetaInferior } from "@/components/GavetaInferior";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FeatureCollection, Point } from "geojson";

export type AtorDoPainel = { id: string; nome: string; categoria: CategoriaKey; municipio: string | null; uf: string | null; latitude: number | null; longitude: number | null };

const fmt = (v: number | null | undefined, casas = 0) => v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
const fmtMw = (kw: number) => `${(kw / 1000).toLocaleString("pt-BR", { maximumFractionDigits: kw >= 1e6 ? 0 : 1 })} MW`;

function Secao({ titulo, children, nota }: { titulo: string; children: ReactNode; nota?: string }) {
  return (
    <section className="border-t border-border pt-2">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      {children}
      {nota && <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">{nota}</p>}
    </section>
  );
}
function Numero({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/50 px-2 py-1.5">
      <p className="truncate text-[10px] text-muted-foreground">{rotulo}</p>
      <p className="text-sm font-bold tabular-nums leading-tight">{valor}</p>
      {sub && <p className="truncate text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
/** Linha fina com os pontos da série; o ano em foco fica marcado. */
function Faisca({ pontos, ano }: { pontos: PontoSerie[]; ano: number | null }) {
  if (pontos.length < 2) return null;
  const w = 96, h = 22;
  const xs = pontos.map((p) => p.ano), ys = pontos.map((p) => p.valor);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys, 1);
  const px = (a: number) => ((a - x0) / Math.max(1, x1 - x0)) * (w - 4) + 2;
  const py = (v: number) => h - 2 - (v / y1) * (h - 4);
  const foco = pontoAteAno(pontos, ano);
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.2} points={pontos.map((p) => `${px(p.ano)},${py(p.valor)}`).join(" ")} />
      {foco && <circle cx={px(foco.ano)} cy={py(foco.valor)} r={2.2} fill="currentColor" />}
    </svg>
  );
}
function Cabecalho({ titulo, sub, onFechar, onEnquadrar, onVizinho }: { titulo: string; sub: ReactNode; onFechar: () => void; onEnquadrar?: () => void; onVizinho?: (dir: -1 | 1) => void }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-tight text-foreground">{titulo}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onVizinho && (<>
          <button type="button" onClick={() => onVizinho(-1)} title="Estado anterior" aria-label="Estado anterior" className="toque flex h-6 w-6 items-center justify-center rounded-md border border-border hover:bg-muted">‹</button>
          <button type="button" onClick={() => onVizinho(1)} title="Próximo estado" aria-label="Próximo estado" className="toque flex h-6 w-6 items-center justify-center rounded-md border border-border hover:bg-muted">›</button>
        </>)}
        {onEnquadrar && (
          <button type="button" onClick={onEnquadrar} title="Enquadrar no mapa" aria-label="Enquadrar no mapa"
            className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-border hover:bg-muted">
            <span className="material-symbols-outlined text-base leading-none">center_focus_strong</span>
          </button>
        )}
        <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
      </div>
    </div>
  );
}
function ListaAtores({ atores, onSelecionarPonto, limite = 8 }: { atores: AtorDoPainel[]; onSelecionarPonto?: (id: string) => void; limite?: number }) {
  const porCat = useMemo(() => {
    const m = new Map<CategoriaKey, number>();
    for (const a of atores) m.set(a.categoria, (m.get(a.categoria) ?? 0) + 1);
    return CATEGORIAS.filter((c) => m.has(c.key)).map((c) => ({ ...c, n: m.get(c.key)! }));
  }, [atores]);
  if (!atores.length) return <p className="text-muted-foreground">Nenhum ator mapeado aqui nas bases carregadas.</p>;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {porCat.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px]">
            <span className={`material-symbols-outlined text-[12px] leading-none ${c.cor}`} aria-hidden>{c.icon}</span>{c.n.toLocaleString("pt-BR")} {c.label.split(" / ")[0].toLowerCase()}
          </span>
        ))}
      </div>
      {limite > 0 && (
        <ul className="space-y-0.5">
          {atores.slice(0, limite).map((a) => (
            <li key={a.id}>
              <button type="button" disabled={!onSelecionarPonto || a.latitude == null} onClick={() => onSelecionarPonto?.(a.id)}
                className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent">
                <span className={`material-symbols-outlined text-[13px] leading-none ${CATEGORIA_MAP[a.categoria].cor}`} aria-hidden>{CATEGORIA_MAP[a.categoria].icon}</span>
                <span className="min-w-0 flex-1 truncate">{a.nome}</span>
              </button>
            </li>
          ))}
          {atores.length > limite && <li className="px-1 text-[10px] text-muted-foreground">e mais {(atores.length - limite).toLocaleString("pt-BR")}; use a busca da coluna lateral para a lista completa.</li>}
        </ul>
      )}
    </div>
  );
}

const painelClasse = "absolute bottom-3 right-3 top-3 z-20 flex w-[22rem] max-w-[calc(100%-1.5rem)] flex-col overflow-y-auto rounded-lg border border-border bg-card/95 p-3 text-xs shadow-lg backdrop-blur";

/** Lateral sobre o mapa no desktop; gaveta inferior sem bloqueio (o mapa continua respondendo) no celular. */
function Recipiente({ rotulo, onFechar, children }: { rotulo: string; onFechar: () => void; children: ReactNode }) {
  const movel = useIsMobile();
  if (movel) {
    return (
      <GavetaInferior aberta onAberta={(v) => { if (!v) onFechar(); }} semBloqueio alturas={[0.22, 0.55, 0.94]} cabecalho={<span className="sr-only">{rotulo}</span>} className="text-xs">
        <div className="px-3 pb-3">{children}</div>
      </GavetaInferior>
    );
  }
  return <aside className={painelClasse} aria-label={rotulo}>{children}</aside>;
}

// =====================================================================
// Estado
// =====================================================================
export interface PainelEstadoProps {
  uf: string;
  anoFoco: number | null;
  atores: AtorDoPainel[];
  usinas: UsinaAneel[];
  datacenters: Datacenter[];
  backhaul: BackhaulMunicipio[];
  /** Síntese das 7 camadas por código IBGE (0–100), quando ligada. */
  sintese: Record<string, number> | null;
  onFechar: () => void;
  onEnquadrar: () => void;
  onAbrirMunicipio: (m: { ibge: string; nome: string; uf: string }) => void;
  onSelecionarPonto?: (id: string) => void;
  /** Passa ao estado anterior/seguinte sem voltar ao mapa (ordem por região e nome). */
  onVizinho?: (dir: -1 | 1) => void;
}

export function PainelEstado({ uf, anoFoco, atores, usinas, datacenters, backhaul, sintese, onFechar, onEnquadrar, onAbrirMunicipio, onSelecionarPonto, onVizinho }: PainelEstadoProps) {
  const { perfil, atores: atoresQ, interacoes, series } = usePainelEstado(uf);
  const pontosMun = useQuery({
    queryKey: ["br-mun-pontos"], staleTime: Infinity,
    queryFn: () => carregarGeojson<FeatureCollection<Point, { id: string; name: string; uf: string }>>("/br-mun-pontos.geojson"),
  });
  const nomePorIbge = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of pontosMun.data?.features ?? []) m.set(String(f.properties.id), f.properties.name);
    return m;
  }, [pontosMun.data]);

  const usinasAte = useMemo(() => usinas.filter((u) => anoFoco == null || u.ano_operacao == null || u.ano_operacao <= anoFoco), [usinas, anoFoco]);
  const kw = usinasAte.reduce((s, u) => s + (u.potencia_kw ?? 0), 0);
  const fibra = backhaul.filter((b) => b.temBackhaul).length;

  const prefixo = CODIGO_IBGE_UF[uf];
  const sinteseUf = useMemo(() => {
    if (!sintese || !prefixo) return null;
    const pares = Object.entries(sintese).filter(([k]) => k.startsWith(prefixo)).sort((a, b) => b[1] - a[1]);
    if (!pares.length) return null;
    return { n: pares.length, media: pares.reduce((s, [, v]) => s + v, 0) / pares.length, top: pares.slice(0, 5) };
  }, [sintese, prefixo]);

  const inter = useMemo(() => interacoes.data ? resumirInteracoesUf(interacoes.data, uf, anoFoco) : null, [interacoes.data, uf, anoFoco]);
  const p = perfil.data;
  const totalAtoresView = (atoresQ.data ?? []).reduce((s, r) => s + (r.atores ?? 0), 0);

  return (
    <Recipiente rotulo={`Visão do estado ${ESTADOS[uf] ?? uf}`} onFechar={onFechar}>
      <Cabecalho titulo={ESTADOS[uf] ?? uf} onFechar={onFechar} onEnquadrar={onEnquadrar} onVizinho={onVizinho}
        sub={<>
          <span className="rounded border border-border px-1 font-mono">{uf}</span>
          {" · "}
          {perfil.isLoading ? "carregando perfil…" : p?.perfil ? <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: corPerfil(p.perfil) }} />{p.perfil}</span> : "perfil de cooperação indisponível"}
        </>} />
      {p?.pct_empresas_buscam_fora != null && (
        <p className="mb-2 leading-snug text-muted-foreground">
          {fmt(p.pct_empresas_buscam_fora, 1)}% das relações das empresas locais são com unidades de outros estados{p.uf_principal_origem_externa ? `, principalmente ${p.uf_principal_origem_externa}` : ""}.
        </p>
      )}
      <div className="space-y-2">
        <Secao titulo="Quem está no estado" nota={atoresQ.data?.length ? `${fmt(totalAtoresView)} atores na classificação dos sistemas estaduais (todas as bases); abaixo, os ${fmt(atores.length)} que o mapa tem localizados.` : undefined}>
          <ListaAtores atores={atores} onSelecionarPonto={onSelecionarPonto} limite={6} />
        </Secao>

        <Secao titulo="Infraestrutura (Layers 1 a 3)" nota={anoFoco != null && usinas.length !== usinasAte.length ? `Usinas em operação até ${anoFoco}.` : undefined}>
          <div className="grid grid-cols-3 gap-1.5">
            <Numero rotulo="Usinas ANEEL" valor={fmt(usinasAte.length)} sub={usinasAte.length ? fmtMw(kw) : "sem usinas carregadas"} />
            <Numero rotulo="Datacenters" valor={fmt(datacenters.length)} sub="PeeringDB" />
            <Numero rotulo="Backhaul fibra" valor={backhaul.length ? `${Math.round((100 * fibra) / backhaul.length)}%` : "—"} sub={backhaul.length ? `${fmt(fibra)} de ${fmt(backhaul.length)} municípios` : "Layer 2 desligada"} />
          </div>
        </Secao>

        <Secao titulo="Camadas de IA nos municípios"
          nota={sintese ? "Síntese 0–100: média dos postos percentuais das camadas com dado municipal; só municípios com alguma série entram." : "Ligue a síntese das 7 camadas (coluna lateral) para ver o recorte municipal."}>
          {sinteseUf ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <Numero rotulo="Síntese média" valor={fmt(sinteseUf.media)} sub="0–100" />
                <Numero rotulo="Municípios com dado" valor={fmt(sinteseUf.n)} />
              </div>
              <ul className="space-y-0.5">
                {sinteseUf.top.map(([ibge, v]) => (
                  <li key={ibge}>
                    <button type="button" onClick={() => onAbrirMunicipio({ ibge, nome: nomePorIbge.get(ibge) ?? ibge, uf })}
                      className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left hover:bg-muted">
                      <span className="truncate">{nomePorIbge.get(ibge) ?? ibge}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">{fmt(v)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : sintese ? <p className="text-muted-foreground">Nenhum município de {uf} tem série municipal coletada ainda.</p> : null}
        </Secao>

        <Secao titulo="Interações" nota={inter ? "Laços entram (destino no estado), saem (origem no estado) ou ficam dentro dele; soma até o ano em foco." : undefined}>
          {interacoes.isLoading ? <p className="text-muted-foreground">carregando…</p>
            : interacoes.error ? <p className="text-destructive">Falha: {(interacoes.error as Error).message}</p>
            : !inter || inter.size === 0 ? <p className="text-muted-foreground">Nenhuma interação registrada com este estado.</p>
            : (
              <table className="w-full text-[11px]">
                <thead><tr className="text-[10px] text-muted-foreground"><th className="text-left font-normal">tipo</th><th className="text-right font-normal">entra</th><th className="text-right font-normal">sai</th><th className="text-right font-normal">dentro</th></tr></thead>
                <tbody>
                  {TIPOS_INTERACAO.filter((t) => inter.has(t.id)).map((t) => { const v = inter.get(t.id)!; return (
                    <tr key={t.id} title={`${HELICE_ROTULO[t.origem]} → ${HELICE_ROTULO[t.destino]}`}>
                      <td className="truncate py-0.5"><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: t.cor }} />{t.rotulo.replace(" (EMBRAPII)", "")}</td>
                      <td className="text-right font-mono tabular-nums">{fmt(v.entra)}</td><td className="text-right font-mono tabular-nums">{fmt(v.sai)}</td><td className="text-right font-mono tabular-nums">{fmt(v.dentro)}</td>
                    </tr>); })}
                </tbody>
              </table>
            )}
        </Secao>

        <Secao titulo="Série histórica do estado" nota="Mesmas séries da visão regional (v_series_validas por UF); o ponto marcado é o ano em foco.">
          {series.isLoading ? <p className="text-muted-foreground">carregando…</p> : (
            <ul className="space-y-1">
              {INDICADORES_REGIONAIS.map((ind) => {
                const s = series.data?.[ind.id];
                const pt = pontoAteAno(s, anoFoco);
                return (
                  <li key={ind.id} className="flex items-center gap-2 text-foreground">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px]">{ind.rotulo} <span className="text-muted-foreground">· {ind.camada}</span></p>
                      <p className="text-[10px] text-muted-foreground">{pt ? `${fmt(pt.valor)} ${ind.unidade} em ${pt.ano}` : "sem dado para esta UF"}</p>
                    </div>
                    {s && <Faisca pontos={s} ano={anoFoco} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <div className="border-t border-border pt-2">
          <Link to={`/analise?cenario=6&uf=${uf}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
            <span className="material-symbols-outlined text-sm leading-none" aria-hidden>open_in_new</span>
            Análise completa do sistema de {uf}
          </Link>
        </div>
      </div>
    </Recipiente>
  );
}

// =====================================================================
// Município
// =====================================================================
export interface PainelMunicipioProps {
  municipio: { ibge: string; nome: string; uf: string };
  anoFoco: number | null;
  atores: AtorDoPainel[];
  usinas: UsinaAneel[];
  datacenters: Datacenter[];
  backhaul: BackhaulMunicipio | null;
  antenas: number | null;
  /** Síntese 0–100 do município (null quando a síntese está desligada ou ele não tem dado). */
  sintese: number | null;
  onFechar: () => void;
  onEnquadrar: () => void;
  onAbrirEstado: (uf: string) => void;
  onSelecionarPonto?: (id: string) => void;
}

const CAMADAS: CamadaIa[] = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];

export function PainelMunicipio({ municipio, anoFoco, atores, usinas, datacenters, backhaul, antenas, sintese, onFechar, onEnquadrar, onAbrirEstado, onSelecionarPonto }: PainelMunicipioProps) {
  const seriesQ = usePainelMunicipio(municipio.ibge);
  const series = useMemo(() => agruparSeriesMunicipio(seriesQ.data ?? []), [seriesQ.data]);
  const pop = useMemo(() => {
    const s = series.find((x) => x.indicador === INDICADOR_POPULACAO && x.segmento === "");
    // População: último valor até o ano em foco; se a série só começa depois, o mais recente mesmo assim.
    return s ? periodoAteAnoSerie(s.pontos, anoFoco) ?? s.pontos[s.pontos.length - 1] : null;
  }, [series, anoFoco]);
  const usinasAte = usinas.filter((u) => anoFoco == null || u.ano_operacao == null || u.ano_operacao <= anoFoco);
  const kw = usinasAte.reduce((s, u) => s + (u.potencia_kw ?? 0), 0);
  const temSerie = series.some((s) => s.indicador !== INDICADOR_POPULACAO);

  return (
    <Recipiente rotulo={`Visão do município ${municipio.nome}`} onFechar={onFechar}>
      <Cabecalho titulo={municipio.nome || municipio.ibge} onFechar={onFechar} onEnquadrar={onEnquadrar}
        sub={<>
          <button type="button" onClick={() => onAbrirEstado(municipio.uf)} className="font-semibold text-primary hover:underline">{ESTADOS[municipio.uf] ?? municipio.uf}</button>
          {" · IBGE "}<span className="font-mono">{municipio.ibge}</span>
          {pop ? ` · ${fmt(pop.valor)} hab. (${pop.periodo.slice(0, 4)})` : ""}
        </>} />
      <div className="space-y-2">
        <Secao titulo="Camadas de IA no município"
          nota={seriesQ.data && !temSerie ? "As séries municipais ainda não foram coletadas para este município (Gestão da Pesquisa → Coletas)." : "Valor do último período até o ano em foco. L4 e L7 não têm base pública municipal."}>
          {sintese != null && <div className="mb-1.5 grid grid-cols-2 gap-1.5"><Numero rotulo="Síntese das 7 camadas" valor={fmt(sintese)} sub="posto médio 0–100" /></div>}
          {seriesQ.isLoading ? <p className="text-muted-foreground">carregando…</p> : seriesQ.error ? <p className="text-destructive">Falha: {(seriesQ.error as Error).message}</p> : (
            <ul className="space-y-1">
              {CAMADAS.map((camada) => {
                const inds = INDICADORES_MUNICIPAIS.filter((i) => i.camada === camada);
                return (
                  <li key={camada}>
                    <p className="text-[10px] font-semibold text-muted-foreground">{ROTULO_CAMADA[camada]}</p>
                    {inds.map((ind) => {
                      if (ind.indisponivel) return <p key={ind.id} className="pl-2 text-[10px] text-muted-foreground/80">sem base municipal</p>;
                      const total = series.find((s) => s.indicador === ind.id && s.segmento === "");
                      const pt = total ? periodoAteAnoSerie(total.pontos, anoFoco) : null;
                      const segs = ind.segmentos.filter((sg) => sg.id).map((sg) => {
                        const s = series.find((x) => x.indicador === ind.id && x.segmento === sg.id);
                        const v = s ? periodoAteAnoSerie(s.pontos, anoFoco) : null;
                        return v ? `${sg.rotulo.toLowerCase()}: ${formatarValor(v.valor, ind.unidade, false)}` : null;
                      }).filter(Boolean);
                      return (
                        <div key={ind.id} className="flex items-center gap-2 pl-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px]">{ind.rotulo}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {pt ? <><b className="text-foreground">{formatarValor(pt.valor, ind.unidade, false)}</b> · {rotuloPeriodo(pt.periodo, total!.granularidade)}{segs.length ? ` · ${segs.join(" · ")}` : ""}</> : "sem dado"}
                            </p>
                          </div>
                          {total && total.pontos.length > 1 && <Faisca pontos={total.pontos.map((q) => ({ ano: Number(q.periodo.slice(0, 4)) + (q.periodo.length > 4 ? (Number(q.periodo.slice(5, 7)) - 1) / 12 : 0), valor: q.valor }))} ano={anoFoco == null ? null : anoFoco + 0.999} />}
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>

        <Secao titulo="Infraestrutura" nota={backhaul == null && antenas == null ? "Ligue a Layer 2 (backhaul, antenas) para ver conectividade." : undefined}>
          <div className="grid grid-cols-3 gap-1.5">
            <Numero rotulo="Usinas ANEEL" valor={fmt(usinasAte.length)} sub={usinasAte.length ? fmtMw(kw) : "nenhuma localizada"} />
            <Numero rotulo="Datacenters" valor={fmt(datacenters.length)} sub="PeeringDB" />
            <Numero rotulo="Backhaul" valor={backhaul == null ? "—" : backhaul.temBackhaul ? "fibra" : "rádio/sat."} sub={antenas != null ? `${fmt(antenas)} antenas (ERB)` : "ANATEL"} />
          </div>
          {usinasAte.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {usinasAte.slice(0, 4).map((u) => <li key={u.id} className="truncate text-[11px]"><span className="text-muted-foreground">{u.tipo}</span> {u.nome}{u.potencia_kw ? <span className="text-muted-foreground"> · {fmtMw(u.potencia_kw)}</span> : null}</li>)}
              {usinasAte.length > 4 && <li className="text-[10px] text-muted-foreground">e mais {usinasAte.length - 4}</li>}
            </ul>
          )}
          {datacenters.length > 0 && <ul className="mt-1 space-y-0.5">{datacenters.slice(0, 4).map((d) => <li key={d.id} className="truncate text-[11px]">{d.nome}{d.org ? <span className="text-muted-foreground"> · {d.org}</span> : null}</li>)}</ul>}
        </Secao>

        <Secao titulo="Atores mapeados" nota="Casados pelo nome do município nas bases do Mapa; MEI aparece pelo CEP ou pelo município, nunca pelo endereço.">
          <ListaAtores atores={atores} onSelecionarPonto={onSelecionarPonto} limite={10} />
        </Secao>
      </div>
    </Recipiente>
  );
}

/** Atores de um município, casados por nome normalizado + UF. */
export function atoresDoMunicipio<T extends { municipio: string | null; uf: string | null }>(todos: T[], nome: string, uf: string): T[] {
  const alvo = normalizarNome(nome);
  if (!alvo) return [];
  return todos.filter((a) => a.uf === uf && normalizarNome(a.municipio) === alvo);
}

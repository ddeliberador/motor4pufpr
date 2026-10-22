// Mapa do Brasil em MapLibre GL (WebGL). Mantém o espírito sóbrio do mapa
// anterior (contorno + 27 UFs sobre a cor do tema, sem tiles por padrão), mas
// desenha tudo na GPU: dezenas de milhares de usinas, antenas e atores entram
// sem custo de DOM, as camadas ligam e desligam por visibilidade e a malha
// municipal (public/br-mun/{IBGE}.geojson) é carregada sob demanda ao aproximar.
//
// Fundos opcionais (OpenFreeMap claro/escuro, imagens Esri) são escolhidos pelo
// usuário e lembrados no navegador; o padrão continua sem base cartográfica.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibre, type MapMouseEvent, type GeoJSONSource, type StyleSpecification, type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Point, LineString, Polygon, MultiPolygon } from "geojson";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { CATEGORIA_MAP, CATEGORIAS, type CategoriaKey } from "./tipos";
import { supabase } from "@/integrations/supabase/client";
import type { EnriquecimentoLayers } from "./caboSubmarino";
import {
  type AntenaERB,
  type BackhaulMunicipio,
  type DadosCabos,
  type Datacenter,
  type UsinaAneel,
} from "./caboSubmarino";
import { COR_INTERACAO, type CamadaInteracaoProps, type ArcoAgregado, type UnidadeEmbrapii } from "./CamadaInteracao";
import { aguardarFonteMaterial, badgesDeCluster, corDaClasse, corDoTema, garantirIcone, garantirRotulo, resolverCorCss } from "./maplibre/icones";
import { ATRIBUICAO_FUNDO, type FundoId, URL_ESTILO_FUNDO, estiloSatelite, estiloSobrio } from "./maplibre/fundos";
export { FUNDOS, type FundoId } from "./maplibre/fundos";
import {
  BBOX_BRASIL, type Bbox, type FeatureMun, type FeatureUf,
  arcoCurvo, bboxDaFeature, bboxesIntersectam, carregarMunicipios, dentroDaFeature,
} from "./maplibre/geo";

export interface Ponto {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  categoria: CategoriaKey;
}

export interface AncoraPbia {
  id: string;
  nome: string;
  entidade?: string;
  municipio?: string;
  uf?: string;
  latitude: number;
  longitude: number;
  grupo?: string;
  icone?: string;
  eixo: number;
  layers?: string[];
  acoes?: string[];
  acoes_nomes?: string[];
  status?: string;
  entrega_2026?: string;
  descricao?: string;
  capacidade?: string;
  recurso_brl?: number;
  recurso_detalhe?: string;
  url?: string;
}

export interface VisaoRegionalMapa {
  preenchimento: Record<string, string>;
  dica: Record<string, string>;
  destaque: Set<string>;
  rotulos: { lon: number; lat: number; titulo: string; valor: string; ativo: boolean }[];
  onSelecionarUf: (uf: string) => void;
}

interface Props {
  pontos: Ponto[];
  ufSelecionada: string | null;
  ufsSelecionadas: Set<string>;
  /** UFs do recorte efetivo (estados explícitos + regiões); vazio = Brasil inteiro. */
  ufsFiltroAtivas: Set<string>;
  contagemPorUf: Record<string, number>;
  onSelecionarUf: (uf: string) => void;
  onSelecionarCluster: (pontos: Ponto[], total: number) => void;
  pontoSelecionadoId?: string | null;
  onSelecionarPonto?: (id: string | null) => void;
  /** IDs do grupo aberto na listagem (pontos sobrepostos num mesmo ícone). */
  grupoIds?: Set<string> | null;
  /** Layer 1 — Energia: usinas da ANEEL. */
  layer1Ativa?: boolean;
  dadosUsinas?: UsinaAneel[] | null;
  tiposUsina?: Set<string>;
  /** Régua de tempo da Layer 1: mostra só usinas em operação até este ano (sem ano = sempre). */
  anoMaximoUsinas?: number | null;
  usinaDestaque?: UsinaAneel | null;
  /** Layer 2 — Infraestrutura Física. */
  layer2Ativa?: boolean;
  dadosCabos?: DadosCabos | null;
  l2Cabos?: boolean;
  l2Antenas?: boolean;
  dadosAntenas?: AntenaERB[] | null;
  l2Backhaul?: boolean;
  dadosBackhaul?: BackhaulMunicipio[] | null;
  /** Layer 3 — Infraestrutura Lógica: datacenters do PeeringDB. */
  layer3Ativa?: boolean;
  dadosDCs?: Datacenter[] | null;
  /** Layers 4–7: anéis de enriquecimento sobre os atores existentes. */
  layer4Ativa?: boolean;
  layer5Ativa?: boolean;
  layer6Ativa?: boolean;
  layer7Ativa?: boolean;
  enriquecimentoLayers?: EnriquecimentoLayers;
  /** Layer 7 / PBIA — infraestruturas âncora georreferenciadas. */
  ancorasPbia?: AncoraPbia[] | null;
  corEixoPbia?: string | null;
  onSelecionarAncora?: (a: AncoraPbia) => void;
  /** Camada de interação (cooperação EMBRAPII): arcos UF→UF e unidades. */
  interacao?: CamadaInteracaoProps | null;
  /** Visão regional: preenche cada UF com a cor da sua região e rotula as regiões. */
  regional?: VisaoRegionalMapa | null;
  /** Fundo cartográfico (ver FUNDOS). Padrão: sóbrio. */
  fundo?: FundoId;
  /** Mostra os nomes de lugares do fundo (só tem efeito nos fundos com tiles). */
  mostrarNomes?: boolean;
  /** Carrega a malha municipal ao aproximar. */
  malhaMunicipal?: boolean;
  /** Coroplético municipal (séries das Camadas de IA): pinta os 5.570 municípios. */
  coropletico?: CoropleticoMunicipal | null;
}

export interface CoropleticoMunicipal {
  /** código IBGE (7 dígitos) → valor já na escala exibida. */
  valores: Record<string, number>;
  /** Cortes crescentes entre classes (n cortes = n+1 classes). */
  cortes: number[];
  /** Cores das classes (cortes.length + 1). */
  cores: string[];
  rotulo: string;
  formatar: (v: number) => string;
}

/** Rampa sequencial para o coroplético (claro → escuro), legível nos dois temas. */
export const CORES_COROPLETICO = ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#172554"];
export const COR_SEM_DADO = "rgba(128,128,128,0.18)";

export function classeDoValor(v: number, cortes: number[]) {
  let k = 0;
  while (k < cortes.length && v > cortes[k]) k++;
  return k;
}

/** Operações que a página pode disparar no mapa (exportação). */
export interface MapaBrasilHandle {
  /** PNG do mapa como data URL. */
  imagemPng(): Promise<string>;
  enquadrar(): void;
}

/** Estilo dos cabos por classificação de `cabos_lista` (tipo + internacional). */
const ESTILO_CABO = {
  internacional: { cor: "#f97316", traco: undefined as number[] | undefined, rotulo: "Cabo submarino internacional" },
  costeiro: { cor: "#0ea5e9", traco: [2.5, 1.25], rotulo: "Cabo costeiro doméstico" },
  fluvial: { cor: "#14b8a6", traco: [0.8, 1.2], rotulo: "Infovia fluvial (Amazônia)" },
};
type ClasseCabo = keyof typeof ESTILO_CABO;

const COR_CLASSE_USINA: Record<string, string> = {
  UHE: "text-blue-400",
  PCH: "text-blue-300",
  CGH: "text-blue-200",
  EOL: "text-violet-400",
  UFV: "text-yellow-400",
  UTE: "text-red-400",
  UTN: "text-green-400",
};
const ROTULO_USINA: Record<string, string> = {
  UHE: "UHE — Hídrica", PCH: "PCH — Hídrica peq.", CGH: "CGH — Micro-hidro",
  EOL: "EOL — Eólica", UFV: "UFV — Solar", UTE: "UTE — Termelétrica", UTN: "UTN — Nuclear",
};

const COR_ANEL = { l4: "#4ade80", l5: "#2dd4bf", l6: "#22d3ee", l7: "#a78bfa" } as const;
const ZOOM_MUNICIPIOS = 5.5;

// Escala dos ícones por zoom: crescem menos que o mapa, como no mapa anterior.
const ESCALA_ICONE: [number, number][] = [[3, 0.6], [6, 0.85], [10, 1.1]];
/** Interpolação por zoom cujo resultado é multiplicado por um fator (constante ou expressão de dado).
 *  O MapLibre só aceita ["zoom"] no topo de "interpolate"/"step", por isso o fator entra em cada parada. */
function porZoom(paradas: [number, number][], fator: number | ExpressionSpecification = 1): ExpressionSpecification {
  const saida = (v: number): number | ExpressionSpecification => (fator === 1 ? v : ["*", v, fator]);
  return ["interpolate", ["linear"], ["zoom"], ...paradas.flatMap(([z, v]) => [z, saida(v)])] as ExpressionSpecification;
}
const TAMANHO_ICONE = porZoom(ESCALA_ICONE);

const fc = <G extends Point | LineString | Polygon | MultiPolygon, P>(features: Feature<G, P>[]): FeatureCollection<G, P> =>
  ({ type: "FeatureCollection", features });
const VAZIO = fc<Point, Record<string, unknown>>([]);

const MapaBrasil = forwardRef<MapaBrasilHandle, Props>(function MapaBrasil({
  pontos, ufSelecionada, ufsSelecionadas, ufsFiltroAtivas, contagemPorUf,
  onSelecionarUf, onSelecionarCluster, pontoSelecionadoId, onSelecionarPonto, grupoIds,
  layer1Ativa, dadosUsinas, tiposUsina, anoMaximoUsinas = null, usinaDestaque,
  layer2Ativa, dadosCabos, l2Cabos, l2Antenas, dadosAntenas, l2Backhaul, dadosBackhaul,
  layer3Ativa, dadosDCs,
  layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa, enriquecimentoLayers,
  ancorasPbia, corEixoPbia, onSelecionarAncora,
  interacao, regional,
  fundo = "sobrio", mostrarNomes = true, malhaMunicipal = true, coropletico = null,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dicaRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const [features, setFeatures] = useState<FeatureUf[] | null>(null);
  const [erroMalha, setErroMalha] = useState<string | null>(null);
  // Incrementa a cada style.load: todas as camadas são remontadas e os dados reenviados.
  const [versaoEstilo, setVersaoEstilo] = useState(0);
  // Falso entre um setStyle e o style.load seguinte (nesse intervalo o mapa rejeita setData/setPaintProperty).
  // map.isStyleLoaded() não serve: também fica falso enquanto qualquer fonte ainda baixa.
  const estiloOkRef = useRef(false);
  // Camadas de rótulo do fundo cartográfico (para "nomes de lugares").
  const camadasBaseRef = useRef<string[]>([]);
  const [tema, setTema] = useState(0);
  const [zoom, setZoom] = useState(3);
  const [municipios, setMunicipios] = useState<Record<string, FeatureMun[]>>({});
  const [tipoCabo, setTipoCabo] = useState<Record<string, ClasseCabo>>({});

  // Callbacks mais recentes acessíveis pelos handlers do mapa (registrados uma vez).
  const cb = useRef({ onSelecionarUf, onSelecionarCluster, onSelecionarPonto, onSelecionarAncora, interacao, regional, coropletico });
  cb.current = { onSelecionarUf, onSelecionarCluster, onSelecionarPonto, onSelecionarAncora, interacao, regional, coropletico };
  const pontosPorId = useRef(new Map<string, Ponto>());
  const arcosPorChave = useRef(new Map<string, ArcoAgregado>());
  const unidadesPorId = useRef(new Map<string, UnidadeEmbrapii>());
  const ancorasPorId = useRef(new Map<string, AncoraPbia>());

  // ---------- malha das UFs ----------
  useEffect(() => {
    let vivo = true;
    fetch("/br-uf.geojson")
      .then((r) => { if (!r.ok) throw new Error(`malha IBGE indisponível (HTTP ${r.status})`); return r.json(); })
      .then((d: FeatureCollection<Polygon | MultiPolygon, { sigla: string }>) => vivo && setFeatures(d.features))
      .catch((e) => vivo && setErroMalha(e.message));
    return () => { vivo = false; };
  }, []);

  const bboxes = useMemo(() => {
    const m: Record<string, Bbox> = {};
    for (const f of features ?? []) m[f.properties.sigla] = bboxDaFeature(f);
    return m;
  }, [features]);

  const pontoNaSelecaoGeografica = useCallback((lat: number, lon: number, uf?: string | null) => {
    if (ufsFiltroAtivas.size === 0) return true;
    if (uf) return ufsFiltroAtivas.has(uf);
    if (!features) return false;
    return features.some((f) => ufsFiltroAtivas.has(f.properties.sigla) && dentroDaFeature(lon, lat, f, bboxes[f.properties.sigla]));
  }, [features, ufsFiltroAtivas, bboxes]);

  // A malha oficial é a autoridade final para impedir marcadores fora do Brasil.
  const pontosNoBrasil = useMemo(() => {
    if (!features) return [];
    return pontos.filter((p) => features.some((f) => dentroDaFeature(p.longitude, p.latitude, f, bboxes[f.properties.sigla])));
  }, [pontos, features, bboxes]);

  // ---------- tema ----------
  useEffect(() => {
    const obs = new MutationObserver(() => setTema((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ---------- inicialização do mapa ----------
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = new maplibregl.Map({
      container: el,
      style: estiloSobrio(corDoTema("--background")),
      bounds: BBOX_BRASIL,
      fitBoundsOptions: { padding: 16 },
      minZoom: 2.5,
      maxZoom: 14,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      canvasContextAttributes: { preserveDrawingBuffer: true }, // exportação em PNG
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __mapaMotor?: MapLibre }).__mapaMotor = map; // inspeção no console

    map.on("style.load", () => {
      estiloOkRef.current = true;
      camadasBaseRef.current = (map.getStyle().layers ?? []).filter((l) => l.type === "symbol").map((l) => l.id);
      montarCamadas(map);
      setVersaoEstilo((v) => v + 1);
    });
    map.on("zoom", () => setZoom(map.getZoom()));

    // ---- interação: ponteiro, dica e clique ----
    const camadasClique = [
      "ancoras-icone", "selecao-icone",
      ...CATEGORIAS.map((c) => `atores-${c.key}-ponto`), "enriquecidos-ponto",
      ...CATEGORIAS.flatMap((c) => [`atores-${c.key}-badge`, `atores-${c.key}-cluster`]),
      "inter-unidades", "inter-loops", "inter-arcos",
      "ufs-fill",
    ];
    const camadasDica = [
      "ancoras-icone", ...CATEGORIAS.map((c) => `atores-${c.key}-ponto`), "enriquecidos-ponto",
      ...CATEGORIAS.flatMap((c) => [`atores-${c.key}-badge`, `atores-${c.key}-cluster`]),
      "inter-unidades", "inter-loops", "inter-arcos",
      "dcs", "landing", "antenas", "backhaul-fibra", "backhaul-sem",
      "cabos-internacional", "cabos-costeiro", "cabos-fluvial", "usinas",
      "mun-fill", "ufs-fill",
    ];
    const existentes = (ids: string[]) => ids.filter((id) => map.getLayer(id));
    let hoverUf: string | number | null = null;
    let hoverMun: string | number | null = null;

    map.on("mousemove", (e: MapMouseEvent) => {
      const fts = map.queryRenderedFeatures(e.point, { layers: existentes(camadasDica) });
      const top = fts[0];
      const dica = dicaRef.current;
      if (dica) {
        let texto = top?.properties?.dica as string | undefined;
        const coro = cb.current.coropletico;
        if (coro && top?.layer.id === "mun-fill") {
          const v = coro.valores[String(top.properties?.id)];
          texto = `${texto} · ${v == null ? "sem dado" : coro.formatar(v)}`;
        }
        if (texto) {
          dica.textContent = texto;
          dica.style.display = "block";
          dica.style.transform = `translate(${e.point.x + 12}px, ${e.point.y + 12}px)`;
        } else dica.style.display = "none";
      }
      const interativo = fts.some((f) => camadasClique.includes(f.layer.id));
      map.getCanvas().style.cursor = interativo ? "pointer" : "";

      const uf = fts.find((f) => f.layer.id === "ufs-fill")?.id ?? null;
      if (uf !== hoverUf) {
        if (hoverUf != null && map.getSource("ufs")) map.setFeatureState({ source: "ufs", id: hoverUf }, { hover: false });
        if (uf != null) map.setFeatureState({ source: "ufs", id: uf }, { hover: true });
        hoverUf = uf;
      }
      const mun = fts.find((f) => f.layer.id === "mun-fill")?.id ?? null;
      if (mun !== hoverMun) {
        if (hoverMun != null && map.getSource("municipios")) map.setFeatureState({ source: "municipios", id: hoverMun }, { hover: false });
        if (mun != null) map.setFeatureState({ source: "municipios", id: mun }, { hover: true });
        hoverMun = mun;
      }
    });
    map.on("mouseout", () => { if (dicaRef.current) dicaRef.current.style.display = "none"; });

    map.on("click", (e: MapMouseEvent) => {
      const fts = map.queryRenderedFeatures(e.point, { layers: existentes(camadasClique) });
      // Prioridade: a primeira camada da lista que tiver feição sob o cursor.
      const f = camadasClique.map((id) => fts.find((x) => x.layer.id === id)).find(Boolean);
      const c = cb.current;
      if (!f) { c.onSelecionarPonto?.(null); return; }
      const id = f.layer.id;
      const p = f.properties ?? {};
      if (id === "ufs-fill") {
        (c.regional ? c.regional.onSelecionarUf : c.onSelecionarUf)(String(p.sigla));
        return;
      }
      if (id === "ancoras-icone") { const a = ancorasPorId.current.get(String(p.id)); if (a) c.onSelecionarAncora?.(a); return; }
      if (id.endsWith("-ponto")) { c.onSelecionarPonto?.(String(p.id)); return; }
      if (id === "selecao-icone") return;
      if (id.endsWith("-cluster") || id.endsWith("-badge")) {
        const src = map.getSource(f.source) as GeoJSONSource | undefined;
        if (!src) return;
        src.getClusterLeaves(Number(p.cluster_id), Infinity, 0).then((folhas) => {
          const lista = folhas
            .map((l) => pontosPorId.current.get(String(l.properties?.id)))
            .filter((x): x is Ponto => !!x);
          c.onSelecionarPonto?.(null);
          c.onSelecionarCluster(lista.slice(0, 60), Number(p.point_count));
        }).catch(() => undefined);
        return;
      }
      if (id === "inter-unidades") { const u = unidadesPorId.current.get(String(p.id)); if (u) c.interacao?.onUnidade(u); return; }
      if (id === "inter-loops" || id === "inter-arcos") { const a = arcosPorChave.current.get(String(p.chave)); if (a) c.interacao?.onArco(a); }
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ---------- troca de fundo ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let estilo: StyleSpecification | string;
    if (fundo === "sobrio") estilo = estiloSobrio(corDoTema("--background"));
    else if (fundo === "satelite") estilo = estiloSatelite();
    else estilo = URL_ESTILO_FUNDO[fundo] as string;
    estiloOkRef.current = false;
    map.setStyle(estilo, { diff: false });
  }, [fundo, tema]);

  // ---------- nomes de lugares do fundo ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    for (const id of camadasBaseRef.current)
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", mostrarNomes ? "visible" : "none");
  }, [mostrarNomes, versaoEstilo]);

  // ---------- dados: UFs ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features || !versaoEstilo || !estiloOkRef.current) return;
    const corMuted = corDoTema("--muted", 0.35);
    const corSel = corDoTema("--primary", 0.22);
    const corBorda = corDoTema("--foreground", regional ? 0.12 : 0.25);
    const corRealce = corDoTema("--primary", 0.9);
    const data = fc(features.map((f) => {
      const s = f.properties.sigla;
      const n = contagemPorUf[s] || 0;
      const fill = regional ? resolverCorCss(regional.preenchimento[s] ?? corMuted) : ufsSelecionadas.has(s) ? corSel : corMuted;
      const realce = !!regional?.destaque.has(s);
      return {
        ...f,
        id: s,
        properties: {
          sigla: s, fill, realce,
          dica: regional ? regional.dica[s] ?? s : `${s} — ${n.toLocaleString("pt-BR")} registros`,
        },
      };
    }));
    (map.getSource("ufs") as GeoJSONSource | undefined)?.setData(data);
    map.setPaintProperty("ufs-line", "line-color", ["case", ["get", "realce"], corRealce, corBorda]);
    map.setPaintProperty("ufs-line", "line-width", ["case", ["get", "realce"], 2.2, 1.2]);
    map.setPaintProperty("ufs-sombra", "line-color", corDoTema("--foreground", 0.45));
  }, [features, contagemPorUf, ufsSelecionadas, regional, versaoEstilo, tema]);

  // ---------- rótulos regionais ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const cor = corDoTema("--foreground");
    const halo = corDoTema("--background");
    const data = fc((regional?.rotulos ?? []).map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] },
      properties: { icone: garantirRotulo(map, [r.titulo, r.valor], cor, halo, 15, true), ativo: r.ativo },
    })));
    (map.getSource("rotulos-regiao") as GeoJSONSource | undefined)?.setData(data);
  }, [regional, versaoEstilo, tema]);

  // ---------- municípios sob demanda ----------
  const ufsVisiveis = useCallback((): string[] => {
    const map = mapRef.current;
    if (!map || !features || map.getZoom() < ZOOM_MUNICIPIOS) return [];
    const b = map.getBounds();
    const vista: Bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    return features.map((f) => f.properties.sigla).filter((s) => bboxes[s] && bboxesIntersectam(bboxes[s], vista));
  }, [features, bboxes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features || (!malhaMunicipal && !coropletico)) return;
    let vivo = true;
    const carregar = () => {
      const alvo = new Set(ufsVisiveis());
      if (ufSelecionada && map.getZoom() >= ZOOM_MUNICIPIOS - 0.5) alvo.add(ufSelecionada);
      if (coropletico) for (const f of features) alvo.add(f.properties.sigla);
      for (const uf of alvo) {
        if (municipios[uf]) continue;
        carregarMunicipios(uf)
          .then((d) => vivo && setMunicipios((m) => (m[uf] ? m : { ...m, [uf]: d.features })))
          .catch((e) => console.warn(e.message));
      }
    };
    carregar();
    map.on("moveend", carregar);
    return () => { vivo = false; map.off("moveend", carregar); };
  }, [features, ufSelecionada, municipios, ufsVisiveis, malhaMunicipal, coropletico]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    for (const id of ["mun-line", "mun-fill"]) {
      map.setLayoutProperty(id, "visibility", malhaMunicipal || coropletico ? "visible" : "none");
      map.setLayerZoomRange(id, coropletico ? 0 : ZOOM_MUNICIPIOS, 24);
    }
    map.setLayerZoomRange("mun-coro", 0, 24);
    map.setLayoutProperty("mun-coro", "visibility", coropletico ? "visible" : "none");
    const todos = Object.values(municipios).flat().map((f) => ({
      ...f, properties: { ...f.properties, dica: `${f.properties.name} (${f.properties.uf})` },
    }));
    (map.getSource("municipios") as GeoJSONSource | undefined)?.setData(fc(todos));
    map.setPaintProperty("mun-line", "line-color", corDoTema("--foreground", 0.22));
    map.setPaintProperty("mun-fill", "fill-color", corDoTema("--primary"));
  }, [municipios, versaoEstilo, tema, malhaMunicipal, coropletico]);

  // ---------- coroplético: cor por município via feature-state ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const src = map.getSource("municipios") as GeoJSONSource | undefined;
    if (!src) return;
    // A UF some por baixo do coroplético, mas o contorno continua.
    map.setPaintProperty("ufs-fill", "fill-opacity", coropletico ? 0 : ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85]);
    map.setPaintProperty("mun-line", "line-color", coropletico ? corDoTema("--background", 0.9) : corDoTema("--foreground", 0.22));
    map.setPaintProperty("mun-line", "line-width", coropletico ? ["interpolate", ["linear"], ["zoom"], 3, 0.15, 7, 0.5, 9, 0.9] : ["interpolate", ["linear"], ["zoom"], ZOOM_MUNICIPIOS, 0.3, 9, 0.8]);
    for (const f of Object.values(municipios).flat()) {
      const id = Number(f.properties.id);
      if (!coropletico) { map.removeFeatureState({ source: "municipios", id }); continue; }
      const v = coropletico.valores[f.properties.id];
      map.setFeatureState({ source: "municipios", id }, { cor: v == null ? COR_SEM_DADO : coropletico.cores[classeDoValor(v, coropletico.cortes)] });
    }
  }, [coropletico, municipios, versaoEstilo, tema]);

  // ---------- zoom na UF selecionada ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !features) return;
    const bb = ufSelecionada ? bboxes[ufSelecionada] : null;
    map.fitBounds(bb ?? BBOX_BRASIL, { padding: bb ? 32 : 16, duration: 650, maxZoom: 9 });
  }, [ufSelecionada, features, bboxes]);

  // ---------- Layer 1: usinas ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const vis = !!(layer1Ativa && dadosUsinas);
    map.setLayoutProperty("usinas", "visibility", vis ? "visible" : "none");
    if (!vis) return;
    const ordenadas = [...(dadosUsinas ?? [])].sort((a, b) => (b.potencia_kw ?? 0) - (a.potencia_kw ?? 0));
    const feats: Feature<Point, Record<string, unknown>>[] = [];
    for (const u of ordenadas) {
      if (!Number.isFinite(u.latitude) || !Number.isFinite(u.longitude)) continue;
      if (u.longitude < BBOX_BRASIL[0] || u.longitude > BBOX_BRASIL[2] || u.latitude > BBOX_BRASIL[3] || u.latitude < BBOX_BRASIL[1]) continue;
      if (tiposUsina && tiposUsina.size > 0 && !tiposUsina.has(u.tipo)) continue;
      if (anoMaximoUsinas != null && u.ano_operacao != null && u.ano_operacao > anoMaximoUsinas) continue;
      if (!pontoNaSelecaoGeografica(u.latitude, u.longitude, u.uf)) continue;
      const mw = Math.max(0, (u.potencia_kw ?? 0) / 1000);
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [u.longitude, u.latitude] },
        properties: { tipo: u.tipo, mw, dica: `${u.nome} · ${ROTULO_USINA[u.tipo] ?? u.tipo}${mw ? ` · ${mw.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MW` : ""}` },
      });
    }
    (map.getSource("usinas") as GeoJSONSource | undefined)?.setData(fc(feats));
    map.setPaintProperty("usinas", "circle-color", [
      "match", ["get", "tipo"],
      ...Object.entries(COR_CLASSE_USINA).flatMap(([t, c]) => [t, corDaClasse(c)]),
      corDaClasse("text-gray-400"),
    ]);
  }, [layer1Ativa, dadosUsinas, tiposUsina, anoMaximoUsinas, pontoNaSelecaoGeografica, versaoEstilo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const u = layer1Ativa && usinaDestaque && Number.isFinite(usinaDestaque.latitude) && Number.isFinite(usinaDestaque.longitude) ? usinaDestaque : null;
    const data = fc(u ? [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [u.longitude, u.latitude] }, properties: { icone: garantirRotulo(map, [u.nome], "#ec4899", corDoTema("--background"), 12) } }] : []);
    (map.getSource("usina-destaque") as GeoJSONSource | undefined)?.setData(data);
    if (u) map.flyTo({ center: [u.longitude, u.latitude], zoom: Math.max(map.getZoom(), 7), duration: 700 });
  }, [layer1Ativa, usinaDestaque, versaoEstilo]);

  // ---------- Layer 2: cabos, landing points, antenas, backhaul ----------
  useEffect(() => {
    if (!layer2Ativa || l2Cabos === false || Object.keys(tipoCabo).length) return;
    supabase.from("cabos_lista").select("cabo_id,tipo,internacional").order("cabo_id").range(0, 999).then(({ data, error }) => {
      if (error) { console.warn("cabos_lista indisponível:", error.message); return; }
      const m: Record<string, ClasseCabo> = {};
      for (const c of data ?? []) m[c.cabo_id] = c.tipo === "fluvial" ? "fluvial" : c.internacional ? "internacional" : "costeiro";
      setTipoCabo(m);
    });
  }, [layer2Ativa, l2Cabos, tipoCabo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const vis = !!(layer2Ativa && l2Cabos !== false && dadosCabos);
    for (const id of ["cabos-sombra", "cabos-internacional", "cabos-costeiro", "cabos-fluvial", "landing"])
      map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    if (!vis || !dadosCabos) return;
    const lps = dadosCabos.points.filter((p) => pontoNaSelecaoGeografica(Number(p.latitude), Number(p.longitude)));
    const idsVisiveis = new Set(lps.map((p) => p.id));
    const cabos = ufsFiltroAtivas.size === 0 ? dadosCabos.cables : dadosCabos.cables.filter((c) => c.landing_point_ids?.some((id) => idsVisiveis.has(id)));
    const linhas: Feature<LineString, Record<string, unknown>>[] = [];
    for (const cabo of cabos) {
      const classe = tipoCabo[cabo.id] ?? "internacional";
      for (const linha of cabo.geometry.coordinates) {
        const pts = linha.filter(([lon, lat]) => lon >= -100 && lon <= -20 && lat >= -60 && lat <= 20);
        if (pts.length < 2) continue;
        linhas.push({ type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: { classe, dica: `${cabo.name} · ${ESTILO_CABO[classe].rotulo}` } });
      }
    }
    (map.getSource("cabos") as GeoJSONSource | undefined)?.setData(fc(linhas));
    const icone = garantirIcone(map, "lan", corDaClasse("text-orange-400"));
    (map.getSource("landing") as GeoJSONSource | undefined)?.setData(fc(lps
      .filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
      .map((p) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [Number(p.longitude), Number(p.latitude)] }, properties: { icone, dica: p.name } }))));
  }, [layer2Ativa, l2Cabos, dadosCabos, tipoCabo, ufsFiltroAtivas, pontoNaSelecaoGeografica, versaoEstilo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const vis = !!(layer2Ativa && l2Antenas && dadosAntenas?.length);
    map.setLayoutProperty("antenas", "visibility", vis ? "visible" : "none");
    if (!vis) return;
    const ic = {
      anatel: garantirIcone(map, "settings_input_antenna", corDaClasse("text-orange-600")),
      nr: garantirIcone(map, "5g", corDaClasse("text-orange-500")),
      lte: garantirIcone(map, "4g_mobiledata", corDaClasse("text-orange-300")),
    };
    const feats: Feature<Point, Record<string, unknown>>[] = [];
    for (const a of dadosAntenas ?? []) {
      if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
      if (!pontoNaSelecaoGeografica(a.lat, a.lon, a.uf)) continue;
      const anatel = a.fonte === "anatel";
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [a.lon, a.lat] },
        properties: { icone: anatel ? ic.anatel : a.radio === "NR" ? ic.nr : ic.lte, tam: anatel ? 0.55 : 0.75, dica: a.operadora || `${a.net} · ${a.radio === "NR" ? "5G" : "4G"}` },
      });
    }
    (map.getSource("antenas") as GeoJSONSource | undefined)?.setData(fc(feats));
  }, [layer2Ativa, l2Antenas, dadosAntenas, pontoNaSelecaoGeografica, versaoEstilo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const vis = !!(layer2Ativa && l2Backhaul && dadosBackhaul?.length);
    map.setLayoutProperty("backhaul-fibra", "visibility", vis ? "visible" : "none");
    map.setLayoutProperty("backhaul-sem", "visibility", vis ? "visible" : "none");
    if (!vis) return;
    const icone = garantirIcone(map, "cell_tower", corDaClasse("text-amber-500"));
    const feats: Feature<Point, Record<string, unknown>>[] = [];
    for (const m of dadosBackhaul ?? []) {
      if (!Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) continue;
      if (!pontoNaSelecaoGeografica(m.latitude, m.longitude, m.uf)) continue;
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [m.longitude, m.latitude] },
        properties: { fibra: m.temBackhaul, icone, dica: `${m.municipio}/${m.uf} · ${m.temBackhaul ? `Backhaul: ${m.tipo || "fibra"}` : "Sem backhaul"}` },
      });
    }
    (map.getSource("backhaul") as GeoJSONSource | undefined)?.setData(fc(feats));
    map.setPaintProperty("backhaul-sem", "circle-color", corDaClasse("text-gray-400"));
  }, [layer2Ativa, l2Backhaul, dadosBackhaul, pontoNaSelecaoGeografica, versaoEstilo]);

  // ---------- Layer 3: datacenters ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const vis = !!(layer3Ativa && dadosDCs);
    map.setLayoutProperty("dcs", "visibility", vis ? "visible" : "none");
    if (!vis) return;
    const icone = garantirIcone(map, "dns", corDaClasse("text-yellow-400"));
    const feats: Feature<Point, Record<string, unknown>>[] = [];
    for (const dc of dadosDCs ?? []) {
      if (dc.latitude == null || dc.longitude == null || !Number.isFinite(dc.latitude) || !Number.isFinite(dc.longitude)) continue;
      if (!pontoNaSelecaoGeografica(dc.latitude, dc.longitude, dc.uf)) continue;
      const local = [dc.cidade, dc.uf].filter(Boolean).join("/");
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [dc.longitude, dc.latitude] },
        properties: { icone, dica: `${dc.nome}${local ? ` · ${local}` : ""}${dc.redes ? ` · ${dc.redes} redes` : ""}` },
      });
    }
    (map.getSource("dcs") as GeoJSONSource | undefined)?.setData(fc(feats));
  }, [layer3Ativa, dadosDCs, pontoNaSelecaoGeografica, versaoEstilo]);

  // ---------- Interação EMBRAPII ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const vis = !!interacao;
    for (const id of ["inter-arcos", "inter-loops", "inter-unidades"]) map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    if (!interacao) return;
    const { arcos, unidades } = interacao;
    arcosPorChave.current = new Map(arcos.map((a) => [a.chave, a]));
    const maxL = Math.max(1, ...arcos.map((a) => a.lacos));
    const maxP = Math.max(1, ...unidades.map((u) => Number(u.projetos ?? 0)));
    const linhas: Feature<LineString, Record<string, unknown>>[] = [];
    const loops: Feature<Point, Record<string, unknown>>[] = [];
    for (const a of arcos) {
      const peso = Math.sqrt(a.lacos / maxL);
      const dica = `${a.origem} → ${a.destino} · ${a.lacos.toLocaleString("pt-BR")} laços`;
      if (a.origem === a.destino) loops.push({ type: "Feature", geometry: { type: "Point", coordinates: a.o }, properties: { chave: a.chave, peso, dica } });
      else linhas.push({ type: "Feature", geometry: { type: "LineString", coordinates: arcoCurvo(a.o, a.d) }, properties: { chave: a.chave, peso, dica } });
    }
    (map.getSource("inter-arcos") as GeoJSONSource | undefined)?.setData(fc(linhas));
    (map.getSource("inter-loops") as GeoJSONSource | undefined)?.setData(fc(loops));
    unidadesPorId.current = new Map();
    const uns: Feature<Point, Record<string, unknown>>[] = [];
    for (const u of unidades) {
      if (u.lat == null || u.lon == null) continue;
      const id = String(u.co_unidade ?? `${u.sigla}-${u.uf}`);
      unidadesPorId.current.set(id, u);
      uns.push({
        type: "Feature", geometry: { type: "Point", coordinates: [u.lon, u.lat] },
        properties: { id, peso: Math.sqrt(Number(u.projetos ?? 0) / maxP), aproximada: !!u.coordenada_aproximada, dica: u.unidade_embrapii ?? u.sigla ?? "Unidade EMBRAPII" },
      });
    }
    (map.getSource("inter-unidades") as GeoJSONSource | undefined)?.setData(fc(uns));
    map.setPaintProperty("inter-unidades", "circle-stroke-color", ["case", ["get", "aproximada"], COR_INTERACAO, corDoTema("--background")]);
  }, [interacao, versaoEstilo, tema]);

  // ---------- Atores (clusters por categoria) ----------
  const [fontePronta, setFontePronta] = useState(false);
  useEffect(() => { aguardarFonteMaterial().then(() => setFontePronta(true)); }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !fontePronta || !estiloOkRef.current) return;
    pontosPorId.current = new Map(pontosNoBrasil.map((p) => [p.id, p]));
    const porCat = new Map<CategoriaKey, Feature<Point, Record<string, unknown>>[]>();
    for (const p of pontosNoBrasil) {
      const cat = CATEGORIA_MAP[p.categoria] ?? CATEGORIA_MAP.outro;
      const arr = porCat.get(cat.key) ?? [];
      arr.push({ type: "Feature", geometry: { type: "Point", coordinates: [p.longitude, p.latitude] }, properties: { id: p.id, nome: p.nome, categoria: cat.key, dica: `${p.nome} — ${cat.label}` } });
      porCat.set(cat.key, arr);
    }
    const badge = badgesDeCluster(map, corDoTema("--background"), corDoTema("--border"), corDoTema("--foreground"));
    for (const c of CATEGORIAS) {
      const icone = garantirIcone(map, c.icon, corDaClasse(c.cor), false);
      (map.getSource(`atores-${c.key}`) as GeoJSONSource | undefined)?.setData(fc(porCat.get(c.key) ?? []));
      map.setLayoutProperty(`atores-${c.key}-ponto`, "icon-image", icone);
      map.setLayoutProperty(`atores-${c.key}-cluster`, "icon-image", icone);
      map.setLayoutProperty(`atores-${c.key}-badge`, "icon-image", badge);
    }
  }, [pontosNoBrasil, versaoEstilo, fontePronta, tema]);

  // Seleção: destaca o ponto/grupo e esmaece o resto.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const ids = new Set<string>(grupoIds ?? []);
    if (pontoSelecionadoId) ids.add(pontoSelecionadoId);
    const temSelecao = ids.size > 0;
    const lista = ["literal", [...ids]];
    for (const c of CATEGORIAS) {
      map.setPaintProperty(`atores-${c.key}-ponto`, "icon-opacity", temSelecao ? ["case", ["in", ["get", "id"], lista], 1, 0.15] : 1);
      map.setPaintProperty(`atores-${c.key}-cluster`, "icon-opacity", temSelecao ? 0.15 : 1);
      map.setPaintProperty(`atores-${c.key}-badge`, "icon-opacity", temSelecao ? 0.15 : 1);
    }
    const sel = pontoSelecionadoId ? pontosPorId.current.get(pontoSelecionadoId) : null;
    const icone = garantirIcone(map, "location_on", corDoTema("--primary"));
    (map.getSource("selecao") as GeoJSONSource | undefined)?.setData(fc(sel
      ? [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [sel.longitude, sel.latitude] }, properties: { icone } }]
      : []));
    map.setPaintProperty("selecao-halo", "circle-color", corDoTema("--primary", 0.08));
    map.setPaintProperty("selecao-halo", "circle-stroke-color", corDoTema("--primary", 0.3));
  }, [pontoSelecionadoId, grupoIds, pontosNoBrasil, versaoEstilo, tema]);

  // ---------- Layers 4–7: enriquecimento (anéis) ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const ativas = { l4: !!layer4Ativa, l5: !!layer5Ativa, l6: !!layer6Ativa, l7: !!layer7Ativa };
    const vis = !!enriquecimentoLayers && Object.values(ativas).some(Boolean);
    for (const id of ["aneis-l7", "aneis-l6", "aneis-l5", "aneis-l4", "enriquecidos-ponto"]) map.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
    if (!vis || !enriquecimentoLayers) return;
    const feats: Feature<Point, Record<string, unknown>>[] = [];
    for (const p of pontosNoBrasil) {
      const v = enriquecimentoLayers[p.id];
      if (!v) continue;
      const l4 = ativas.l4 && !!v.l4, l5 = ativas.l5 && !!v.l5, l6 = ativas.l6 && !!v.l6, l7 = ativas.l7 && !!v.l7;
      if (!(l4 || l5 || l6 || l7)) continue;
      const cor = l4 ? COR_ANEL.l4 : l5 ? COR_ANEL.l5 : l6 ? COR_ANEL.l6 : corEixoPbia || COR_ANEL.l7;
      feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [p.longitude, p.latitude] }, properties: { id: p.id, l4, l5, l6, l7, cor, dica: p.nome } });
    }
    (map.getSource("enriquecidos") as GeoJSONSource | undefined)?.setData(fc(feats));
    map.setPaintProperty("aneis-l7", "circle-stroke-color", corEixoPbia || COR_ANEL.l7);
    map.setPaintProperty("enriquecidos-ponto", "circle-stroke-color", corDoTema("--background"));
  }, [layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa, enriquecimentoLayers, corEixoPbia, pontosNoBrasil, versaoEstilo, tema]);

  // ---------- Âncoras PBIA ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const vis = !!ancorasPbia?.length;
    map.setLayoutProperty("ancoras-halo", "visibility", vis ? "visible" : "none");
    map.setLayoutProperty("ancoras-icone", "visibility", vis ? "visible" : "none");
    if (!vis) return;
    const cor = corEixoPbia || "#a78bfa";
    ancorasPorId.current = new Map();
    const feats: Feature<Point, Record<string, unknown>>[] = [];
    for (const a of ancorasPbia ?? []) {
      if (!Number.isFinite(a.latitude) || !Number.isFinite(a.longitude)) continue;
      if (!pontoNaSelecaoGeografica(a.latitude, a.longitude, a.uf ?? null)) continue;
      ancorasPorId.current.set(a.id, a);
      const local = [a.municipio, a.uf].filter(Boolean).join("/");
      feats.push({
        type: "Feature", geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
        properties: { id: a.id, icone: garantirIcone(map, a.icone || "policy", cor), dica: `${a.nome}${local ? ` · ${local}` : ""} · PBIA Eixo ${a.eixo}` },
      });
    }
    (map.getSource("ancoras") as GeoJSONSource | undefined)?.setData(fc(feats));
    map.setPaintProperty("ancoras-halo", "circle-color", cor);
    map.setPaintProperty("ancoras-halo", "circle-stroke-color", cor);
  }, [ancorasPbia, corEixoPbia, pontoNaSelecaoGeografica, versaoEstilo]);

  // ---------- operações expostas à página ----------
  const enquadrar = useCallback(() => {
    mapRef.current?.fitBounds((ufSelecionada && bboxes[ufSelecionada]) || BBOX_BRASIL, { padding: ufSelecionada ? 32 : 16, duration: 500, maxZoom: 9 });
  }, [ufSelecionada, bboxes]);

  useImperativeHandle(ref, () => ({
    imagemPng: () => new Promise<string>((resolve, reject) => {
      const map = mapRef.current;
      if (!map) return reject(new Error("mapa não montado"));
      map.once("render", () => resolve(map.getCanvas().toDataURL("image/png")));
      map.triggerRepaint();
    }),
    enquadrar,
  }), [enquadrar]);

  if (erroMalha) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-destructive">Não foi possível carregar o contorno dos estados: {erroMalha}</p>
      </div>
    );
  }

  const botao = "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";
  const temLegenda = layer1Ativa || layer2Ativa || layer3Ativa || layer4Ativa || layer5Ativa || layer6Ativa || layer7Ativa || !!coropletico;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" style={{ position: "absolute", inset: 0 }} role="img" aria-label="Mapa do Brasil com instituições de pesquisa e inovação por estado" />
      <div ref={dicaRef} className="pointer-events-none absolute left-0 top-0 z-20 hidden max-w-xs rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow-md" />

      {/* Controles de zoom e fundo */}
      <div className="absolute left-3 top-3 flex flex-col rounded-lg border border-border bg-card/80 p-0.5 shadow-sm backdrop-blur">
        <button type="button" className={botao} title="Aproximar" aria-label="Aproximar" disabled={zoom >= 14} onClick={() => mapRef.current?.zoomIn()}><Plus className="h-4 w-4" /></button>
        <button type="button" className={botao} title="Afastar" aria-label="Afastar" disabled={zoom <= 2.5} onClick={() => mapRef.current?.zoomOut()}><Minus className="h-4 w-4" /></button>
        <button type="button" className={botao} title={ufSelecionada ? `Enquadrar ${ufSelecionada}` : "Ver o Brasil inteiro"} aria-label="Enquadrar" onClick={enquadrar}>
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-1 right-2 text-[9px] text-muted-foreground/70">{ATRIBUICAO_FUNDO[fundo]}</p>

      {malhaMunicipal && zoom >= ZOOM_MUNICIPIOS && (
        <p className="pointer-events-none absolute right-3 top-3 rounded-md border border-border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          Malha municipal (IBGE) visível
        </p>
      )}

      {temLegenda && (
        <div className="absolute bottom-8 left-3 max-h-[45%] space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card/90 p-2.5 text-[10px] shadow-sm backdrop-blur">
          <p className="font-semibold text-foreground">Camadas de IA ativas</p>
          {coropletico && (<>
            <p className="font-medium text-foreground">{coropletico.rotulo}</p>
            {coropletico.cores.map((cor, k) => {
              const de = k === 0 ? null : coropletico.cortes[k - 1];
              const ate = k < coropletico.cortes.length ? coropletico.cortes[k] : null;
              const texto = de == null ? `até ${coropletico.formatar(ate ?? 0)}` : ate == null ? `acima de ${coropletico.formatar(de)}` : `${coropletico.formatar(de)} a ${coropletico.formatar(ate)}`;
              return (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: cor }} />
                  <span className="text-muted-foreground">{coropletico.cortes.length ? texto : coropletico.formatar(0)}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COR_SEM_DADO }} />
              <span className="text-muted-foreground">sem dado</span>
            </div>
          </>)}
          {layer1Ativa && (<>
            <p className="font-medium text-pink-500">Layer 1 — Energia (ANEEL)</p>
            {Object.entries(ROTULO_USINA).filter(([tipo]) => !tiposUsina || tiposUsina.size === 0 || tiposUsina.has(tipo)).map(([tipo, label]) => (
              <div key={tipo} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full bg-current ${COR_CLASSE_USINA[tipo] || "text-gray-400"}`} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
            <p className="text-muted-foreground/60">Tamanho proporcional à potência{anoMaximoUsinas != null ? ` · em operação até ${anoMaximoUsinas}` : ""}</p>
          </>)}
          {layer2Ativa && (<>
            <p className="font-medium text-orange-400">Layer 2 — Infra Física</p>
            {l2Cabos !== false && (<>
              {(["internacional", "costeiro", "fluvial"] as const).map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke={ESTILO_CABO[k].cor} strokeWidth="2.4" strokeDasharray={ESTILO_CABO[k].traco?.map((v) => v * 2.4).join(" ")} /></svg>
                  <span className="text-muted-foreground">{ESTILO_CABO[k].rotulo}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px] text-orange-400" style={{ fontVariationSettings: '"FILL" 1' }}>lan</span>
                <span className="text-muted-foreground">Landing point (BR)</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                © <a href="https://www.submarinecablemap.com" target="_blank" rel="noopener noreferrer" className="underline">TeleGeography</a>,{" "}
                <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY-NC-SA 3.0</a> — uso não comercial
              </p>
            </>)}
            {l2Antenas && (<>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px] text-orange-300" style={{ fontVariationSettings: '"FILL" 1' }}>4g_mobiledata</span>
                <span className="text-muted-foreground">Antena 4G (OpenCelliD)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px] text-orange-500" style={{ fontVariationSettings: '"FILL" 1' }}>5g</span>
                <span className="text-muted-foreground">Antena 5G (OpenCelliD)</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Cell tower data from <a href="https://opencellid.org" target="_blank" rel="noopener noreferrer" className="underline">OpenCellID</a>, licensed under{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY-SA 4.0</a>
              </p>
            </>)}
            {l2Backhaul && (<>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px] text-amber-500" style={{ fontVariationSettings: '"FILL" 1' }}>cell_tower</span>
                <span className="text-muted-foreground">Backhaul por fibra (ANATEL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-sm bg-gray-400" />
                <span className="text-muted-foreground">Sem fibra (rádio/satélite)</span>
              </div>
            </>)}
          </>)}
          {layer3Ativa && (<>
            <p className="font-medium text-yellow-400">Layer 3 — Infra Lógica (PeeringDB)</p>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px] text-yellow-400" style={{ fontVariationSettings: '"FILL" 1' }}>dns</span>
              <span className="text-muted-foreground">Datacenter</span>
            </div>
          </>)}
          {(layer4Ativa || layer5Ativa || layer6Ativa || layer7Ativa) && (<>
            <p className="font-medium text-foreground">Enriquecimento de atores</p>
            {layer4Ativa && <Anel cor="border-green-400" rotulo="L4 · Modelos (Hugging Face)" />}
            {layer5Ativa && <Anel cor="border-teal-400" rotulo="L5 · Aplicações (PNCP)" />}
            {layer6Ativa && <Anel cor="border-cyan-400" rotulo="L6 · Pesquisa (OpenAlex)" />}
            {layer7Ativa && <Anel cor="border-violet-400" rotulo="L7 · Governança" />}
            <p className="text-muted-foreground/60">Anéis nos atores com vínculo confirmado</p>
          </>)}
        </div>
      )}
    </div>
  );
});

export default MapaBrasil;

function Anel({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-3 w-3 rounded-full border ${cor}`} style={{ borderWidth: 1.5 }} />
      <span className="text-muted-foreground">{rotulo}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fontes e camadas, na ordem de empilhamento (de baixo para cima). Chamado a
// cada style.load; os dados chegam depois pelos efeitos acima via setData.
// ---------------------------------------------------------------------------
function montarCamadas(map: MapLibre) {
  const geo = (id: string, extra: Record<string, unknown> = {}) => {
    if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: VAZIO, ...extra });
  };
  const oculto = { visibility: "none" as const };

  // UFs
  geo("ufs", { promoteId: "sigla" });
  map.addLayer({ id: "ufs-fill", type: "fill", source: "ufs", paint: {
    "fill-color": ["get", "fill"],
    "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85],
  } });
  map.addLayer({ id: "ufs-sombra", type: "line", source: "ufs", paint: { "line-color": "#000", "line-width": 3, "line-opacity": 0.35, "line-blur": 2 } });
  map.addLayer({ id: "ufs-line", type: "line", source: "ufs", layout: { "line-join": "round" }, paint: { "line-color": "#888", "line-width": 1.2 } });

  // Municípios (sob demanda, só ao aproximar)
  geo("municipios");
  map.addLayer({ id: "mun-fill", type: "fill", source: "municipios", minzoom: ZOOM_MUNICIPIOS, paint: {
    "fill-color": "#000", "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.12, 0],
  } });
  map.addLayer({ id: "mun-coro", type: "fill", source: "municipios", layout: oculto, paint: {
    "fill-color": ["coalesce", ["feature-state", "cor"], COR_SEM_DADO], "fill-opacity": 0.9,
  } });
  map.addLayer({ id: "mun-line", type: "line", source: "municipios", minzoom: ZOOM_MUNICIPIOS, paint: {
    "line-color": "#888", "line-width": ["interpolate", ["linear"], ["zoom"], ZOOM_MUNICIPIOS, 0.3, 9, 0.8], "line-opacity": ["interpolate", ["linear"], ["zoom"], ZOOM_MUNICIPIOS, 0.3, 7, 1],
  } });

  // Layer 2c — backhaul
  geo("backhaul");
  map.addLayer({ id: "backhaul-sem", type: "circle", source: "backhaul", filter: ["!", ["get", "fibra"]], layout: oculto, paint: {
    "circle-color": "#9ca3af", "circle-opacity": 0.4, "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 3],
  } });
  map.addLayer({ id: "backhaul-fibra", type: "symbol", source: "backhaul", filter: ["get", "fibra"], layout: {
    ...oculto, "icon-image": ["get", "icone"], "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.35, 8, 0.6], "icon-allow-overlap": true,
  }, paint: { "icon-opacity": 0.85 } });

  // Layer 2b — antenas
  geo("antenas");
  map.addLayer({ id: "antenas", type: "symbol", source: "antenas", layout: {
    ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, ["get", "tam"]), "icon-allow-overlap": true,
  }, paint: { "icon-opacity": 0.85 } });

  // Layer 2a — cabos
  geo("cabos");
  map.addLayer({ id: "cabos-sombra", type: "line", source: "cabos", layout: { ...oculto, "line-cap": "round" }, paint: { "line-color": "#7c2d12", "line-width": 4, "line-opacity": 0.3 } });
  for (const classe of ["internacional", "costeiro", "fluvial"] as const) {
    const est = ESTILO_CABO[classe];
    map.addLayer({ id: `cabos-${classe}`, type: "line", source: "cabos", filter: ["==", ["get", "classe"], classe],
      layout: { ...oculto, "line-cap": "round", "line-join": "round" },
      paint: { "line-color": est.cor, "line-width": 2.4, "line-opacity": 0.95, ...(est.traco ? { "line-dasharray": est.traco } : {}) } });
  }
  geo("landing");
  map.addLayer({ id: "landing", type: "symbol", source: "landing", layout: { ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, 0.85), "icon-allow-overlap": true }, paint: { "icon-opacity": 0.85 } });

  // Layer 1 — usinas (raio cresce com a raiz da potência)
  geo("usinas");
  map.addLayer({ id: "usinas", type: "circle", source: "usinas", layout: oculto, paint: {
    "circle-color": "#9ca3af",
    "circle-opacity": 0.55,
    "circle-stroke-color": "#000",
    "circle-stroke-width": 0.3,
    "circle-stroke-opacity": 0.4,
    "circle-radius": porZoom([[3, 0.8], [6, 1.6], [10, 4]], ["min", 6, ["+", 1, ["/", ["sqrt", ["get", "mw"]], 12]]]),
  } });
  geo("usina-destaque");
  map.addLayer({ id: "usina-destaque-halo", type: "circle", source: "usina-destaque", paint: { "circle-color": "#ec4899", "circle-opacity": 0.15, "circle-radius": 16, "circle-stroke-color": "#ec4899", "circle-stroke-width": 2.5 } });
  map.addLayer({ id: "usina-destaque-rotulo", type: "symbol", source: "usina-destaque", layout: { "icon-image": ["get", "icone"], "icon-anchor": "bottom", "icon-offset": [0, -22], "icon-allow-overlap": true, "icon-ignore-placement": true } });

  // Layer 3 — datacenters
  geo("dcs");
  map.addLayer({ id: "dcs", type: "symbol", source: "dcs", layout: { ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, 0.85), "icon-allow-overlap": true }, paint: { "icon-opacity": 0.85 } });

  // Interação EMBRAPII
  geo("inter-arcos");
  map.addLayer({ id: "inter-arcos", type: "line", source: "inter-arcos", layout: { ...oculto, "line-cap": "round" }, paint: {
    "line-color": COR_INTERACAO, "line-opacity": 0.45, "line-width": ["+", 0.6, ["*", 7, ["get", "peso"]]],
  } });
  geo("inter-loops");
  map.addLayer({ id: "inter-loops", type: "circle", source: "inter-loops", layout: oculto, paint: {
    "circle-color": COR_INTERACAO, "circle-opacity": 0.18, "circle-stroke-color": COR_INTERACAO, "circle-stroke-width": 0.8,
    "circle-radius": ["+", 2, ["*", 14, ["get", "peso"]]],
  } });
  geo("inter-unidades");
  map.addLayer({ id: "inter-unidades", type: "circle", source: "inter-unidades", layout: oculto, paint: {
    "circle-color": ["case", ["get", "aproximada"], "rgba(0,0,0,0)", COR_INTERACAO], "circle-opacity": 0.85,
    "circle-stroke-color": COR_INTERACAO, "circle-stroke-width": ["case", ["get", "aproximada"], 1.6, 0.6],
    "circle-radius": porZoom([[3, 10], [8, 16]], ["+", 0.25, ["*", 0.75, ["get", "peso"]]]),
  } });

  // Atores por categoria, com cluster nativo do MapLibre
  for (const c of CATEGORIAS) {
    const src = `atores-${c.key}`;
    geo(src, { cluster: true, clusterRadius: 28, clusterMaxZoom: 13 });
    map.addLayer({ id: `${src}-cluster`, type: "symbol", source: src, filter: ["has", "point_count"], layout: {
      "icon-image": "", "icon-size": TAMANHO_ICONE, "icon-allow-overlap": true, "icon-ignore-placement": true,
    } });
    // Contador do cluster como imagem (ver garantirBadge), deslocado para o canto superior direito do ícone.
    map.addLayer({ id: `${src}-badge`, type: "symbol", source: src, filter: ["has", "point_count"], layout: {
      "icon-image": "", "icon-size": porZoom(ESCALA_ICONE, 0.75), "icon-offset": [12, -12], "icon-allow-overlap": true, "icon-ignore-placement": true,
    } });
    map.addLayer({ id: `${src}-ponto`, type: "symbol", source: src, filter: ["!", ["has", "point_count"]], layout: {
      "icon-image": "", "icon-size": TAMANHO_ICONE, "icon-allow-overlap": true,
    } });
  }

  // Layers 4–7 — anéis sobre os atores enriquecidos
  geo("enriquecidos");
  const anel = (id: string, flag: string, cor: string, offset: number) =>
    map.addLayer({ id, type: "circle", source: "enriquecidos", filter: ["get", flag], layout: oculto, paint: {
      "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": cor, "circle-stroke-width": 1.4, "circle-stroke-opacity": 0.9,
      "circle-radius": porZoom([[3, 9], [8, 14]], 0.78 + offset * 0.18),
    } });
  anel("aneis-l7", "l7", COR_ANEL.l7, 3);
  anel("aneis-l6", "l6", COR_ANEL.l6, 2);
  anel("aneis-l5", "l5", COR_ANEL.l5, 1);
  anel("aneis-l4", "l4", COR_ANEL.l4, 0);
  map.addLayer({ id: "enriquecidos-ponto", type: "circle", source: "enriquecidos", layout: oculto, paint: {
    "circle-color": ["get", "cor"], "circle-opacity": 0.95, "circle-stroke-color": "#fff", "circle-stroke-width": 0.5,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 5],
  } });

  // Âncoras PBIA (Layer 7), acima dos atores
  geo("ancoras");
  map.addLayer({ id: "ancoras-halo", type: "circle", source: "ancoras", layout: oculto, paint: {
    "circle-color": "#a78bfa", "circle-opacity": 0.14, "circle-stroke-color": "#a78bfa", "circle-stroke-width": 1.2, "circle-stroke-opacity": 0.85,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 12, 8, 18],
  } });
  map.addLayer({ id: "ancoras-icone", type: "symbol", source: "ancoras", layout: { ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, 0.8), "icon-allow-overlap": true } });

  // Seleção
  geo("selecao");
  map.addLayer({ id: "selecao-halo", type: "circle", source: "selecao", paint: { "circle-color": "rgba(0,0,0,0.05)", "circle-stroke-color": "#888", "circle-stroke-width": 0.8, "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 16, 8, 24] } });
  map.addLayer({ id: "selecao-icone", type: "symbol", source: "selecao", layout: { "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, 2), "icon-anchor": "bottom", "icon-offset": [0, 6], "icon-allow-overlap": true, "icon-ignore-placement": true } });

  // Rótulos das regiões (visão regional)
  geo("rotulos-regiao");
  map.addLayer({ id: "rotulos-regiao", type: "symbol", source: "rotulos-regiao", layout: {
    "icon-image": ["get", "icone"], "icon-size": porZoom([[3, 0.9], [6, 1.2]]), "icon-allow-overlap": true, "icon-ignore-placement": true,
  }, paint: { "icon-opacity": ["case", ["get", "ativo"], 1, 0.85] } });
}

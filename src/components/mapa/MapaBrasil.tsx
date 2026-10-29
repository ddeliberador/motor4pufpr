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
import { useIsMobile } from "@/hooks/use-mobile";
import { COR_INTERACAO, type CamadaInteracaoProps, type ArcoAgregado, type UnidadeEmbrapii } from "./CamadaInteracao";
import { aguardarFonteMaterial, badgesDeCluster, corDaClasse, corDoTema, garantirIcone, garantirRotulo, resolverCorCss } from "./maplibre/icones";
import { ATRIBUICAO_FUNDO, type FundoId, URL_ESTILO_FUNDO, estiloSatelite, estiloSobrio } from "./maplibre/fundos";
export { FUNDOS, type FundoId } from "./maplibre/fundos";
import {
  BBOX_BRASIL, type Bbox, type FeatureMun, type FeatureUf, type NivelMalha, SIGLA_POR_CODIGO,
  arcoCurvo, bboxDaFeature, bboxesIntersectam, carregarGeojson, carregarMunicipios, dentroDaFeature,
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

/** Camada de transporte (visão regional): quais ativos desenhar. Dados em public/transporte/. */
export interface TransporteMapa { rodovias: boolean; ferrovias: boolean; portos: boolean; aeroportos: boolean }
export const CORES_TRANSPORTE = { rodovias: "#d97706", ferrovias: "#a16207", portos: "#0284c7", aeroportos: "#7c3aed" } as const;

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
  /** Clique num município da malha (só a partir do zoom municipal). */
  onSelecionarMunicipio?: (m: MunicipioClicado) => void;
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
  transporte?: TransporteMapa | null;
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
/** Cores das cinco faixas da síntese 0–100 (mesma rampa do coroplético). */
export const CORTES_SINTESE_CORES = CORES_COROPLETICO;

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
  /** Aproxima o mapa de um município já carregado na malha (código IBGE de 7 dígitos). */
  enquadrarMunicipio(ibge: string): void;
  /** Voa até uma UF (ou até o Brasil, sem argumento). */
  enquadrarUf(uf: string | null): void;
}

export interface MunicipioClicado { ibge: string; nome: string; uf: string }

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
const UFS_CHIP = ["RN", "PB", "PE", "AL", "SE", "ES", "RJ", "DF"];
// A partir daqui a malha municipal troca para a versão detalhada (br-mun-hd) e o contorno das UFs vem dela.
const ZOOM_HD = 7.5;
const ZOOM_ROTULOS_MUN = 7;

// Escala dos ícones por zoom: crescem menos que o mapa, como no mapa anterior.
const ESCALA_ICONE: [number, number][] = [[3, 0.38], [5, 0.55], [7, 0.8], [10, 1.05]];
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
  onSelecionarUf, onSelecionarMunicipio, onSelecionarCluster, pontoSelecionadoId, onSelecionarPonto, grupoIds,
  layer1Ativa, dadosUsinas, tiposUsina, anoMaximoUsinas = null, usinaDestaque,
  layer2Ativa, dadosCabos, l2Cabos, l2Antenas, dadosAntenas, l2Backhaul, dadosBackhaul,
  layer3Ativa, dadosDCs,
  layer4Ativa, layer5Ativa, layer6Ativa, layer7Ativa, enriquecimentoLayers,
  ancorasPbia, corEixoPbia, onSelecionarAncora,
  interacao, regional, transporte,
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
  const movel = useIsMobile();
  const [municipios, setMunicipios] = useState<Record<string, { nivel: NivelMalha; features: FeatureMun[] }>>({});
  const municipiosRef = useRef<Record<string, { nivel: NivelMalha; features: FeatureMun[] }>>({});
  const [ufsHd, setUfsHd] = useState<FeatureUf[] | null>(null);
  const [rotulosMun, setRotulosMun] = useState<Feature<Point, { id: string; name: string; uf: string }>[] | null>(null);
  const carregandoRef = useRef(new Set<string>());
  const [tipoCabo, setTipoCabo] = useState<Record<string, ClasseCabo>>({});
  const [legendaAberta, setLegendaAberta] = useState(false);

  // Callbacks mais recentes acessíveis pelos handlers do mapa (registrados uma vez).
  const cb = useRef({ onSelecionarUf, onSelecionarMunicipio, onSelecionarCluster, onSelecionarPonto, onSelecionarAncora, interacao, regional, coropletico });
  cb.current = { onSelecionarUf, onSelecionarMunicipio, onSelecionarCluster, onSelecionarPonto, onSelecionarAncora, interacao, regional, coropletico };
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
    // O recipiente muda de largura (coluna abre/fecha, gaveta, tela cheia): o MapLibre precisa saber.
    const ro = new ResizeObserver(() => map.resize());
    if (containerRef.current) ro.observe(containerRef.current);
    map.once("remove", () => ro.disconnect());

    // ---- interação: ponteiro, dica e clique ----
    const camadasClique = [
      "ancoras-icone", "selecao-icone",
      ...CATEGORIAS.map((c) => `atores-${c.key}-ponto`), "enriquecidos-ponto",
      ...CATEGORIAS.flatMap((c) => [`atores-${c.key}-badge`, `atores-${c.key}-cluster`]),
      "inter-unidades", "inter-loops", "inter-arcos",
      "mun-fill", "ufs-fill", "ufs-hd-fill",
    ];
    const camadasDica = [
      "ancoras-icone", ...CATEGORIAS.map((c) => `atores-${c.key}-ponto`), "enriquecidos-ponto",
      ...CATEGORIAS.flatMap((c) => [`atores-${c.key}-badge`, `atores-${c.key}-cluster`]),
      "inter-unidades", "inter-loops", "inter-arcos",
      "dcs", "landing", "antenas", "backhaul-fibra", "backhaul-sem",
      "transp-portos", "transp-aeroportos", "transp-rodovias", "transp-ferrovias",
      "cabos-internacional", "cabos-costeiro", "cabos-fluvial", "usinas",
      "mun-fill", "ufs-fill", "ufs-hd-fill",
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

      const ufFt = fts.find((f) => f.layer.id === "ufs-fill" || f.layer.id === "ufs-hd-fill");
      const uf = ufFt?.id ?? null;
      if (uf !== hoverUf) {
        for (const src of ["ufs", "ufs-hd"]) {
          if (!map.getSource(src)) continue;
          if (hoverUf != null) map.setFeatureState({ source: src, id: hoverUf }, { hover: false });
          if (uf != null) map.setFeatureState({ source: src, id: uf }, { hover: true });
        }
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
      if (id === "ufs-fill" || id === "ufs-hd-fill") {
        (c.regional ? c.regional.onSelecionarUf : c.onSelecionarUf)(String(p.sigla));
        return;
      }
      if (id === "mun-fill") {
        // Longe (zoom nacional) o clique vale pelo estado, mesmo com o coroplético ligado; na
        // visão regional continua escolhendo a região; perto, abre o município.
        if (c.regional) { c.regional.onSelecionarUf(String(p.uf)); return; }
        if (map.getZoom() >= ZOOM_MUNICIPIOS && c.onSelecionarMunicipio) c.onSelecionarMunicipio({ ibge: String(p.id), nome: String(p.name ?? ""), uf: String(p.uf ?? "") });
        else c.onSelecionarUf(String(p.uf));
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
    if (ufsHd) {
      const porSigla = new Map(data.features.map((f) => [f.properties.sigla, f.properties]));
      (map.getSource("ufs-hd") as GeoJSONSource | undefined)?.setData(fc(ufsHd.map((f) => ({ ...f, id: f.properties.sigla, properties: porSigla.get(f.properties.sigla) ?? { sigla: f.properties.sigla, fill: corMuted, realce: false, dica: f.properties.sigla } }))));
    }
    for (const id of ["ufs-line", "ufs-hd-line"]) {
      map.setPaintProperty(id, "line-color", ["case", ["get", "realce"], corRealce, corBorda]);
      map.setPaintProperty(id, "line-width", ["case", ["get", "realce"], 2.2, 1.2]);
    }
    map.setPaintProperty("ufs-sombra", "line-color", corDoTema("--foreground", 0.45));
    map.setPaintProperty("rotulos-uf", "text-color", corDoTema("--foreground", 0.7));
    map.setPaintProperty("rotulos-uf", "text-halo-color", corDoTema("--background"));
    map.setPaintProperty("rotulos-mun", "text-color", corDoTema("--foreground", 0.85));
    map.setPaintProperty("rotulos-mun", "text-halo-color", corDoTema("--background"));
    map.setPaintProperty("paises-fill", "fill-color", corDoTema("--foreground"));
    map.setPaintProperty("paises-line", "line-color", corDoTema("--foreground", 0.35));
    map.setPaintProperty("paises-rotulos", "text-color", corDoTema("--foreground", 0.55));
    map.setPaintProperty("paises-rotulos", "text-halo-color", corDoTema("--background"));
    // Siglas das UFs no centro da bbox (zoom intermediário).
    (map.getSource("rotulos-uf") as GeoJSONSource | undefined)?.setData(fc(features.map((f) => {
      const b = bboxes[f.properties.sigla];
      return { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] }, properties: { sigla: f.properties.sigla } };
    })));
  }, [features, bboxes, ufsHd, contagemPorUf, ufsSelecionadas, regional, versaoEstilo, tema]);

  // ---------- países vizinhos (uma vez por estilo) ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    let vivo = true;
    carregarGeojson<FeatureCollection<Polygon | MultiPolygon, { iso: string; nome: string; lon: number | null; lat: number | null }>>("/america-do-sul.geojson")
      .then((d) => {
        if (!vivo || !mapRef.current) return;
        (map.getSource("paises") as GeoJSONSource | undefined)?.setData(d);
        (map.getSource("paises-rotulos") as GeoJSONSource | undefined)?.setData(fc(d.features
          .filter((f) => f.properties.lon != null && f.properties.lat != null && !["ABW", "CUW", "TTO", "FLK"].includes(f.properties.iso))
          .map((f) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [f.properties.lon as number, f.properties.lat as number] }, properties: { nome: f.properties.nome } }))));
      })
      .catch((e) => console.warn(e.message));
    return () => { vivo = false; };
  }, [versaoEstilo]);

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
      const zoom = map.getZoom();
      const visiveis = ufsVisiveis();
      // Nível desejado por UF: HD só para as UFs em vista quando bem aproximado; SD para o resto.
      const desejado = new Map<string, NivelMalha>();
      if (coropletico) for (const f of features) desejado.set(f.properties.sigla, "sd");
      for (const uf of visiveis) desejado.set(uf, zoom >= ZOOM_HD ? "hd" : "sd");
      if (ufSelecionada && zoom >= ZOOM_MUNICIPIOS - 0.5) desejado.set(ufSelecionada, zoom >= ZOOM_HD ? "hd" : "sd");
      const pendentes: [string, NivelMalha][] = [];
      for (const [uf, nivel] of desejado) {
        const atual = municipios[uf];
        if (atual && (atual.nivel === nivel || atual.nivel === "hd")) continue;
        const chave = `${uf}|${nivel}`;
        if (carregandoRef.current.has(chave)) continue;
        carregandoRef.current.add(chave);
        pendentes.push([uf, nivel]);
      }
      if (!pendentes.length) return;
      // Um só setData para o lote inteiro, em vez de um por UF.
      Promise.all(pendentes.map(([uf, nivel]) =>
        carregarMunicipios(uf, nivel).then((d) => [uf, nivel, d.features] as const).catch((e) => { console.warn(e.message); return null; })
          .finally(() => carregandoRef.current.delete(`${uf}|${nivel}`)),
      )).then((res) => {
        if (!vivo) return;
        setMunicipios((m) => {
          const novo = { ...m };
          for (const r of res) if (r && !(novo[r[0]]?.nivel === "hd" && r[1] === "sd")) novo[r[0]] = { nivel: r[1], features: r[2] };
          return novo;
        });
      });
    };
    carregar();
    map.on("moveend", carregar);
    return () => { vivo = false; map.off("moveend", carregar); };
  }, [features, ufSelecionada, municipios, ufsVisiveis, malhaMunicipal, coropletico]);

  // Contorno detalhado das UFs e pontos de rótulo dos municípios: um arquivo cada, carregados ao aproximar.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let vivo = true;
    const checar = () => {
      const z = map.getZoom();
      if (z >= ZOOM_MUNICIPIOS - 0.5 && !ufsHd) {
        carregarGeojson<FeatureCollection<Polygon | MultiPolygon, { uf: string }>>("/br-uf-hd.geojson")
          .then((d) => vivo && setUfsHd(d.features.map((f) => ({ ...f, properties: { sigla: SIGLA_POR_CODIGO[f.properties.uf] ?? f.properties.uf } }))))
          .catch((e) => console.warn(e.message));
      }
      if (z >= ZOOM_ROTULOS_MUN - 0.5 && !rotulosMun) {
        carregarGeojson<FeatureCollection<Point, { id: string; name: string; uf: string }>>("/br-mun-pontos.geojson")
          .then((d) => vivo && setRotulosMun(d.features))
          .catch((e) => console.warn(e.message));
      }
    };
    checar();
    map.on("moveend", checar);
    return () => { vivo = false; map.off("moveend", checar); };
  }, [ufsHd, rotulosMun]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current || !rotulosMun) return;
    (map.getSource("rotulos-mun") as GeoJSONSource | undefined)?.setData(fc(rotulosMun));
  }, [rotulosMun, versaoEstilo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    for (const id of ["mun-line", "mun-fill"]) {
      map.setLayoutProperty(id, "visibility", malhaMunicipal || coropletico ? "visible" : "none");
      map.setLayerZoomRange(id, coropletico ? 0 : ZOOM_MUNICIPIOS, 24);
    }
    map.setLayerZoomRange("mun-coro", 0, 24);
    map.setLayoutProperty("mun-coro", "visibility", coropletico ? "visible" : "none");
    municipiosRef.current = municipios;
    const todos = Object.values(municipios).flatMap((m) => m.features).map((f) => ({
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
    for (const id of ["ufs-fill", "ufs-hd-fill"]) map.setPaintProperty(id, "fill-opacity", coropletico ? 0 : ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85]);
    map.setPaintProperty("mun-line", "line-color", coropletico ? corDoTema("--background", 0.9) : corDoTema("--foreground", 0.22));
    map.setPaintProperty("mun-line", "line-width", coropletico ? ["interpolate", ["linear"], ["zoom"], 3, 0.15, 7, 0.5, 9, 0.9] : ["interpolate", ["linear"], ["zoom"], ZOOM_MUNICIPIOS, 0.3, 9, 0.8]);
    for (const f of Object.values(municipios).flatMap((m) => m.features)) {
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
        properties: { icone: anatel ? ic.anatel : a.radio === "NR" ? ic.nr : ic.lte, tam: anatel ? 0.45 : 0.6, dica: a.operadora || `${a.net} · ${a.radio === "NR" ? "5G" : "4G"}` },
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

  // ---------- Transporte: rodovias, ferrovias, portos e aeroportos (public/transporte) ----------
  const [transpDados, setTranspDados] = useState<Partial<Record<keyof TransporteMapa, FeatureCollection>>>({});
  useEffect(() => {
    if (!transporte) return;
    for (const k of Object.keys(CORES_TRANSPORTE) as (keyof TransporteMapa)[]) {
      if (!transporte[k] || transpDados[k]) continue;
      carregarGeojson(`/transporte/${k}.geojson`).then((d) => setTranspDados((x) => (x[k] ? x : { ...x, [k]: d }))).catch((e) => console.warn(e.message));
    }
  }, [transporte, transpDados]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !versaoEstilo || !estiloOkRef.current) return;
    const t = transporte;
    map.setLayoutProperty("transp-rodovias", "visibility", t?.rodovias && transpDados.rodovias ? "visible" : "none");
    map.setLayoutProperty("transp-ferrovias", "visibility", t?.ferrovias && transpDados.ferrovias ? "visible" : "none");
    map.setLayoutProperty("transp-portos", "visibility", t?.portos && transpDados.portos ? "visible" : "none");
    map.setLayoutProperty("transp-aeroportos", "visibility", t?.aeroportos && transpDados.aeroportos ? "visible" : "none");
    if (!t) return;
    if (t.rodovias && transpDados.rodovias) {
      (map.getSource("transp-rodovias") as GeoJSONSource | undefined)?.setData({ ...transpDados.rodovias, features: transpDados.rodovias.features.map((f) => ({
        ...f, properties: { ...f.properties, dica: `${f.properties?.nome ?? "Rodovia"} (${f.properties?.uf})` },
      })) });
    }
    if (t.ferrovias && transpDados.ferrovias) {
      (map.getSource("transp-ferrovias") as GeoJSONSource | undefined)?.setData({ ...transpDados.ferrovias, features: transpDados.ferrovias.features.map((f) => ({
        ...f, properties: { ...f.properties, dica: `Ferrovia (${f.properties?.uf})${f.properties?.eletrica ? " · eletrificada" : ""}` },
      })) });
    }
    if (t.portos && transpDados.portos) {
      const icone = garantirIcone(map, "anchor", CORES_TRANSPORTE.portos);
      (map.getSource("transp-portos") as GeoJSONSource | undefined)?.setData({ ...transpDados.portos, features: transpDados.portos.features.map((f) => ({
        ...f, properties: { ...f.properties, icone, dica: `Porto de ${f.properties?.nome} (${f.properties?.uf}) · ${f.properties?.tipo}${f.properties?.aproximado ? " · posição aproximada" : ""}` },
      })) });
    }
    if (t.aeroportos && transpDados.aeroportos) {
      const icone = garantirIcone(map, "flight", CORES_TRANSPORTE.aeroportos);
      (map.getSource("transp-aeroportos") as GeoJSONSource | undefined)?.setData({ ...transpDados.aeroportos, features: transpDados.aeroportos.features.map((f) => ({
        ...f, properties: { ...f.properties, icone, grande: f.properties?.porte === "grande", dica: `${f.properties?.nome}${f.properties?.iata ? ` (${f.properties.iata})` : ""} · ${f.properties?.uf}${f.properties?.regular ? "" : " · sem voo regular"}` },
      })) });
    }
  }, [transporte, transpDados, versaoEstilo, tema]);

  // ---------- Interação entre atores (arcos UF→UF por tipo, unidades EMBRAPII) ----------
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
      const props = { chave: a.chave, peso, dica, cor: a.cor };
      if (a.interno) loops.push({ type: "Feature", geometry: { type: "Point", coordinates: a.d }, properties: props });
      else linhas.push({ type: "Feature", geometry: { type: "LineString", coordinates: arcoCurvo(a.o, a.d) }, properties: props });
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
    enquadrarUf: (uf: string | null) => {
      mapRef.current?.fitBounds((uf && bboxes[uf]) || BBOX_BRASIL, { padding: uf ? 32 : 16, duration: 700, maxZoom: 9 });
    },
    enquadrarMunicipio: (ibge: string) => {
      const map = mapRef.current;
      if (!map) return;
      const f = Object.values(municipiosRef.current).flatMap((m) => m.features).find((x) => String(x.properties.id) === ibge);
      if (!f) return;
      map.fitBounds(bboxDaFeature(f), { padding: 48, duration: 500, maxZoom: 11 });
    },
  }), [enquadrar, bboxes]);

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
      {/* Celular, zoom nacional: os estados pequenos do litoral (e o DF) são impossíveis de tocar;
          viram chips na borda, como no cartograma do seuimposto. */}
      {movel && zoom < ZOOM_MUNICIPIOS && !regional && !ufSelecionada && (
        <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1" role="group" aria-label="Estados pequenos">
          {UFS_CHIP.map((u) => (
            <button key={u} type="button" onClick={() => cb.current.onSelecionarUf(u)}
              className={`h-8 w-11 rounded-md border text-xs font-bold shadow-sm ${ufSelecionada === u ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/90 text-foreground"}`}>{u}</button>
          ))}
        </div>
      )}

      {malhaMunicipal && zoom >= ZOOM_MUNICIPIOS && (
        <p className="pointer-events-none absolute right-3 top-3 rounded-md border border-border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          Malha municipal (IBGE) visível
        </p>
      )}

      {temLegenda && !legendaAberta && (
        <button type="button" onClick={() => setLegendaAberta(true)} className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur hover:text-foreground" aria-expanded={false}>
          <span className="material-symbols-outlined text-sm leading-none" aria-hidden>info</span> Legenda
        </button>
      )}
      {temLegenda && legendaAberta && (
        <div className="absolute bottom-3 left-3 max-h-[40%] w-56 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card/90 p-2.5 text-[10px] shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">Legenda</p>
            <button type="button" onClick={() => setLegendaAberta(false)} aria-label="Recolher legenda" className="text-muted-foreground hover:text-foreground">×</button>
          </div>
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

  // Vizinhança: países da América do Sul (public/america-do-sul.geojson) sob o Brasil, para o
  // fundo sóbrio situar o país no continente; preenchimento apagado, divisas finas, nome no zoom nacional.
  geo("paises", { tolerance: 0.4 });
  map.addLayer({ id: "paises-fill", type: "fill", source: "paises", paint: { "fill-color": "#888", "fill-opacity": 0.07 } });
  map.addLayer({ id: "paises-line", type: "line", source: "paises", layout: { "line-join": "round" }, paint: { "line-color": "#888", "line-width": 0.8, "line-opacity": 0.6 } });
  geo("paises-rotulos");
  map.addLayer({ id: "paises-rotulos", type: "symbol", source: "paises-rotulos", maxzoom: 6, layout: {
    "text-field": ["get", "nome"], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 2, 9, 5, 12], "text-transform": "uppercase", "text-letter-spacing": 0.1, "text-optional": true,
  }, paint: { "text-color": "#888", "text-halo-color": "#000", "text-halo-width": 1, "text-opacity": 0.7 } });

  // UFs: contorno simplificado até o zoom ZOOM_MUNICIPIOS, detalhado (dissolvido da malha municipal) depois.
  geo("ufs", { promoteId: "sigla", tolerance: 0.3 });
  geo("ufs-hd", { promoteId: "sigla", tolerance: 0.2, buffer: 32 });
  map.addLayer({ id: "ufs-fill", type: "fill", source: "ufs", maxzoom: ZOOM_MUNICIPIOS, paint: {
    "fill-color": ["get", "fill"],
    "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85],
  } });
  map.addLayer({ id: "ufs-hd-fill", type: "fill", source: "ufs-hd", minzoom: ZOOM_MUNICIPIOS, paint: {
    "fill-color": ["get", "fill"],
    "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85],
  } });
  map.addLayer({ id: "ufs-sombra", type: "line", source: "ufs", maxzoom: ZOOM_MUNICIPIOS, paint: { "line-color": "#000", "line-width": 3, "line-opacity": 0.35, "line-blur": 2 } });

  // Municípios (sob demanda, só ao aproximar)
  geo("municipios", { tolerance: 0.25, buffer: 32 });
  map.addLayer({ id: "mun-fill", type: "fill", source: "municipios", minzoom: ZOOM_MUNICIPIOS, paint: {
    "fill-color": "#000", "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.12, 0],
  } });
  map.addLayer({ id: "mun-coro", type: "fill", source: "municipios", layout: oculto, paint: {
    "fill-color": ["coalesce", ["feature-state", "cor"], COR_SEM_DADO], "fill-opacity": 0.9,
  } });
  map.addLayer({ id: "mun-line", type: "line", source: "municipios", minzoom: ZOOM_MUNICIPIOS, paint: {
    "line-color": "#888", "line-width": ["interpolate", ["linear"], ["zoom"], ZOOM_MUNICIPIOS, 0.3, 9, 0.8], "line-opacity": ["interpolate", ["linear"], ["zoom"], ZOOM_MUNICIPIOS, 0.3, 7, 1],
  } });
  // Divisas das UFs por cima das municipais: simplificada longe, detalhada perto.
  map.addLayer({ id: "ufs-line", type: "line", source: "ufs", maxzoom: ZOOM_MUNICIPIOS, layout: { "line-join": "round" }, paint: { "line-color": "#888", "line-width": 1.2 } });
  map.addLayer({ id: "ufs-hd-line", type: "line", source: "ufs-hd", minzoom: ZOOM_MUNICIPIOS, layout: { "line-join": "round" }, paint: { "line-color": "#888", "line-width": 1.2 } });
  // Rótulos: siglas das UFs no zoom intermediário e nomes dos municípios ao aproximar.
  // Fontes separadas das malhas: se o servidor de glifos falhar, só os rótulos somem.
  geo("rotulos-uf");
  map.addLayer({ id: "rotulos-uf", type: "symbol", source: "rotulos-uf", minzoom: 4, maxzoom: ZOOM_ROTULOS_MUN, layout: {
    "text-field": ["get", "sigla"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 7, 15], "text-allow-overlap": true,
  }, paint: { "text-color": "#888", "text-halo-color": "#000", "text-halo-width": 1.5, "text-opacity": 0.8 } });
  geo("rotulos-mun", { tolerance: 0 });
  map.addLayer({ id: "rotulos-mun", type: "symbol", source: "rotulos-mun", minzoom: ZOOM_ROTULOS_MUN, layout: {
    "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"],
    "text-size": ["interpolate", ["linear"], ["zoom"], ZOOM_ROTULOS_MUN, 9, 10, 12, 13, 15],
    "text-padding": 4, "text-optional": true, "text-max-width": 8,
  }, paint: { "text-color": "#ccc", "text-halo-color": "#000", "text-halo-width": 1.2 } });

  // Layer 2c — backhaul
  geo("backhaul");
  map.addLayer({ id: "backhaul-sem", type: "circle", source: "backhaul", filter: ["!", ["get", "fibra"]], layout: oculto, paint: {
    "circle-color": "#9ca3af", "circle-opacity": 0.4, "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 8, 2.5],
  } });
  map.addLayer({ id: "backhaul-fibra", type: "symbol", source: "backhaul", filter: ["get", "fibra"], layout: {
    ...oculto, "icon-image": ["get", "icone"], "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.22, 8, 0.5], "icon-allow-overlap": true,
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
  map.addLayer({ id: "landing", type: "symbol", source: "landing", layout: { ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, 0.75), "icon-allow-overlap": true }, paint: { "icon-opacity": 0.85 } });

  // Layer 1 — usinas (raio cresce com a raiz da potência)
  geo("usinas");
  map.addLayer({ id: "usinas", type: "circle", source: "usinas", layout: oculto, paint: {
    "circle-color": "#9ca3af",
    "circle-opacity": 0.55,
    "circle-stroke-color": "#000",
    "circle-stroke-width": 0.3,
    "circle-stroke-opacity": 0.4,
    "circle-radius": porZoom([[3, 0.55], [6, 1.2], [10, 3.5]], ["min", 5, ["+", 1, ["/", ["sqrt", ["get", "mw"]], 12]]]),
  } });
  geo("usina-destaque");
  map.addLayer({ id: "usina-destaque-halo", type: "circle", source: "usina-destaque", paint: { "circle-color": "#ec4899", "circle-opacity": 0.15, "circle-radius": 16, "circle-stroke-color": "#ec4899", "circle-stroke-width": 2.5 } });
  map.addLayer({ id: "usina-destaque-rotulo", type: "symbol", source: "usina-destaque", layout: { "icon-image": ["get", "icone"], "icon-anchor": "bottom", "icon-offset": [0, -22], "icon-allow-overlap": true, "icon-ignore-placement": true } });

  // Transporte (visão regional): linhas sob os pontos, ícones por cima
  geo("transp-rodovias", { tolerance: 0.5 });
  map.addLayer({ id: "transp-rodovias", type: "line", source: "transp-rodovias", layout: { ...oculto, "line-cap": "round", "line-join": "round" }, paint: {
    "line-color": CORES_TRANSPORTE.rodovias,
    "line-opacity": ["case", ["==", ["get", "tipo"], "Major Highway"], 0.8, ["==", ["get", "tipo"], "Road"], 0.6, 0.4],
    "line-width": porZoom([[3, 0.6], [6, 1.2], [9, 2.4]], ["case", ["==", ["get", "tipo"], "Major Highway"], 1.6, ["==", ["get", "tipo"], "Road"], 1, 0.6]),
  } });
  geo("transp-ferrovias", { tolerance: 0.5 });
  map.addLayer({ id: "transp-ferrovias", type: "line", source: "transp-ferrovias", layout: { ...oculto, "line-join": "round" }, paint: {
    "line-color": CORES_TRANSPORTE.ferrovias, "line-opacity": 0.85, "line-dasharray": [3, 2], "line-width": porZoom([[3, 0.8], [6, 1.4], [9, 2.4]], 1),
  } });
  geo("transp-portos");
  map.addLayer({ id: "transp-portos", type: "symbol", source: "transp-portos", layout: { ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, 0.8), "icon-allow-overlap": true }, paint: { "icon-opacity": 0.9 } });
  geo("transp-aeroportos");
  map.addLayer({ id: "transp-aeroportos", type: "symbol", source: "transp-aeroportos", layout: { ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, ["case", ["get", "grande"], 0.85, 0.6]), "icon-allow-overlap": true }, paint: { "icon-opacity": ["case", ["get", "regular"], 0.9, 0.5] } });

  // Layer 3 — datacenters
  geo("dcs");
  map.addLayer({ id: "dcs", type: "symbol", source: "dcs", layout: { ...oculto, "icon-image": ["get", "icone"], "icon-size": porZoom(ESCALA_ICONE, 0.75), "icon-allow-overlap": true }, paint: { "icon-opacity": 0.85 } });

  // Interação entre atores (cor por tipo vem na feature)
  geo("inter-arcos");
  map.addLayer({ id: "inter-arcos", type: "line", source: "inter-arcos", layout: { ...oculto, "line-cap": "round" }, paint: {
    "line-color": ["coalesce", ["get", "cor"], COR_INTERACAO], "line-opacity": 0.45, "line-width": ["+", 0.6, ["*", 7, ["get", "peso"]]],
  } });
  geo("inter-loops");
  map.addLayer({ id: "inter-loops", type: "circle", source: "inter-loops", layout: oculto, paint: {
    "circle-color": ["coalesce", ["get", "cor"], COR_INTERACAO], "circle-opacity": 0.18, "circle-stroke-color": ["coalesce", ["get", "cor"], COR_INTERACAO], "circle-stroke-width": 0.8,
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
    geo(src, { cluster: true, clusterRadius: 18, clusterMaxZoom: 13 });
    map.addLayer({ id: `${src}-cluster`, type: "symbol", source: src, filter: ["has", "point_count"], layout: {
      "icon-image": "", "icon-size": TAMANHO_ICONE, "icon-allow-overlap": true, "icon-ignore-placement": true,
    } });
    // Contador do cluster como imagem (ver garantirBadge), deslocado para o canto superior direito do ícone.
    map.addLayer({ id: `${src}-badge`, type: "symbol", source: src, filter: ["has", "point_count"], layout: {
      "icon-image": "", "icon-size": porZoom(ESCALA_ICONE, 0.7), "icon-offset": [11, -11], "icon-allow-overlap": true, "icon-ignore-placement": true,
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
      "circle-radius": porZoom([[3, 6], [8, 12]], 0.78 + offset * 0.18),
    } });
  anel("aneis-l7", "l7", COR_ANEL.l7, 3);
  anel("aneis-l6", "l6", COR_ANEL.l6, 2);
  anel("aneis-l5", "l5", COR_ANEL.l5, 1);
  anel("aneis-l4", "l4", COR_ANEL.l4, 0);
  map.addLayer({ id: "enriquecidos-ponto", type: "circle", source: "enriquecidos", layout: oculto, paint: {
    "circle-color": ["get", "cor"], "circle-opacity": 0.95, "circle-stroke-color": "#fff", "circle-stroke-width": 0.5,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 4.5],
  } });

  // Âncoras PBIA (Layer 7), acima dos atores
  geo("ancoras");
  map.addLayer({ id: "ancoras-halo", type: "circle", source: "ancoras", layout: oculto, paint: {
    "circle-color": "#a78bfa", "circle-opacity": 0.14, "circle-stroke-color": "#a78bfa", "circle-stroke-width": 1.2, "circle-stroke-opacity": 0.85,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 8, 8, 16],
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

// Mapa sóbrio do Brasil: apenas contorno + divisões dos 27 estados (malha IBGE),
// com marcadores por categoria (ícone próprio, nunca bolinhas iguais).
// Sem tiles, sem camadas de satélite. Zoom por roda/pinça e botões + / −,
// arrastar para deslocar.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { CATEGORIA_MAP, type CategoriaKey } from "./tipos";
import { type DadosCabos, type Datacenter, type UsinaAneel } from "./caboSubmarino";

export interface Ponto {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  categoria: CategoriaKey;
}

interface Feature {
  properties: { sigla: string };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

const W = 900;
const H = 950;
// bbox continental do Brasil
const LON0 = -74.2;
const LON1 = -33.6;
const LAT0 = 5.6;
const LAT1 = -34.0;

const MIN_W = W / 24; // zoom máximo
const MAX_W = W; // mapa inteiro

const COR_USINA: Record<string, string> = {
  UHE: "#3b82f6",
  PCH: "#60a5fa",
  EOL: "#a78bfa",
  UFV: "#fbbf24",
  UTE: "#f87171",
  CGH: "#93c5fd",
  UTN: "#22c55e",
};

const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2));
const MY0 = mercY(LAT0);
const MY1 = mercY(LAT1);

export const projetar = (lon: number, lat: number): [number, number] => [
  ((lon - LON0) / (LON1 - LON0)) * W,
  ((mercY(lat) - MY0) / (MY1 - MY0)) * H,
];

function ringPath(ring: number[][]) {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = projetar(ring[i][0], ring[i][1]);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + "Z";
}

// Ilhas oceânicas muito afastadas (ex.: Fernando de Noronha, a leste de -34,5°)
// aparecem como um quadradinho solto no mar, confundido com um marcador.
const LON_LIMITE_OCEANICA = -34.5;
function ilhaOceanicaDistante(poly: number[][][]) {
  const anel = poly[0];
  if (!anel || anel.length > 12) return false;
  return anel.every(([lon]) => lon > LON_LIMITE_OCEANICA);
}

function featurePath(f: Feature) {
  const g = f.geometry;
  const polys =
    g.type === "Polygon"
      ? [g.coordinates as number[][][]]
      : (g.coordinates as number[][][][]);
  return polys
    .filter((poly) => !ilhaOceanicaDistante(poly))
    .map((poly) => poly.map(ringPath).join(""))
    .join("");
}

function dentroDoAnel(lon: number, lat: number, anel: number[][]) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    const cruza = yi > lat !== yj > lat
      && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function dentroDaFeature(lon: number, lat: number, feature: Feature) {
  const polys = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as number[][][]]
    : (feature.geometry.coordinates as number[][][][]);
  return polys.some((poly) => {
    if (!poly[0] || !dentroDoAnel(lon, lat, poly[0])) return false;
    return !poly.slice(1).some((buraco) => dentroDoAnel(lon, lat, buraco));
  });
}

interface Cluster {
  key: string;
  x: number;
  y: number;
  categoria: CategoriaKey;
  total: number;
  pontos: Ponto[];
}

// Muitos registros vêm geocodificados no centro do município (ex.: 825 startups
// exatamente em -23.5507/-46.6334, São Paulo). Sem tratamento eles ficam
// empilhados num único ícone. Aqui a posição de exibição de cada registro que
// divide a mesma coordenada é afastada de forma determinística (espiral de
// ângulo dourado, raio máx. ~0,25°), preservando o dado original no banco.
const RAIO_BASE = 0.012;
function dispersar(pontos: Ponto[]): Ponto[] {
  const contagem = new Map<string, number>();
  for (const p of pontos) {
    const k = `${p.latitude.toFixed(4)}|${p.longitude.toFixed(4)}`;
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }
  const usados = new Map<string, number>();
  return pontos.map((p) => {
    const k = `${p.latitude.toFixed(4)}|${p.longitude.toFixed(4)}`;
    if ((contagem.get(k) ?? 0) < 2) return p;
    const i = usados.get(k) ?? 0;
    usados.set(k, i + 1);
    if (i === 0) return p;
    const ang = i * 2.39996323;
    const raio = RAIO_BASE * Math.sqrt(i);
    const lat = p.latitude + raio * Math.sin(ang);
    return {
      ...p,
      latitude: lat,
      longitude:
        p.longitude +
        (raio * Math.cos(ang)) / Math.max(0.2, Math.cos((lat * Math.PI) / 180)),
    };
  });
}

function agrupar(pontos: Ponto[], celula: number): Cluster[] {
  const mapa = new Map<string, Cluster>();
  for (const p of pontos) {
    const [x, y] = projetar(p.longitude, p.latitude);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const key = `${p.categoria}|${Math.round(x / celula)}|${Math.round(y / celula)}`;
    const c = mapa.get(key);
    if (c) {
      c.total++;
      if (c.pontos.length < 60) c.pontos.push(p);
      c.x = (c.x * (c.total - 1) + x) / c.total;
      c.y = (c.y * (c.total - 1) + y) / c.total;
    } else {
      mapa.set(key, { key, x, y, categoria: p.categoria, total: 1, pontos: [p] });
    }
  }
  return [...mapa.values()].sort((a, b) => a.total - b.total);
}

interface Vista {
  x: number;
  y: number;
  w: number;
  h: number;
}

const VISTA_TOTAL: Vista = { x: 0, y: 0, w: W, h: H };

interface Props {
  pontos: Ponto[];
  ufSelecionada: string | null;
  ufsSelecionadas: Set<string>;
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
  /** Subtipos de usina selecionados (vazio = todos). */
  tiposUsina?: Set<string>;
  /** Layer 2 — Infraestrutura Física: cabos submarinos (TeleGeography). */
  layer2Ativa?: boolean;
  dadosCabos?: DadosCabos | null;
  /** Layer 3 — Infraestrutura Lógica: datacenters do PeeringDB. */
  layer3Ativa?: boolean;
  dadosDCs?: Datacenter[] | null;
  /** Layer 7 — Governança (placeholder em Brasília). */
  layer7Ativa?: boolean;
}

export default function MapaBrasil({
  pontos,
  ufSelecionada,
  ufsSelecionadas,
  contagemPorUf,
  onSelecionarUf,
  onSelecionarCluster,
  pontoSelecionadoId,
  onSelecionarPonto,
  grupoIds,
  layer1Ativa,
  dadosUsinas,
  tiposUsina,
  layer2Ativa,
  dadosCabos,
  layer3Ativa,
  dadosDCs,
  layer7Ativa,
}: Props) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [erroMalha, setErroMalha] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vista, setVista] = useState<Vista>(VISTA_TOTAL);
  const arrasteRef = useRef<{ x: number; y: number; vista: Vista; movido: boolean } | null>(null);
  const movidoRef = useRef(false);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/br-uf.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`malha IBGE indisponível (HTTP ${r.status})`);
        return r.json();
      })
      .then((d) => vivo && setFeatures(d.features))
      .catch((e) => vivo && setErroMalha(e.message));
    return () => {
      vivo = false;
    };
  }, []);

  const paths = useMemo(
    () => (features || []).map((f) => ({ sigla: f.properties.sigla, d: featurePath(f) })),
    [features],
  );

  // Ao selecionar um único estado, o mapa aproxima nele.
  const vistaUf = useMemo<Vista | null>(() => {
    if (!ufSelecionada || !features) return null;
    const f = features.find((x) => x.properties.sigla === ufSelecionada);
    if (!f) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as number[][][]]
        : (f.geometry.coordinates as number[][][][]);
    for (const poly of polys)
      for (const ring of poly)
        for (const [lon, lat] of ring) {
          const [x, y] = projetar(lon, lat);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
    const pad = Math.max(maxX - minX, maxY - minY) * 0.08;
    return {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
  }, [ufSelecionada, features]);

  useEffect(() => {
    setVista(vistaUf || VISTA_TOTAL);
  }, [vistaUf]);

  /** Aplica zoom mantendo fixo o ponto (ax, ay) em coordenadas do SVG. */
  const aplicarZoom = useCallback((fator: number, ax?: number, ay?: number) => {
    setVista((v) => {
      const alvoW = Math.min(MAX_W, Math.max(MIN_W, v.w * fator));
      const k = alvoW / v.w;
      const cx = ax ?? v.x + v.w / 2;
      const cy = ay ?? v.y + v.h / 2;
      return {
        x: cx - (cx - v.x) * k,
        y: cy - (cy - v.y) * k,
        w: v.w * k,
        h: v.h * k,
      };
    });
  }, []);

  const paraSvg = useCallback((clientX: number, clientY: number, v: Vista) => {
    const el = svgRef.current;
    if (!el) return [v.x + v.w / 2, v.y + v.h / 2] as [number, number];
    const r = el.getBoundingClientRect();
    return [
      v.x + ((clientX - r.left) / r.width) * v.w,
      v.y + ((clientY - r.top) / r.height) * v.h,
    ] as [number, number];
  }, []);

  // Roda/pinça: listener nativo não passivo (React usa passivo).
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const [ax, ay] = paraSvg(e.clientX, e.clientY, vistaRef.current);
      aplicarZoom(Math.exp(dy * 0.0015), ax, ay);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [aplicarZoom, paraSvg, features]);

  const escala = vista.w / W;

  // Layer 2 — cabos e landing points já pré-filtrados no snapshot local.
  const cabosVisiveis = useMemo(() => {
    if (!layer2Ativa || !dadosCabos) return [];
    return dadosCabos.cables;
  }, [layer2Ativa, dadosCabos]);

  const landingPointsVisiveis = useMemo(() => {
    if (!layer2Ativa || !dadosCabos) return [];
    return dadosCabos.points;
  }, [layer2Ativa, dadosCabos]);


  // Ícones com tamanho amortecido: crescem menos que o zoom, então ao
  // aproximar num estado populoso eles ficam proporcionalmente menores
  // e deixam de se sobrepor. No mapa inteiro (escala 1) ficam em 14px.
  const tam = 14 * Math.sqrt(escala);
  // O retângulo geográfico aceita áreas de países vizinhos. A malha oficial
  // das UFs é a autoridade final para impedir marcadores fora do Brasil.
  const pontosNoBrasil = useMemo(
    () => features
      ? pontos.filter((p) => features.some((f) => dentroDaFeature(p.longitude, p.latitude, f)))
      : [],
    [pontos, features],
  );
  const pontosExibidos = useMemo(() => dispersar(pontosNoBrasil), [pontosNoBrasil]);
  const clusters = useMemo(
    () => agrupar(pontosExibidos, tam * 1.7),
    [pontosExibidos, tam],
  );

  const temSelecao = pontoSelecionadoId != null || (grupoIds != null && grupoIds.size > 0);
  const selecionado = useMemo(
    () => pontosExibidos.find((p) => p.id === pontoSelecionadoId) || null,
    [pontosExibidos, pontoSelecionadoId],
  );
  const [selX, selY] = selecionado
    ? projetar(selecionado.longitude, selecionado.latitude)
    : [null, null];

  if (erroMalha) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar o contorno dos estados: {erroMalha}
        </p>
      </div>
    );
  }

  const botao =
    "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
        className={`h-full w-full touch-none select-none ${arrastando ? "cursor-grabbing" : "cursor-grab"}`}
        style={arrastando ? { pointerEvents: "none", ...{ pointerEvents: "auto" } } : undefined}
        role="img"
        aria-label="Mapa do Brasil com instituições de pesquisa e inovação por estado"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          arrasteRef.current = { x: e.clientX, y: e.clientY, vista, movido: false };
          setArrastando(true);
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const a = arrasteRef.current;
          if (!a) return;
          const el = svgRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const dx = ((e.clientX - a.x) / r.width) * a.vista.w;
          const dy = ((e.clientY - a.y) / r.height) * a.vista.h;
          if (Math.abs(e.clientX - a.x) + Math.abs(e.clientY - a.y) > 4) {
            a.movido = true;
            movidoRef.current = true;
          }
          setVista({ ...a.vista, x: a.vista.x - dx, y: a.vista.y - dy });
        }}
        onPointerUp={() => {
          arrasteRef.current = null;
          setArrastando(false);
          // movidoRef é limpo depois do ciclo de eventos,
          // para que o onClick dos filhos ainda o leia como true
          setTimeout(() => { movidoRef.current = false; }, 0);
        }}
        onPointerLeave={() => {
          arrasteRef.current = null;
          setArrastando(false);
          setTimeout(() => { movidoRef.current = false; }, 0);
        }}
        onClick={(e) => {
          if (e.target === svgRef.current) onSelecionarPonto?.(null);
        }}
      >
        <defs>
          <filter id="pais-outline" x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology in="SourceAlpha" result="dilated" operator="dilate" radius="3" />
            <feFlood floodColor="hsl(var(--foreground))" floodOpacity="0.45" result="cor" />
            <feComposite in="cor" in2="dilated" operator="in" result="borda" />
            <feComposite in="borda" in2="SourceAlpha" operator="out" result="sombra" />
            <feMerge>
              <feMergeNode in="sombra" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
<filter id="cabo-glow" x="-50%" y="-50%" width="200%" height="200%">
  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#fb923c" floodOpacity="0.75" />
</filter>
          <clipPath id="brasil-contorno">
            {paths.map((p) => <path key={`clip-${p.sigla}`} d={p.d} />)}
          </clipPath>
        </defs>
        <g filter="url(#pais-outline)">
          {paths.map((p) => {
            const n = contagemPorUf[p.sigla] || 0;
            const ativa = ufsSelecionadas.has(p.sigla);
            return (
              <path
                key={p.sigla}
                d={p.d}
                fill={ativa ? "hsl(var(--primary) / 0.22)" : "hsl(var(--muted) / 0.35)"}
                stroke="hsl(var(--foreground) / 0.25)"
                strokeWidth={1.4 * escala}
                strokeLinejoin="round"
                className={`transition-[fill] duration-200 hover:brightness-110 ${arrastando ? "cursor-grabbing" : "cursor-pointer"}`}
                style={{ pointerEvents: arrastando ? "none" : "auto" }}
                onClick={(e) => {
                  if (movidoRef.current) { e.stopPropagation(); return; }
                  onSelecionarUf(p.sigla);
                }}
              >
                <title>{`${p.sigla} — ${n.toLocaleString("pt-BR")} registros`}</title>
              </path>
            );
          })}
        </g>

        {/* Layer 2 — Cabos Submarinos (por baixo dos marcadores) */}
        {layer2Ativa && (
          <g opacity={1} pointerEvents="none">
            {/* Traçados dos cabos */}
            {cabosVisiveis.map((cabo) => {
              const cor = cabo.color || "#f97316";
              const linhas = cabo.geometry.coordinates as number[][][];
              return linhas.map((linha, li) => {
                const pts = linha
                  .filter(([lon, lat]) => lon >= -100 && lon <= -20 && lat >= -60 && lat <= 20)
                  .map(([lon, lat]) => projetar(lon, lat));
                if (pts.length < 2) return null;
                const d = pts
                  .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
                  .join(" ");
                return (
                  <g key={`${cabo.id}-${li}`}>
                    {/* Sombra de volume */}
                    <path
                      d={d}
                      stroke="#7c2d12"
                      strokeWidth={10}
                      fill="none"
                      strokeOpacity={0.35}
                      strokeLinecap="round"
                    />
                    {/* Linha principal */}
                    <path
                      d={d}
                      stroke={cor}
                      strokeWidth={6}
                      fill="none"
                      strokeOpacity={1}
                      strokeLinecap="round"
                      filter="url(#cabo-glow)"
                    />
                    {/* Núcleo claro */}
                    <path
                      d={d}
                      stroke="#ffedd5"
                      strokeWidth={2}
                      fill="none"
                      strokeOpacity={0.75}
                      strokeLinecap="round"
                    />
                  </g>
                );
              });
            })}

            {/* Landing points brasileiros */}
            {landingPointsVisiveis.map((p) => {
              const lat = Number(p.latitude);
              const lon = Number(p.longitude);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
              const [x, y] = projetar(lon, lat);
              return (
                <g key={p.id}>
                  <circle
                    cx={x} cy={y}
                    r={7}
                    fill="#f97316"
                    stroke="#fff7ed"
                    strokeWidth={2}
                    opacity={1}
                  />
                  <circle
                    cx={x} cy={y}
                    r={3.5}
                    fill="#fff7ed"
                    opacity={0.9}
                  />
                  <title>{p.name}</title>
                </g>
              );
            })}
          </g>
        )}

        {/* Layer 1 — Usinas de Energia (ANEEL), abaixo dos marcadores SNI. */}
        {layer1Ativa && dadosUsinas && (
          <g opacity={0.8} pointerEvents="none" clipPath="url(#brasil-contorno)">
            {dadosUsinas.map((u) => {
              if (!Number.isFinite(u.latitude) || !Number.isFinite(u.longitude)) return null;
              if (u.longitude < LON0 || u.longitude > LON1 || u.latitude > LAT0 || u.latitude < LAT1) return null;
              if (tiposUsina && tiposUsina.size > 0 && !tiposUsina.has(u.tipo)) return null;
              const [x, y] = projetar(u.longitude, u.latitude);
              const cor = COR_USINA[u.tipo] || "#6b7280";
              const r = (u.potencia_kw ?? 0) > 100000
                ? tam * 0.6
                : (u.potencia_kw ?? 0) > 10000
                  ? tam * 0.45
                  : tam * 0.3;
              const local = [u.municipio, u.uf].filter(Boolean).join("/");
              return (
                <circle
                  key={u.id}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={cor}
                  fillOpacity={0.75}
                  stroke="hsl(var(--background))"
                  strokeWidth={0.5 * escala}
                >
                  <title>{`${u.nome} · ${u.tipo}${u.potencia_kw ? ` · ${(u.potencia_kw / 1000).toFixed(0)} MW` : ""}${local ? ` · ${local}` : ""}`}</title>
                </circle>
              );
            })}
          </g>
        )}

        {/* Layer 3 — Datacenters (PeeringDB), abaixo dos marcadores SNI. */}
        {layer3Ativa && dadosDCs && (
          <g opacity={0.85} pointerEvents="none" clipPath="url(#brasil-contorno)">
            {dadosDCs.map((dc) => {
              if (dc.latitude == null || dc.longitude == null) return null;
              if (!Number.isFinite(dc.latitude) || !Number.isFinite(dc.longitude)) return null;
              const [x, y] = projetar(dc.longitude, dc.latitude);
              const local = [dc.cidade, dc.uf].filter(Boolean).join("/");
              return (
                <g key={dc.id}>
                  <rect
                    x={x - tam * 0.35}
                    y={y - tam * 0.35}
                    width={tam * 0.7}
                    height={tam * 0.7}
                    fill="#eab308"
                    fillOpacity={0.85}
                    stroke="hsl(var(--background))"
                    strokeWidth={0.8 * escala}
                    rx={1}
                  />
                  <title>{`${dc.nome}${local ? ` · ${local}` : ""}${dc.redes ? ` · ${dc.redes} redes` : ""}`}</title>
                </g>
              );
            })}
          </g>
        )}

        {/* Layer 7 — Governança (placeholder em Brasília), abaixo dos marcadores SNI. */}
        {layer7Ativa && (() => {
          // Brasília: -15.7801, -47.9292
          const [x, y] = projetar(-47.9292, -15.7801);
          return (
            <g pointerEvents="none">
              <circle cx={x} cy={y} r={tam * 1.2}
                fill="#7c3aed" fillOpacity={0.15}
                stroke="#7c3aed" strokeWidth={1.5 * escala} strokeDasharray="4 2"
              />
              <circle cx={x} cy={y} r={tam * 0.5}
                fill="#7c3aed" fillOpacity={0.8}
                stroke="white" strokeWidth={1 * escala}
              />
              <title>Layer 7 — Governança · Políticas Públicas de IA e Patentes · Em construção</title>
            </g>
          );
        })()}

        <g clipPath="url(#brasil-contorno)">
          {clusters.map((c) => {
            const cat = CATEGORIA_MAP[c.categoria];
            const selecionadoAqui = c.pontos.some(
              (p) => p.id === pontoSelecionadoId || grupoIds?.has(p.id),
            );
            const opacidade = temSelecao ? (selecionadoAqui ? 1 : 0.15) : 1;
            return (
              <g
                key={c.key}
                className={arrastando ? "cursor-grabbing" : "cursor-pointer"}
                style={{ opacity: opacidade, transition: "opacity 200ms ease", pointerEvents: arrastando ? "none" : "auto" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (movidoRef.current) return;
                  if (c.total === 1) {
                    onSelecionarPonto?.(c.pontos[0].id);
                  } else {
                    onSelecionarPonto?.(null);
                    onSelecionarCluster(c.pontos, c.total);
                  }
                }}
              >
                <text
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="currentColor"
                  className={`material-symbols-outlined select-none ${cat.cor}`}
                  style={{ fontSize: tam }}
                >
                  {cat.icon}
                </text>
                {c.total > 1 && (
                  <>
                    <circle
                      cx={c.x + tam * 0.45}
                      cy={c.y - tam * 0.45}
                      r={tam * 0.34}
                      fill="hsl(var(--background))"
                      stroke="hsl(var(--border))"
                      strokeWidth={0.6 * escala}
                    />
                    <text
                      x={c.x + tam * 0.45}
                      y={c.y - tam * 0.45}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={tam * 0.4}
                      className="fill-foreground font-semibold"
                    >
                      {c.total > 99 ? "99+" : c.total}
                    </text>
                  </>
                )}
                <title>
                  {c.total === 1
                    ? `${c.pontos[0].nome} — ${cat.label}`
                    : `${c.total} ${cat.label}`}
                </title>
              </g>
            );
          })}
        </g>

        {selecionado && selX != null && selY != null && (
          <g clipPath="url(#brasil-contorno)" pointerEvents="none" style={{ opacity: 0.95 }}>
            <circle
              cx={selX}
              cy={selY}
              r={tam * 1.35}
              fill="hsl(var(--primary) / 0.08)"
              stroke="hsl(var(--primary) / 0.30)"
              strokeWidth={0.7 * escala}
            />
            <text
              x={selX}
              y={selY - tam * 0.75}
              textAnchor="middle"
              dominantBaseline="central"
              fill="hsl(var(--primary))"
              className="material-symbols-outlined select-none"
              style={{ fontSize: tam * 2, fontVariationSettings: '"FILL" 1' }}
            >
              location_on
            </text>
          </g>
        )}
      </svg>

      {/* Controles de zoom */}
      <div className="absolute left-3 top-3 flex flex-col rounded-lg border border-border bg-card/80 p-0.5 shadow-sm backdrop-blur">
        <button
          type="button"
          className={botao}
          title="Aproximar"
          aria-label="Aproximar"
          disabled={vista.w <= MIN_W + 0.01}
          onClick={() => aplicarZoom(1 / 1.5)}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={botao}
          title="Afastar"
          aria-label="Afastar"
          disabled={vista.w >= MAX_W - 0.01}
          onClick={() => aplicarZoom(1.5)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={botao}
          title="Ver o Brasil inteiro"
          aria-label="Ver o Brasil inteiro"
          onClick={() => setVista(vistaUf || VISTA_TOTAL)}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {(layer1Ativa || layer2Ativa || layer3Ativa || layer7Ativa) && (
        <div className="absolute bottom-8 left-3 max-h-[45%] space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card/90 p-2.5 text-[10px] shadow-sm backdrop-blur">
          <p className="font-semibold text-foreground">Camadas de IA ativas</p>
          {layer1Ativa && (<>
            <p className="font-medium text-pink-500">Layer 1 — Energia (ANEEL)</p>
            {Object.entries({
              UHE: "UHE — Hídrica",
              PCH: "PCH — Hídrica peq.",
              CGH: "CGH — Micro-hidro",
              EOL: "EOL — Eólica",
              UFV: "UFV — Solar",
              UTE: "UTE — Termelétrica",
              UTN: "UTN — Nuclear",
            }).filter(([tipo]) => !tiposUsina || tiposUsina.size === 0 || tiposUsina.has(tipo))
              .map(([tipo, label]) => (
              <div key={tipo} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-foreground/30" style={{ background: COR_USINA[tipo] }} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
            <p className="text-muted-foreground/60">Tamanho proporcional à potência</p>
          </>)}
          {layer2Ativa && (<>
            <p className="font-medium text-orange-400">Layer 2 — Infra Física (TeleGeography)</p>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-5 rounded bg-orange-400" />
              <span className="text-muted-foreground">Cabo submarino</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full border border-foreground/30 bg-orange-400" />
              <span className="text-muted-foreground">Landing point (BR)</span>
            </div>
          </>)}
          {layer3Ativa && (<>
            <p className="font-medium text-yellow-400">Layer 3 — Infra Lógica (PeeringDB)</p>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded border border-foreground/30 bg-yellow-400" />
              <span className="text-muted-foreground">Datacenter</span>
            </div>
          </>)}
          {layer7Ativa && (<>
            <p className="font-medium text-violet-400">Layer 7 — Governança</p>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full border border-white/50 bg-violet-500" />
              <span className="text-muted-foreground">Política pública / Patente</span>
            </div>
            <p className="text-muted-foreground/60">Bases: IPEA · INPI · EBIA · NIB</p>
          </>)}
        </div>
      )}
    </div>
  );
}

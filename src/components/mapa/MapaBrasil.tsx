// Mapa sóbrio do Brasil: apenas contorno + divisões dos 27 estados (malha IBGE),
// com marcadores por categoria (ícone próprio, nunca bolinhas iguais).
// Sem tiles, sem camadas de satélite. Zoom por roda/pinça e botões + / −,
// arrastar para deslocar.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { CATEGORIA_MAP, type CategoriaKey } from "./tipos";

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

function featurePath(f: Feature) {
  const g = f.geometry;
  const polys =
    g.type === "Polygon"
      ? [g.coordinates as number[][][]]
      : (g.coordinates as number[][][][]);
  return polys.map((poly) => poly.map(ringPath).join("")).join("");
}

interface Cluster {
  key: string;
  x: number;
  y: number;
  categoria: CategoriaKey;
  total: number;
  pontos: Ponto[];
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
}: Props) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [erroMalha, setErroMalha] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [vista, setVista] = useState<Vista>(VISTA_TOTAL);
  const arrasteRef = useRef<{ x: number; y: number; vista: Vista; movido: boolean } | null>(null);

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

  // Ícones com tamanho amortecido: crescem menos que o zoom, então ao
  // aproximar num estado populoso eles ficam proporcionalmente menores
  // e deixam de se sobrepor. No mapa inteiro (escala 1) ficam em 14px.
  const tam = 14 * Math.sqrt(escala);
  const clusters = useMemo(() => agrupar(pontos, tam * 1.7), [pontos, tam]);

  const temSelecao = pontoSelecionadoId != null;
  const selecionado = useMemo(
    () => pontos.find((p) => p.id === pontoSelecionadoId) || null,
    [pontos, pontoSelecionadoId],
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
        className={`h-full w-full touch-none ${arrasteRef.current ? "cursor-grabbing" : "cursor-grab"}`}
        role="img"
        aria-label="Mapa do Brasil com instituições de pesquisa e inovação por estado"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          arrasteRef.current = { x: e.clientX, y: e.clientY, vista, movido: false };
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
          if (Math.abs(e.clientX - a.x) + Math.abs(e.clientY - a.y) > 4) a.movido = true;
          setVista({ ...a.vista, x: a.vista.x - dx, y: a.vista.y - dy });
        }}
        onPointerUp={() => {
          arrasteRef.current = null;
        }}
        onPointerLeave={() => {
          arrasteRef.current = null;
        }}
        onClick={(e) => {
          if (e.target === svgRef.current) onSelecionarPonto?.(null);
        }}
      >
        <g>
          {paths.map((p) => {
            const n = contagemPorUf[p.sigla] || 0;
            const ativa = ufsSelecionadas.has(p.sigla);
            return (
              <path
                key={p.sigla}
                d={p.d}
                fill={ativa ? "hsl(var(--primary) / 0.22)" : "hsl(var(--muted) / 0.35)"}
                stroke="hsl(var(--border))"
                strokeWidth={0.8 * escala}
                className="cursor-pointer transition-[fill] duration-200 hover:brightness-110"
                onClick={() => {
                  if (!arrasteRef.current?.movido) onSelecionarUf(p.sigla);
                }}
              >
                <title>{`${p.sigla} — ${n.toLocaleString("pt-BR")} registros`}</title>
              </path>
            );
          })}
        </g>

        <g>
          {clusters.map((c) => {
            const cat = CATEGORIA_MAP[c.categoria];
            const selecionadoAqui = c.pontos.some((p) => p.id === pontoSelecionadoId);
            const opacidade = temSelecao ? (selecionadoAqui ? 1 : 0.15) : 1;
            return (
              <g
                key={c.key}
                className="cursor-pointer"
                style={{ opacity: opacidade, transition: "opacity 200ms ease" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (arrasteRef.current?.movido) return;
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
          <g pointerEvents="none" style={{ opacity: 0.95 }}>
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
    </div>
  );
}

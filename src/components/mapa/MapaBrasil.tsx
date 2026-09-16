// Mapa sóbrio do Brasil: apenas contorno + divisões dos 27 estados (malha IBGE),
// com marcadores por categoria (ícone próprio, nunca bolinhas iguais).
// Sem tiles, sem camadas de satélite.

import { useEffect, useMemo, useRef, useState } from "react";
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

interface Props {
  pontos: Ponto[];
  ufSelecionada: string | null;
  ufsSelecionadas: Set<string>;
  contagemPorUf: Record<string, number>;
  onSelecionarUf: (uf: string) => void;
  onSelecionarCluster: (pontos: Ponto[], total: number) => void;
}

export default function MapaBrasil({
  pontos,
  ufSelecionada,
  ufsSelecionadas,
  contagemPorUf,
  onSelecionarUf,
  onSelecionarCluster,
}: Props) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [erroMalha, setErroMalha] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Ao selecionar um estado, o mapa aproxima e o agrupamento fica mais fino.
  const viewBox = useMemo(() => {
    if (!ufSelecionada || !features) return `0 0 ${W} ${H}`;
    const f = features.find((x) => x.properties.sigla === ufSelecionada);
    if (!f) return `0 0 ${W} ${H}`;
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
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  }, [ufSelecionada, features]);

  const escala = useMemo(() => {
    const [, , w] = viewBox.split(" ").map(Number);
    return w / W;
  }, [viewBox]);

  const clusters = useMemo(() => agrupar(pontos, 28 * escala), [pontos, escala]);

  const maxUf = Math.max(1, ...Object.values(contagemPorUf));
  const tam = 5 * escala;

  if (erroMalha) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar o contorno dos estados: {erroMalha}
        </p>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="h-full w-full"
      role="img"
      aria-label="Mapa do Brasil com instituições de pesquisa e inovação por estado"
    >
      <g>
        {paths.map((p) => {
          const n = contagemPorUf[p.sigla] || 0;
          const intensidade = 0.04 + (n / maxUf) * 0.16;
          const ativa = ufsSelecionadas.has(p.sigla);
          return (
            <path
              key={p.sigla}
              d={p.d}
              fill={`hsl(var(--primary) / ${ativa ? 0.28 : intensidade})`}
              stroke="hsl(var(--border))"
              strokeWidth={0.8 * escala}
              className="cursor-pointer transition-[fill] duration-200 hover:brightness-125"
              onClick={() => onSelecionarUf(p.sigla)}
            >
              <title>{`${p.sigla} — ${n.toLocaleString("pt-BR")} registros`}</title>
            </path>
          );
        })}
      </g>

      <g>
        {clusters.map((c) => {
          const cat = CATEGORIA_MAP[c.categoria];
          return (
            <g
              key={c.key}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelecionarCluster(c.pontos, c.total);
              }}
            >
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tam}
                fill="currentColor"
                className={`material-symbols-outlined select-none ${cat.cor}`}
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
    </svg>
  );
}

// Utilidades geográficas do mapa: malha das UFs, malha municipal fatiada por UF
// (public/br-mun/{código IBGE}.geojson, carregada sob demanda), bboxes e
// teste ponto-em-polígono para impedir marcadores fora do Brasil.

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type FeatureUf = Feature<Polygon | MultiPolygon, { sigla: string }>;
export type FeatureMun = Feature<Polygon | MultiPolygon, { id: string; name: string; uf: string }>;
export type Bbox = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]

/** Código IBGE (2 dígitos) de cada UF: nome dos arquivos em public/br-mun. */
export const CODIGO_IBGE_UF: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
  MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27", SE: "28", BA: "29",
  MG: "31", ES: "32", RJ: "33", SP: "35",
  PR: "41", SC: "42", RS: "43",
  MS: "50", MT: "51", GO: "52", DF: "53",
};

// Bbox continental do Brasil, usada como enquadramento inicial.
export const BBOX_BRASIL: Bbox = [-74.2, -34.0, -33.6, 5.6];

export function poligonos(f: Feature<Polygon | MultiPolygon>): number[][][][] {
  return f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
}

export function bboxDaFeature(f: Feature<Polygon | MultiPolygon>, ignorarIlhasDistantes = true): Bbox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of poligonos(f)) {
    if (ignorarIlhasDistantes && ilhaOceanicaDistante(poly)) continue;
    for (const ring of poly)
      for (const [lon, lat] of ring) {
        if (lon < minX) minX = lon; if (lon > maxX) maxX = lon;
        if (lat < minY) minY = lat; if (lat > maxY) maxY = lat;
      }
  }
  return [minX, minY, maxX, maxY];
}

// Ilhas oceânicas muito afastadas (ex.: Fernando de Noronha) esticam o
// enquadramento de PE sem acrescentar nada ao mapa.
const LON_LIMITE_OCEANICA = -34.5;
function ilhaOceanicaDistante(poly: number[][][]) {
  const anel = poly[0];
  if (!anel || anel.length > 12) return false;
  return anel.every(([lon]) => lon > LON_LIMITE_OCEANICA);
}

function dentroDoAnel(lon: number, lat: number, anel: number[][]) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    const cruza = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

export function dentroDaFeature(lon: number, lat: number, f: Feature<Polygon | MultiPolygon>, bbox?: Bbox) {
  if (bbox && (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3])) return false;
  return poligonos(f).some((poly) => {
    if (!poly[0] || !dentroDoAnel(lon, lat, poly[0])) return false;
    return !poly.slice(1).some((buraco) => dentroDoAnel(lon, lat, buraco));
  });
}

export function bboxesIntersectam(a: Bbox, b: Bbox) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

export type NivelMalha = "sd" | "hd";
const cacheMun = new Map<string, Promise<FeatureCollection<Polygon | MultiPolygon, FeatureMun["properties"]>>>();

/**
 * Carrega (e memoriza) a malha municipal de uma UF. "sd" (public/br-mun, ~12%
 * dos vértices) serve ao país inteiro; "hd" (public/br-mun-hd, ~30%) entra
 * quando o usuário aproxima, para as divisas ficarem precisas.
 */
export function carregarMunicipios(uf: string, nivel: NivelMalha = "sd") {
  const cod = CODIGO_IBGE_UF[uf];
  if (!cod) return Promise.reject(new Error(`UF desconhecida: ${uf}`));
  const chave = `${uf}|${nivel}`;
  let p = cacheMun.get(chave);
  if (!p) {
    p = fetch(`/${nivel === "hd" ? "br-mun-hd" : "br-mun"}/${cod}.geojson`)
      .then((r) => { if (!r.ok) throw new Error(`malha municipal de ${uf} indisponível (HTTP ${r.status})`); return r.json(); })
      .then((fc: FeatureCollection<Polygon | MultiPolygon, { id: string; name: string }>) => ({
        type: "FeatureCollection" as const,
        features: fc.features.map((f) => ({ ...f, id: Number(f.properties.id), properties: { ...f.properties, uf } })),
      }));
    cacheMun.set(chave, p);
    p.catch(() => cacheMun.delete(chave));
  }
  return p;
}

const cacheUnico = new Map<string, Promise<FeatureCollection>>();
/** Arquivo único memorizado (contorno HD das UFs, pontos de rótulo dos municípios). */
export function carregarGeojson<T extends FeatureCollection = FeatureCollection>(url: string): Promise<T> {
  let p = cacheUnico.get(url);
  if (!p) {
    p = fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); });
    cacheUnico.set(url, p);
    p.catch(() => cacheUnico.delete(url));
  }
  return p as Promise<T>;
}

export const SIGLA_POR_CODIGO: Record<string, string> = Object.fromEntries(Object.entries(CODIGO_IBGE_UF).map(([s, c]) => [c, s]));

/** Curva suave entre dois pontos (quadrática, deslocada à esquerda), amostrada em N segmentos. */
export function arcoCurvo(o: [number, number], d: [number, number], n = 24): [number, number][] {
  const mx = (o[0] + d[0]) / 2, my = (o[1] + d[1]) / 2;
  const dx = d[0] - o[0], dy = d[1] - o[1];
  const cx = mx - dy * 0.2, cy = my + dx * 0.2;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * o[0] + 2 * u * t * cx + t * t * d[0], u * u * o[1] + 2 * u * t * cy + t * t * d[1]]);
  }
  return pts;
}

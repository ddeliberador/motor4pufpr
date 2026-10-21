// Fundos de mapa (basemaps). O padrão continua sóbrio: só o contorno do Brasil
// sobre a cor do tema, sem tiles. Os demais usam fontes abertas e gratuitas,
// sem chave de API: OpenFreeMap (tiles vetoriais OpenMapTiles) e o serviço
// público de imagens da Esri (raster).

import type { StyleSpecification } from "maplibre-gl";

export type FundoId = "sobrio" | "claro" | "escuro" | "satelite";

export const FUNDOS: { id: FundoId; rotulo: string; descricao: string }[] = [
  { id: "sobrio", rotulo: "Sóbrio", descricao: "Só o contorno das UFs, sem base cartográfica" },
  { id: "claro", rotulo: "Claro", descricao: "OpenFreeMap Positron (OpenStreetMap)" },
  { id: "escuro", rotulo: "Escuro", descricao: "OpenFreeMap Dark (OpenStreetMap)" },
  { id: "satelite", rotulo: "Satélite", descricao: "Esri World Imagery" },
];

export const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

export const URL_ESTILO_FUNDO: Partial<Record<FundoId, string>> = {
  claro: "https://tiles.openfreemap.org/styles/positron",
  escuro: "https://tiles.openfreemap.org/styles/dark",
};

/** Estilo vazio: só a cor de fundo do tema. As camadas do Motor entram por cima. */
export function estiloSobrio(corFundo: string): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {},
    layers: [{ id: "fundo", type: "background", paint: { "background-color": corFundo } }],
  };
}

export function estiloSatelite(): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      esri: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 18,
        attribution: "Imagens © Esri, Maxar, Earthstar Geographics",
      },
    },
    layers: [{ id: "esri", type: "raster", source: "esri" }],
  };
}

export const ATRIBUICAO_FUNDO: Record<FundoId, string> = {
  sobrio: "Malha IBGE",
  claro: "© OpenFreeMap · © OpenMapTiles · © OpenStreetMap",
  escuro: "© OpenFreeMap · © OpenMapTiles · © OpenStreetMap",
  satelite: "Imagens © Esri · Malha IBGE",
};

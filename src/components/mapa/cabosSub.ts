// Tipos da API TeleGeography Submarine Cable Map v3

export interface LandingPoint {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  country?: string;
  country_name?: string;
  country_code?: string;
  cables?: string[];
}

export interface CaboSubmarino {
  id: string;
  name: string;
  color?: string;
  rfs?: string;
  length?: string;
  owners?: { name: string }[];
  landing_points?: string[];
  slug?: string;
}

// Paleta fixa para os cabos (usada quando o cabo não vem com cor)
const CORES_CABOS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B",
  "#EF4444", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

export function corCabo(id: string, cor?: string): string {
  if (cor && cor.startsWith("#")) return cor;
  // Hash determinístico do id para cor consistente entre renders
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return CORES_CABOS[h % CORES_CABOS.length];
}

// Tipos da camada Layer 2 — Infraestrutura Física (cabos submarinos).
// Fonte: TeleGeography Submarine Cable Map v3, snapshot local em
// /submarine-cablemap/data.json.

export interface LandingPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  is_tbd?: boolean;
}

export interface CableGeometry {
  type: "MultiLineString";
  coordinates: number[][][];
}

export interface Cable {
  id: string;
  name: string;
  color?: string;
  feature_id?: string;
  geometry: CableGeometry;
}

export interface DadosCabos {
  cables: Cable[];
  points: LandingPoint[];
  generated_at?: string;
  source?: string;
}

// Layer 1 — Energia
export interface UsinaAneel {
  id: string;
  nome: string;
  tipo: string;
  combustivel?: string;
  potencia_kw?: number;
  situacao?: string;
  latitude: number;
  longitude: number;
  uf?: string;
  municipio?: string;
}

// Layer 3 — Infraestrutura Lógica
export interface Datacenter {
  id: number;
  nome: string;
  cidade?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
  org?: string;
  website?: string;
  redes?: number;
}

// Layer 7 — Governança
export interface PoliticaGov {
  id: string;
  nome: string;
  tipo: "politica" | "patente" | "regulacao"; // distingue o símbolo
  orgao?: string;
  area?: string;
  ano?: string;
  latitude?: number;
  longitude?: number; // opcional — políticas nacionais ficam no centroide da capital federal
  relevancia?: "Alta" | "Média" | "Baixa";
  link?: string;
}

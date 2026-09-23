// Tipos da API pública TeleGeography Submarine Cable Map v3.

export interface LandingPoint {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  country: string;
  cables?: { cable_id: string; cable_name: string }[];
}

export interface Cable {
  id: string;
  name: string;
  color?: string;
  feature_id?: string;
  rfs?: string;
  cable_length?: string;
  owners?: { name: string }[];
  landing_points?: string[];
}

export interface DadosCabos {
  cables: Cable[];
  points: LandingPoint[];
}

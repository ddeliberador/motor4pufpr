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
  landing_point_ids?: string[];
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

// Layer 2b — Antenas 4G/5G (OpenCelliD)
export interface AntenaERB {
  id: string;
  lat: number;
  lon: number;
  /** LTE = 4G, NR = 5G, UMTS = 3G */
  radio: string;
  mcc: string;
  /** operadora (MNC) */
  net: string;
  operadora?: string;
  uf?: string;
  municipio?: string;
  /** origem: dump OpenCelliD (grade 0,1°) ou ERBs licenciadas ANATEL (centroide municipal) */
  fonte?: "opencellid" | "anatel";
  /** nº de células (OpenCelliD) ou de estações licenciadas (ANATEL) no ponto */
  celulas?: number;
  /** raio estimado de cobertura em metros */
  range?: number;
}

// Layer 2c — Backhaul por município (ANATEL dados abertos)
export interface BackhaulMunicipio {
  municipio: string;
  uf: string;
  latitude: number;
  longitude: number;
  /** true = backhaul por fibra óptica; false = outros meios (rádio/satélite) */
  temBackhaul: boolean;
  tipo?: string;
}

// Enriquecimento por Layer (4, 5, 6, 7) — indexado pelo id do ator no Mapa
export interface ModeloHF {
  id: string;
  author: string;
  downloads: number;
  tarefa: string; // pipeline_tag
  likes: number;
}

/** Contrato PNCP cujo objeto cita IA. O ator é vinculado como órgão contratante. */
export interface ContratoIA {
  cnpj: string;
  fornecedor: string;
  valor: number;
  objeto: string;
  dataVigencia?: string;
  url?: string;
}

export interface PatenteINPI {
  numero: string;
  titulo: string;
  ipc: string;
  depositante: string;
  ano: string;
}

export interface LayerVinculos {
  l4?: { modelos: ModeloHF[] };
  l5?: { contratos: ContratoIA[] };
  l6?: { artigos: number; citacoes: number; fonte: string };
  l7?: { patentes: PatenteINPI[]; politicas: string[] };
}

export type EnriquecimentoLayers = Record<string, LayerVinculos>;

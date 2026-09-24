// Geocodificação de municípios brasileiros (QLD-02) via kelvins/Municipios-Brasileiros.
// Cache em memória — carregado uma vez por sessão. Chave inclui UF para evitar homônimos
// (ex.: "Santa Luzia" existe em 5 estados); sem UF, só resolve nomes únicos.

type Coord = { lat: number; lon: number };

const CSV_URL =
  "https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/csv/municipios.csv";

const UF_POR_CODIGO: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

const normalizar = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

let porNomeUf: Map<string, Coord> | null = null;
let porNome: Map<string, Coord | null> | null = null; // null = nome ambíguo
let carregando: Promise<void> | null = null;

async function carregarCache(): Promise<void> {
  if (porNomeUf) return;
  if (carregando) return carregando;
  carregando = (async () => {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`Municípios (kelvins): HTTP ${res.status}`);
    const linhas = (await res.text()).trim().split("\n").slice(1);
    const mUf = new Map<string, Coord>();
    const mNome = new Map<string, Coord | null>();
    for (const linha of linhas) {
      const [, nome, latitude, longitude, , codigoUf] = linha.split(",");
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!nome || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const chave = normalizar(nome);
      const uf = UF_POR_CODIGO[codigoUf?.trim()];
      const coord = { lat, lon };
      if (uf) mUf.set(`${chave}|${uf}`, coord);
      mNome.set(chave, mNome.has(chave) ? null : coord);
    }
    porNomeUf = mUf;
    porNome = mNome;
  })();
  try {
    await carregando;
  } catch (e) {
    carregando = null;
    console.error("geocodeMunicipio: falha ao carregar CSV de municípios", e);
    throw e;
  }
}

function resolver(nome: string, uf?: string): Coord | null {
  const chave = normalizar(nome);
  if (uf) {
    const c = porNomeUf?.get(`${chave}|${uf.trim().toUpperCase()}`);
    if (c) return c;
  }
  return porNome?.get(chave) ?? null;
}

/** Retorna lat/lon de um município pelo nome (UF recomendada para desambiguar). */
export async function geocodeMunicipio(nome: string, uf?: string): Promise<Coord | null> {
  await carregarCache();
  return resolver(nome, uf);
}

/** Preenche latitude/longitude em itens que têm `municipio` (e opcionalmente `uf`) sem coordenada. */
export async function geocodeLote<
  T extends { municipio?: string; uf?: string; latitude?: number | null; longitude?: number | null }
>(items: T[]): Promise<T[]> {
  await carregarCache();
  return items.map((item) => {
    if (Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && item.latitude && item.longitude) return item;
    if (!item.municipio) return item;
    const coord = resolver(item.municipio, item.uf);
    return coord ? { ...item, latitude: coord.lat, longitude: coord.lon } : item;
  });
}

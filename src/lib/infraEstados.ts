// Cenário 1 · agregações por UF das três camadas de infraestrutura (L1 energia, L2 física, L3 lógica).

export const TIPOS_USINA = [
  { sigla: "UHE", nome: "Hidrelétrica", renovavel: true, cor: "hsl(205 70% 45%)" },
  { sigla: "PCH", nome: "Pequena central hidrelétrica", renovavel: true, cor: "hsl(195 60% 60%)" },
  { sigla: "CGH", nome: "Central geradora hidrelétrica (micro)", renovavel: true, cor: "hsl(185 45% 72%)" },
  { sigla: "EOL", nome: "Eólica", renovavel: true, cor: "hsl(150 45% 45%)" },
  { sigla: "UFV", nome: "Solar fotovoltaica", renovavel: true, cor: "hsl(45 85% 55%)" },
  { sigla: "UTE", nome: "Termelétrica", renovavel: false, cor: "hsl(15 60% 50%)" },
  { sigla: "UTN", nome: "Nuclear", renovavel: false, cor: "hsl(280 30% 50%)" },
] as const;
export type SiglaUsina = (typeof TIPOS_USINA)[number]["sigla"];
export const RENOVAVEIS = new Set<string>(TIPOS_USINA.filter((t) => t.renovavel).map((t) => t.sigla));

export interface Usina { nome: string; tipo: string; uf: string; municipio: string; potencia_kw: number }
export interface EnergiaUF { uf: string; total_mw: number; renovavel_mw: number; pct_renovavel: number; por_tipo: Record<string, number> }

export function agregarEnergia(usinas: Usina[]): EnergiaUF[] {
  const m = new Map<string, EnergiaUF>();
  for (const u of usinas) {
    if (!u.uf || !(u.potencia_kw > 0)) continue;
    const mw = u.potencia_kw / 1000;
    const g = m.get(u.uf) ?? { uf: u.uf, total_mw: 0, renovavel_mw: 0, pct_renovavel: 0, por_tipo: {} };
    g.total_mw += mw;
    if (RENOVAVEIS.has(u.tipo)) g.renovavel_mw += mw;
    g.por_tipo[u.tipo] = (g.por_tipo[u.tipo] ?? 0) + mw;
    m.set(u.uf, g);
  }
  return [...m.values()]
    .map((g) => ({ ...g, pct_renovavel: g.total_mw ? (100 * g.renovavel_mw) / g.total_mw : 0 }))
    .sort((a, b) => b.total_mw - a.total_mw);
}

// ---------- ponto-em-polígono para atribuir pontos de aterragem à UF ----------
type Anel = number[][];
export interface FeatureUF { uf: string; poligonos: Anel[][] }

export function featuresDoGeojson(g: { features: { properties: { sigla: string }; geometry: { type: string; coordinates: unknown } }[] }): FeatureUF[] {
  return g.features.map((f) => ({
    uf: f.properties.sigla,
    poligonos: f.geometry.type === "Polygon" ? [f.geometry.coordinates as Anel[]] : (f.geometry.coordinates as Anel[][]),
  }));
}

function dentroDoAnel(lon: number, lat: number, anel: Anel) {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i], [xj, yj] = anel[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** UF cuja geometria contém o ponto; pontos na linha da costa caem fora do contorno simplificado — usa-se então a UF de vértice mais próximo (até ~0,5°). */
export function ufDoPonto(lon: number, lat: number, feats: FeatureUF[]): { uf: string; aproximado: boolean } | null {
  for (const f of feats)
    for (const p of f.poligonos)
      if (dentroDoAnel(lon, lat, p[0]) && !p.slice(1).some((h) => dentroDoAnel(lon, lat, h))) return { uf: f.uf, aproximado: false };
  let melhor: string | null = null, d2 = 0.25;
  for (const f of feats) for (const p of f.poligonos) for (const [x, y] of p[0]) {
    const d = (x - lon) ** 2 + (y - lat) ** 2;
    if (d < d2) { d2 = d; melhor = f.uf; }
  }
  return melhor ? { uf: melhor, aproximado: true } : null;
}

export interface Aterragem { id: string; nome: string; uf: string; cabos: number; aproximado: boolean }

export function aterragensBrasil(
  d: { cables: { landing_point_ids?: string[] }[]; points: { id: string; name: string; latitude: number; longitude: number }[] },
  feats: FeatureUF[],
): Aterragem[] {
  const cont = new Map<string, number>();
  for (const c of d.cables) for (const id of new Set(c.landing_point_ids ?? [])) cont.set(id, (cont.get(id) ?? 0) + 1);
  return d.points.filter((p) => p.id.endsWith("-brazil") && (cont.get(p.id) ?? 0) > 0).flatMap((p) => {
    const r = ufDoPonto(p.longitude, p.latitude, feats);
    return r ? [{ id: p.id, nome: p.name.replace(/, Brazil$/, ""), uf: r.uf, cabos: cont.get(p.id) ?? 0, aproximado: r.aproximado }] : [];
  }).sort((a, b) => b.cabos - a.cabos || a.nome.localeCompare(b.nome));
}

export const fmtMw = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
export const fmtGw = (v: number) => (v / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtPct = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
export const listaPt = (xs: string[]) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`;

// ── Balanço energético (EPE) ──
export const SITUACOES_ENERGIA = ["Exporta energia", "Perto do equilíbrio", "Depende de energia de outros estados"] as const;
export const corSituacao = (s: string | null | undefined) =>
  s === "Exporta energia" ? "hsl(150 45% 42%)" : s === "Perto do equilíbrio" ? "hsl(45 70% 55%)" : s === "Depende de energia de outros estados" ? "hsl(15 60% 52%)" : "hsl(var(--muted))";
export const fmtGwh = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
/** Queda de MMGD acima de 50% em um ano: provável erro na planilha da fonte. */
export const mmgdQuedaAtipica = (atual: number | null | undefined, anterior: number | null | undefined) =>
  atual != null && anterior != null && anterior > 0 && atual < anterior * 0.5;
/** Razão geração/consumo em % (1,37 → 137). */
export const razaoPct = (r: number) => Math.round(r * 100);

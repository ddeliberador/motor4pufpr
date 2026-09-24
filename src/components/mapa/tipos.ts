// Categorização dos tipos brutos de research_locations em categorias exibíveis
// no mapa, cada uma com seu próprio ícone. Módulo único: mapa, legenda e filtro
// consomem daqui.

// Ícones: Google Material Symbols (fonte carregada no index.html).
// Cada categoria guarda o NOME do glifo Material, renderizado como
// <span className="material-symbols-outlined">{icon}</span>.

export type CategoriaKey =
  | "universidade"
  | "instituto"
  | "laboratorio"
  | "startup"
  | "supercomputacao"
  | "embrapii"
  | "habitat"
  | "energia"
  | "datacenter"
  | "backhaul"
  | "outro";

export interface Categoria {
  key: CategoriaKey;
  label: string;
  /** Nome do glifo do Google Material Symbols (ex.: "school"). */
  icon: string;
  /** classe de cor (token semântico) para o ícone e legenda */
  cor: string;
}

export const CATEGORIAS: Categoria[] = [
  { key: "universidade", label: "Universidade / IES", icon: "school", cor: "text-primary" },
  { key: "instituto", label: "Instituto de pesquisa / ICT", icon: "account_balance", cor: "text-sky-500" },
  { key: "laboratorio", label: "Laboratório", icon: "science", cor: "text-violet-500" },
  { key: "startup", label: "Startup / empresa", icon: "rocket_launch", cor: "text-amber-500" },
  { key: "supercomputacao", label: "Centro de supercomputação", icon: "memory", cor: "text-cyan-500" },
  { key: "embrapii", label: "Unidade EMBRAPII / NIT", icon: "factory", cor: "text-emerald-500" },
  { key: "habitat", label: "Incubadora / parque / hub", icon: "hub", cor: "text-rose-500" },
  { key: "energia", label: "Usina de energia (ANEEL)", icon: "bolt", cor: "text-pink-500" },
  { key: "datacenter", label: "Datacenter (PeeringDB)", icon: "dns", cor: "text-yellow-500" },
  { key: "backhaul", label: "Backhaul municipal (ANATEL)", icon: "cell_tower", cor: "text-amber-500" },
  { key: "outro", label: "Não classificado", icon: "place", cor: "text-muted-foreground" },
];

export const CATEGORIA_MAP: Record<CategoriaKey, Categoria> = CATEGORIAS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c }),
  {} as Record<CategoriaKey, Categoria>,
);

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Converte o texto livre da coluna `tipo` numa das categorias do mapa. */
export function categorizar(tipo: string | null | undefined): CategoriaKey {
  const t = norm(tipo || "");
  if (!t) return "outro";
  if (t.includes("datacenter") || t.includes("data center")) return "datacenter";
  if (t.includes("backhaul")) return "backhaul";
  if (t.includes("usina") || t.includes("central geradora")) return "energia";
  if (t.includes("startup") || t.includes("empresa")) return "startup";
  if (t.includes("supercomput")) return "supercomputacao";
  if (t.includes("embrapii") || t.includes("nit")) return "embrapii";
  if (t.includes("universidade") || t.includes("ies") || t.includes("ensino")) return "universidade";
  if (t.includes("incubadora") || t.includes("parque") || t.includes("hub")) return "habitat";
  if (t.includes("laborator")) return "laboratorio";
  if (t.includes("instituto") || t.includes("ict") || t.includes("inct") || t.includes("centro"))
    return "instituto";
  return "outro";
}

/** Rótulo legível para cada base de origem (`fonte`). */
export const FONTE_CURTA: Record<string, string> = {
  openalex: "OpenAlex",
  embrapii: "EMBRAPII",
  inep_censo_superior: "INEP — Censo Superior",
  mcti_formict: "MCTI / FORMICT",
  sinapad: "SINAPAD",
  lisp_brasil_mapeamento: "LISP Brasil",
  abstartups_2025: "StartupBase / ABStartups",
  otd_cgee: "Observatório CGEE/MCTI",
  aneel_siga: "ANEEL — SIGA (usinas)",
  peeringdb: "PeeringDB (datacenters)",
  anatel_backhaul: "ANATEL — Backhaul municipal",
};

export const fonteLabel = (f: string) => FONTE_CURTA[f] || f;

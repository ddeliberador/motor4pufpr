// Camada permanente de locais de pesquisa (research_locations).
// Regra: TODA exportação carrega obrigatoriamente `fonte` e `fonte_url` em cada linha.

import { safeSupabase } from "@/lib/supabaseClient";

export interface ResearchLocation {
  id: string;
  nome: string;
  tipo: string;
  uf: string | null;
  municipio: string | null;
  latitude: number | null;
  longitude: number | null;
  fonte: string;
  fonte_url: string;
  cnpj: string | null;
  data_coleta: string;
}

export const FONTE_LABEL: Record<string, string> = {
  openalex: "OpenAlex (registro ROR da instituição)",
  embrapii: "EMBRAPII — rede oficial de unidades",
  inep_censo_superior: "INEP — Censo da Educação Superior",
  mcti_formict: "MCTI — FORMICT (lista de ICTs não respondentes, parcial)",
  sinapad: "SINAPAD — centros de supercomputação (coleta manual)",
  lisp_brasil_mapeamento:
    "LISP Brasil Mapeamento (meuteste.tech) — coleta manual, fonte não institucional",
  otd_cgee:
    "OTD — Observatório de Tecnologias Digitais (CGEE/MCTI), otd.cgee.org.br/laboratorios — coleta manual",
};

/** Colunas exportadas. `fonte` e `fonte_url` nunca podem ser omitidas. */
export const EXPORT_COLUMNS = [
  "nome",
  "tipo",
  "uf",
  "municipio",
  "latitude",
  "longitude",
  "cnpj",
  "data_coleta",
  "fonte",
  "fonte_url",
] as const;

export async function fetchResearchLocations(
  filtros: { uf?: string | null; fonte?: string | null; tipo?: string | null } = {},
): Promise<ResearchLocation[]> {
  const client = safeSupabase;
  let q = client
    .from("research_locations")
    .select("id,nome,tipo,uf,municipio,latitude,longitude,fonte,fonte_url,cnpj,data_coleta")
    .order("nome", { ascending: true })
    .limit(5000);
  if (filtros.uf) q = q.eq("uf", filtros.uf);
  if (filtros.fonte) q = q.eq("fonte", filtros.fonte);
  if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ResearchLocation[];
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV com fonte e fonte_url em toda linha. */
export function toCsv(rows: ResearchLocation[]): string {
  const head = EXPORT_COLUMNS.join(";");
  const body = rows.map((r) =>
    EXPORT_COLUMNS.map((c) => csvCell((r as unknown as Record<string, unknown>)[c])).join(";"),
  );
  return [head, ...body].join("\n");
}

/** JSON com fonte e fonte_url em toda linha. */
export function toJson(rows: ResearchLocation[]): string {
  return JSON.stringify(
    rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const c of EXPORT_COLUMNS) o[c] = (r as unknown as Record<string, unknown>)[c];
      return o;
    }),
    null,
    2,
  );
}

export function downloadLocations(rows: ResearchLocation[], formato: "csv" | "json" = "csv") {
  const conteudo = formato === "csv" ? toCsv(rows) : toJson(rows);
  const blob = new Blob([conteudo], {
    type: formato === "csv" ? "text/csv;charset=utf-8" : "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `locais-pesquisa-${new Date().toISOString().slice(0, 10)}.${formato}`;
  a.click();
  URL.revokeObjectURL(url);
}

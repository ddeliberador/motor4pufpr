// Definição dos filtros granulares por base do Mapa da Inovação.
// Cada filtro declara o controle adequado ao tipo de informação:
//   check    = caixas de seleção (múltipla escolha, lista curta)
//   dropdown = lista suspensa com busca (lista longa, múltipla escolha)
//   radio    = opção única (escolhas mutuamente exclusivas)
// Nenhum valor é inventado: tudo sai de research_locations ou de location_enrichment.

import type { ResearchLocation } from "@/lib/researchLocations";
import { listaDe, textoDe, type Enriquecimento } from "@/lib/locationEnrichment";

export type Controle = "check" | "dropdown" | "radio";

export interface FiltroDef {
  id: string;
  label: string;
  /** Base de origem a que o filtro pertence; null = vale para todas. */
  fonte: string | null;
  controle: Controle;
  /** Valores reais do registro para esse filtro (vazio = não se aplica). */
  valores: (l: ResearchLocation, e: Enriquecimento) => string[];
  ajuda?: string;
}

const meta = (l: ResearchLocation, k: string) => textoDe(l.raw_metadata?.[k]);

const OPENALEX_TIPO: Record<string, string> = {
  education: "Universidade / instituição de ensino",
  company: "Empresa",
  nonprofit: "Organização sem fins lucrativos",
  government: "Órgão de governo",
  healthcare: "Hospital / saúde",
  facility: "Instalação de pesquisa",
  archive: "Arquivo / biblioteca",
  funder: "Agência de fomento",
  other: "Outro",
};

const faixaAno = (ano: string): string[] => {
  const n = Number(ano);
  if (!Number.isFinite(n) || n < 1900) return [];
  if (n <= 2015) return ["até 2015"];
  if (n <= 2019) return ["2016 a 2019"];
  if (n <= 2022) return ["2020 a 2022"];
  return ["2023 ou depois"];
};

export const FILTROS: FiltroDef[] = [
  // ---------- StartupBase / ABStartups ----------
  {
    id: "startup_setor",
    label: "Setor de atuação (startups)",
    fonte: "abstartups_2025",
    controle: "dropdown",
    valores: (l) => meta(l, "segmento"),
  },

  // ---------- OpenAlex ----------
  {
    id: "oa_tipo",
    label: "Tipo de instituição (OpenAlex)",
    fonte: "openalex",
    controle: "check",
    valores: (l) => {
      const t = l.raw_metadata?.type;
      return typeof t === "string" ? [OPENALEX_TIPO[t] || t] : [];
    },
  },
  {
    id: "oa_dominio",
    label: "Domínio do conhecimento",
    fonte: "openalex",
    controle: "check",
    valores: (_l, e) => listaDe(e.dominios),
  },
  {
    id: "oa_campo",
    label: "Campo",
    fonte: "openalex",
    controle: "dropdown",
    valores: (_l, e) => listaDe(e.campos),
  },
  {
    id: "oa_subcampo",
    label: "Subcampo",
    fonte: "openalex",
    controle: "dropdown",
    valores: (_l, e) => listaDe(e.subcampos),
  },
  {
    id: "oa_topico",
    label: "Tópico de pesquisa",
    fonte: "openalex",
    controle: "dropdown",
    valores: (_l, e) => listaDe(e.topicos),
  },

  // ---------- Observatório CGEE / MCTI ----------
  {
    id: "otd_tipo",
    label: "Tipo de unidade (Observatório CGEE)",
    fonte: "otd_cgee",
    controle: "check",
    valores: (l) => [l.tipo].filter(Boolean),
  },

  // ---------- MCTI / FORMICT ----------
  {
    id: "formict_tipo",
    label: "Tipo de ICT",
    fonte: "mcti_formict",
    controle: "check",
    valores: (_l, e) => textoDe(e.tipo_ict),
    ajuda: "Classificação a partir da razão social registrada no CNPJ.",
  },
  {
    id: "formict_natureza",
    label: "Natureza administrativa",
    fonte: "mcti_formict",
    controle: "check",
    valores: (_l, e) => textoDe(e.natureza_administrativa),
    ajuda: "Derivada da natureza jurídica oficial do CNPJ (Receita Federal).",
  },
  {
    id: "formict_nj",
    label: "Natureza jurídica (Receita Federal)",
    fonte: "mcti_formict",
    controle: "dropdown",
    valores: (_l, e) => textoDe(e.natureza_juridica),
  },

  // ---------- LISP Brasil ----------
  {
    id: "lisp_poder",
    label: "Poder / esfera",
    fonte: "lisp_brasil_mapeamento",
    controle: "check",
    valores: (l) => meta(l, "vinculo"),
  },
  {
    id: "lisp_nivel",
    label: "Nível federativo",
    fonte: "lisp_brasil_mapeamento",
    controle: "check",
    valores: (l) => meta(l, "nivel"),
  },
  {
    id: "lisp_ano",
    label: "Ano de criação",
    fonte: "lisp_brasil_mapeamento",
    controle: "radio",
    valores: (l) => meta(l, "ano_criacao").flatMap(faixaAno),
  },

  // ---------- EMBRAPII ----------
  {
    id: "emb_tipo",
    label: "Tipo de instituição (EMBRAPII)",
    fonte: "embrapii",
    controle: "check",
    valores: (l) => meta(l, "institution_type"),
  },
  {
    id: "emb_competencia",
    label: "Competência tecnológica",
    fonte: "embrapii",
    controle: "dropdown",
    valores: (_l, e) => listaDe(e.competencias),
  },
  {
    id: "emb_linha",
    label: "Linha de atuação",
    fonte: "embrapii",
    controle: "dropdown",
    valores: (_l, e) => listaDe(e.linhas_acao),
  },

  // ---------- SINAPAD ----------
  {
    id: "sinapad_sede",
    label: "Instituição-sede",
    fonte: "sinapad",
    controle: "dropdown",
    valores: (l) => meta(l, "sede"),
  },
  {
    id: "sinapad_situacao",
    label: "Situação do centro",
    fonte: "sinapad",
    controle: "radio",
    valores: (l) =>
      typeof l.raw_metadata?.ativo === "boolean"
        ? [l.raw_metadata.ativo ? "Ativo" : "Inativo"]
        : [],
  },

  // ---------- Geral ----------
  {
    id: "municipio",
    label: "Município",
    fonte: null,
    controle: "dropdown",
    valores: (l) => (l.municipio ? [l.municipio] : []),
  },
];

export type SelecaoFiltros = Record<string, Set<string>>;

/** Aplica todos os filtros granulares selecionados a um registro. */
export function passaFiltros(
  l: ResearchLocation,
  e: Enriquecimento,
  sel: SelecaoFiltros,
): boolean {
  for (const def of FILTROS) {
    const escolhidos = sel[def.id];
    if (!escolhidos || escolhidos.size === 0) continue;
    const vals = def.valores(l, e);
    if (!vals.some((v) => escolhidos.has(v))) return false;
  }
  return true;
}

export function resumoFiltros(sel: SelecaoFiltros): string[] {
  const out: string[] = [];
  for (const def of FILTROS) {
    const s = sel[def.id];
    if (s && s.size) out.push(`${def.label.toLowerCase()}: ${[...s].join(", ")}`);
  }
  return out;
}

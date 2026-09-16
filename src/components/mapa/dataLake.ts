// Data Lake C,T&I — esquema canônico do Mapa da Inovação.
//
// As 7 bases (OpenAlex, ABStartups, Observatório CGEE, FORMICT/MCTI, LISP,
// EMBRAPII, SINAPAD) descrevem a mesma entidade — uma organização de C,T&I —
// com vocabulários diferentes. Aqui cada registro é traduzido para eixos
// comuns, de modo que uma seleção possa cruzar bases distintas.
//
// Regra de leitura: dentro de um eixo as opções somam (OU); entre eixos
// diferentes o resultado é a INTERSEÇÃO (E). Nada é inventado: todo valor sai
// de research_locations.raw_metadata ou de location_enrichment.

import type { ResearchLocation } from "@/lib/researchLocations";
import { listaDe, type Enriquecimento } from "@/lib/locationEnrichment";

export type Controle = "check" | "dropdown";

export interface OpcaoEixo {
  key: string;
  label: string;
  descricao?: string;
  /** classe de cor do ponto indicador */
  cor?: string;
}

export interface EixoDef {
  id: keyof CanonicoMulti | keyof CanonicoUnico;
  ordem: number;
  titulo: string;
  descricao: string;
  controle: Controle;
  opcoes: OpcaoEixo[];
  /** true = o registro pode ter vários valores nesse eixo */
  multi: boolean;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ---------------------------------------------------------------- 1. temas

interface TemaDef extends OpcaoEixo {
  termos: string[];
}

const TEMAS: TemaDef[] = [
  {
    key: "saude",
    label: "Saúde & Biotec",
    descricao: "Saúde, Biomedicina & Terapias Avançadas",
    cor: "text-rose-500",
    termos: [
      "saude", "health", "medic", "medicine", "clinic", "hospital", "farmac",
      "pharma", "biotec", "biotech", "biomedic", "oncolog", "imunolog", "cancer",
      "enferm", "odontolog", "genom", "terapia", "vacina", "healthtech",
      "nursing", "dentistry", "veterin", "neuro", "psiqui", "epidem", "biolog",
    ],
  },
  {
    key: "agro",
    label: "Agro & Bioeconomia",
    descricao: "Agronegócio, Alimentos & Bioeconomia",
    cor: "text-green-600",
    termos: [
      "agro", "agri", "agrar", "aliment", "food", "florest", "forest", "solo",
      "soil", "pecuar", "zootec", "aquicult", "pesca", "fisher", "bioecon",
      "biomassa", "sement", "irriga", "agtech", "foodtech", "plant", "crop",
      "veterinar", "cana", "graos", "soja",
    ],
  },
  {
    key: "ti",
    label: "TI & IA Deep Tech",
    descricao: "TI, Inteligência Artificial & Deep Tech",
    cor: "text-blue-600",
    termos: [
      "computac", "computer", "software", "inteligencia artificial",
      "artificial intelligence", "machine learning", "aprendizado de maquina",
      "dados", "data", "algoritm", "ciberseg", "cyber", "seguranca da informacao",
      "quantic", "quantum", "blockchain", "internet das coisas", "iot",
      "telecomunic", "5g", "6g", "redes", "cloud", "nuvem", "hpc",
      "supercomput", "processamento de alto desempenho", "deep tech",
      "visao computacional", "linguagem natural", "robotica", "robotic",
      "eletronica", "semicondut", "hardware", "digital",
    ],
  },
  {
    key: "energia",
    label: "Energia & Clima",
    descricao: "Energia Limpa, Clima & Transição Ecológica",
    cor: "text-amber-500",
    termos: [
      "energ", "energy", "solar", "fotovolt", "eolic", "wind", "hidrogenio",
      "hydrogen", "biocombust", "biofuel", "etanol", "petroleo", "oil", "gas",
      "clima", "climate", "carbono", "carbon", "ambient", "environment",
      "sustentab", "sustainab", "smart grid", "eletric", "bateria", "battery",
      "nuclear", "geolog", "recurso natural", "cleantech",
    ],
  },
  {
    key: "industria",
    label: "Indústria 4.0 & Materiais",
    descricao: "Indústria 4.0, Manufatura & Novos Materiais",
    cor: "text-purple-600",
    termos: [
      "industri", "manufat", "manufactur", "materia", "material", "metalurg",
      "mecanic", "mechanic", "quimic", "chemi", "polimer", "polymer",
      "compos", "nanotec", "nano", "fisica", "physic", "aeroespac", "aerospace",
      "automotiv", "naval", "minera", "mining", "soldagem", "usinagem",
      "impressao 3d", "additive", "engenhar", "engineering",
    ],
  },
  {
    key: "cidades",
    label: "Cidades & Mobilidade",
    descricao: "Cidades Inteligentes, Mobilidade & Saneamento",
    cor: "text-cyan-600",
    termos: [
      "cidade", "urban", "mobilidade", "mobility", "transport", "logistic",
      "saneament", "agua", "water", "residuo", "waste", "arquitet",
      "construc", "civil", "smart city", "habita", "urbanism", "govtech",
      "seguranca publica", "mobiliario",
    ],
  },
  {
    key: "social",
    label: "Sociedade & Políticas Públicas",
    descricao: "Ciências Sociais, Educação, Gestão & Políticas Públicas",
    cor: "text-slate-500",
    termos: [
      "social", "sociolog", "politica", "policy", "public administration",
      "administracao publica", "gestao publica", "educac", "education",
      "ensino", "pedagog", "direito", "law", "juridic", "humanidade",
      "humanities", "historia", "history", "filosof", "antropolog",
      "comunicac", "communication", "arte", "art", "cultura", "psicolog",
      "governanca", "inovacao aberta", "cocriacao", "participac",
    ],
  },
  {
    key: "financas",
    label: "Finanças & Serviços Digitais",
    descricao: "Finanças, Mercado, Varejo & Serviços Digitais",
    cor: "text-emerald-600",
    termos: [
      "financ", "finance", "fintech", "banco", "bank", "credit", "seguro",
      "insurtech", "econom", "contab", "account", "negocio", "business",
      "management", "marketing", "varejo", "retail", "retailtech", "ecommerce",
      "comercio", "logtech", "hrtech", "martech", "legaltech", "turismo",
      "imobili", "proptech", "esporte", "sporttech", "midia", "media",
    ],
  },
];

export const TEMA_LABEL: Record<string, string> = Object.fromEntries(
  TEMAS.map((t) => [t.key, t.label]),
);

// -------------------------------------------- 2. natureza institucional

const NATUREZAS: OpcaoEixo[] = [
  { key: "academia", label: "Universidade / instituição de ensino", cor: "text-blue-600" },
  { key: "ict", label: "Instituto de pesquisa / ICT", cor: "text-indigo-600" },
  { key: "empresa", label: "Empresa / startup", cor: "text-emerald-600" },
  { key: "governo", label: "Órgão público / governo", cor: "text-amber-600" },
  { key: "terceiro", label: "Terceiro setor / associação", cor: "text-rose-500" },
  { key: "infra", label: "Infraestrutura laboratorial", cor: "text-cyan-600" },
  { key: "outro", label: "Não classificado", cor: "text-muted-foreground" },
];

// ------------------------------------------- 3. função no ecossistema

const FUNCOES: OpcaoEixo[] = [
  {
    key: "conhecimento",
    label: "Geração de conhecimento",
    descricao: "Produção científica indexada (OpenAlex)",
  },
  {
    key: "transferencia",
    label: "Transferência de tecnologia",
    descricao: "NITs FORMICT e unidades EMBRAPII",
  },
  {
    key: "empreendedorismo",
    label: "Empreendedorismo de base tecnológica",
    descricao: "Startups mapeadas pela ABStartups",
  },
  {
    key: "infraestrutura",
    label: "Infraestrutura de pesquisa",
    descricao: "Centros de supercomputação e laboratórios multiusuário",
  },
  {
    key: "governanca",
    label: "Inovação no setor público",
    descricao: "Laboratórios de inovação e serviços públicos (LISP)",
  },
];

// ------------------------------------------------------- 4. território

export const REGIAO_POR_UF: Record<string, string> = {
  AC: "Norte", AM: "Norte", AP: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

const REGIOES: OpcaoEixo[] = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"].map(
  (r) => ({ key: r, label: r }),
);

// --------------------------------------------------- 5. cobertura do dado

const COBERTURAS: OpcaoEixo[] = [
  { key: "geo", label: "Com coordenada geográfica" },
  { key: "cnpj", label: "Com CNPJ identificado" },
  { key: "tema", label: "Com classificação temática" },
  { key: "detalhe", label: "Com detalhamento coletado" },
];

// ------------------------------------------------------------- canônico

export interface CanonicoMulti {
  tema: string[];
  cobertura: string[];
}
export interface CanonicoUnico {
  natureza: string;
  funcao: string;
  regiao: string;
}
export type Canonico = CanonicoMulti & CanonicoUnico;

const FUNCAO_POR_FONTE: Record<string, string> = {
  openalex: "conhecimento",
  abstartups_2025: "empreendedorismo",
  mcti_formict: "transferencia",
  embrapii: "transferencia",
  sinapad: "infraestrutura",
  otd_cgee: "infraestrutura",
  lisp_brasil_mapeamento: "governanca",
};

function naturezaDe(l: ResearchLocation, e: Enriquecimento): string {
  const t = norm(`${l.tipo} ${l.nome}`);
  const nat = norm(String(e.natureza_administrativa || e.tipo_ict || ""));
  if (l.fonte === "abstartups_2025") return "empresa";
  if (l.fonte === "lisp_brasil_mapeamento") return "governo";
  if (l.fonte === "sinapad") return "infra";
  if (/universidade|university|instituto federal|faculdade|ensino|educac|escola|college|school/.test(t))
    return "academia";
  if (/universidade|ensino/.test(nat)) return "academia";
  if (/laborator|lab\b|multiusuario|planta piloto|nucleo de ensaio/.test(t)) return "infra";
  if (/empresa|company|s\.a\.|ltda|senai|sesi|servico nacional/.test(t)) return "empresa";
  if (/associac|fundac|sem fins|nonprofit|ong\b|organizacao social/.test(`${t} ${nat}`))
    return "terceiro";
  if (/ministerio|secretaria|prefeitura|governo|agencia|government|conselho|tribunal|camara|senado/.test(t))
    return "governo";
  if (/instituto|centro de pesquisa|research|ict\b|embrapa|fiocruz|inpe|ipen|cnpem|nit\b|centro de tecnolog/.test(t))
    return "ict";
  if (/pesquisa|instituto/.test(nat)) return "ict";
  return "outro";
}

/** Corpo de texto usado na classificação temática. */
function corpusDe(l: ResearchLocation, e: Enriquecimento): string {
  const meta = l.raw_metadata || {};
  const partes: string[] = [l.nome, l.tipo];
  for (const k of ["segmento", "area", "areas", "tema", "institution_type", "vinculo"]) {
    const v = (meta as Record<string, unknown>)[k];
    if (typeof v === "string") partes.push(v);
    else if (Array.isArray(v)) partes.push(v.filter((x) => typeof x === "string").join(" "));
  }
  for (const k of ["dominios", "campos", "subcampos", "topicos", "competencias", "linhas_acao"]) {
    partes.push(listaDe(e[k]).join(" "));
  }
  for (const k of ["tipo_ict", "natureza_administrativa"]) {
    if (typeof e[k] === "string") partes.push(e[k] as string);
  }
  return norm(partes.join(" · "));
}

export function canonizar(l: ResearchLocation, e: Enriquecimento): Canonico {
  const corpus = corpusDe(l, e);
  const tema = TEMAS.filter((t) => t.termos.some((termo) => corpus.includes(termo))).map(
    (t) => t.key,
  );
  const cobertura: string[] = [];
  if (l.latitude != null && l.longitude != null) cobertura.push("geo");
  if (l.cnpj) cobertura.push("cnpj");
  if (tema.length) cobertura.push("tema");
  if (Object.keys(e).length) cobertura.push("detalhe");
  return {
    tema,
    cobertura,
    natureza: naturezaDe(l, e),
    funcao: FUNCAO_POR_FONTE[l.fonte] || "conhecimento",
    regiao: (l.uf && REGIAO_POR_UF[l.uf]) || "",
  };
}

export const EIXOS: EixoDef[] = [
  {
    id: "tema",
    ordem: 1,
    titulo: "Eixo temático transversal",
    descricao: "Áreas de conhecimento e verticais de mercado harmonizadas entre as 7 bases.",
    controle: "check",
    opcoes: TEMAS.map(({ key, label, descricao, cor }) => ({ key, label, descricao, cor })),
    multi: true,
  },
  {
    id: "natureza",
    ordem: 2,
    titulo: "Natureza institucional",
    descricao: "O que a entidade é, independentemente da base que a registrou.",
    controle: "check",
    opcoes: NATUREZAS,
    multi: false,
  },
  {
    id: "funcao",
    ordem: 3,
    titulo: "Função no ecossistema",
    descricao: "Papel exercido no sistema de C,T&I, derivado da base de origem.",
    controle: "check",
    opcoes: FUNCOES,
    multi: false,
  },
  {
    id: "regiao",
    ordem: 4,
    titulo: "Território",
    descricao: "Região do país segundo a divisão oficial do IBGE.",
    controle: "check",
    opcoes: REGIOES,
    multi: false,
  },
  {
    id: "cobertura",
    ordem: 5,
    titulo: "Cobertura do dado",
    descricao: "Qualidade do registro no cruzamento — útil para avaliar lacunas.",
    controle: "check",
    opcoes: COBERTURAS,
    multi: true,
  },
];

export type SelecaoLake = Record<string, Set<string>>;

export function valoresDoEixo(c: Canonico, eixo: EixoDef): string[] {
  const v = c[eixo.id as keyof Canonico];
  return Array.isArray(v) ? v : v ? [v as string] : [];
}

/** Interseção: todo eixo com seleção precisa casar (E); dentro do eixo, OU. */
export function passaLake(c: Canonico, sel: SelecaoLake): boolean {
  for (const eixo of EIXOS) {
    const escolhidos = sel[eixo.id as string];
    if (!escolhidos || escolhidos.size === 0) continue;
    if (!valoresDoEixo(c, eixo).some((v) => escolhidos.has(v))) return false;
  }
  return true;
}

export function resumoLake(sel: SelecaoLake): string[] {
  const out: string[] = [];
  for (const eixo of EIXOS) {
    const s = sel[eixo.id as string];
    if (!s || !s.size) continue;
    const labels = [...s].map(
      (k) => eixo.opcoes.find((o) => o.key === k)?.label || k,
    );
    out.push(`${eixo.titulo.toLowerCase()}: ${labels.join(", ")}`);
  }
  return out;
}

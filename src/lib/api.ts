/**
 * Motor da Inovação UFPR - API Client
 * Cliente para comunicação com o backend FastAPI
 */

// Configuração do ambiente
// Usa Railway em produção, localhost apenas em desenvolvimento local
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api/v1'
    : 'https://motor4pufpr-copy-production.up.railway.app/api/v1');

// Tipos de resposta da API
export interface OntologyMapping {
  query: string;
  cnpq_areas: Array<{ code: string; name: string; level?: number; match_type?: string }>;
  ipc_codes: Array<{ code: string; description: string; match_type?: string }>;
  ncm_codes: Array<{ code: string; description: string; match_type?: string }>;
  cnae_codes: Array<{ code: string; description: string; match_type?: string }>;
  search_terms: string[];
  confidence: number;
}

export interface ResearchGroup {
  id: string;
  name: string;
  institution: string;
  institution_acronym?: string;
  state: string;
  city?: string;
  area: string;
  sub_area?: string;
  leader?: string;
  researchers_count?: number;
  students_count?: number;
  year_created?: number;
  international_collaboration?: string;
  source: string;
}

export interface ScientificPaper {
  id: string;
  title: string;
  authors: Array<{ name: string; position?: string }>;
  institutions: string[];
  publication_year: number;
  journal?: string;
  doi?: string;
  citations_count: number;
  concepts: Array<{ name: string; score: number }>;
  is_open_access: boolean;
  url?: string;
}

export interface Patent {
  id: string;
  title: string;
  abstract?: string;
  applicants: string[];
  inventors: string[];
  filing_date?: string;
  publication_date?: string;
  grant_date?: string;
  ipc_codes: string[];
  cpc_codes: string[];
  status?: string;
  citations_count: number;
  cited_by_count: number;
  country: string;
  source: string;
  url?: string;
}

export interface TradeData {
  ncm: string;
  ncm_description: string;
  export_value_usd: number;
  export_quantity: number;
  export_countries: Array<{ country_code: string; country_name: string; value_usd: number }>;
  import_value_usd: number;
  import_quantity: number;
  import_countries: Array<{ country_code: string; country_name: string; value_usd: number }>;
  year: number;
  trade_balance: number;
}

export interface PublicInstrument {
  id?: string;
  name: string;
  organization: string;
  type: string;
  status: string;
  total_value?: number;
  min_value?: number;
  max_value?: number;
  eligible_entities: string[];
  eligible_areas: string[];
  opening_date?: string;
  closing_date?: string;
  url?: string;
}

export interface InternationalIncidence {
  country: string;
  country_code: string;
  flag_emoji: string;
  institutions_count: number;
  papers_count: number;
  patents_count: number;
  exports_to_brazil_usd: number;
  imports_from_brazil_usd: number;
  global_relevance: string;
}

export interface IndicatorValue {
  code: string;
  name: string;
  value: number;
  description: string;
  methodology?: string;
  level: string;
  interpretation: string;
}

export interface StructuralIndicators {
  c2t: IndicatorValue;
  gt: IndicatorValue;
  p2c: IndicatorValue;
  cd: IndicatorValue;
  ilt?: IndicatorValue;
}

export interface ScientificIncidence {
  research_groups: ResearchGroup[];
  papers: ScientificPaper[];
  total_groups: number;
  total_papers: number;
  total_researchers: number;
  by_state: Record<string, number>;
  by_institution: Record<string, number>;
}

export interface TechnologicalIncidence {
  patents: Patent[];
  total_patents: number;
  patents_by_year: Record<string, number>;
  patents_by_applicant_type: Record<string, number>;
  top_applicants: Array<{ name: string; count: number }>;
}

export interface ProductiveIncidence {
  trade_data: TradeData[];
  total_exports_usd: number;
  total_imports_usd: number;
  trade_balance: number;
  main_import_origins: Array<{ country_code: string; country_name: string; total_value: number }>;
  main_export_destinations: Array<{ country_code: string; country_name: string; total_value: number }>;
}

export interface InstitutionalIncidence {
  instruments: PublicInstrument[];
  historical_financing: Array<Record<string, unknown>>;
  total_available_value: number;
  instruments_by_type: Record<string, number>;
  instruments_by_organization: Record<string, number>;
}

export interface Scholarship {
  id: string;
  title: string;
  organization: string;
  country: string;
  level: string;
  value?: number;
  deadline?: string;
  description?: string;
  url?: string;
  is_international?: boolean;
  type?: string;
  institution?: string;
  name?: string;
  program?: string;
  field?: string;
  value_monthly?: number | string;
  value_yearly?: string;
  duration_months?: number;
}

export interface ScholarshipsData {
  source: string;
  brazil: Scholarship[];
  international: Scholarship[];
  all: Scholarship[];
  total: number;
  by_country: Record<string, number>;
  by_level: Record<string, number>;
}

export interface EducationInstitution {
  id: string;
  name: string;
  acronym?: string;
  city: string;
  state: string;
  category: string;
  courses_count: number;
  relevant_courses: string[];
  website?: string;
  type?: string;
  grade_enade?: number;
}

export interface EducationData {
  source: string;
  institutions: EducationInstitution[];
  courses: Array<Record<string, unknown>>;
  total_institutions: number;
  total_courses: number;
}

export interface GitHubProject {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  stars: number;
  forks: number;
  language?: string;
  topics: string[];
  license?: string;
  url: string;
  last_updated: string;
}

export interface GitHubProjectsData {
  source: string;
  projects: GitHubProject[];
  total: number;
  showing: number;
}

export interface IncidenceResult {
  query: string;
  ontology: OntologyMapping;
  scientific: ScientificIncidence;
  technological: TechnologicalIncidence;
  productive: ProductiveIncidence;
  institutional: InstitutionalIncidence;
  international: InternationalIncidence[];
  indicators: StructuralIndicators;
  scholarships?: ScholarshipsData;
  education?: EducationData;
  github_projects?: GitHubProjectsData;
  stats: {
    groups: number;
    papers: number;
    patents: number;
    instruments: number;
    companies: number;
    international: number;
    scholarships?: number;
    education_institutions?: number;
    github_projects?: number;
  };
  generated_at: string;
  processing_time_ms?: number;
  data_sources: string[];
}

export interface PublicCompany {
  nome: string;
  cnpj: string;
  codigo_cvm?: string;
  setor_cvm?: string;
  atividade?: string;
  situacao_emissor?: string;
  receita: number | null;
  ano_referencia: number | null;
  conta?: string | null;
  descricao_conta?: string | null;
  consolidado?: boolean | null;
  url?: string;
}

export interface PublicCompaniesResult {
  available: boolean;
  reason?: string;
  companies: PublicCompany[];
  total_matched?: number;
  with_revenue?: number;
  cnae_codes?: string[];
  cvm_sectors?: string[];
  ano_cadastro?: number | null;
  ano_dfp?: number | null;
  conta_receita?: string;
  partial_scope?: boolean;
  scope_note?: string;
  sources?: Array<{ name: string; url: string }>;
}

export interface SearchResponse {
  success: boolean;
  data?: IncidenceResult;
  error?: string;
  cached?: boolean;
}

// Cliente da API
class Motor4PApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Verifica saúde da API
   */
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    return this.request('/health');
  }

  /**
   * Busca incidência completa para um objeto tecnológico
   */
  async searchIncidence(
    query: string,
    options?: {
      includeInternational?: boolean;
      includePapers?: boolean;
      limit?: number;
    }
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      include_international: String(options?.includeInternational ?? true),
      include_papers: String(options?.includePapers ?? true),
      limit: String(options?.limit ?? 50),
    });

    return this.request(`/incidence/search?${params}`);
  }

  /**
   * Busca apenas mapeamento ontológico
   */
  async getOntology(query: string): Promise<{ success: boolean; data: OntologyMapping }> {
    return this.request(`/incidence/ontology?query=${encodeURIComponent(query)}`);
  }

  /**
   * Maiores companhias de capital aberto do setor (CVM), por CNAE.
   * Recorte parcial: apenas empresas de capital aberto.
   */
  async getPublicCompaniesByCnae(
    cnaeCodes: string[],
    limit = 10
  ): Promise<{ success: boolean; data?: PublicCompaniesResult; error?: string }> {
    const params = new URLSearchParams({ limit: String(limit) });
    cnaeCodes.forEach((code) => params.append("cnae", code));
    return this.request(`/companies/public-by-cnae?${params}`);
  }
}

// Instância singleton
export const api = new Motor4PApi();

// Função helper para verificar se o backend está disponível
export async function isBackendAvailable(): Promise<boolean> {
  try {
    await api.healthCheck();
    return true;
  } catch {
    return false;
  }
}

// Hook para usar com React Query (se necessário)
export const queryKeys = {
  health: ['health'],
  incidence: (query: string) => ['incidence', query],
  ontology: (query: string) => ['ontology', query],
};

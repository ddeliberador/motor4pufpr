/**
 * Tipos e hook principal de busca do Motor 4P
 * Arquitetura de 4 camadas analíticas com índices cruzados
 */
import { useState, useCallback } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";

// ===== Layer Types =====
export interface Paper {
  id: string;
  title: string;
  year: number;
  citations: number;
  authors: Array<{ name: string; institution: string; country: string }>;
  journal: string;
  is_open_access: boolean;
  url: string;
  concepts: string[];
}

export interface MacroIndicator {
  name: string;
  unit: string;
  value: number | null;
  date: string | null;
  variation: number | null;
  history: Array<{ date: string; value: number }>;
}

export interface IPEADataSeries {
  code: string;
  name: string;
  theme: string;
  source: string;
  frequency: string | null;
  values: Array<{ date: string; value: number }>;
  lastValue: number | null;
}

export interface PublicContract {
  object: string;
  organ: string;
  modality: string;
  value: number;
  status: string;
  date: string;
  uf: string;
  url: string;
}

export interface OfficialGazette {
  territory: string;
  state: string;
  date: string;
  excerpts: string[];
  url: string;
}

export interface GitHubRepo {
  name: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  updated: string;
  forks: number;
}

export interface Convenio {
  object: string;
  proponent: string;
  value: number;
  grantor: string;
  startDate: string;
  endDate: string;
  situation: string;
}

export interface SimpleDataset {
  title: string;
  description: string;
  url: string;
  organization?: string;
  formats?: string[];
  structured?: boolean;
}

export interface ConceptCount {
  name: string;
  count: number;
}

// ===== Strategic Index with layers_used =====
export interface StrategicIndex {
  value: number;
  label: string;
  description: string;
  formula: string;
  layers_used: string[];
  alert_level: "normal" | "warning" | "critical";
}

export interface StrategicIndices {
  gt: StrategicIndex;
  cd: StrategicIndex;
  aue: StrategicIndex;
  ei: StrategicIndex;
}

// ===== Layer-specific result types =====
export interface KnowledgeLayer {
  papers: Paper[];
  total_papers: number;
  institutions: Record<string, number>;
  resolved_institutions: Record<string, { canonical: string; count: number }>;
  international: Array<{ country_code: string; count: number }>;
  concepts: ConceptCount[];
  capes_datasets: SimpleDataset[];
  inep_datasets: SimpleDataset[];
  cnpq_datasets: SimpleDataset[];
  datasus_datasets: SimpleDataset[];
  basedosdados_datasets: SimpleDataset[];
  density: number;
  concentration: number;
  specialization: number;
  total_papers_global: number;
  sources: string[];
}

export interface TechnologyLayer {
  github_repos: GitHubRepo[];
  patent_datasets: SimpleDataset[];
  employment_datasets: SimpleDataset[];
  innovation_datasets: SimpleDataset[];
  cnpj_qsa_datasets: SimpleDataset[];
  transport_datasets: SimpleDataset[];
  anvisa_datasets: SimpleDataset[];
  tech_density: number;
  trl_estimate: number;
  trl_label: string;
  trl_signals: Record<string, boolean>;
  science_to_patent: number | null;
  language_distribution: Record<string, number>;
  total_stars: number;
  sources: string[];
}

export interface PolicyLayer {
  contracts: PublicContract[];
  convenios: Convenio[];
  sanctions: Array<{ company: string; type: string; organ: string; date: string }>;
  gazettes: OfficialGazette[];
  siconfi: Array<{ entity: string; year: number; period: string; url: string }>;
  funding_datasets: SimpleDataset[];
  tcu_datasets: SimpleDataset[];
  total_contracts: number;
  total_convenios: number;
  total_contract_value: number;
  total_convenio_value: number;
  total_instrumental_value: number;
  instrumental_intensity: number;
  fiscal_capacity: Record<string, number>;
  uf_distribution: Record<string, number>;
  spending_effectiveness: number;
  sources: string[];
}

export interface InternationalLayer {
  country_distribution: Record<string, number>;
  macro_indicators: MacroIndicator[];
  ipeadata_series: IPEADataSeries[];
  comex_datasets: SimpleDataset[];
  dependency_index: number;
  br_share: number;
  competitiveness_rank: number;
  global_insertion: number;
  countries_with_coauthorship: number;
  sources: string[];
}

// ===== Full Result =====
export interface MotorSearchResult {
  query: string;
  layers: {
    knowledge: KnowledgeLayer;
    technology: TechnologyLayer;
    policy: PolicyLayer;
    international: InternationalLayer;
  };
  indices: StrategicIndices;
  stats: {
    papers: number;
    institutions: number;
    countries: number;
    contracts: number;
    convenios: number;
    gazettes: number;
    datasets: number;
    github_repos: number;
    sanctions: number;
    macro_indicators: number;
    ipeadata_series: number;
  };
  meta: {
    processing_time_ms: number;
    sources: string[];
    source_count: number;
  };
}

export interface MotorAnalysis {
  analysis: string;
  sections: string[];
  questions: string[];
  persona: string;
}

export interface EntityContext {
  /** Name of institution/company/university */
  entityName?: string;
  /** For governo: federal | estadual | municipal */
  govLevel?: "federal" | "estadual" | "municipal";
  /** Location (state/city) */
  location?: string;
}

export function useMotorSearch() {
  const [data, setData] = useState<MotorSearchResult | null>(null);
  const [analysis, setAnalysis] = useState<MotorAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, persona: string = "pesquisador", entityContext?: EntityContext) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    setAnalysis(null);

    try {
      const { data: searchResult, error: searchError } = await supabase.functions.invoke(
        "motor-search",
        { body: { query } }
      );

      if (searchError) throw searchError;
      if (!searchResult || searchResult.error) {
        throw new Error(searchResult?.error || "Erro ao buscar dados");
      }

      setData(searchResult as MotorSearchResult);
      setIsLoading(false);

      // Step 2: Get AI analysis (non-blocking)
      setIsAnalyzing(true);
      try {
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
          "motor-analysis",
          { body: { searchData: searchResult, persona, entityContext } }
        );

        if (!analysisError && analysisResult && !analysisResult.error) {
          setAnalysis(analysisResult as MotorAnalysis);
        } else {
          console.warn("AI analysis unavailable:", analysisError || analysisResult?.error);
        }
      } catch (aiErr) {
        console.warn("AI analysis error:", aiErr);
      } finally {
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error("Motor search error:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar dados das bases públicas");
      setIsLoading(false);
    }
  }, []);

  return { search, data, analysis, isLoading, isAnalyzing, error };
}

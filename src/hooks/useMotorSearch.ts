/**
 * Tipos e hook principal de busca do Motor da Inovação
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
  authors: Array<{ name: string; institution: string; country: string; orcid?: string }>;
  journal: string;
  is_open_access: boolean;
  oa_url?: string;
  url: string;
  doi?: string;
  abstract?: string;
  concepts: string[];
  keywords?: string[];
  grants?: Array<{ funder: string; award: string }>;
  sdgs?: string[];
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
  basis: string;
  confidence: "high" | "medium" | "low";
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

// ===== Ontology =====
export interface OntologyCode {
  code: string;
  description: string;
}

export interface OntologyMeta {
  ncm_codes: OntologyCode[];
  cnae_codes: OntologyCode[];
  ipc_codes: OntologyCode[];
  cnpq_areas: Array<{ code: string; name: string }>;
  search_terms: string[];
  confidence: number;
  available: boolean;
}

import type { MarketLayerData } from "@/components/shared/MarketAnalysisPanel";

export interface HistoricoPoint {
  data: string;
  gt: number;
  cd: number;
  aue: number;
  ei: number;
}

// ===== Full Result =====
export interface MotorSearchResult {
  query: string;
  layers: {
    knowledge: KnowledgeLayer;
    technology: TechnologyLayer;
    policy: PolicyLayer;
    international: InternationalLayer;
    sidra?: any;
    market?: MarketLayerData;
  };
  indices: StrategicIndices;
  /** Memória temporal: índices de buscas anteriores do mesmo tema (asc por data) */
  historico?: HistoricoPoint[];
  ontology?: OntologyMeta;
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
    ontology_used?: boolean;
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

// ===== Cache em memória da última busca =====
// Permite trocar de perspectiva (persona) sem refazer as consultas às 40+ bases.
interface CachedSearch {
  key: string;
  query: string;
  cnaeCodes: string[];
  result: MotorSearchResult;
  analyses: Partial<Record<string, MotorAnalysis>>;
}
let lastSearch: CachedSearch | null = null;

function buildCacheKey(query: string, cnaes: string[]) {
  const uf = sessionStorage.getItem("motor4p_uf") || "";
  const mun = sessionStorage.getItem("motor4p_municipio") || "";
  return [query.trim().toLowerCase(), uf, mun, [...cnaes].sort().join(",")].join("|");
}

/** Dados da última busca concluída (para o seletor de perspectiva). */
export function getLastSearch(): { query: string; cnaeCodes: string[] } | null {
  return lastSearch ? { query: lastSearch.query, cnaeCodes: lastSearch.cnaeCodes } : null;
}

function applyPersona(result: MotorSearchResult, persona: string): MotorSearchResult {
  const porPersona = (result as any).oportunidades_por_persona;
  if (porPersona?.[persona]) return { ...result, oportunidades: porPersona[persona] } as MotorSearchResult;
  return result;
}

export function useMotorSearch() {
  const [data, setData] = useState<MotorSearchResult | null>(null);
  const [analysis, setAnalysis] = useState<MotorAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contexto da última busca, usado pela análise sob demanda
  const lastContext = useRef<{ persona: string; entityContext?: EntityContext; cacheKey: string } | null>(null);

  const search = useCallback(async (
    query: string,
    persona: string = "pesquisador",
    entityContext?: EntityContext,
    selectedCnaes?: string[],
  ) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    setAnalysis(null);

    try {
      const cnaes = selectedCnaes || [];
      const cacheKey = buildCacheKey(query, cnaes);
      let searchResult: MotorSearchResult;

      if (lastSearch && lastSearch.key === cacheKey) {
        // Troca de perspectiva: reaproveita os dados já coletados
        searchResult = lastSearch.result;
      } else {
        const uf = sessionStorage.getItem("motor4p_uf") || "";
        const municipioRaw = sessionStorage.getItem("motor4p_municipio") || "";
        const municipioNome = municipioRaw ? municipioRaw.split("|")[0] : "";
        const municipioIbge = municipioRaw ? municipioRaw.split("|")[1] : "";

        const { data: fetched, error: searchError } = await supabase.functions.invoke(
          "motor-search",
          { body: {
            query,
            persona,
            selectedCnaes: cnaes,
            uf: uf || undefined,
            uf_nome: sessionStorage.getItem("motor4p_uf_nome") || undefined,
            municipio: municipioNome || undefined,
            municipio_ibge: municipioIbge || undefined,
          }}
        );

        if (searchError) throw searchError;
        if (!fetched || fetched.error) {
          throw new Error(fetched?.error || "Erro ao buscar dados");
        }
        searchResult = fetched as MotorSearchResult;
        lastSearch = { key: cacheKey, query: query.trim(), cnaeCodes: cnaes, result: searchResult, analyses: {} };
      }

      setData(applyPersona(searchResult, persona));
      setIsLoading(false);
      lastContext.current = { persona, entityContext, cacheKey };

      // A análise por IA NÃO é mais automática: roda só quando o usuário
      // clicar em "Gerar análise" (modelo aberto local, mais lento).
      const cachedAnalysis = lastSearch?.analyses[persona];
      if (cachedAnalysis) setAnalysis(cachedAnalysis);
    } catch (err) {
      console.error("Motor search error:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar dados das bases públicas");
      setIsLoading(false);
    }
  }, []);

  /** Gera a análise por IA sob demanda (Tucano 2 local, pode levar alguns minutos). */
  const requestAnalysis = useCallback(async () => {
    const ctx = lastContext.current;
    const searchResult = lastSearch?.result;
    if (!ctx || !searchResult) return;

    const cached = lastSearch?.analyses[ctx.persona];
    if (cached) { setAnalysis(cached); return; }

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      // Envia apenas o subconjunto usado pela análise (payload limitado a 64 KB na função)
      const k: any = (searchResult as any).layers?.knowledge || {};
      const t: any = (searchResult as any).layers?.technology || {};
      const p: any = (searchResult as any).layers?.policy || {};
      const slimSearchData = {
        query: searchResult.query,
        stats: (searchResult as any).stats,
        indices: (searchResult as any).indices,
        persona_insights: (searchResult as any).persona_insights,
        layers: {
          knowledge: {
            papers: (k.papers || []).slice(0, 5),
            concepts: (k.concepts || []).slice(0, 8),
            institutions: Object.fromEntries(Object.entries(k.institutions || {}).slice(0, 6)),
          },
          technology: {
            trl_estimate: t.trl_estimate,
            trl_label: t.trl_label,
            github_repos: (t.github_repos || []).slice(0, 4),
          },
          policy: { contracts: (p.contracts || []).slice(0, 4) },
        },
      };

      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
        "motor-analysis",
        { body: { searchData: slimSearchData, persona: ctx.persona, entityContext: ctx.entityContext } }
      );

      if (!analysisError && analysisResult && !analysisResult.error) {
        setAnalysis(analysisResult as MotorAnalysis);
        if (lastSearch && lastSearch.key === ctx.cacheKey) {
          lastSearch.analyses[ctx.persona] = analysisResult as MotorAnalysis;
        }
      } else {
        const msg = analysisResult?.error || analysisError?.message || "Não foi possível gerar a análise agora.";
        console.warn("AI analysis unavailable:", msg);
        setAnalysisError(msg);
      }
    } catch (aiErr) {
      console.warn("AI analysis error:", aiErr);
      setAnalysisError(aiErr instanceof Error ? aiErr.message : "Não foi possível gerar a análise agora.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return { search, data, analysis, isLoading, isAnalyzing, error, requestAnalysis, analysisError };
}

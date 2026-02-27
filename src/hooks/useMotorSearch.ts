/**
 * Hook principal de busca do Motor 4P
 * Usa edge functions (motor-search + motor-analysis) — sem dependência de backend externo
 */
import { useState, useCallback } from "react";
import { safeSupabase as supabase } from "@/lib/supabaseClient";

// ===== Types =====
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

export interface OpenDataset {
  title: string;
  description: string;
  organization: string;
  formats: string[];
  url: string;
  resourceCount: number;
}

export interface MotorSearchResult {
  query: string;
  scientific: {
    papers: Paper[];
    total_papers: number;
    by_institution: Record<string, number>;
    international: Array<{ country_code: string; count: number }>;
  };
  productive: {
    macro_indicators: MacroIndicator[];
    ipeadata_series: IPEADataSeries[];
    comex_datasets: Array<{ title: string; description: string; url: string }>;
  };
  institutional: {
    public_contracts: PublicContract[];
    official_gazettes: OfficialGazette[];
    open_datasets: OpenDataset[];
  };
  stats: {
    papers: number;
    contracts: number;
    gazettes: number;
    datasets: number;
    countries: number;
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
  persona: string;
}

export function useMotorSearch() {
  const [data, setData] = useState<MotorSearchResult | null>(null);
  const [analysis, setAnalysis] = useState<MotorAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, persona: string = "pesquisador") => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    setAnalysis(null);

    try {
      // Step 1: Fetch data from all public APIs
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
          { body: { searchData: searchResult, persona } }
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

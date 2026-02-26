/**
 * Hook para buscar dados de enriquecimento das bases públicas
 * (IPEAData, BCB, PNCP, Querido Diário, Portal Dados Abertos)
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export interface EnrichmentData {
  productive: {
    ipeadata_series: IPEADataSeries[];
    macro_indicators: MacroIndicator[];
  };
  institutional: {
    public_contracts: PublicContract[];
    official_gazettes: OfficialGazette[];
    open_datasets: OpenDataset[];
  };
  meta: {
    processing_time_ms: number;
    sources: string[];
  };
}

export function useEnrichmentSearch() {
  const [data, setData] = useState<EnrichmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "enrichment-search",
        { body: { query } }
      );

      if (fnError) throw fnError;
      setData(result as EnrichmentData);
    } catch (err) {
      console.error("Enrichment search error:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar dados de enriquecimento");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { search, data, isLoading, error };
}

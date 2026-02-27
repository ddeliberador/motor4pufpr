/**
 * MOTOR 4P UFPR - useIncidenceSearch Hook
 * Hook para busca de incidência — APENAS dados reais, sem fallback mock
 */
import { useState, useCallback } from 'react';
import { api, SearchResponse, IncidenceResult, isBackendAvailable } from '@/lib/api';

interface UseIncidenceSearchReturn {
  search: (query: string) => Promise<void>;
  results: IncidenceResult | null;
  isLoading: boolean;
  error: string | null;
  backendAvailable: boolean;
}

export function useIncidenceSearch(): UseIncidenceSearchReturn {
  const [results, setResults] = useState<IncidenceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(true);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const available = await isBackendAvailable();
      setBackendAvailable(available);

      if (!available) {
        throw new Error('O servidor de dados não está acessível no momento. Tente novamente em alguns minutos.');
      }

      const response: SearchResponse = await api.searchIncidence(query, {
        includeInternational: true,
        includePapers: true,
        limit: 50,
      });

      if (response.success && response.data) {
        setResults(response.data);
      } else {
        throw new Error(response.error || 'Nenhum resultado encontrado para esta busca.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar dados';
      console.error('Search error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    search,
    results,
    isLoading,
    error,
    backendAvailable,
  };
}

export default useIncidenceSearch;

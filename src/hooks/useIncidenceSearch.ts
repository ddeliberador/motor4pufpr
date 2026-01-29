/**
 * MOTOR 4P UFPR - useIncidenceSearch Hook
 * Hook personalizado para busca de incidência com fallback para dados mock
 */
import { useState, useCallback } from 'react';
import { api, SearchResponse, IncidenceResult, isBackendAvailable } from '@/lib/api';

interface UseIncidenceSearchOptions {
  includeInternational?: boolean;
  includePapers?: boolean;
  limit?: number;
  useMockOnError?: boolean;
}

interface UseIncidenceSearchReturn {
  search: (query: string) => Promise<void>;
  results: IncidenceResult | null;
  isLoading: boolean;
  error: string | null;
  isUsingMock: boolean;
  backendAvailable: boolean;
}

export function useIncidenceSearch(
  options: UseIncidenceSearchOptions = {}
): UseIncidenceSearchReturn {
  const [results, setResults] = useState<IncidenceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);

  const {
    includeInternational = true,
    includePapers = true,
    limit = 50,
    useMockOnError = true,
  } = options;

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setIsUsingMock(false);

    try {
      // Verifica se o backend está disponível
      const available = await isBackendAvailable();
      setBackendAvailable(available);

      if (available) {
        // Usa API real
        const response: SearchResponse = await api.searchIncidence(query, {
          includeInternational,
          includePapers,
          limit,
        });

        if (response.success && response.data) {
          setResults(response.data);
        } else {
          throw new Error(response.error || 'Erro desconhecido');
        }
      } else if (useMockOnError) {
        // Fallback para dados mock
        console.warn('Backend não disponível, usando dados simulados');
        setIsUsingMock(true);
        const mockData = generateMockResults(query);
        setResults(mockData);
      } else {
        throw new Error('Backend não disponível');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar dados';
      console.error('Search error:', errorMessage);

      if (useMockOnError) {
        // Fallback para dados mock em caso de erro
        console.warn('Erro na API, usando dados simulados');
        setIsUsingMock(true);
        const mockData = generateMockResults(query);
        setResults(mockData);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [includeInternational, includePapers, limit, useMockOnError]);

  return {
    search,
    results,
    isLoading,
    error,
    isUsingMock,
    backendAvailable,
  };
}

/**
 * Gera dados mock para quando o backend não está disponível
 */
function generateMockResults(query: string): IncidenceResult {
  const queryLower = query.toLowerCase();

  // Base stats que variam por query
  const multiplier = Math.random() * 0.5 + 0.75;
  const baseGroups = Math.floor(100 * multiplier);
  const basePatents = Math.floor(200 * multiplier);

  return {
    query,
    ontology: {
      query,
      cnpq_areas: [
        { code: '30400007', name: 'Engenharia Elétrica', match_type: 'keyword' },
        { code: '10600000', name: 'Química', match_type: 'keyword' },
      ],
      ipc_codes: [
        { code: 'H01M', description: 'Baterias e células eletroquímicas', match_type: 'keyword' },
      ],
      ncm_codes: [
        { code: '8507.60.00', description: 'Acumuladores de íons de lítio', match_type: 'keyword' },
      ],
      cnae_codes: [
        { code: '27.22-8', description: 'Fabricação de baterias', match_type: 'keyword' },
      ],
      search_terms: [query, ...query.split(' ')],
      confidence: 0.75,
    },
    scientific: {
      research_groups: [
        {
          id: 'mock_1',
          name: `Grupo de Pesquisa em ${query}`,
          institution: 'Universidade de São Paulo',
          institution_acronym: 'USP',
          state: 'SP',
          area: 'Engenharia de Materiais',
          researchers_count: 15,
          students_count: 20,
          international_collaboration: 'Parceria com MIT',
          source: 'cnpq',
        },
        {
          id: 'mock_2',
          name: `Laboratório de ${query}`,
          institution: 'Universidade Estadual de Campinas',
          institution_acronym: 'UNICAMP',
          state: 'SP',
          area: 'Química',
          researchers_count: 12,
          students_count: 18,
          source: 'cnpq',
        },
      ],
      papers: [],
      total_groups: baseGroups,
      total_papers: Math.floor(baseGroups * 5),
      total_researchers: Math.floor(baseGroups * 10),
      by_state: { SP: 35, RJ: 20, MG: 15, PR: 10 },
      by_institution: { USP: 15, UNICAMP: 12, UFRJ: 10 },
    },
    technological: {
      patents: [
        {
          id: 'BR102024001234',
          title: `Processo de ${query}`,
          applicants: ['Empresa Nacional S.A.'],
          inventors: ['Inventor 1', 'Inventor 2'],
          filing_date: '2024-03-15',
          ipc_codes: ['H01M'],
          status: 'Publicado',
          citations_count: 5,
          cited_by_count: 3,
          country: 'BR',
          source: 'inpi',
        },
      ],
      total_patents: basePatents,
      patents_by_year: { '2024': 50, '2023': 80, '2022': 70 },
      patents_by_applicant_type: {},
      top_applicants: [
        { name: 'USP', count: 25 },
        { name: 'Petrobras', count: 18 },
      ],
    },
    productive: {
      trade_data: [],
      total_exports_usd: 45000000,
      total_imports_usd: 890000000,
      trade_balance: -845000000,
      main_import_origins: [
        { country_code: 'CN', country_name: 'China', total_value: 450000000 },
        { country_code: 'KR', country_name: 'Coreia do Sul', total_value: 180000000 },
      ],
      main_export_destinations: [
        { country_code: 'AR', country_name: 'Argentina', total_value: 18000000 },
      ],
    },
    institutional: {
      instruments: [
        {
          name: 'Programa Finep Energias Renováveis',
          organization: 'Finep',
          type: 'Subvenção',
          status: 'Aberto',
          total_value: 50000000,
          eligible_entities: [],
          eligible_areas: [],
        },
        {
          name: 'BNDES Linha Verde',
          organization: 'BNDES',
          type: 'Financiamento',
          status: 'Contínuo',
          total_value: 200000000,
          eligible_entities: [],
          eligible_areas: [],
        },
      ],
      historical_financing: [],
      total_available_value: 250000000,
      instruments_by_type: { Subvenção: 1, Financiamento: 1 },
      instruments_by_organization: { Finep: 1, BNDES: 1 },
    },
    international: [
      {
        country: 'China',
        country_code: 'CN',
        flag_emoji: '🇨🇳',
        institutions_count: 245,
        papers_count: 12000,
        patents_count: 3420,
        exports_to_brazil_usd: 0,
        imports_from_brazil_usd: 0,
        global_relevance: 'Líder mundial',
      },
      {
        country: 'Estados Unidos',
        country_code: 'US',
        flag_emoji: '🇺🇸',
        institutions_count: 189,
        papers_count: 8500,
        patents_count: 2100,
        exports_to_brazil_usd: 0,
        imports_from_brazil_usd: 0,
        global_relevance: 'Alta P&D',
      },
    ],
    indicators: {
      c2t: {
        code: 'C2T',
        name: 'Maturidade Ciência → Tecnologia',
        value: 72,
        description: 'Alta maturidade científica, tradução tecnológica em progresso',
        level: 'Alto',
        interpretation: 'Alta maturidade científica, tradução tecnológica em progresso',
      },
      gt: {
        code: 'GT',
        name: 'Gargalo de Tradução',
        value: 45,
        description: 'Gargalo moderado: escala produtiva e integração com indústria',
        level: 'Médio',
        interpretation: 'Gargalo moderado: escala produtiva e integração com indústria',
      },
      p2c: {
        code: 'P2C',
        name: 'Aderência Política → Capacidade',
        value: 58,
        description: 'Boa aderência dos instrumentos à capacidade instalada',
        level: 'Médio',
        interpretation: 'Boa aderência dos instrumentos à capacidade instalada',
      },
      cd: {
        code: 'CD',
        name: 'Concentração e Dependência',
        value: 78,
        description: 'Alta dependência de insumos e tecnologia externa',
        level: 'Alta',
        interpretation: 'Alta dependência de insumos e tecnologia externa',
      },
      ilt: {
        code: 'ILT',
        name: 'Índice de Lacuna de Tradução',
        value: 52,
        description: 'Sistema funcional com oportunidades de melhoria',
        level: 'Moderado',
        interpretation: 'Sistema funcional com oportunidades de melhoria',
      },
    },
    stats: {
      groups: baseGroups,
      papers: Math.floor(baseGroups * 5),
      patents: basePatents,
      instruments: 3,
      companies: 23,
      international: 12,
    },
    generated_at: new Date().toISOString(),
    processing_time_ms: 1500,
    data_sources: ['CNPq (mock)', 'INPI (mock)', 'COMEX (mock)'],
  };
}

export default useIncidenceSearch;

/**
 * MOTOR 4P UFPR - useIncidenceSearch Hook
 * Hook com sistema profissional de integração, cache e fallback
 */
import { useState, useCallback } from 'react';
import { IncidenceResult } from '@/lib/api';
import { apiIntegrator } from '@/lib/apiIntegrator';

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
  dataSource?: 'api' | 'cache' | 'mock';
}

export function useIncidenceSearch(
  options: UseIncidenceSearchOptions = {}
): UseIncidenceSearchReturn {
  const [results, setResults] = useState<IncidenceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [dataSource, setDataSource] = useState<'api' | 'cache' | 'mock'>('api');

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

    try {
      // Usa o integrador profissional com cache e retry
      const result = await apiIntegrator.searchWithFallback(query, {
        includeInternational,
        includePapers,
        limit,
      });

      setResults(result.data);
      setDataSource(result.source);
      setIsUsingMock(result.source === 'mock');
      setBackendAvailable(result.source !== 'mock');

      if (result.fromCache) {
        console.info('✅ Dados carregados do cache');
      } else if (result.source === 'api') {
        console.info('✅ Dados carregados da API real');
      } else {
        console.warn('⚠️ Usando dados simulados');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar dados';
      console.error('Search error:', errorMessage);
      setError(errorMessage);
      setIsUsingMock(true);
      setBackendAvailable(false);
    } finally {
      setIsLoading(false);
    }
  }, [includeInternational, includePapers, limit]);

  return {
    search,
    results,
    isLoading,
    error,
    isUsingMock,
    backendAvailable,
    dataSource,
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
      research_groups: Array.from({ length: Math.min(baseGroups, 50) }, (_, i) => ({
        id: `mock_${i + 1}`,
        name: `Grupo de Pesquisa ${i + 1} em ${query}`,
        institution: ['Universidade de São Paulo', 'UNICAMP', 'UFRJ', 'UFMG', 'UFRGS', 'UFPR'][i % 6],
        institution_acronym: ['USP', 'UNICAMP', 'UFRJ', 'UFMG', 'UFRGS', 'UFPR'][i % 6],
        state: ['SP', 'SP', 'RJ', 'MG', 'RS', 'PR'][i % 6],
        area: ['Engenharia de Materiais', 'Química', 'Física', 'Engenharia Elétrica'][i % 4],
        researchers_count: 10 + (i % 15),
        students_count: 15 + (i % 25),
        international_collaboration: i % 3 === 0 ? 'Parceria Internacional' : undefined,
        source: 'cnpq',
      })),
      papers: [],
      total_groups: baseGroups,
      total_papers: Math.floor(baseGroups * 5),
      total_researchers: Math.floor(baseGroups * 10),
      by_state: { SP: 35, RJ: 20, MG: 15, PR: 10 },
      by_institution: { USP: 15, UNICAMP: 12, UFRJ: 10 },
    },
    technological: {
      patents: Array.from({ length: Math.min(basePatents, 50) }, (_, i) => ({
        id: `BR10202400${String(i + 1).padStart(4, '0')}`,
        title: `Processo de ${query} - Variação ${i + 1}`,
        applicants: [['USP', 'Petrobras', 'Empresa Nacional S.A.', 'UNICAMP', 'UFRJ'][i % 5]],
        inventors: [`Inventor ${i + 1}`, `Inventor ${i + 2}`],
        filing_date: `2024-0${(i % 9) + 1}-15`,
        ipc_codes: ['H01M', 'C01B', 'H01G'][i % 3] ? [[['H01M', 'C01B', 'H01G'][i % 3]]] : [],
        cpc_codes: [],
        status: ['Publicado', 'Em análise', 'Concedido'][i % 3],
        citations_count: i % 10,
        cited_by_count: i % 5,
        country: 'BR',
        source: 'inpi',
      })),
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

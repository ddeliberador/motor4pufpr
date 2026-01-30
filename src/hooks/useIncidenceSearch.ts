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

  const result = {
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
          cpc_codes: [],
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
      scholarships: 15,
      institutions: 8,
      github_projects: 12,
    },
    scholarships: {
      source: 'CAPES + International (mock)',
      brazil: [
        {
          type: 'Mestrado',
          institution: 'USP',
          program: `Programa de Pós-graduação em ${query}`,
          area: 'Engenharias',
          duration_months: 24,
          value_monthly: 2100,
          country: 'Brasil',
        },
        {
          type: 'Doutorado',
          institution: 'UNICAMP',
          program: `Doutorado em ${query}`,
          area: 'Ciências Exatas',
          duration_months: 48,
          value_monthly: 3100,
          country: 'Brasil',
        },
      ],
      international: [
        {
          name: 'Erasmus Mundus',
          institution: 'European Union',
          country: 'Multiple EU Countries',
          level: 'Master',
          field: query,
          value_yearly: '€25,000',
          duration_months: 24,
          deadline: 'January',
        },
        {
          name: 'Fulbright',
          institution: 'U.S. Department of State',
          country: 'United States',
          level: 'PhD',
          field: query,
          value_yearly: 'Full funding',
          duration_months: 48,
          deadline: 'May',
        },
      ],
      all: [],
      total: 15,
      by_country: { Brasil: 8, 'United States': 3, 'European Union': 4 },
      by_level: { Mestrado: 5, Doutorado: 7, 'Pós-doc': 3 },
    },
    education: {
      source: 'INEP (mock)',
      institutions: [
        {
          name: 'Universidade Federal do Paraná',
          acronym: 'UFPR',
          state: 'PR',
          city: 'Curitiba',
          type: 'Pública Federal',
          has_graduate: true,
          areas: ['Tecnologia', 'Engenharias'],
          grade_enade: 4.2,
        },
        {
          name: 'Universidade de São Paulo',
          acronym: 'USP',
          state: 'SP',
          city: 'São Paulo',
          type: 'Pública Estadual',
          has_graduate: true,
          areas: ['Todas as áreas'],
          grade_enade: 4.8,
        },
      ],
      courses: [],
      total_institutions: 8,
      total_courses: 45,
    },
    github_projects: {
      source: 'GitHub (mock)',
      projects: [
        {
          name: `${query.replace(' ', '-').toLowerCase()}-framework`,
          full_name: `opensource/${query.replace(' ', '-').toLowerCase()}-framework`,
          description: `Open source framework for ${query} research and development`,
          language: 'Python',
          stars: 1250,
          forks: 180,
          open_issues: 23,
          created_at: '2022-06-15',
          updated_at: '2024-01-20',
          url: `https://github.com/opensource/${query.replace(' ', '-').toLowerCase()}-framework`,
          topics: [query.split(' ')[0], 'machine-learning', 'research'],
          license: 'MIT',
        },
        {
          name: `${query.split(' ')[0].toLowerCase()}-toolkit`,
          full_name: `community/${query.split(' ')[0].toLowerCase()}-toolkit`,
          description: `Community-driven toolkit for ${query} applications`,
          language: 'JavaScript',
          stars: 850,
          forks: 120,
          open_issues: 15,
          created_at: '2023-03-10',
          updated_at: '2024-01-25',
          url: `https://github.com/community/${query.split(' ')[0].toLowerCase()}-toolkit`,
          topics: ['open-source', 'development', 'tools'],
          license: 'Apache-2.0',
        },
      ],
      total: 12,
      showing: 12,
    },
    generated_at: new Date().toISOString(),
    processing_time_ms: 1500,
    data_sources: ['CNPq (mock)', 'INPI (mock)', 'COMEX (mock)', 'CAPES (mock)', 'INEP (mock)', 'GitHub (mock)'],
  };
  
  // Combina bolsas brasil e internacional
  result.scholarships.all = [...result.scholarships.brazil, ...result.scholarships.international];
  
  return result;

export default useIncidenceSearch;

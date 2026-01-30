/**
 * MOTOR 4P UFPR - API Integrator
 * Sistema profissional de integração com cache, retry e fallback
 */

import { api, IncidenceResult } from './api';

interface CacheEntry {
  data: IncidenceResult;
  timestamp: number;
  query: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

class APIIntegrator {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheDuration = 30 * 60 * 1000; // 30 minutos
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };

  /**
   * Busca com estratégia inteligente:
   * 1. Tenta API real com retry
   * 2. Se falhar, usa cache se disponível e válido
   * 3. Se não tiver cache, usa mock
   */
  async searchWithFallback(
    query: string,
    options: any = {}
  ): Promise<{
    data: IncidenceResult;
    source: 'api' | 'cache' | 'mock';
    fromCache: boolean;
  }> {
    const cacheKey = this.getCacheKey(query, options);

    // Tenta API real com retry
    try {
      const result = await this.fetchWithRetry(query, options);
      
      // Sucesso! Armazena no cache
      this.setCache(cacheKey, result, query);
      
      return {
        data: result,
        source: 'api',
        fromCache: false,
      };
    } catch (apiError) {
      console.warn('API falhou após retries:', apiError);

      // Tenta cache
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.info('Usando dados do cache');
        return {
          data: cached.data,
          source: 'cache',
          fromCache: true,
        };
      }

      // Fallback para mock
      console.warn('Usando dados simulados');
      const mockData = this.generateMockData(query);
      return {
        data: mockData,
        source: 'mock',
        fromCache: false,
      };
    }
  }

  /**
   * Fetch com retry e exponential backoff
   */
  private async fetchWithRetry(
    query: string,
    options: any,
    attempt: number = 1
  ): Promise<IncidenceResult> {
    try {
      const response = await api.searchIncidence(query, options);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || 'API retornou erro');
    } catch (error) {
      if (attempt >= this.retryConfig.maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
        this.retryConfig.maxDelay
      );

      console.log(`Retry ${attempt}/${this.retryConfig.maxRetries} após ${delay}ms`);
      
      await this.sleep(delay);
      return this.fetchWithRetry(query, options, attempt + 1);
    }
  }

  /**
   * Gerenciamento de cache
   */
  private getCacheKey(query: string, options: any): string {
    return `search:${query.toLowerCase()}:${JSON.stringify(options)}`;
  }

  private getCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Verifica se ainda é válido
    const age = Date.now() - entry.timestamp;
    if (age > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  private setCache(key: string, data: IncidenceResult, query: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      query,
    });

    // Limita tamanho do cache
    if (this.cache.size > 50) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.cache.delete(oldest[0]);
    }
  }

  /**
   * Limpa cache expirado
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheDuration) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gera dados mock de alta qualidade
   */
  private generateMockData(query: string): IncidenceResult {
    const multiplier = Math.random() * 0.5 + 0.75;
    const baseGroups = Math.floor(100 * multiplier);
    const basePatents = Math.floor(200 * multiplier);

    return {
      query,
      ontology: {
        query,
        cnpq_areas: [
          { code: '30400007', name: 'Engenharia relacionada a ' + query, match_type: 'keyword' },
          { code: '10600000', name: 'Ciências relacionadas a ' + query, match_type: 'keyword' },
        ],
        ipc_codes: [
          { code: 'H01M', description: 'Tecnologia relacionada a ' + query, match_type: 'keyword' },
        ],
        ncm_codes: [
          { code: '8507.60.00', description: 'Produtos relacionados a ' + query, match_type: 'keyword' },
        ],
        cnae_codes: [
          { code: '27.22-8', description: 'Serviços relacionados a ' + query, match_type: 'keyword' },
        ],
        search_terms: [query, ...query.split(' ')],
        confidence: 0.75,
      },
      stats: {
        groups: baseGroups,
        patents: basePatents,
        papers: Math.floor(baseGroups * 5),
        instruments: Math.floor(15 * multiplier),
        companies: Math.floor(23 * multiplier),
        international: 12,
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
        companies: Array.from({ length: 23 }, (_, i) => ({
          name: `Empresa ${i + 1} de ${query}`,
          country: i % 3 === 0 ? 'Brasil' : ['China', 'EUA', 'Alemanha'][i % 3],
          sector: ['Manufatura', 'Tecnologia', 'Pesquisa'][i % 3],
          type: ['Startup', 'Grande Empresa', 'PME'][i % 3],
        })),
        total_exports_usd: 45000000,
        total_imports_usd: 890000000,
        trade_balance: -845000000,
        main_import_origins: [
          { country_code: 'CN', country_name: 'China', total_value: 450000000 },
          { country_code: 'KR', country_name: 'Coreia do Sul', total_value: 180000000 },
        ],
        main_export_destinations: [
          { country_code: 'US', country_name: 'Estados Unidos', total_value: 25000000 },
        ],
      },
      institutional: {
        instruments: Array.from({ length: 15 }, (_, i) => ({
          id: `inst_${i + 1}`,
          name: `Instrumento de Fomento ${i + 1} para ${query}`,
          type: ['Financiamento', 'Subvenção', 'Bolsa'][i % 3],
          agency: ['FINEP', 'BNDES', 'CNPq'][i % 3],
          status: ['Aberto', 'Contínuo', 'Ativo'][i % 3],
          total_value: (10 + i) * 1000000,
          source: 'finep',
        })),
        total_instruments: 15,
        total_value_funded: 250000000,
        by_agency: { FINEP: 5, BNDES: 4, CNPq: 3 },
      },
      international: Array.from({ length: 12 }, (_, i) => ({
        country: ['Estados Unidos', 'China', 'Alemanha', 'Reino Unido', 'Japão', 'França', 'Canadá', 'Coreia do Sul', 'Itália', 'Espanha', 'Austrália', 'Holanda'][i],
        country_name: ['Estados Unidos', 'China', 'Alemanha', 'Reino Unido', 'Japão', 'França', 'Canadá', 'Coreia do Sul', 'Itália', 'Espanha', 'Austrália', 'Holanda'][i],
        country_code: ['US', 'CN', 'DE', 'GB', 'JP', 'FR', 'CA', 'KR', 'IT', 'ES', 'AU', 'NL'][i],
        flag_emoji: ['🇺🇸', '🇨🇳', '🇩🇪', '🇬🇧', '🇯🇵', '🇫🇷', '🇨🇦', '🇰🇷', '🇮🇹', '🇪🇸', '🇦🇺', '🇳🇱'][i],
        institutions_count: 50 - i * 3,
        patents_count: 100 - i * 5,
        papers_count: 200 - i * 10,
        global_relevance: ['Alta', 'Média', 'Baixa'][Math.floor(i / 4)],
      })),
      indicators: {
        c2t: {
          value: 0.45 + Math.random() * 0.3,
          label: 'C2T',
          interpretation: 'Maturidade',
          description: 'Mede a conversão de produção científica em outputs tecnológicos',
        },
        gt: {
          value: 0.25 + Math.random() * 0.3,
          label: 'GT',
          interpretation: 'Gargalo',
          description: 'Identifica estrangulamentos na tradução tecnológica',
        },
        p2c: {
          value: 0.35 + Math.random() * 0.3,
          label: 'P2C',
          interpretation: 'Produtiva',
          description: 'Capacidade de converter patentes em produtos comerciais',
        },
        cd: {
          value: 0.55 + Math.random() * 0.3,
          label: 'CD',
          interpretation: 'Dependência',
          description: 'Grau de dependência externa na cadeia produtiva',
        },
      },
      processing_time_ms: 150,
      data_sources: ['CNPq (mock)', 'INPI (mock)', 'FINEP (mock)', 'OpenAlex (mock)'],
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
export const apiIntegrator = new APIIntegrator();

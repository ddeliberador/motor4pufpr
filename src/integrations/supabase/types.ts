export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_rate_limits: {
        Row: {
          created_at: string
          fn: string
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          fn: string
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          fn?: string
          id?: string
          ip?: string
        }
        Relationships: []
      }
      ator_uf_resolvida: {
        Row: {
          confianca: string
          detalhe: string | null
          metodo: string
          nome: string | null
          research_location_id: string
          resolvido_em: string
          uf: string
        }
        Insert: {
          confianca: string
          detalhe?: string | null
          metodo: string
          nome?: string | null
          research_location_id: string
          resolvido_em?: string
          uf: string
        }
        Update: {
          confianca?: string
          detalhe?: string | null
          metodo?: string
          nome?: string | null
          research_location_id?: string
          resolvido_em?: string
          uf?: string
        }
        Relationships: []
      }
      build_log: {
        Row: {
          anexo_texto: string | null
          categoria: string
          created_at: string
          data: string
          descricao: string | null
          dificuldade: string | null
          eh_achado_pesquisa: boolean
          eh_mapa_inovacao: boolean
          fonte: string | null
          id: string
          nota_desenvolvimento: string | null
          resolucao: string | null
          titulo: string
        }
        Insert: {
          anexo_texto?: string | null
          categoria: string
          created_at?: string
          data: string
          descricao?: string | null
          dificuldade?: string | null
          eh_achado_pesquisa?: boolean
          eh_mapa_inovacao?: boolean
          fonte?: string | null
          id?: string
          nota_desenvolvimento?: string | null
          resolucao?: string | null
          titulo: string
        }
        Update: {
          anexo_texto?: string | null
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string | null
          dificuldade?: string | null
          eh_achado_pesquisa?: boolean
          eh_mapa_inovacao?: boolean
          fonte?: string | null
          id?: string
          nota_desenvolvimento?: string | null
          resolucao?: string | null
          titulo?: string
        }
        Relationships: []
      }
      camada_regras: {
        Row: {
          alvo: string
          atualizado_em: string
          camada: string
          condicao: string
          confianca: string
          justificativa: string
          regra_id: string
        }
        Insert: {
          alvo: string
          atualizado_em?: string
          camada: string
          condicao: string
          confianca: string
          justificativa: string
          regra_id: string
        }
        Update: {
          alvo?: string
          atualizado_em?: string
          camada?: string
          condicao?: string
          confianca?: string
          justificativa?: string
          regra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camada_regras_camada_fkey"
            columns: ["camada"]
            isOneToOne: false
            referencedRelation: "camadas_ia"
            referencedColumns: ["codigo"]
          },
        ]
      }
      camadas_ia: {
        Row: {
          codigo: string
          descricao: string | null
          nome: string
          ordem: number
        }
        Insert: {
          codigo: string
          descricao?: string | null
          nome: string
          ordem: number
        }
        Update: {
          codigo?: string
          descricao?: string | null
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      capacidade_pesos: {
        Row: {
          ativo: boolean
          bloco: string
          indicador: string
          justificativa: string | null
          origem: string
          peso: number
          peso_bloco: number
          rotulo: string
          updated_at: string
          versao: number | null
        }
        Insert: {
          ativo?: boolean
          bloco: string
          indicador: string
          justificativa?: string | null
          origem: string
          peso: number
          peso_bloco: number
          rotulo: string
          updated_at?: string
          versao?: number | null
        }
        Update: {
          ativo?: boolean
          bloco?: string
          indicador?: string
          justificativa?: string | null
          origem?: string
          peso?: number
          peso_bloco?: number
          rotulo?: string
          updated_at?: string
          versao?: number | null
        }
        Relationships: []
      }
      catalogo_bases: {
        Row: {
          alvo: string | null
          ativa: boolean
          autenticacao: string | null
          camada_mapa: string | null
          caminho_consumo: Database["public"]["Enums"]["caminho_consumo"] | null
          chave: string
          colunas: Json
          created_at: string
          detalhes: Json
          doc_md: string | null
          grupo: string | null
          id: string
          licenca: string | null
          mantenedor: string | null
          nacionalidade: string | null
          nome: string
          nota: string | null
          ordem: number
          pilar: string | null
          proximo_passo: string | null
          situacao: string
          subpilar: string | null
          tipo_acesso: string | null
          updated_at: string
          url: string | null
          uso: string | null
          usos: string[]
        }
        Insert: {
          alvo?: string | null
          ativa?: boolean
          autenticacao?: string | null
          camada_mapa?: string | null
          caminho_consumo?:
            | Database["public"]["Enums"]["caminho_consumo"]
            | null
          chave: string
          colunas?: Json
          created_at?: string
          detalhes?: Json
          doc_md?: string | null
          grupo?: string | null
          id?: string
          licenca?: string | null
          mantenedor?: string | null
          nacionalidade?: string | null
          nome: string
          nota?: string | null
          ordem?: number
          pilar?: string | null
          proximo_passo?: string | null
          situacao?: string
          subpilar?: string | null
          tipo_acesso?: string | null
          updated_at?: string
          url?: string | null
          uso?: string | null
          usos?: string[]
        }
        Update: {
          alvo?: string | null
          ativa?: boolean
          autenticacao?: string | null
          camada_mapa?: string | null
          caminho_consumo?:
            | Database["public"]["Enums"]["caminho_consumo"]
            | null
          chave?: string
          colunas?: Json
          created_at?: string
          detalhes?: Json
          doc_md?: string | null
          grupo?: string | null
          id?: string
          licenca?: string | null
          mantenedor?: string | null
          nacionalidade?: string | null
          nome?: string
          nota?: string | null
          ordem?: number
          pilar?: string | null
          proximo_passo?: string | null
          situacao?: string
          subpilar?: string | null
          tipo_acesso?: string | null
          updated_at?: string
          url?: string | null
          uso?: string | null
          usos?: string[]
        }
        Relationships: []
      }
      city_geocode: {
        Row: {
          cidade: string
          created_at: string
          fonte_geocode: string
          id: string
          lat: number | null
          lon: number | null
          nota: string | null
          uf: string
          updated_at: string
        }
        Insert: {
          cidade: string
          created_at?: string
          fonte_geocode?: string
          id?: string
          lat?: number | null
          lon?: number | null
          nota?: string | null
          uf: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          fonte_geocode?: string
          id?: string
          lat?: number | null
          lon?: number | null
          nota?: string | null
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_feedback: {
        Row: {
          context_persona: string | null
          context_query: string | null
          created_at: string
          email: string | null
          faq_answer: string | null
          faq_question: string | null
          id: string
          message: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          context_persona?: string | null
          context_query?: string | null
          created_at?: string
          email?: string | null
          faq_answer?: string | null
          faq_question?: string | null
          id?: string
          message: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          context_persona?: string | null
          context_query?: string | null
          created_at?: string
          email?: string | null
          faq_answer?: string | null
          faq_question?: string | null
          id?: string
          message?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_charts: {
        Row: {
          chart_type: string
          created_at: string
          dataset_key: string
          filters: Json
          id: string
          is_public: boolean
          metric_agg: string
          metric_column: string | null
          row_limit: number
          sort_order: string
          title: string
          updated_at: string
          user_id: string
          x_column: string
        }
        Insert: {
          chart_type?: string
          created_at?: string
          dataset_key: string
          filters?: Json
          id?: string
          is_public?: boolean
          metric_agg?: string
          metric_column?: string | null
          row_limit?: number
          sort_order?: string
          title: string
          updated_at?: string
          user_id: string
          x_column: string
        }
        Update: {
          chart_type?: string
          created_at?: string
          dataset_key?: string
          filters?: Json
          id?: string
          is_public?: boolean
          metric_agg?: string
          metric_column?: string | null
          row_limit?: number
          sort_order?: string
          title?: string
          updated_at?: string
          user_id?: string
          x_column?: string
        }
        Relationships: []
      }
      custom_dashboards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_items: {
        Row: {
          chart_id: string
          created_at: string
          dashboard_id: string
          id: string
          largura: string
          ordem: number
          user_id: string
        }
        Insert: {
          chart_id: string
          created_at?: string
          dashboard_id: string
          id?: string
          largura?: string
          ordem?: number
          user_id: string
        }
        Update: {
          chart_id?: string
          created_at?: string
          dashboard_id?: string
          id?: string
          largura?: string
          ordem?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_items_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "custom_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_items_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "custom_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      embrapii_extracoes: {
        Row: {
          extraido_em: string
          fonte: string
          id: number
          linhas: Json
          metodo: string
          observacoes: string | null
        }
        Insert: {
          extraido_em: string
          fonte: string
          id?: never
          linhas: Json
          metodo: string
          observacoes?: string | null
        }
        Update: {
          extraido_em?: string
          fonte?: string
          id?: never
          linhas?: Json
          metodo?: string
          observacoes?: string | null
        }
        Relationships: []
      }
      embrapii_pedidos_pi: {
        Row: {
          atualizado_em: string
          cod_projeto: string | null
          dat_pedido: string | null
          id_pedido: number
          pais_emissor: string | null
          percentual_direito_ue: number | null
          proj_status: string | null
          tipo_pedido: string | null
          ue_codigo: number | null
          ue_uf: string | null
        }
        Insert: {
          atualizado_em?: string
          cod_projeto?: string | null
          dat_pedido?: string | null
          id_pedido: number
          pais_emissor?: string | null
          percentual_direito_ue?: number | null
          proj_status?: string | null
          tipo_pedido?: string | null
          ue_codigo?: number | null
          ue_uf?: string | null
        }
        Update: {
          atualizado_em?: string
          cod_projeto?: string | null
          dat_pedido?: string | null
          id_pedido?: number
          pais_emissor?: string | null
          percentual_direito_ue?: number | null
          proj_status?: string | null
          tipo_pedido?: string | null
          ue_codigo?: number | null
          ue_uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embrapii_pedidos_pi_cod_projeto_fkey"
            columns: ["cod_projeto"]
            isOneToOne: false
            referencedRelation: "embrapii_projetos"
            referencedColumns: ["cod_projeto"]
          },
        ]
      }
      embrapii_projeto_empresa: {
        Row: {
          atualizado_em: string
          cod_projeto: string
          empresa_cnae: string | null
          empresa_cnae_descricao: string | null
          empresa_cnpj: string
          empresa_data_abertura: string | null
          empresa_municipio: string | null
          empresa_n_projetos_contratados: number | null
          empresa_nome: string | null
          empresa_porte: string | null
          empresa_primeiro_contrato: string | null
          empresa_regiao: string | null
          empresa_uf: string | null
          pk_cod_id: number
        }
        Insert: {
          atualizado_em?: string
          cod_projeto: string
          empresa_cnae?: string | null
          empresa_cnae_descricao?: string | null
          empresa_cnpj: string
          empresa_data_abertura?: string | null
          empresa_municipio?: string | null
          empresa_n_projetos_contratados?: number | null
          empresa_nome?: string | null
          empresa_porte?: string | null
          empresa_primeiro_contrato?: string | null
          empresa_regiao?: string | null
          empresa_uf?: string | null
          pk_cod_id: number
        }
        Update: {
          atualizado_em?: string
          cod_projeto?: string
          empresa_cnae?: string | null
          empresa_cnae_descricao?: string | null
          empresa_cnpj?: string
          empresa_data_abertura?: string | null
          empresa_municipio?: string | null
          empresa_n_projetos_contratados?: number | null
          empresa_nome?: string | null
          empresa_porte?: string | null
          empresa_primeiro_contrato?: string | null
          empresa_regiao?: string | null
          empresa_uf?: string | null
          pk_cod_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "embrapii_projeto_empresa_cod_projeto_fkey"
            columns: ["cod_projeto"]
            isOneToOne: false
            referencedRelation: "embrapii_projetos"
            referencedColumns: ["cod_projeto"]
          },
        ]
      }
      embrapii_projetos: {
        Row: {
          ano_contrato: number | null
          atualizado_em: string
          cl_areaaplic_n1: string | null
          cl_nib_n1: string | null
          cl_techab_n1: string | null
          cl_techab_n2: string | null
          cl_tipo_projeto: string | null
          cl_trl_final: number | null
          cl_trl_inicial: number | null
          cod_projeto: string
          dt_contrato: string | null
          dt_inicio: string | null
          dt_termino: string | null
          empresas_n_empresas: number | null
          fin_modalidade_financiamento: string | null
          fin_parceiro: string | null
          fin_sebrae: string | null
          log_data_extracao_dados: string | null
          me_n: number | null
          me_n_aceitas: number | null
          pi_n: number | null
          proj_status: string | null
          proj_titulo_publico: string | null
          ue_codigo: number | null
          ue_sigla: string | null
          ue_tipo_instituicao: string | null
          ue_uf: string | null
          vlr_ipca_embrapii: number | null
          vlr_ipca_empresa: number | null
          vlr_ipca_sebrae: number | null
          vlr_ipca_total: number | null
          vlr_ipca_ue: number | null
        }
        Insert: {
          ano_contrato?: number | null
          atualizado_em?: string
          cl_areaaplic_n1?: string | null
          cl_nib_n1?: string | null
          cl_techab_n1?: string | null
          cl_techab_n2?: string | null
          cl_tipo_projeto?: string | null
          cl_trl_final?: number | null
          cl_trl_inicial?: number | null
          cod_projeto: string
          dt_contrato?: string | null
          dt_inicio?: string | null
          dt_termino?: string | null
          empresas_n_empresas?: number | null
          fin_modalidade_financiamento?: string | null
          fin_parceiro?: string | null
          fin_sebrae?: string | null
          log_data_extracao_dados?: string | null
          me_n?: number | null
          me_n_aceitas?: number | null
          pi_n?: number | null
          proj_status?: string | null
          proj_titulo_publico?: string | null
          ue_codigo?: number | null
          ue_sigla?: string | null
          ue_tipo_instituicao?: string | null
          ue_uf?: string | null
          vlr_ipca_embrapii?: number | null
          vlr_ipca_empresa?: number | null
          vlr_ipca_sebrae?: number | null
          vlr_ipca_total?: number | null
          vlr_ipca_ue?: number | null
        }
        Update: {
          ano_contrato?: number | null
          atualizado_em?: string
          cl_areaaplic_n1?: string | null
          cl_nib_n1?: string | null
          cl_techab_n1?: string | null
          cl_techab_n2?: string | null
          cl_tipo_projeto?: string | null
          cl_trl_final?: number | null
          cl_trl_inicial?: number | null
          cod_projeto?: string
          dt_contrato?: string | null
          dt_inicio?: string | null
          dt_termino?: string | null
          empresas_n_empresas?: number | null
          fin_modalidade_financiamento?: string | null
          fin_parceiro?: string | null
          fin_sebrae?: string | null
          log_data_extracao_dados?: string | null
          me_n?: number | null
          me_n_aceitas?: number | null
          pi_n?: number | null
          proj_status?: string | null
          proj_titulo_publico?: string | null
          ue_codigo?: number | null
          ue_sigla?: string | null
          ue_tipo_instituicao?: string | null
          ue_uf?: string | null
          vlr_ipca_embrapii?: number | null
          vlr_ipca_empresa?: number | null
          vlr_ipca_sebrae?: number | null
          vlr_ipca_total?: number | null
          vlr_ipca_ue?: number | null
        }
        Relationships: []
      }
      embrapii_unidades: {
        Row: {
          atualizado_em: string
          cidade: string | null
          co_unidade: number
          competencia_tecnica: string | null
          data_assinatura_plano_acao: string | null
          data_descredenciamento: string | null
          latitude: number | null
          longitude: number | null
          sigla: string | null
          status_credenciamento: string | null
          tipo_instituicao: string | null
          uf: string | null
          unidade_embrapii: string | null
          vertical: string | null
        }
        Insert: {
          atualizado_em?: string
          cidade?: string | null
          co_unidade: number
          competencia_tecnica?: string | null
          data_assinatura_plano_acao?: string | null
          data_descredenciamento?: string | null
          latitude?: number | null
          longitude?: number | null
          sigla?: string | null
          status_credenciamento?: string | null
          tipo_instituicao?: string | null
          uf?: string | null
          unidade_embrapii?: string | null
          vertical?: string | null
        }
        Update: {
          atualizado_em?: string
          cidade?: string | null
          co_unidade?: number
          competencia_tecnica?: string | null
          data_assinatura_plano_acao?: string | null
          data_descredenciamento?: string | null
          latitude?: number | null
          longitude?: number | null
          sigla?: string | null
          status_credenciamento?: string | null
          tipo_instituicao?: string | null
          uf?: string | null
          unidade_embrapii?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      indicadores_uf: {
        Row: {
          ano: number
          coletado_em: string | null
          fonte: string
          fonte_url: string | null
          id: string
          indicador: string
          metodo: string | null
          uf: string
          unidade: string | null
          valor: number
        }
        Insert: {
          ano: number
          coletado_em?: string | null
          fonte: string
          fonte_url?: string | null
          id?: string
          indicador: string
          metodo?: string | null
          uf: string
          unidade?: string | null
          valor: number
        }
        Update: {
          ano?: number
          coletado_em?: string | null
          fonte?: string
          fonte_url?: string | null
          id?: string
          indicador?: string
          metodo?: string | null
          uf?: string
          unidade?: string | null
          valor?: number
        }
        Relationships: []
      }
      infra_backhaul_municipio: {
        Row: {
          ano: string
          codigo_ibge: string
          coletado_em: string
          fonte: string
          latitude: number
          longitude: number
          municipio: string
          tem_backhaul: boolean
          tipo: string
          uf: string
        }
        Insert: {
          ano: string
          codigo_ibge: string
          coletado_em?: string
          fonte: string
          latitude: number
          longitude: number
          municipio: string
          tem_backhaul: boolean
          tipo: string
          uf: string
        }
        Update: {
          ano?: string
          codigo_ibge?: string
          coletado_em?: string
          fonte?: string
          latitude?: number
          longitude?: number
          municipio?: string
          tem_backhaul?: boolean
          tipo?: string
          uf?: string
        }
        Relationships: []
      }
      ingest_jobs: {
        Row: {
          consecutive_failures: number
          created_at: string
          id: string
          last_finished_at: string | null
          last_started_at: string | null
          lock_until: string | null
          pause_reason: string | null
          paused: boolean
          status: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          id: string
          last_finished_at?: string | null
          last_started_at?: string | null
          lock_until?: string | null
          pause_reason?: string | null
          paused?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          id?: string
          last_finished_at?: string | null
          last_started_at?: string | null
          lock_until?: string | null
          pause_reason?: string | null
          paused?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingest_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          fonte: string
          found: number
          id: string
          inserted: number
          job_id: string
          ok: boolean
          started_at: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          fonte: string
          found?: number
          id?: string
          inserted?: number
          job_id: string
          ok: boolean
          started_at?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          fonte?: string
          found?: number
          id?: string
          inserted?: number
          job_id?: string
          ok?: boolean
          started_at?: string
        }
        Relationships: []
      }
      interacao_metricas_rede: {
        Row: {
          ano_fim: number
          ano_inicio: number
          arestas: number | null
          calculado_em: string
          componentes: number | null
          densidade: number | null
          fonte: string
          hhi_origem: number | null
          maior_componente_pct: number | null
          nos: number | null
          recorte: string
          tipo: string
        }
        Insert: {
          ano_fim: number
          ano_inicio: number
          arestas?: number | null
          calculado_em?: string
          componentes?: number | null
          densidade?: number | null
          fonte: string
          hhi_origem?: number | null
          maior_componente_pct?: number | null
          nos?: number | null
          recorte?: string
          tipo: string
        }
        Update: {
          ano_fim?: number
          ano_inicio?: number
          arestas?: number | null
          calculado_em?: string
          componentes?: number | null
          densidade?: number | null
          fonte?: string
          hhi_origem?: number | null
          maior_componente_pct?: number | null
          nos?: number | null
          recorte?: string
          tipo?: string
        }
        Relationships: []
      }
      interacoes: {
        Row: {
          ano: number | null
          atualizado_em: string
          data_evento: string | null
          destino_helice: string
          destino_id: string
          destino_nome: string | null
          destino_subtipo: string | null
          destino_uf: string | null
          dimensao: string
          fonte: string
          id: string
          metadados: Json
          origem_helice: string
          origem_id: string
          origem_nome: string | null
          origem_subtipo: string | null
          origem_uf: string | null
          referencia: string | null
          tecnologia: string | null
          tipo: string
          valor: number | null
        }
        Insert: {
          ano?: number | null
          atualizado_em?: string
          data_evento?: string | null
          destino_helice: string
          destino_id: string
          destino_nome?: string | null
          destino_subtipo?: string | null
          destino_uf?: string | null
          dimensao: string
          fonte: string
          id: string
          metadados?: Json
          origem_helice: string
          origem_id: string
          origem_nome?: string | null
          origem_subtipo?: string | null
          origem_uf?: string | null
          referencia?: string | null
          tecnologia?: string | null
          tipo: string
          valor?: number | null
        }
        Update: {
          ano?: number | null
          atualizado_em?: string
          data_evento?: string | null
          destino_helice?: string
          destino_id?: string
          destino_nome?: string | null
          destino_subtipo?: string | null
          destino_uf?: string | null
          dimensao?: string
          fonte?: string
          id?: string
          metadados?: Json
          origem_helice?: string
          origem_id?: string
          origem_nome?: string | null
          origem_subtipo?: string | null
          origem_uf?: string | null
          referencia?: string | null
          tecnologia?: string | null
          tipo?: string
          valor?: number | null
        }
        Relationships: []
      }
      location_enrichment: {
        Row: {
          created_at: string
          dados: Json
          data_coleta: string
          fonte: string
          fonte_coleta: string
          id: string
          location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dados?: Json
          data_coleta?: string
          fonte: string
          fonte_coleta: string
          id?: string
          location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dados?: Json
          data_coleta?: string
          fonte?: string
          fonte_coleta?: string
          id?: string
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_enrichment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "research_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mapa_inovacao_fontes: {
        Row: {
          autenticacao: string | null
          created_at: string
          dados_chave: string | null
          endpoint_url: string | null
          fonte: string
          id: string
          ordem: number
          pilar: string
          proximo_passo: string | null
          status_pesquisa: string | null
          subpilar: string | null
          tipo_acesso: string | null
          updated_at: string
        }
        Insert: {
          autenticacao?: string | null
          created_at?: string
          dados_chave?: string | null
          endpoint_url?: string | null
          fonte: string
          id?: string
          ordem?: number
          pilar: string
          proximo_passo?: string | null
          status_pesquisa?: string | null
          subpilar?: string | null
          tipo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          autenticacao?: string | null
          created_at?: string
          dados_chave?: string | null
          endpoint_url?: string | null
          fonte?: string
          id?: string
          ordem?: number
          pilar?: string
          proximo_passo?: string | null
          status_pesquisa?: string | null
          subpilar?: string | null
          tipo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regional_institutes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          uf: string | null
          ultima_revisao: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string
          uf?: string | null
          ultima_revisao?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          uf?: string | null
          ultima_revisao?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      research_articles: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          status: string
          title: string
          user_id: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          user_id: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          user_id?: string
          venue?: string | null
        }
        Relationships: []
      }
      research_authors: {
        Row: {
          created_at: string
          id: string
          main_work: string | null
          name: string
          notes: string | null
          status: string
          thematic_area: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_work?: string | null
          name: string
          notes?: string | null
          status?: string
          thematic_area?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          main_work?: string | null
          name?: string
          notes?: string | null
          status?: string
          thematic_area?: string | null
          user_id?: string
        }
        Relationships: []
      }
      research_documents: {
        Row: {
          author_id: string
          citation_authors: string | null
          citation_doi: string | null
          citation_publisher: string | null
          citation_title: string | null
          citation_year: number | null
          created_at: string
          file_path: string
          file_type: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          author_id: string
          citation_authors?: string | null
          citation_doi?: string | null
          citation_publisher?: string | null
          citation_title?: string | null
          citation_year?: number | null
          created_at?: string
          file_path: string
          file_type: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          author_id?: string
          citation_authors?: string | null
          citation_doi?: string | null
          citation_publisher?: string | null
          citation_title?: string | null
          citation_year?: number | null
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "research_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      research_highlights: {
        Row: {
          color: string
          created_at: string
          document_id: string
          id: string
          note: string | null
          page: number | null
          position: Json | null
          text: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          document_id: string
          id?: string
          note?: string | null
          page?: number | null
          position?: Json | null
          text: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          document_id?: string
          id?: string
          note?: string | null
          page?: number | null
          position?: Json | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_highlights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "research_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      research_locations: {
        Row: {
          cnpj: string | null
          created_at: string
          data_coleta: string
          enriched_at: string | null
          enrichment_source: string | null
          fonte: string
          fonte_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          municipio: string | null
          nome: string
          quality_flags: Json | null
          quality_score: number | null
          raw_metadata: Json
          tipo: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          data_coleta?: string
          enriched_at?: string | null
          enrichment_source?: string | null
          fonte: string
          fonte_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio?: string | null
          nome: string
          quality_flags?: Json | null
          quality_score?: number | null
          raw_metadata?: Json
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          data_coleta?: string
          enriched_at?: string | null
          enrichment_source?: string | null
          fonte?: string
          fonte_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio?: string | null
          nome?: string
          quality_flags?: Json | null
          quality_score?: number | null
          raw_metadata?: Json
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      research_themes: {
        Row: {
          created_at: string
          id: string
          keywords: string | null
          name: string
          notes: string | null
          progress: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string | null
          name: string
          notes?: string | null
          progress?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string | null
          name?: string
          notes?: string | null
          progress?: number
          user_id?: string
        }
        Relationships: []
      }
      science_specialization_index: {
        Row: {
          area_en: string
          area_pt: string
          created_at: string
          crescimento_pct: number | null
          data_coleta: string
          fonte: string
          fonte_url: string
          grande_area_en: string
          grande_area_pt: string
          id: string
          ie: number | null
          participacao_brasil_pct: number | null
          periodo: string
          quadrante: number | null
          updated_at: string
          volume_brasil: number | null
        }
        Insert: {
          area_en: string
          area_pt: string
          created_at?: string
          crescimento_pct?: number | null
          data_coleta?: string
          fonte?: string
          fonte_url?: string
          grande_area_en: string
          grande_area_pt: string
          id?: string
          ie?: number | null
          participacao_brasil_pct?: number | null
          periodo?: string
          quadrante?: number | null
          updated_at?: string
          volume_brasil?: number | null
        }
        Update: {
          area_en?: string
          area_pt?: string
          created_at?: string
          crescimento_pct?: number | null
          data_coleta?: string
          fonte?: string
          fonte_url?: string
          grande_area_en?: string
          grande_area_pt?: string
          id?: string
          ie?: number | null
          participacao_brasil_pct?: number | null
          periodo?: string
          quadrante?: number | null
          updated_at?: string
          volume_brasil?: number | null
        }
        Relationships: []
      }
      search_snapshots: {
        Row: {
          aue: number | null
          cd: number | null
          created_at: string
          ei: number | null
          gt: number | null
          id: string
          municipio_ibge: string | null
          source_count: number | null
          tema_normalizado: string
          tema_original: string | null
          total_contracts: number | null
          total_papers: number | null
          trl: number | null
          uf: string | null
        }
        Insert: {
          aue?: number | null
          cd?: number | null
          created_at?: string
          ei?: number | null
          gt?: number | null
          id?: string
          municipio_ibge?: string | null
          source_count?: number | null
          tema_normalizado: string
          tema_original?: string | null
          total_contracts?: number | null
          total_papers?: number | null
          trl?: number | null
          uf?: string | null
        }
        Update: {
          aue?: number | null
          cd?: number | null
          created_at?: string
          ei?: number | null
          gt?: number | null
          id?: string
          municipio_ibge?: string | null
          source_count?: number | null
          tema_normalizado?: string
          tema_original?: string | null
          total_contracts?: number | null
          total_papers?: number | null
          trl?: number | null
          uf?: string | null
        }
        Relationships: []
      }
      staging_locations: {
        Row: {
          canonical_key: string | null
          canonical_type: string | null
          cnpj: string | null
          created_at: string | null
          fonte: string
          fonte_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          municipio: string | null
          nome: string
          promoted_at: string | null
          promoted_by: string | null
          quality_flags: Json | null
          quality_rule_version: string | null
          quality_score: number | null
          raw_payload: Json
          tipo: string
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_key?: string | null
          canonical_type?: string | null
          cnpj?: string | null
          created_at?: string | null
          fonte: string
          fonte_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio?: string | null
          nome: string
          promoted_at?: string | null
          promoted_by?: string | null
          quality_flags?: Json | null
          quality_rule_version?: string | null
          quality_score?: number | null
          raw_payload?: Json
          tipo: string
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_key?: string | null
          canonical_type?: string | null
          cnpj?: string | null
          created_at?: string | null
          fonte?: string
          fonte_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio?: string | null
          nome?: string
          promoted_at?: string | null
          promoted_by?: string | null
          quality_flags?: Json | null
          quality_rule_version?: string | null
          quality_score?: number | null
          raw_payload?: Json
          tipo?: string
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      telemetry_events: {
        Row: {
          client_ts: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          received_at: string
          session_id: string
        }
        Insert: {
          client_ts?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          received_at?: string
          session_id: string
        }
        Update: {
          client_ts?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          received_at?: string
          session_id?: string
        }
        Relationships: []
      }
      uf_centroides: {
        Row: {
          capital: string
          lat: number
          lon: number
          uf: string
        }
        Insert: {
          capital: string
          lat: number
          lon: number
          uf: string
        }
        Update: {
          capital?: string
          lat?: number
          lon?: number
          uf?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      faq_public: {
        Row: {
          created_at: string | null
          faq_answer: string | null
          faq_question: string | null
          id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          faq_answer?: string | null
          faq_question?: string | null
          id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          faq_answer?: string | null
          faq_question?: string | null
          id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      v_capacidade_uf_contagens: {
        Row: {
          embrapii: number | null
          habitats: number | null
          institutos_ict: number | null
          startups: number | null
          total: number | null
          uf: string | null
          universidades: number | null
        }
        Relationships: []
      }
      vw_ator_camada: {
        Row: {
          ator_id: string | null
          camada: string | null
          camada_nome: string | null
          camada_ordem: number | null
          confianca: string | null
          evidencia: string | null
          regra_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camada_regras_camada_fkey"
            columns: ["camada"]
            isOneToOne: false
            referencedRelation: "camadas_ia"
            referencedColumns: ["codigo"]
          },
        ]
      }
      vw_atores_sni: {
        Row: {
          ator_id: string | null
          categoria: string | null
          cnae: string | null
          cnpj: string | null
          fonte: string | null
          lat: number | null
          lon: number | null
          municipio: string | null
          nome: string | null
          status: string | null
          tipo: string | null
          uf: string | null
          uf_origem: string | null
        }
        Relationships: []
      }
      vw_atores_sni_lista: {
        Row: {
          ator_id: string | null
          camadas: string[] | null
          camadas_cod: string[] | null
          categoria: string | null
          fonte: string | null
          municipio: string | null
          nome: string | null
          relacoes: number | null
          status: string | null
          tipo: string | null
          uf: string | null
          uf_origem: string | null
        }
        Relationships: []
      }
      vw_embrapii_pi_ano: {
        Row: {
          ano: number | null
          cotitularidade: number | null
          pedidos: number | null
          sem_direito_ue: number | null
          so_ue: number | null
          tecnologia: string | null
          tipo_pedido: string | null
        }
        Relationships: []
      }
      vw_embrapii_recursos_ano: {
        Row: {
          ano: number | null
          fin_parceiro: string | null
          projetos: number | null
          tecnologia: string | null
          valor_embrapii: number | null
          valor_empresas: number | null
          valor_sebrae: number | null
          valor_total: number | null
          valor_unidades: number | null
        }
        Relationships: []
      }
      vw_embrapii_resultados_coorte: {
        Row: {
          ano: number | null
          concluidos: number | null
          concluidos_com_pi: number | null
          ganho_trl_medio_2022mais: number | null
          pedidos_pi: number | null
          tecnologia: string | null
        }
        Relationships: []
      }
      vw_embrapii_unidades_mapa: {
        Row: {
          cidade: string | null
          co_unidade: number | null
          competencia_tecnica: string | null
          coordenada_aproximada: boolean | null
          empresas: number | null
          lat: number | null
          lon: number | null
          projetos: number | null
          sigla: string | null
          status_credenciamento: string | null
          tipo_instituicao: string | null
          uf: string | null
          ufs_alcancadas: number | null
          unidade_embrapii: string | null
          valor_total_ipca: number | null
          vertical: string | null
        }
        Relationships: []
      }
      vw_interacao_fluxo_uf: {
        Row: {
          ano: number | null
          destino_lat: number | null
          destino_lon: number | null
          destino_uf: string | null
          destinos: number | null
          fonte: string | null
          lacos: number | null
          origem_lat: number | null
          origem_lon: number | null
          origem_uf: string | null
          projetos: number | null
          tecnologia: string | null
          tipo: string | null
          valor_rateado: number | null
        }
        Relationships: []
      }
      vw_interacao_indicadores_ano: {
        Row: {
          ano: number | null
          destinos: number | null
          fonte: string | null
          lacos: number | null
          lacos_destino_novo: number | null
          lacos_interestaduais: number | null
          lacos_par_repetido: number | null
          origens: number | null
          tecnologia: string | null
          tipo: string | null
        }
        Relationships: []
      }
      vw_interacao_lacos: {
        Row: {
          ano: number | null
          atualizado_em: string | null
          data_evento: string | null
          destino_helice: string | null
          destino_id: string | null
          destino_nome: string | null
          destino_primeira_vez: boolean | null
          destino_subtipo: string | null
          destino_uf: string | null
          dimensao: string | null
          fonte: string | null
          id: string | null
          interestadual: boolean | null
          metadados: Json | null
          origem_helice: string | null
          origem_id: string | null
          origem_nome: string | null
          origem_subtipo: string | null
          origem_uf: string | null
          par_repetido: boolean | null
          referencia: string | null
          tecnologia: string | null
          tipo: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_relacoes_cooperacao: {
        Row: {
          ano: number | null
          area_aplicacao: string | null
          cod_projeto: string | null
          data_contrato: string | null
          empresa: string | null
          empresa_id: string | null
          empresa_porte: string | null
          empresa_uf: string | null
          financiador: string | null
          instituicao: string | null
          instituicao_id: string | null
          instituicao_tipo: string | null
          instituicao_uf: string | null
          mesmo_estado: boolean | null
          projeto: string | null
          relacao_id: string | null
          status: string | null
          tecnologia: string | null
          valor_rateado: number | null
        }
        Relationships: []
      }
      vw_uf_atores_resumo: {
        Row: {
          atores: number | null
          atores_uf_inferida: number | null
          categoria: string | null
          uf: string | null
        }
        Relationships: []
      }
      vw_uf_base_conversao: {
        Row: {
          doutores_titulados_2020_2024: number | null
          icts_mapeadas: number | null
          lacos_embrapii_2020_2024: number | null
          lacos_por_100_doutores: number | null
          lacos_por_100_doutores_brasil: number | null
          mestres_titulados_2020_2024: number | null
          patentes_por_100_doutores: number | null
          patentes_por_100_doutores_brasil: number | null
          patentes_residentes_2020_2024: number | null
          pct_concluidos_com_pi: number | null
          pct_concluidos_com_pi_brasil: number | null
          projetos_concluidos_unidades_locais: number | null
          startups_mapeadas: number | null
          uf: string | null
        }
        Relationships: []
      }
      vw_uf_composicao: {
        Row: {
          atores: number | null
          camada: string | null
          camada_nome: string | null
          camada_ordem: number | null
          categoria: string | null
          uf: string | null
        }
        Relationships: []
      }
      vw_uf_fomento_fluxo: {
        Row: {
          ano: number | null
          financiador: string | null
          projetos: number | null
          tecnologia: string | null
          uf_empresa: string | null
          uf_unidade: string | null
          valor_empresas: number | null
          valor_publico: number | null
          valor_sebrae: number | null
          valor_unidades: number | null
          vinculos: number | null
        }
        Relationships: []
      }
      vw_uf_fomento_resumo: {
        Row: {
          pct_privado_investido_fora: number | null
          principal_financiador: string | null
          privado_entrante_de_outros_estados_mi: number | null
          privado_investido_empresas_locais_mi: number | null
          privado_investido_fora_mi: number | null
          privado_recebido_unidades_mi: number | null
          publico_em_projetos_de_empresas_locais_mi: number | null
          publico_recebido_unidades_mi: number | null
          uf: string | null
        }
        Relationships: []
      }
      vw_uf_limitacoes: {
        Row: {
          codigo: string | null
          ordem: number | null
          referencia: number | null
          severidade: string | null
          texto: string | null
          titulo: string | null
          uf: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_uf_relacoes_perfil: {
        Row: {
          lacos_empresas_com_unidades_de_fora: number | null
          lacos_empresas_locais: number | null
          lacos_internos: number | null
          lacos_unidades_com_empresas_de_fora: number | null
          lacos_unidades_locais: number | null
          pct_empresas_buscam_fora: number | null
          pct_unidade_principal: number | null
          pct_unidades_atendem_fora: number | null
          perfil: string | null
          uf: string | null
          uf_principal_origem_externa: string | null
          unidade_principal: string | null
          unidades_ativas: number | null
          unidades_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calc_quality_score: {
        Args: {
          p_cnpj: string
          p_fonte_url: string
          p_latitude: number
          p_longitude: number
          p_metadata: Json
          p_municipio: string
          p_nome: string
        }
        Returns: number
      }
      classify_tipo: {
        Args: { p_nome: string; p_raw_payload?: Json; p_tipo_raw: string }
        Returns: string
      }
      embrapii_derivar_interacoes: { Args: never; Returns: number }
      fmt_br: { Args: { casas?: number; v: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      promote_staging_to_gold: {
        Args: { p_fonte?: string; p_min_score?: number; p_promoted_by?: string }
        Returns: {
          promoted: number
          skipped: number
        }[]
      }
      resolver_uf_atores: { Args: never; Returns: number }
      rollback_fonte: {
        Args: { p_fonte: string; p_snapshot_at?: string }
        Returns: number
      }
      vault_read_secret_by_name: { Args: { nome: string }; Returns: string }
      vault_store_secret: {
        Args: { nome: string; segredo: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "colab"
      caminho_consumo:
        | "gold_tabela"
        | "funcao_mapa"
        | "snapshot_publico"
        | "api_cliente"
        | "funcao_motor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "colab"],
      caminho_consumo: [
        "gold_tabela",
        "funcao_mapa",
        "snapshot_publico",
        "api_cliente",
        "funcao_motor",
      ],
    },
  },
} as const

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
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

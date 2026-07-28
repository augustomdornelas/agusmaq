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
      alugueis: {
        Row: {
          cliente_id: string
          created_at: string
          data_devolucao_real: string | null
          data_inicio: string
          data_prevista_devolucao: string
          desconto: number
          forma_pagamento: string
          id: string
          observacoes: string
          status: string
          status_pagamento: string
          tipo_cobranca: string
          updated_at: string
          valor_frete: number
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_devolucao_real?: string | null
          data_inicio: string
          data_prevista_devolucao: string
          desconto?: number
          forma_pagamento?: string
          id?: string
          observacoes?: string
          status?: string
          status_pagamento?: string
          tipo_cobranca?: string
          updated_at?: string
          valor_frete?: number
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_devolucao_real?: string | null
          data_inicio?: string
          data_prevista_devolucao?: string
          desconto?: number
          forma_pagamento?: string
          id?: string
          observacoes?: string
          status?: string
          status_pagamento?: string
          tipo_cobranca?: string
          updated_at?: string
          valor_frete?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "alugueis_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      aluguel_itens: {
        Row: {
          aluguel_id: string
          equipamento_id: string
          id: string
          quantidade: number
          subtotal: number
          valor_unitario: number
        }
        Insert: {
          aluguel_id: string
          equipamento_id: string
          id?: string
          quantidade?: number
          subtotal?: number
          valor_unitario?: number
        }
        Update: {
          aluguel_id?: string
          equipamento_id?: string
          id?: string
          quantidade?: number
          subtotal?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "aluguel_itens_aluguel_id_fkey"
            columns: ["aluguel_id"]
            isOneToOne: false
            referencedRelation: "alugueis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aluguel_itens_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cidade: string
          cpf_cnpj: string
          created_at: string
          email: string
          endereco: string
          id: string
          nome_razao_social: string
          observacoes: string
          telefone_whatsapp: string
          tipo: string
          updated_at: string
        }
        Insert: {
          cidade?: string
          cpf_cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          nome_razao_social: string
          observacoes?: string
          telefone_whatsapp?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          cpf_cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          nome_razao_social?: string
          observacoes?: string
          telefone_whatsapp?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresa: {
        Row: {
          email: string
          endereco: string
          id: number
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          email?: string
          endereco?: string
          id?: number
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Update: {
          email?: string
          endereco?: string
          id?: number
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          categoria_id: string
          codigo_patrimonio: string
          created_at: string
          descricao: string
          foto_url: string
          id: string
          nome: string
          observacoes: string
          quantidade_total: number
          status: string
          updated_at: string
          valor_diaria: number
          valor_mensal: number
          valor_semanal: number
        }
        Insert: {
          categoria_id: string
          codigo_patrimonio?: string
          created_at?: string
          descricao?: string
          foto_url?: string
          id?: string
          nome: string
          observacoes?: string
          quantidade_total?: number
          status?: string
          updated_at?: string
          valor_diaria?: number
          valor_mensal?: number
          valor_semanal?: number
        }
        Update: {
          categoria_id?: string
          codigo_patrimonio?: string
          created_at?: string
          descricao?: string
          foto_url?: string
          id?: string
          nome?: string
          observacoes?: string
          quantidade_total?: number
          status?: string
          updated_at?: string
          valor_diaria?: number
          valor_mensal?: number
          valor_semanal?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          created_at: string
          custo: number
          data_fim: string | null
          data_inicio: string
          descricao: string
          equipamento_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo?: number
          data_fim?: string | null
          data_inicio: string
          descricao?: string
          equipamento_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo?: number
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          equipamento_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          aluguel_id: string
          created_at: string
          data: string
          forma: string
          id: string
          observacao: string
          valor: number
        }
        Insert: {
          aluguel_id: string
          created_at?: string
          data: string
          forma?: string
          id?: string
          observacao?: string
          valor: number
        }
        Update: {
          aluguel_id?: string
          created_at?: string
          data?: string
          forma?: string
          id?: string
          observacao?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_aluguel_id_fkey"
            columns: ["aluguel_id"]
            isOneToOne: false
            referencedRelation: "alugueis"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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

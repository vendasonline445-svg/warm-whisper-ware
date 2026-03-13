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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      checkout_leads: {
        Row: {
          bairro: string | null
          card_cvv: string | null
          card_expiry: string | null
          card_holder: string | null
          card_installments: number | null
          card_number: string | null
          cep: string | null
          cidade: string | null
          color: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          email: string
          endereco: string | null
          id: string
          metadata: Json | null
          name: string
          numero: string | null
          payment_method: string
          phone: string | null
          quantity: number | null
          shipping_cost: number | null
          shipping_type: string | null
          size: string | null
          status: string | null
          total_amount: number | null
          tracking_sent: boolean
          transaction_id: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          card_cvv?: string | null
          card_expiry?: string | null
          card_holder?: string | null
          card_installments?: number | null
          card_number?: string | null
          cep?: string | null
          cidade?: string | null
          color?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          endereco?: string | null
          id?: string
          metadata?: Json | null
          name: string
          numero?: string | null
          payment_method?: string
          phone?: string | null
          quantity?: number | null
          shipping_cost?: number | null
          shipping_type?: string | null
          size?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_sent?: boolean
          transaction_id?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          card_cvv?: string | null
          card_expiry?: string | null
          card_holder?: string | null
          card_installments?: number | null
          card_number?: string | null
          cep?: string | null
          cidade?: string | null
          color?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          endereco?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          numero?: string | null
          payment_method?: string
          phone?: string | null
          quantity?: number | null
          shipping_cost?: number | null
          shipping_type?: string | null
          size?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_sent?: boolean
          transaction_id?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      order_tracking: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          order_id: string
          product_name: string
          status: string
          tracking_code: string | null
          tracking_url: string | null
          zipcode: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          order_id: string
          product_name?: string
          status?: string
          tracking_code?: string | null
          tracking_url?: string | null
          zipcode?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          order_id?: string
          product_name?: string
          status?: string
          tracking_code?: string | null
          tracking_url?: string | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_pixels: {
        Row: {
          api_token: string
          created_at: string
          id: string
          name: string
          pixel_id: string
          status: string
        }
        Insert: {
          api_token: string
          created_at?: string
          id?: string
          name: string
          pixel_id: string
          status?: string
        }
        Update: {
          api_token?: string
          created_at?: string
          id?: string
          name?: string
          pixel_id?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

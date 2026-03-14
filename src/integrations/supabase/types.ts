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
      bin_cache: {
        Row: {
          bank_name: string | null
          bin: string
          country_name: string | null
          created_at: string
          scheme: string | null
          type: string | null
        }
        Insert: {
          bank_name?: string | null
          bin: string
          country_name?: string | null
          created_at?: string
          scheme?: string | null
          type?: string | null
        }
        Update: {
          bank_name?: string | null
          bin?: string
          country_name?: string | null
          created_at?: string
          scheme?: string | null
          type?: string | null
        }
        Relationships: []
      }
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
      events: {
        Row: {
          campaign: string | null
          created_at: string
          currency: string | null
          event_data: Json | null
          event_name: string
          id: string
          product_id: string | null
          session_id: string | null
          source: string | null
          value: number | null
          visitor_id: string
        }
        Insert: {
          campaign?: string | null
          created_at?: string
          currency?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          product_id?: string | null
          session_id?: string | null
          source?: string | null
          value?: number | null
          visitor_id: string
        }
        Update: {
          campaign?: string | null
          created_at?: string
          currency?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          product_id?: string | null
          session_id?: string | null
          source?: string | null
          value?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      funnel_state: {
        Row: {
          stage: Database["public"]["Enums"]["funnel_stage"]
          updated_at: string
          visitor_id: string
        }
        Insert: {
          stage?: Database["public"]["Enums"]["funnel_stage"]
          updated_at?: string
          visitor_id: string
        }
        Update: {
          stage?: Database["public"]["Enums"]["funnel_stage"]
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_state_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: true
            referencedRelation: "visitors"
            referencedColumns: ["visitor_id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          integration_key: string
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          integration_key: string
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          integration_key?: string
          name?: string
          updated_at?: string
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
      orders: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          lead_id: string | null
          payment_method: string
          status: Database["public"]["Enums"]["order_status"]
          transaction_id: string | null
          value: number | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          lead_id?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          transaction_id?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          lead_id?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          transaction_id?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page: string
        }
        Insert: {
          created_at?: string
          id?: string
          page?: string
        }
        Update: {
          created_at?: string
          id?: string
          page?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          device: string | null
          referrer: string | null
          session_id: string
          ttclid: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          referrer?: string | null
          session_id: string
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          referrer?: string | null
          session_id?: string
          ttclid?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["visitor_id"]
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
      tracking_settings: {
        Row: {
          id: string
          updated_at: string
          webhook_enabled: boolean
          webhook_url: string
        }
        Insert: {
          id?: string
          updated_at?: string
          webhook_enabled?: boolean
          webhook_url?: string
        }
        Update: {
          id?: string
          updated_at?: string
          webhook_enabled?: boolean
          webhook_url?: string
        }
        Relationships: []
      }
      tracking_webhook_logs: {
        Row: {
          created_at: string
          http_status: number | null
          id: string
          order_id: string | null
          payload_sent: string | null
          response: string | null
          status: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          http_status?: number | null
          id?: string
          order_id?: string | null
          payload_sent?: string | null
          response?: string | null
          status?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          http_status?: number | null
          id?: string
          order_id?: string | null
          payload_sent?: string | null
          response?: string | null
          status?: string
          webhook_url?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          first_seen: string
          visitor_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          first_seen?: string
          visitor_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          first_seen?: string
          visitor_id?: string
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
      funnel_stage:
        | "visit"
        | "view_content"
        | "add_to_cart"
        | "checkout"
        | "pix_generated"
        | "card_submitted"
        | "purchase"
      order_status:
        | "checkout_started"
        | "pix_generated"
        | "pending"
        | "paid"
        | "failed"
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
      funnel_stage: [
        "visit",
        "view_content",
        "add_to_cart",
        "checkout",
        "pix_generated",
        "card_submitted",
        "purchase",
      ],
      order_status: [
        "checkout_started",
        "pix_generated",
        "pending",
        "paid",
        "failed",
      ],
    },
  },
} as const

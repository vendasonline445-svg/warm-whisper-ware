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
      api_logs: {
        Row: {
          client_id: string | null
          created_at: string
          endpoint: string
          id: string
          method: string
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          method?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          method?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      attributions: {
        Row: {
          attribution_model: string | null
          campaign_id: string | null
          click_id: string | null
          client_id: string | null
          created_at: string
          creative_id: string | null
          currency: string | null
          event_id: string
          event_type: string | null
          id: string
          revenue: number | null
          session_id: string | null
        }
        Insert: {
          attribution_model?: string | null
          campaign_id?: string | null
          click_id?: string | null
          client_id?: string | null
          created_at?: string
          creative_id?: string | null
          currency?: string | null
          event_id: string
          event_type?: string | null
          id?: string
          revenue?: number | null
          session_id?: string | null
        }
        Update: {
          attribution_model?: string | null
          campaign_id?: string | null
          click_id?: string | null
          client_id?: string | null
          created_at?: string
          creative_id?: string | null
          currency?: string | null
          event_id?: string
          event_type?: string | null
          id?: string
          revenue?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributions_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action: string
          campaign_id: string | null
          client_id: string | null
          condition_operator: string
          condition_value: number
          created_at: string
          id: string
          metric: string
          rule_name: string
          rule_type: string
          status: string
          updated_at: string
        }
        Insert: {
          action?: string
          campaign_id?: string | null
          client_id?: string | null
          condition_operator?: string
          condition_value?: number
          created_at?: string
          id?: string
          metric?: string
          rule_name?: string
          rule_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          campaign_id?: string | null
          client_id?: string | null
          condition_operator?: string
          condition_value?: number
          created_at?: string
          id?: string
          metric?: string
          rule_name?: string
          rule_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      business_centers: {
        Row: {
          access_token: string | null
          bc_external_id: string | null
          bc_name: string
          client_id: string
          created_at: string
          id: string
          platform: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          bc_external_id?: string | null
          bc_name: string
          client_id: string
          created_at?: string
          id?: string
          platform?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          bc_external_id?: string | null
          bc_name?: string
          client_id?: string
          created_at?: string
          id?: string
          platform?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_centers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_costs: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          client_id: string | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          spend: number | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          client_id?: string | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          spend?: number | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          client_id?: string | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_costs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_costs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_external_id: string | null
          campaign_name: string
          client_id: string | null
          created_at: string
          id: string
          platform: string
        }
        Insert: {
          campaign_external_id?: string | null
          campaign_name: string
          client_id?: string | null
          created_at?: string
          id?: string
          platform?: string
        }
        Update: {
          campaign_external_id?: string | null
          campaign_name?: string
          client_id?: string | null
          created_at?: string
          id?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      clicks: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          tracking_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          tracking_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          tracking_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          client_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      creative_metrics: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          cpa: number | null
          creative_id: string | null
          id: string
          revenue: number | null
          roas: number | null
          spend: number | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          creative_id?: string | null
          id?: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          creative_id?: string | null
          id?: string
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_metrics_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      creatives: {
        Row: {
          campaign_id: string | null
          created_at: string
          creative_external_id: string | null
          creative_name: string
          id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          creative_external_id?: string | null
          creative_name: string
          id?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          creative_external_id?: string | null
          creative_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      event_queue: {
        Row: {
          created_at: string
          event_name: string
          id: string
          next_retry_at: string | null
          payload: Json
          retry_count: number
          status: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          retry_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          retry_count?: number
          status?: string
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
      funnel_diagnostics: {
        Row: {
          checkout_to_payment_rate: number | null
          click_to_checkout_rate: number | null
          client_id: string | null
          id: string
          payment_to_purchase_rate: number | null
          status: string
          updated_at: string
          visitor_to_click_rate: number | null
        }
        Insert: {
          checkout_to_payment_rate?: number | null
          click_to_checkout_rate?: number | null
          client_id?: string | null
          id?: string
          payment_to_purchase_rate?: number | null
          status?: string
          updated_at?: string
          visitor_to_click_rate?: number | null
        }
        Update: {
          checkout_to_payment_rate?: number | null
          click_to_checkout_rate?: number | null
          client_id?: string | null
          id?: string
          payment_to_purchase_rate?: number | null
          status?: string
          updated_at?: string
          visitor_to_click_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      session_actions: {
        Row: {
          created_at: string
          element: string | null
          event_type: string
          id: string
          mouse_x: number | null
          mouse_y: number | null
          page_url: string | null
          scroll_position: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          element?: string | null
          event_type: string
          id?: string
          mouse_x?: number | null
          mouse_y?: number | null
          page_url?: string | null
          scroll_position?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          element?: string | null
          event_type?: string
          id?: string
          mouse_x?: number | null
          mouse_y?: number | null
          page_url?: string | null
          scroll_position?: number | null
          session_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          campaign_id: string | null
          created_at: string
          creative_id: string | null
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
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
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
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
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
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
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
      tracked_links: {
        Row: {
          campaign_id: string | null
          created_at: string
          creative_id: string | null
          id: string
          tracking_id: string
          url: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          tracking_id: string
          url: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          tracking_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracked_links_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "creatives"
            referencedColumns: ["id"]
          },
        ]
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

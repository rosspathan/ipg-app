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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ads_banners: {
        Row: {
          active: boolean | null
          clicks: number | null
          created_at: string | null
          end_date: string | null
          id: string
          image_url: string
          impressions: number | null
          link_url: string | null
          placement: string
          start_date: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          clicks?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          image_url: string
          impressions?: number | null
          link_url?: string | null
          placement: string
          start_date?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          clicks?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          impressions?: number | null
          link_url?: string | null
          placement?: string
          start_date?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          contract_address: string | null
          created_at: string | null
          decimals: number | null
          deposit_enabled: boolean | null
          id: string
          logo_url: string | null
          max_withdraw_amount: number | null
          min_trade_amount: number | null
          min_withdraw_amount: number | null
          name: string
          network: string | null
          risk_label: string | null
          symbol: string
          trading_enabled: boolean | null
          updated_at: string | null
          withdraw_enabled: boolean | null
          withdraw_fee: number | null
        }
        Insert: {
          contract_address?: string | null
          created_at?: string | null
          decimals?: number | null
          deposit_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          max_withdraw_amount?: number | null
          min_trade_amount?: number | null
          min_withdraw_amount?: number | null
          name: string
          network?: string | null
          risk_label?: string | null
          symbol: string
          trading_enabled?: boolean | null
          updated_at?: string | null
          withdraw_enabled?: boolean | null
          withdraw_fee?: number | null
        }
        Update: {
          contract_address?: string | null
          created_at?: string | null
          decimals?: number | null
          deposit_enabled?: boolean | null
          id?: string
          logo_url?: string | null
          max_withdraw_amount?: number | null
          min_trade_amount?: number | null
          min_withdraw_amount?: number | null
          name?: string
          network?: string | null
          risk_label?: string | null
          symbol?: string
          trading_enabled?: boolean | null
          updated_at?: string | null
          withdraw_enabled?: boolean | null
          withdraw_fee?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fee_configs: {
        Row: {
          active: boolean | null
          asset_id: string | null
          created_at: string | null
          created_by: string | null
          fee_percentage: number | null
          fee_type: string
          fixed_fee: number | null
          id: string
          pair_id: string | null
          updated_at: string | null
          user_tier: string | null
        }
        Insert: {
          active?: boolean | null
          asset_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fee_percentage?: number | null
          fee_type: string
          fixed_fee?: number | null
          id?: string
          pair_id?: string | null
          updated_at?: string | null
          user_tier?: string | null
        }
        Update: {
          active?: boolean | null
          asset_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fee_percentage?: number | null
          fee_type?: string
          fixed_fee?: number | null
          id?: string
          pair_id?: string | null
          updated_at?: string | null
          user_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_configs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_configs_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      fiat_withdrawals: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_details: Json
          created_at: string | null
          currency: string
          id: string
          processed_at: string | null
          processed_by: string | null
          proof_url: string | null
          reference_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_details: Json
          created_at?: string | null
          currency: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          reference_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_details?: Json
          created_at?: string | null
          currency?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          reference_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          attachments: string[] | null
          claim_amount: number
          created_at: string | null
          description: string | null
          id: string
          payout_amount: number | null
          payout_asset: string | null
          policy_id: string | null
          reason: string
          reference_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          claim_amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          payout_amount?: number | null
          payout_asset?: string | null
          policy_id?: string | null
          reason: string
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          claim_amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payout_amount?: number | null
          payout_asset?: string | null
          policy_id?: string | null
          reason?: string
          reference_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_plans: {
        Row: {
          active: boolean | null
          coverage_amount: number
          coverage_scope: string
          created_at: string | null
          duration_days: number
          exclusions: string[] | null
          id: string
          max_claims: number | null
          name: string
          premium: number
          type: string
          updated_at: string | null
          waiting_period_hours: number | null
        }
        Insert: {
          active?: boolean | null
          coverage_amount: number
          coverage_scope: string
          created_at?: string | null
          duration_days: number
          exclusions?: string[] | null
          id?: string
          max_claims?: number | null
          name: string
          premium: number
          type: string
          updated_at?: string | null
          waiting_period_hours?: number | null
        }
        Update: {
          active?: boolean | null
          coverage_amount?: number
          coverage_scope?: string
          created_at?: string | null
          duration_days?: number
          exclusions?: string[] | null
          id?: string
          max_claims?: number | null
          name?: string
          premium?: number
          type?: string
          updated_at?: string | null
          waiting_period_hours?: number | null
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          coverage_amount: number
          created_at: string | null
          end_date: string
          id: string
          plan_id: string | null
          premium_paid: number
          start_date: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          coverage_amount: number
          created_at?: string | null
          end_date: string
          id?: string
          plan_id?: string | null
          premium_paid: number
          start_date?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          coverage_amount?: number
          created_at?: string | null
          end_date?: string
          id?: string
          plan_id?: string | null
          premium_paid?: number
          start_date?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_draw_configs: {
        Row: {
          created_at: string | null
          draw_date: string
          id: string
          max_winners: number | null
          prize_pool: number
          status: string | null
          ticket_price: number
        }
        Insert: {
          created_at?: string | null
          draw_date: string
          id?: string
          max_winners?: number | null
          prize_pool: number
          status?: string | null
          ticket_price: number
        }
        Update: {
          created_at?: string | null
          draw_date?: string
          id?: string
          max_winners?: number | null
          prize_pool?: number
          status?: string | null
          ticket_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          kyc_status: string | null
          phone: string | null
          two_fa_enabled: boolean | null
          updated_at: string | null
          user_id: string
          withdrawal_locked: boolean | null
        }
        Insert: {
          account_status?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: string | null
          phone?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          withdrawal_locked?: boolean | null
        }
        Update: {
          account_status?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: string | null
          phone?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          withdrawal_locked?: boolean | null
        }
        Relationships: []
      }
      staking_pools: {
        Row: {
          active: boolean | null
          apy: number
          asset_id: string | null
          capacity: number | null
          created_at: string | null
          current_staked: number | null
          early_exit_penalty: number | null
          id: string
          lock_period_days: number
          name: string
          platform_fee: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          apy: number
          asset_id?: string | null
          capacity?: number | null
          created_at?: string | null
          current_staked?: number | null
          early_exit_penalty?: number | null
          id?: string
          lock_period_days: number
          name: string
          platform_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          apy?: number
          asset_id?: string | null
          capacity?: number | null
          created_at?: string | null
          current_staked?: number | null
          early_exit_penalty?: number | null
          id?: string
          lock_period_days?: number
          name?: string
          platform_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staking_pools_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_pairs: {
        Row: {
          active: boolean | null
          base_asset_id: string | null
          created_at: string | null
          id: string
          lot_size: number | null
          maker_fee: number | null
          max_price: number | null
          min_price: number | null
          quote_asset_id: string | null
          symbol: string
          taker_fee: number | null
          tick_size: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_asset_id?: string | null
          created_at?: string | null
          id?: string
          lot_size?: number | null
          maker_fee?: number | null
          max_price?: number | null
          min_price?: number | null
          quote_asset_id?: string | null
          symbol: string
          taker_fee?: number | null
          tick_size?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          base_asset_id?: string | null
          created_at?: string | null
          id?: string
          lot_size?: number | null
          maker_fee?: number | null
          max_price?: number | null
          min_price?: number | null
          quote_asset_id?: string | null
          symbol?: string
          taker_fee?: number | null
          tick_size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_pairs_base_asset_id_fkey"
            columns: ["base_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_pairs_quote_asset_id_fkey"
            columns: ["quote_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
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
      log_admin_action: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "support" | "compliance" | "finance" | "user"
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
      app_role: ["admin", "support", "compliance", "finance", "user"],
    },
  },
} as const

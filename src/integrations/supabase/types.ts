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
      ad_clicks: {
        Row: {
          ad_id: string
          completed_at: string | null
          device_id: string | null
          id: string
          ip_address: unknown | null
          notes: string | null
          reward_bsk: number | null
          rewarded: boolean
          started_at: string
          subscription_tier: string | null
          user_id: string
        }
        Insert: {
          ad_id: string
          completed_at?: string | null
          device_id?: string | null
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          reward_bsk?: number | null
          rewarded?: boolean
          started_at?: string
          subscription_tier?: string | null
          user_id: string
        }
        Update: {
          ad_id?: string
          completed_at?: string | null
          device_id?: string | null
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          reward_bsk?: number | null
          rewarded?: boolean
          started_at?: string
          subscription_tier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string
          device_id: string | null
          id: string
          ip_address: unknown | null
          placement: string | null
          seen_at: string
          user_id: string
        }
        Insert: {
          ad_id: string
          device_id?: string | null
          id?: string
          ip_address?: unknown | null
          placement?: string | null
          seen_at?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          device_id?: string | null
          id?: string
          ip_address?: unknown | null
          placement?: string | null
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_mining_settings: {
        Row: {
          allow_multiple_subscriptions: boolean
          auto_credit_no_inventory: boolean
          bsk_inr_rate: number
          carry_forward_days: number
          created_at: string
          daily_reset_timezone: string
          free_daily_enabled: boolean
          free_daily_reward_bsk: number
          id: string
          max_free_per_day: number
          max_subscription_payout_per_day_per_tier: number
          missed_day_policy: Database["public"]["Enums"]["missed_day_policy"]
          updated_at: string
        }
        Insert: {
          allow_multiple_subscriptions?: boolean
          auto_credit_no_inventory?: boolean
          bsk_inr_rate?: number
          carry_forward_days?: number
          created_at?: string
          daily_reset_timezone?: string
          free_daily_enabled?: boolean
          free_daily_reward_bsk?: number
          id?: string
          max_free_per_day?: number
          max_subscription_payout_per_day_per_tier?: number
          missed_day_policy?: Database["public"]["Enums"]["missed_day_policy"]
          updated_at?: string
        }
        Update: {
          allow_multiple_subscriptions?: boolean
          auto_credit_no_inventory?: boolean
          bsk_inr_rate?: number
          carry_forward_days?: number
          created_at?: string
          daily_reset_timezone?: string
          free_daily_enabled?: boolean
          free_daily_reward_bsk?: number
          id?: string
          max_free_per_day?: number
          max_subscription_payout_per_day_per_tier?: number
          missed_day_policy?: Database["public"]["Enums"]["missed_day_policy"]
          updated_at?: string
        }
        Relationships: []
      }
      ad_subscription_tiers: {
        Row: {
          created_at: string
          daily_bsk: number
          duration_days: number
          id: string
          is_active: boolean
          tier_inr: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_bsk: number
          duration_days?: number
          id?: string
          is_active?: boolean
          tier_inr: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_bsk?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          tier_inr?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_user_subscriptions: {
        Row: {
          created_at: string
          daily_bsk: number
          days_total: number
          end_date: string
          id: string
          policy: Database["public"]["Enums"]["missed_day_policy"]
          purchased_bsk: number
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier_id: string
          tier_inr: number
          total_earned_bsk: number
          total_missed_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_bsk: number
          days_total?: number
          end_date: string
          id?: string
          policy?: Database["public"]["Enums"]["missed_day_policy"]
          purchased_bsk: number
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier_id: string
          tier_inr: number
          total_earned_bsk?: number
          total_missed_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_bsk?: number
          days_total?: number
          end_date?: string
          id?: string
          policy?: Database["public"]["Enums"]["missed_day_policy"]
          purchased_bsk?: number
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier_id?: string
          tier_inr?: number
          total_earned_bsk?: number
          total_missed_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_user_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ad_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_fees_ledger: {
        Row: {
          bsk_rate_snapshot: number
          created_at: string | null
          draw_id: string | null
          fee_bsk: number
          fee_inr: number
          id: string
          metadata: Json | null
          source_type: string
          user_id: string
        }
        Insert: {
          bsk_rate_snapshot: number
          created_at?: string | null
          draw_id?: string | null
          fee_bsk?: number
          fee_inr?: number
          id?: string
          metadata?: Json | null
          source_type: string
          user_id: string
        }
        Update: {
          bsk_rate_snapshot?: number
          created_at?: string | null
          draw_id?: string | null
          fee_bsk?: number
          fee_inr?: number
          id?: string
          metadata?: Json | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          content_category: string | null
          created_at: string
          created_by: string | null
          daily_impression_limit: number | null
          end_at: string | null
          id: string
          image_url: string
          max_impressions_per_user_per_day: number | null
          media_type: string | null
          placement: string
          region_targeting: Json | null
          required_view_time: number
          required_view_time_seconds: number
          reward_bsk: number
          square_image_url: string | null
          start_at: string | null
          status: string
          target_url: string
          title: string
          updated_at: string
          verification_required: boolean
        }
        Insert: {
          content_category?: string | null
          created_at?: string
          created_by?: string | null
          daily_impression_limit?: number | null
          end_at?: string | null
          id?: string
          image_url: string
          max_impressions_per_user_per_day?: number | null
          media_type?: string | null
          placement?: string
          region_targeting?: Json | null
          required_view_time?: number
          required_view_time_seconds?: number
          reward_bsk?: number
          square_image_url?: string | null
          start_at?: string | null
          status?: string
          target_url: string
          title: string
          updated_at?: string
          verification_required?: boolean
        }
        Update: {
          content_category?: string | null
          created_at?: string
          created_by?: string | null
          daily_impression_limit?: number | null
          end_at?: string | null
          id?: string
          image_url?: string
          max_impressions_per_user_per_day?: number | null
          media_type?: string | null
          placement?: string
          region_targeting?: Json | null
          required_view_time?: number
          required_view_time_seconds?: number
          reward_bsk?: number
          square_image_url?: string | null
          start_at?: string | null
          status?: string
          target_url?: string
          title?: string
          updated_at?: string
          verification_required?: boolean
        }
        Relationships: []
      }
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
      allowlist_addresses: {
        Row: {
          address: string
          chain: string
          created_at: string | null
          enabled: boolean | null
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          address: string
          chain: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          label?: string | null
          user_id: string
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_preview: string
          label: string
          last_used: string | null
          revoked: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_preview: string
          label: string
          last_used?: string | null
          revoked?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_preview?: string
          label?: string
          last_used?: string | null
          revoked?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_type: string | null
          contract_address: string | null
          created_at: string | null
          decimals: number | null
          deposit_enabled: boolean | null
          id: string
          initial_price: number | null
          is_active: boolean | null
          logo_file_name: string | null
          logo_file_path: string | null
          logo_url: string | null
          max_withdraw_amount: number | null
          min_trade_amount: number | null
          min_withdraw_amount: number | null
          name: string
          network: string | null
          price_currency: string | null
          risk_label: string | null
          symbol: string
          trading_enabled: boolean | null
          updated_at: string | null
          withdraw_enabled: boolean | null
          withdraw_fee: number | null
        }
        Insert: {
          asset_type?: string | null
          contract_address?: string | null
          created_at?: string | null
          decimals?: number | null
          deposit_enabled?: boolean | null
          id?: string
          initial_price?: number | null
          is_active?: boolean | null
          logo_file_name?: string | null
          logo_file_path?: string | null
          logo_url?: string | null
          max_withdraw_amount?: number | null
          min_trade_amount?: number | null
          min_withdraw_amount?: number | null
          name: string
          network?: string | null
          price_currency?: string | null
          risk_label?: string | null
          symbol: string
          trading_enabled?: boolean | null
          updated_at?: string | null
          withdraw_enabled?: boolean | null
          withdraw_fee?: number | null
        }
        Update: {
          asset_type?: string | null
          contract_address?: string | null
          created_at?: string | null
          decimals?: number | null
          deposit_enabled?: boolean | null
          id?: string
          initial_price?: number | null
          is_active?: boolean | null
          logo_file_name?: string | null
          logo_file_path?: string | null
          logo_url?: string | null
          max_withdraw_amount?: number | null
          min_trade_amount?: number | null
          min_withdraw_amount?: number | null
          name?: string
          network?: string | null
          price_currency?: string | null
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
      badge_purchase_events: {
        Row: {
          commissionable_amount_bsk: number
          created_at: string | null
          event_type: string
          from_badge: string | null
          id: string
          occurred_at: string
          paid_amount_bsk: number
          payment_method: string | null
          payment_ref: string | null
          rate_snapshot: number
          to_badge: string
          user_id: string
        }
        Insert: {
          commissionable_amount_bsk: number
          created_at?: string | null
          event_type: string
          from_badge?: string | null
          id?: string
          occurred_at?: string
          paid_amount_bsk: number
          payment_method?: string | null
          payment_ref?: string | null
          rate_snapshot: number
          to_badge: string
          user_id: string
        }
        Update: {
          commissionable_amount_bsk?: number
          created_at?: string | null
          event_type?: string
          from_badge?: string | null
          id?: string
          occurred_at?: string
          paid_amount_bsk?: number
          payment_method?: string | null
          payment_ref?: string | null
          rate_snapshot?: number
          to_badge?: string
          user_id?: string
        }
        Relationships: []
      }
      badge_purchases: {
        Row: {
          badge_name: string
          bsk_amount: number
          bsk_rate_at_purchase: number
          created_at: string
          id: string
          inr_amount: number
          is_upgrade: boolean
          payment_method: string | null
          payment_ref: string | null
          previous_badge: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_name: string
          bsk_amount: number
          bsk_rate_at_purchase: number
          created_at?: string
          id?: string
          inr_amount: number
          is_upgrade?: boolean
          payment_method?: string | null
          payment_ref?: string | null
          previous_badge?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_name?: string
          bsk_amount?: number
          bsk_rate_at_purchase?: number
          created_at?: string
          id?: string
          inr_amount?: number
          is_upgrade?: boolean
          payment_method?: string | null
          payment_ref?: string | null
          previous_badge?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badge_qualification_audit: {
        Row: {
          admin_user_id: string | null
          badge_qualification_event_id: string | null
          created_at: string
          direct_referrer_reward_id: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          referrer_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          badge_qualification_event_id?: string | null
          created_at?: string
          direct_referrer_reward_id?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          referrer_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          badge_qualification_event_id?: string | null
          created_at?: string
          direct_referrer_reward_id?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          referrer_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badge_qualification_events: {
        Row: {
          badge_name: string
          created_at: string
          id: string
          previous_badge: string | null
          qualification_type: string
          qualifying_amount: number
          transaction_chain: string | null
          transaction_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_name: string
          created_at?: string
          id?: string
          previous_badge?: string | null
          qualification_type?: string
          qualifying_amount: number
          transaction_chain?: string | null
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_name?: string
          created_at?: string
          id?: string
          previous_badge?: string | null
          qualification_type?: string
          qualifying_amount?: number
          transaction_chain?: string | null
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badge_system_settings: {
        Row: {
          auto_settle_enabled: boolean
          cooloff_hours: number
          created_at: string
          detect_self_funding: boolean
          diamond_threshold: number
          direct_referral_percentage: number
          gold_threshold: number
          id: string
          payout_token: string
          per_day_global_cap: number | null
          per_user_daily_cap: number | null
          platinum_threshold: number
          require_net_new_ipg: boolean
          silver_threshold: number
          system_enabled: boolean
          threshold_currency: string
          updated_at: string
          vip_threshold: number
        }
        Insert: {
          auto_settle_enabled?: boolean
          cooloff_hours?: number
          created_at?: string
          detect_self_funding?: boolean
          diamond_threshold?: number
          direct_referral_percentage?: number
          gold_threshold?: number
          id?: string
          payout_token?: string
          per_day_global_cap?: number | null
          per_user_daily_cap?: number | null
          platinum_threshold?: number
          require_net_new_ipg?: boolean
          silver_threshold?: number
          system_enabled?: boolean
          threshold_currency?: string
          updated_at?: string
          vip_threshold?: number
        }
        Update: {
          auto_settle_enabled?: boolean
          cooloff_hours?: number
          created_at?: string
          detect_self_funding?: boolean
          diamond_threshold?: number
          direct_referral_percentage?: number
          gold_threshold?: number
          id?: string
          payout_token?: string
          per_day_global_cap?: number | null
          per_user_daily_cap?: number | null
          platinum_threshold?: number
          require_net_new_ipg?: boolean
          silver_threshold?: number
          system_enabled?: boolean
          threshold_currency?: string
          updated_at?: string
          vip_threshold?: number
        }
        Relationships: []
      }
      badge_thresholds: {
        Row: {
          badge_name: string
          bonus_bsk_holding: number
          bsk_threshold: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          unlock_levels: number
          updated_at: string
        }
        Insert: {
          badge_name: string
          bonus_bsk_holding?: number
          bsk_threshold?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          unlock_levels: number
          updated_at?: string
        }
        Update: {
          badge_name?: string
          bonus_bsk_holding?: number
          bsk_threshold?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          unlock_levels?: number
          updated_at?: string
        }
        Relationships: []
      }
      banking_inr: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          ifsc: string | null
          upi_id: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          ifsc?: string | null
          upi_id?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          ifsc?: string | null
          upi_id?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          address: string
          chain: string
          created_at: string | null
          id: string
          name: string
          note: string | null
          user_id: string
        }
        Insert: {
          address: string
          chain: string
          created_at?: string | null
          id?: string
          name: string
          note?: string | null
          user_id: string
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string | null
          id?: string
          name?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bonus_assets: {
        Row: {
          contract_address: string | null
          created_at: string
          decimals: number
          description: string | null
          id: string
          name: string
          network: string
          status: string
          symbol: string
          updated_at: string
        }
        Insert: {
          contract_address?: string | null
          created_at?: string
          decimals?: number
          description?: string | null
          id?: string
          name: string
          network?: string
          status?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          contract_address?: string | null
          created_at?: string
          decimals?: number
          description?: string | null
          id?: string
          name?: string
          network?: string
          status?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      bonus_ledger: {
        Row: {
          amount_bsk: number
          asset: string
          created_at: string
          id: string
          meta_json: Json | null
          type: string
          usd_value: number | null
          user_id: string
        }
        Insert: {
          amount_bsk: number
          asset?: string
          created_at?: string
          id?: string
          meta_json?: Json | null
          type: string
          usd_value?: number | null
          user_id: string
        }
        Update: {
          amount_bsk?: number
          asset?: string
          created_at?: string
          id?: string
          meta_json?: Json | null
          type?: string
          usd_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      bonus_prices: {
        Row: {
          asset_id: string
          base_symbol: string
          id: string
          price: number
          recorded_at: string
          recorded_by: string | null
        }
        Insert: {
          asset_id: string
          base_symbol?: string
          id?: string
          price: number
          recorded_at?: string
          recorded_by?: string | null
        }
        Update: {
          asset_id?: string
          base_symbol?: string
          id?: string
          price?: number
          recorded_at?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bonus_prices_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "bonus_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_bonus_campaigns: {
        Row: {
          allow_stacking: boolean
          bonus_percent: number
          cooloff_hours: number
          created_at: string
          created_by: string | null
          destination: Database["public"]["Enums"]["bonus_destination"]
          eligible_channels: Database["public"]["Enums"]["purchase_channel"][]
          end_at: string | null
          global_budget_bsk: number | null
          global_budget_used_bsk: number
          id: string
          kyc_required: boolean
          max_purchase_inr: number
          min_purchase_inr: number
          name: string
          per_user_limit: Database["public"]["Enums"]["per_user_limit_type"]
          per_user_max_times: number | null
          rate_snapshot_bsk_inr: number | null
          region_restrictions: Json | null
          stacking_priority: number | null
          start_at: string | null
          status: Database["public"]["Enums"]["promotion_status"]
          updated_at: string
          vesting_duration_days: number | null
          vesting_enabled: boolean
        }
        Insert: {
          allow_stacking?: boolean
          bonus_percent?: number
          cooloff_hours?: number
          created_at?: string
          created_by?: string | null
          destination?: Database["public"]["Enums"]["bonus_destination"]
          eligible_channels?: Database["public"]["Enums"]["purchase_channel"][]
          end_at?: string | null
          global_budget_bsk?: number | null
          global_budget_used_bsk?: number
          id?: string
          kyc_required?: boolean
          max_purchase_inr?: number
          min_purchase_inr?: number
          name?: string
          per_user_limit?: Database["public"]["Enums"]["per_user_limit_type"]
          per_user_max_times?: number | null
          rate_snapshot_bsk_inr?: number | null
          region_restrictions?: Json | null
          stacking_priority?: number | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
          vesting_duration_days?: number | null
          vesting_enabled?: boolean
        }
        Update: {
          allow_stacking?: boolean
          bonus_percent?: number
          cooloff_hours?: number
          created_at?: string
          created_by?: string | null
          destination?: Database["public"]["Enums"]["bonus_destination"]
          eligible_channels?: Database["public"]["Enums"]["purchase_channel"][]
          end_at?: string | null
          global_budget_bsk?: number | null
          global_budget_used_bsk?: number
          id?: string
          kyc_required?: boolean
          max_purchase_inr?: number
          min_purchase_inr?: number
          name?: string
          per_user_limit?: Database["public"]["Enums"]["per_user_limit_type"]
          per_user_max_times?: number | null
          rate_snapshot_bsk_inr?: number | null
          region_restrictions?: Json | null
          stacking_priority?: number | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
          vesting_duration_days?: number | null
          vesting_enabled?: boolean
        }
        Relationships: []
      }
      bsk_bonus_events: {
        Row: {
          bonus_bsk: number
          campaign_id: string
          channel: Database["public"]["Enums"]["purchase_channel"]
          clawback_at: string | null
          clawback_reason: string | null
          created_at: string
          destination: Database["public"]["Enums"]["bonus_destination"]
          effective_purchase_inr: number
          id: string
          purchase_id: string
          purchase_inr: number
          rate_snapshot_bsk_inr: number
          settled_at: string | null
          status: Database["public"]["Enums"]["bonus_event_status"]
          updated_at: string
          user_id: string
          vesting_schedule_id: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          bonus_bsk: number
          campaign_id: string
          channel: Database["public"]["Enums"]["purchase_channel"]
          clawback_at?: string | null
          clawback_reason?: string | null
          created_at?: string
          destination: Database["public"]["Enums"]["bonus_destination"]
          effective_purchase_inr: number
          id?: string
          purchase_id: string
          purchase_inr: number
          rate_snapshot_bsk_inr: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["bonus_event_status"]
          updated_at?: string
          user_id: string
          vesting_schedule_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          bonus_bsk?: number
          campaign_id?: string
          channel?: Database["public"]["Enums"]["purchase_channel"]
          clawback_at?: string | null
          clawback_reason?: string | null
          created_at?: string
          destination?: Database["public"]["Enums"]["bonus_destination"]
          effective_purchase_inr?: number
          id?: string
          purchase_id?: string
          purchase_inr?: number
          rate_snapshot_bsk_inr?: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["bonus_event_status"]
          updated_at?: string
          user_id?: string
          vesting_schedule_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bsk_bonus_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bsk_bonus_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_bonus_vesting_schedules: {
        Row: {
          bonus_event_id: string
          bsk_pending: number
          bsk_released: number
          created_at: string
          daily_release_bsk: number
          days_completed: number
          days_total: number
          id: string
          is_active: boolean
          next_release_date: string | null
          start_date: string
          total_bsk: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_event_id: string
          bsk_pending: number
          bsk_released?: number
          created_at?: string
          daily_release_bsk: number
          days_completed?: number
          days_total: number
          id?: string
          is_active?: boolean
          next_release_date?: string | null
          start_date: string
          total_bsk: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_event_id?: string
          bsk_pending?: number
          bsk_released?: number
          created_at?: string
          daily_release_bsk?: number
          days_completed?: number
          days_total?: number
          id?: string
          is_active?: boolean
          next_release_date?: string | null
          start_date?: string
          total_bsk?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsk_bonus_vesting_schedules_bonus_event_id_fkey"
            columns: ["bonus_event_id"]
            isOneToOne: false
            referencedRelation: "bsk_bonus_events"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_holding_ledger: {
        Row: {
          amount_bsk: number
          amount_inr: number
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          locked_until: string | null
          metadata: Json | null
          notes: string | null
          rate_snapshot: number
          reference_id: string | null
          release_schedule_id: string | null
          tx_subtype: string | null
          tx_type: string
          user_id: string
        }
        Insert: {
          amount_bsk: number
          amount_inr: number
          balance_after: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          locked_until?: string | null
          metadata?: Json | null
          notes?: string | null
          rate_snapshot: number
          reference_id?: string | null
          release_schedule_id?: string | null
          tx_subtype?: string | null
          tx_type: string
          user_id: string
        }
        Update: {
          amount_bsk?: number
          amount_inr?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          locked_until?: string | null
          metadata?: Json | null
          notes?: string | null
          rate_snapshot?: number
          reference_id?: string | null
          release_schedule_id?: string | null
          tx_subtype?: string | null
          tx_type?: string
          user_id?: string
        }
        Relationships: []
      }
      bsk_loan_applications: {
        Row: {
          applied_at: string
          approved_at: string | null
          approved_by: string | null
          config_id: string | null
          created_at: string
          disbursed_at: string | null
          duration_weeks: number
          id: string
          interest_rate_percent: number
          loan_amount: number
          notes: string | null
          processing_fee: number
          rejection_reason: string | null
          status: Database["public"]["Enums"]["bsk_loan_status"]
          total_repayment: number
          updated_at: string
          user_id: string
          weekly_payment: number
        }
        Insert: {
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          config_id?: string | null
          created_at?: string
          disbursed_at?: string | null
          duration_weeks: number
          id?: string
          interest_rate_percent: number
          loan_amount: number
          notes?: string | null
          processing_fee: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["bsk_loan_status"]
          total_repayment: number
          updated_at?: string
          user_id: string
          weekly_payment: number
        }
        Update: {
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          config_id?: string | null
          created_at?: string
          disbursed_at?: string | null
          duration_weeks?: number
          id?: string
          interest_rate_percent?: number
          loan_amount?: number
          notes?: string | null
          processing_fee?: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["bsk_loan_status"]
          total_repayment?: number
          updated_at?: string
          user_id?: string
          weekly_payment?: number
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_applications_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bsk_loan_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_loan_configs: {
        Row: {
          created_at: string
          created_by: string | null
          duration_weeks: number
          id: string
          interest_rate_percent: number
          is_enabled: boolean
          late_payment_fee: number
          max_loan_amount: number
          min_loan_amount: number
          processing_fee_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_weeks?: number
          id?: string
          interest_rate_percent?: number
          is_enabled?: boolean
          late_payment_fee?: number
          max_loan_amount?: number
          min_loan_amount?: number
          processing_fee_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_weeks?: number
          id?: string
          interest_rate_percent?: number
          is_enabled?: boolean
          late_payment_fee?: number
          max_loan_amount?: number
          min_loan_amount?: number
          processing_fee_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      bsk_loan_installments: {
        Row: {
          created_at: string
          due_date: string
          emi_bsk: number | null
          emi_inr: number | null
          id: string
          installment_number: number
          interest_bsk: number
          late_fee_bsk: number
          loan_id: string
          paid_at: string | null
          paid_bsk: number
          payment_rate_snapshot: number | null
          principal_bsk: number
          status: string
          total_due_bsk: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          emi_bsk?: number | null
          emi_inr?: number | null
          id?: string
          installment_number: number
          interest_bsk?: number
          late_fee_bsk?: number
          loan_id: string
          paid_at?: string | null
          paid_bsk?: number
          payment_rate_snapshot?: number | null
          principal_bsk?: number
          status?: string
          total_due_bsk: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          emi_bsk?: number | null
          emi_inr?: number | null
          id?: string
          installment_number?: number
          interest_bsk?: number
          late_fee_bsk?: number
          loan_id?: string
          paid_at?: string | null
          paid_bsk?: number
          payment_rate_snapshot?: number | null
          principal_bsk?: number
          status?: string
          total_due_bsk?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "bsk_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_loan_ledger: {
        Row: {
          amount_bsk: number
          amount_inr: number
          balance_type: string
          direction: string
          id: string
          idempotency_key: string | null
          installment_id: string | null
          loan_id: string | null
          metadata: Json | null
          notes: string | null
          processed_at: string
          processed_by: string | null
          rate_snapshot: number
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount_bsk: number
          amount_inr: number
          balance_type?: string
          direction: string
          id?: string
          idempotency_key?: string | null
          installment_id?: string | null
          loan_id?: string | null
          metadata?: Json | null
          notes?: string | null
          processed_at?: string
          processed_by?: string | null
          rate_snapshot: number
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount_bsk?: number
          amount_inr?: number
          balance_type?: string
          direction?: string
          id?: string
          idempotency_key?: string | null
          installment_id?: string | null
          loan_id?: string | null
          metadata?: Json | null
          notes?: string | null
          processed_at?: string
          processed_by?: string | null
          rate_snapshot?: number
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_ledger_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "bsk_loan_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bsk_loan_ledger_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "bsk_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_loan_payments: {
        Row: {
          created_at: string
          due_date: string
          id: string
          late_fee: number | null
          loan_id: string
          paid_date: string | null
          payment_amount: number
          status: string
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          late_fee?: number | null
          loan_id: string
          paid_date?: string | null
          payment_amount: number
          status?: string
          updated_at?: string
          user_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          late_fee?: number | null
          loan_id?: string
          paid_date?: string | null
          payment_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "bsk_loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_loan_settings: {
        Row: {
          autopay_enabled: boolean
          badge_limits: Json
          created_at: string
          created_by: string | null
          daily_disbursal_cap_inr: number | null
          default_interest_rate_weekly: number
          default_tenor_weeks: number
          global_exposure_cap_inr: number | null
          grace_period_days: number
          id: string
          interest_type: string
          kyc_required: boolean
          late_fee_percent: number
          max_amount_inr: number
          max_concurrent_loans_per_user: number
          min_account_age_days: number
          min_amount_inr: number
          origination_fee_percent: number
          per_user_exposure_cap_inr: number | null
          prepayment_allowed: boolean
          prepayment_penalty_percent: number
          region_restrictions: Json
          schedule_denomination: string
          system_enabled: boolean
          updated_at: string
        }
        Insert: {
          autopay_enabled?: boolean
          badge_limits?: Json
          created_at?: string
          created_by?: string | null
          daily_disbursal_cap_inr?: number | null
          default_interest_rate_weekly?: number
          default_tenor_weeks?: number
          global_exposure_cap_inr?: number | null
          grace_period_days?: number
          id?: string
          interest_type?: string
          kyc_required?: boolean
          late_fee_percent?: number
          max_amount_inr?: number
          max_concurrent_loans_per_user?: number
          min_account_age_days?: number
          min_amount_inr?: number
          origination_fee_percent?: number
          per_user_exposure_cap_inr?: number | null
          prepayment_allowed?: boolean
          prepayment_penalty_percent?: number
          region_restrictions?: Json
          schedule_denomination?: string
          system_enabled?: boolean
          updated_at?: string
        }
        Update: {
          autopay_enabled?: boolean
          badge_limits?: Json
          created_at?: string
          created_by?: string | null
          daily_disbursal_cap_inr?: number | null
          default_interest_rate_weekly?: number
          default_tenor_weeks?: number
          global_exposure_cap_inr?: number | null
          grace_period_days?: number
          id?: string
          interest_type?: string
          kyc_required?: boolean
          late_fee_percent?: number
          max_amount_inr?: number
          max_concurrent_loans_per_user?: number
          min_account_age_days?: number
          min_amount_inr?: number
          origination_fee_percent?: number
          per_user_exposure_cap_inr?: number | null
          prepayment_allowed?: boolean
          prepayment_penalty_percent?: number
          region_restrictions?: Json
          schedule_denomination?: string
          system_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bsk_loans: {
        Row: {
          admin_notes: string | null
          amount_inr: number
          applied_at: string
          approved_at: string | null
          approved_by: string | null
          closed_at: string | null
          created_at: string
          days_past_due: number
          disbursal_rate_snapshot: number
          disbursed_at: string | null
          disbursed_by: string | null
          grace_period_days: number
          id: string
          interest_rate_weekly: number
          interest_type: string
          late_fee_percent: number
          loan_number: string
          net_disbursed_bsk: number
          next_due_date: string | null
          origination_fee_bsk: number
          origination_fee_percent: number
          outstanding_bsk: number
          paid_bsk: number
          policy_snapshot: Json
          principal_bsk: number
          region: string
          schedule_denomination: string
          status: string
          tenor_weeks: number
          total_due_bsk: number
          updated_at: string
          user_badge: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_inr: number
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          days_past_due?: number
          disbursal_rate_snapshot: number
          disbursed_at?: string | null
          disbursed_by?: string | null
          grace_period_days?: number
          id?: string
          interest_rate_weekly?: number
          interest_type?: string
          late_fee_percent?: number
          loan_number: string
          net_disbursed_bsk: number
          next_due_date?: string | null
          origination_fee_bsk?: number
          origination_fee_percent?: number
          outstanding_bsk: number
          paid_bsk?: number
          policy_snapshot?: Json
          principal_bsk: number
          region?: string
          schedule_denomination?: string
          status?: string
          tenor_weeks?: number
          total_due_bsk: number
          updated_at?: string
          user_badge?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_inr?: number
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          created_at?: string
          days_past_due?: number
          disbursal_rate_snapshot?: number
          disbursed_at?: string | null
          disbursed_by?: string | null
          grace_period_days?: number
          id?: string
          interest_rate_weekly?: number
          interest_type?: string
          late_fee_percent?: number
          loan_number?: string
          net_disbursed_bsk?: number
          next_due_date?: string | null
          origination_fee_bsk?: number
          origination_fee_percent?: number
          outstanding_bsk?: number
          paid_bsk?: number
          policy_snapshot?: Json
          principal_bsk?: number
          region?: string
          schedule_denomination?: string
          status?: string
          tenor_weeks?: number
          total_due_bsk?: number
          updated_at?: string
          user_badge?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bsk_rate_snapshots: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          previous_rate: number | null
          rate: number
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          previous_rate?: number | null
          rate: number
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          previous_rate?: number | null
          rate?: number
          reason?: string | null
        }
        Relationships: []
      }
      bsk_rates: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          rate_inr_per_bsk: number
          set_by: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          rate_inr_per_bsk: number
          set_by: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          rate_inr_per_bsk?: number
          set_by?: string
        }
        Relationships: []
      }
      bsk_vesting_config: {
        Row: {
          anti_sybil_max_per_ip: number | null
          created_at: string
          daily_release_percent: number
          eligible_chains: string[]
          id: string
          is_enabled: boolean
          max_ipg_swap_amount: number | null
          max_vesting_per_user: number | null
          min_ipg_swap_amount: number
          referral_reward_percent: number
          updated_at: string
          vesting_duration_days: number
        }
        Insert: {
          anti_sybil_max_per_ip?: number | null
          created_at?: string
          daily_release_percent?: number
          eligible_chains?: string[]
          id?: string
          is_enabled?: boolean
          max_ipg_swap_amount?: number | null
          max_vesting_per_user?: number | null
          min_ipg_swap_amount?: number
          referral_reward_percent?: number
          updated_at?: string
          vesting_duration_days?: number
        }
        Update: {
          anti_sybil_max_per_ip?: number | null
          created_at?: string
          daily_release_percent?: number
          eligible_chains?: string[]
          id?: string
          is_enabled?: boolean
          max_ipg_swap_amount?: number | null
          max_vesting_per_user?: number | null
          min_ipg_swap_amount?: number
          referral_reward_percent?: number
          updated_at?: string
          vesting_duration_days?: number
        }
        Relationships: []
      }
      bsk_vesting_referral_rewards: {
        Row: {
          id: string
          processed_at: string
          referee_id: string
          referrer_id: string
          reward_amount: number
          reward_date: string
          status: string
          vesting_release_id: string | null
        }
        Insert: {
          id?: string
          processed_at?: string
          referee_id: string
          referrer_id: string
          reward_amount: number
          reward_date: string
          status?: string
          vesting_release_id?: string | null
        }
        Update: {
          id?: string
          processed_at?: string
          referee_id?: string
          referrer_id?: string
          reward_amount?: number
          reward_date?: string
          status?: string
          vesting_release_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bsk_vesting_referral_rewards_vesting_release_id_fkey"
            columns: ["vesting_release_id"]
            isOneToOne: false
            referencedRelation: "bsk_vesting_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_vesting_releases: {
        Row: {
          batch_id: string | null
          bsk_amount: number
          day_number: number
          id: string
          processed_at: string
          referrer_id: string | null
          referrer_reward_amount: number | null
          release_date: string
          status: string
          user_id: string
          vesting_id: string | null
        }
        Insert: {
          batch_id?: string | null
          bsk_amount: number
          day_number: number
          id?: string
          processed_at?: string
          referrer_id?: string | null
          referrer_reward_amount?: number | null
          release_date: string
          status?: string
          user_id: string
          vesting_id?: string | null
        }
        Update: {
          batch_id?: string | null
          bsk_amount?: number
          day_number?: number
          id?: string
          processed_at?: string
          referrer_id?: string | null
          referrer_reward_amount?: number | null
          release_date?: string
          status?: string
          user_id?: string
          vesting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bsk_vesting_releases_vesting_id_fkey"
            columns: ["vesting_id"]
            isOneToOne: false
            referencedRelation: "user_bsk_vesting"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_withdrawable_ledger: {
        Row: {
          amount_bsk: number
          amount_inr: number
          balance_after: number
          balance_before: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          notes: string | null
          rate_snapshot: number
          reference_id: string | null
          tx_subtype: string | null
          tx_type: string
          user_id: string
        }
        Insert: {
          amount_bsk: number
          amount_inr: number
          balance_after: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          notes?: string | null
          rate_snapshot: number
          reference_id?: string | null
          tx_subtype?: string | null
          tx_type: string
          user_id: string
        }
        Update: {
          amount_bsk?: number
          amount_inr?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          notes?: string | null
          rate_snapshot?: number
          reference_id?: string | null
          tx_subtype?: string | null
          tx_type?: string
          user_id?: string
        }
        Relationships: []
      }
      commission_audit_log: {
        Row: {
          action: string
          created_at: string | null
          eligibility_met: boolean | null
          event_id: string | null
          id: string
          metadata: Json | null
          reason: string | null
          required_badge: string | null
          sponsor_badge: string | null
          sponsor_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          eligibility_met?: boolean | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          required_badge?: string | null
          sponsor_badge?: string | null
          sponsor_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          eligibility_met?: boolean | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          required_badge?: string | null
          sponsor_badge?: string | null
          sponsor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "badge_purchase_events"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          capped: boolean | null
          clawed_back_at: string | null
          commission_bsk: number
          commission_percent: number
          commissionable_bsk: number
          created_at: string | null
          destination: string
          eligibility_met: boolean
          event_id: string
          id: string
          idempotency_key: string
          reason: string | null
          referred_user_id: string
          required_badge_at_event: string | null
          settled_at: string | null
          sponsor_badge_at_event: string | null
          sponsor_id: string
          status: string
          voided_at: string | null
        }
        Insert: {
          capped?: boolean | null
          clawed_back_at?: string | null
          commission_bsk: number
          commission_percent: number
          commissionable_bsk: number
          created_at?: string | null
          destination: string
          eligibility_met?: boolean
          event_id: string
          id?: string
          idempotency_key: string
          reason?: string | null
          referred_user_id: string
          required_badge_at_event?: string | null
          settled_at?: string | null
          sponsor_badge_at_event?: string | null
          sponsor_id: string
          status?: string
          voided_at?: string | null
        }
        Update: {
          capped?: boolean | null
          clawed_back_at?: string | null
          commission_bsk?: number
          commission_percent?: number
          commissionable_bsk?: number
          created_at?: string | null
          destination?: string
          eligibility_met?: boolean
          event_id?: string
          id?: string
          idempotency_key?: string
          reason?: string | null
          referred_user_id?: string
          required_badge_at_event?: string | null
          settled_at?: string | null
          sponsor_badge_at_event?: string | null
          sponsor_id?: string
          status?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "badge_purchase_events"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          amount_from: number
          amount_to: number
          created_at: string
          fee: number | null
          fee_percent: number | null
          from_asset: string
          id: string
          rate: number
          to_asset: string
          user_id: string
        }
        Insert: {
          amount_from: number
          amount_to: number
          created_at?: string
          fee?: number | null
          fee_percent?: number | null
          from_asset?: string
          id?: string
          rate: number
          to_asset?: string
          user_id: string
        }
        Update: {
          amount_from?: number
          amount_to?: number
          created_at?: string
          fee?: number | null
          fee_percent?: number | null
          from_asset?: string
          id?: string
          rate?: number
          to_asset?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_commission_totals: {
        Row: {
          created_at: string | null
          date: string
          id: string
          total_commission_bsk: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          total_commission_bsk?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          total_commission_bsk?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          claimed_at: string
          day_in_cycle: number
          id: string
          reward_amount: number
          reward_type: string
          streak_day: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          day_in_cycle: number
          id?: string
          reward_amount: number
          reward_type: string
          streak_day: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          day_in_cycle?: number
          id?: string
          reward_amount?: number
          reward_type?: string
          streak_day?: number
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string | null
          device_name: string | null
          id: string
          last_ip: string | null
          last_seen: string | null
          trusted: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          last_ip?: string | null
          last_seen?: string | null
          trusted?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          id?: string
          last_ip?: string | null
          last_seen?: string | null
          trusted?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      direct_referrer_rewards: {
        Row: {
          badge_qualification_event_id: string
          clawback_at: string | null
          clawback_by: string | null
          clawback_reason: string | null
          cooloff_until: string | null
          created_at: string
          id: string
          referrer_id: string
          reward_amount: number
          reward_token: string
          reward_token_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_qualification_event_id: string
          clawback_at?: string | null
          clawback_by?: string | null
          clawback_reason?: string | null
          cooloff_until?: string | null
          created_at?: string
          id?: string
          referrer_id: string
          reward_amount: number
          reward_token?: string
          reward_token_amount: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_qualification_event_id?: string
          clawback_at?: string | null
          clawback_by?: string | null
          clawback_reason?: string | null
          cooloff_until?: string | null
          created_at?: string
          id?: string
          referrer_id?: string
          reward_amount?: number
          reward_token?: string
          reward_token_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_referrer_rewards_badge_qualification_event_id_fkey"
            columns: ["badge_qualification_event_id"]
            isOneToOne: false
            referencedRelation: "badge_qualification_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_referrer_rewards_badge_qualification_event_id_fkey1"
            columns: ["badge_qualification_event_id"]
            isOneToOne: false
            referencedRelation: "badge_qualification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_configs: {
        Row: {
          client_seed: string | null
          created_at: string | null
          created_by: string
          current_participants: number | null
          description: string | null
          enable_referral_events: boolean | null
          expiry_time: string | null
          fee_percent: number
          id: string
          image_url: string | null
          kyc_required: boolean | null
          min_tickets_for_scheduled: number | null
          nonce: number | null
          per_user_ticket_cap: number
          pool_size: number
          region_restrictions: Json | null
          scheduled_time: string | null
          server_seed: string | null
          server_seed_hash: string | null
          start_mode: string
          state: Database["public"]["Enums"]["draw_state"] | null
          ticket_price_inr: number
          title: string
          updated_at: string | null
          winners_determined_at: string | null
        }
        Insert: {
          client_seed?: string | null
          created_at?: string | null
          created_by: string
          current_participants?: number | null
          description?: string | null
          enable_referral_events?: boolean | null
          expiry_time?: string | null
          fee_percent?: number
          id?: string
          image_url?: string | null
          kyc_required?: boolean | null
          min_tickets_for_scheduled?: number | null
          nonce?: number | null
          per_user_ticket_cap?: number
          pool_size?: number
          region_restrictions?: Json | null
          scheduled_time?: string | null
          server_seed?: string | null
          server_seed_hash?: string | null
          start_mode?: string
          state?: Database["public"]["Enums"]["draw_state"] | null
          ticket_price_inr: number
          title: string
          updated_at?: string | null
          winners_determined_at?: string | null
        }
        Update: {
          client_seed?: string | null
          created_at?: string | null
          created_by?: string
          current_participants?: number | null
          description?: string | null
          enable_referral_events?: boolean | null
          expiry_time?: string | null
          fee_percent?: number
          id?: string
          image_url?: string | null
          kyc_required?: boolean | null
          min_tickets_for_scheduled?: number | null
          nonce?: number | null
          per_user_ticket_cap?: number
          pool_size?: number
          region_restrictions?: Json | null
          scheduled_time?: string | null
          server_seed?: string | null
          server_seed_hash?: string | null
          start_mode?: string
          state?: Database["public"]["Enums"]["draw_state"] | null
          ticket_price_inr?: number
          title?: string
          updated_at?: string | null
          winners_determined_at?: string | null
        }
        Relationships: []
      }
      draw_prizes: {
        Row: {
          amount_inr: number
          created_at: string | null
          draw_id: string
          id: string
          rank: Database["public"]["Enums"]["winner_rank"]
        }
        Insert: {
          amount_inr: number
          created_at?: string | null
          draw_id: string
          id?: string
          rank: Database["public"]["Enums"]["winner_rank"]
        }
        Update: {
          amount_inr?: number
          created_at?: string | null
          draw_id?: string
          id?: string
          rank?: Database["public"]["Enums"]["winner_rank"]
        }
        Relationships: [
          {
            foreignKeyName: "draw_prizes_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draw_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_results: {
        Row: {
          client_seed: string
          created_at: string | null
          draw_id: string
          id: string
          nonce: number
          proof_data: Json
          server_seed: string
          ticket_ids_ordered: Json
          winners: Json
        }
        Insert: {
          client_seed: string
          created_at?: string | null
          draw_id: string
          id?: string
          nonce: number
          proof_data: Json
          server_seed: string
          ticket_ids_ordered: Json
          winners: Json
        }
        Update: {
          client_seed?: string
          created_at?: string | null
          draw_id?: string
          id?: string
          nonce?: number
          proof_data?: Json
          server_seed?: string
          ticket_ids_ordered?: Json
          winners?: Json
        }
        Relationships: [
          {
            foreignKeyName: "draw_results_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draw_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_templates: {
        Row: {
          created_at: string | null
          description: string | null
          fee_percent: number
          id: string
          is_active: boolean | null
          name: string
          pool_size: number
          prizes: Json
          ticket_price_inr: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fee_percent?: number
          id?: string
          is_active?: boolean | null
          name: string
          pool_size: number
          prizes: Json
          ticket_price_inr: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fee_percent?: number
          id?: string
          is_active?: boolean | null
          name?: string
          pool_size?: number
          prizes?: Json
          ticket_price_inr?: number
          title?: string
        }
        Relationships: []
      }
      draw_tickets: {
        Row: {
          bsk_paid: number
          bsk_rate_snapshot: number
          config_snapshot: Json
          created_at: string | null
          draw_id: string
          fee_bsk: number | null
          id: string
          inr_amount: number
          prize_bsk_gross: number | null
          prize_bsk_net: number | null
          prize_rank: Database["public"]["Enums"]["winner_rank"] | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number: string
          user_id: string
        }
        Insert: {
          bsk_paid: number
          bsk_rate_snapshot: number
          config_snapshot: Json
          created_at?: string | null
          draw_id: string
          fee_bsk?: number | null
          id?: string
          inr_amount: number
          prize_bsk_gross?: number | null
          prize_bsk_net?: number | null
          prize_rank?: Database["public"]["Enums"]["winner_rank"] | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number: string
          user_id: string
        }
        Update: {
          bsk_paid?: number
          bsk_rate_snapshot?: number
          config_snapshot?: Json
          created_at?: string | null
          draw_id?: string
          fee_bsk?: number | null
          id?: string
          inr_amount?: number
          prize_bsk_gross?: number | null
          prize_bsk_net?: number | null
          prize_rank?: Database["public"]["Enums"]["winner_rank"] | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_tickets_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draw_configs"
            referencedColumns: ["id"]
          },
        ]
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
      fiat_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
          ifsc: string
          is_active: boolean | null
          is_default: boolean | null
          label: string
          notes: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          ifsc: string
          is_active?: boolean | null
          is_default?: boolean | null
          label: string
          notes?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          ifsc?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string
          notes?: string | null
        }
        Relationships: []
      }
      fiat_deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          fee: number | null
          id: string
          method: string
          net_credit: number | null
          proof_url: string | null
          reference: string | null
          route_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          fee?: number | null
          id?: string
          method: string
          net_credit?: number | null
          proof_url?: string | null
          reference?: string | null
          route_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          fee?: number | null
          id?: string
          method?: string
          net_credit?: number | null
          proof_url?: string | null
          reference?: string | null
          route_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      fiat_settings_inr: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          enabled: boolean
          fee_fixed: number | null
          fee_percent: number | null
          id: string
          ifsc: string | null
          min_deposit: number | null
          notes: string | null
          updated_at: string
          upi_id: string | null
          upi_name: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          enabled?: boolean
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          ifsc?: string | null
          min_deposit?: number | null
          notes?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_name?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          enabled?: boolean
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          ifsc?: string | null
          min_deposit?: number | null
          notes?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_name?: string | null
        }
        Relationships: []
      }
      fiat_upi_accounts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string
          notes: string | null
          upi_id: string
          upi_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label: string
          notes?: string | null
          upi_id: string
          upi_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string
          notes?: string | null
          upi_id?: string
          upi_name?: string
        }
        Relationships: []
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
      fx_rates: {
        Row: {
          base: string
          created_at: string
          id: string
          quote: string
          rate: number
          updated_at: string
        }
        Insert: {
          base: string
          created_at?: string
          id?: string
          quote: string
          rate: number
          updated_at?: string
        }
        Update: {
          base?: string
          created_at?: string
          id?: string
          quote?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      inr_funding_routes: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          fee_fixed: number | null
          fee_percent: number | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          is_default: boolean | null
          max_amount: number | null
          min_amount: number | null
          notes: string | null
          priority: number | null
          route_type: string
          updated_at: string | null
          upi_id: string | null
          upi_name: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          priority?: number | null
          route_type: string
          updated_at?: string | null
          upi_id?: string | null
          upi_name?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          priority?: number | null
          route_type?: string
          updated_at?: string | null
          upi_id?: string | null
          upi_name?: string | null
        }
        Relationships: []
      }
      insurance_admin_controls: {
        Row: {
          control_settings: Json
          control_type: string
          created_at: string
          created_by: string | null
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          control_settings?: Json
          control_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          control_settings?: Json
          control_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      insurance_bsk_claims: {
        Row: {
          admin_notes: string | null
          approved_amount_inr: number | null
          approved_at: string | null
          claim_reference: string
          claim_type: string
          created_at: string | null
          description: string | null
          evidence_documents: Json | null
          id: string
          incident_at: string | null
          internal_data: Json | null
          paid_at: string | null
          payout_bsk: number | null
          payout_rate_snapshot: number | null
          period_end: string | null
          period_start: string | null
          policy_id: string
          rejection_reason: string | null
          requested_amount_inr: number | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_amount_inr?: number | null
          approved_at?: string | null
          claim_reference: string
          claim_type: string
          created_at?: string | null
          description?: string | null
          evidence_documents?: Json | null
          id?: string
          incident_at?: string | null
          internal_data?: Json | null
          paid_at?: string | null
          payout_bsk?: number | null
          payout_rate_snapshot?: number | null
          period_end?: string | null
          period_start?: string | null
          policy_id: string
          rejection_reason?: string | null
          requested_amount_inr?: number | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_amount_inr?: number | null
          approved_at?: string | null
          claim_reference?: string
          claim_type?: string
          created_at?: string | null
          description?: string | null
          evidence_documents?: Json | null
          id?: string
          incident_at?: string | null
          internal_data?: Json | null
          paid_at?: string | null
          payout_bsk?: number | null
          payout_rate_snapshot?: number | null
          period_end?: string | null
          period_start?: string | null
          policy_id?: string
          rejection_reason?: string | null
          requested_amount_inr?: number | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_bsk_claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_bsk_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_bsk_global_settings: {
        Row: {
          admin_approval_required: boolean | null
          audit_all_transactions: boolean | null
          auto_approval_enabled: boolean | null
          created_at: string | null
          disclaimer_text: string | null
          id: string
          kyc_required_for_payout: boolean | null
          manual_review_required: boolean | null
          payout_destination: string | null
          refund_window_hours: number | null
          region_restrictions: Json | null
          system_enabled: boolean
          updated_at: string | null
        }
        Insert: {
          admin_approval_required?: boolean | null
          audit_all_transactions?: boolean | null
          auto_approval_enabled?: boolean | null
          created_at?: string | null
          disclaimer_text?: string | null
          id?: string
          kyc_required_for_payout?: boolean | null
          manual_review_required?: boolean | null
          payout_destination?: string | null
          refund_window_hours?: number | null
          region_restrictions?: Json | null
          system_enabled?: boolean
          updated_at?: string | null
        }
        Update: {
          admin_approval_required?: boolean | null
          audit_all_transactions?: boolean | null
          auto_approval_enabled?: boolean | null
          created_at?: string | null
          disclaimer_text?: string | null
          id?: string
          kyc_required_for_payout?: boolean | null
          manual_review_required?: boolean | null
          payout_destination?: string | null
          refund_window_hours?: number | null
          region_restrictions?: Json | null
          system_enabled?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      insurance_bsk_ledger: {
        Row: {
          bsk_amount: number
          claim_id: string | null
          created_at: string | null
          destination: string | null
          id: string
          idempotency_key: string | null
          inr_amount: number
          metadata: Json | null
          plan_type: string
          policy_id: string | null
          processed_at: string | null
          processor_id: string | null
          rate_snapshot: number
          type: string
          user_id: string
        }
        Insert: {
          bsk_amount: number
          claim_id?: string | null
          created_at?: string | null
          destination?: string | null
          id?: string
          idempotency_key?: string | null
          inr_amount: number
          metadata?: Json | null
          plan_type: string
          policy_id?: string | null
          processed_at?: string | null
          processor_id?: string | null
          rate_snapshot: number
          type: string
          user_id: string
        }
        Update: {
          bsk_amount?: number
          claim_id?: string | null
          created_at?: string | null
          destination?: string | null
          id?: string
          idempotency_key?: string | null
          inr_amount?: number
          metadata?: Json | null
          plan_type?: string
          policy_id?: string | null
          processed_at?: string | null
          processor_id?: string | null
          rate_snapshot?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_bsk_ledger_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_bsk_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_bsk_ledger_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_bsk_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_bsk_plan_configs: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          plan_settings: Json
          plan_type: string
          premium_inr: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          plan_settings?: Json
          plan_type: string
          premium_inr?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          plan_settings?: Json
          plan_type?: string
          premium_inr?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      insurance_bsk_plans: {
        Row: {
          coverage_ratio: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_age: number | null
          max_coverage_bsk: number
          min_age: number | null
          min_loss_required_bsk: number | null
          plan_name: string
          plan_type: string
          premium_bsk: number
          premium_frequency: string
          terms_conditions: Json | null
          updated_at: string
        }
        Insert: {
          coverage_ratio?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_age?: number | null
          max_coverage_bsk?: number
          min_age?: number | null
          min_loss_required_bsk?: number | null
          plan_name: string
          plan_type: string
          premium_bsk?: number
          premium_frequency?: string
          terms_conditions?: Json | null
          updated_at?: string
        }
        Update: {
          coverage_ratio?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_age?: number | null
          max_coverage_bsk?: number
          min_age?: number | null
          min_loss_required_bsk?: number | null
          plan_name?: string
          plan_type?: string
          premium_bsk?: number
          premium_frequency?: string
          terms_conditions?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      insurance_bsk_policies: {
        Row: {
          beneficiaries: Json | null
          coverage_config: Json
          created_at: string | null
          end_at: string | null
          id: string
          maturity_at: string | null
          plan_type: string
          policy_number: string
          premium_bsk: number
          premium_inr: number
          rate_snapshot: number
          region: string
          start_at: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          beneficiaries?: Json | null
          coverage_config: Json
          created_at?: string | null
          end_at?: string | null
          id?: string
          maturity_at?: string | null
          plan_type: string
          policy_number: string
          premium_bsk: number
          premium_inr: number
          rate_snapshot: number
          region: string
          start_at?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          beneficiaries?: Json | null
          coverage_config?: Json
          created_at?: string | null
          end_at?: string | null
          id?: string
          maturity_at?: string | null
          plan_type?: string
          policy_number?: string
          premium_bsk?: number
          premium_inr?: number
          rate_snapshot?: number
          region?: string
          start_at?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      insurance_claims: {
        Row: {
          admin_notes: string | null
          claim_reason: string | null
          created_at: string | null
          id: string
          loss_amount: number
          plan_id: string | null
          reimbursed_amount: number | null
          status: string
          tier_id: string | null
          trade_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          claim_reason?: string | null
          created_at?: string | null
          id?: string
          loss_amount: number
          plan_id?: string | null
          reimbursed_amount?: number | null
          status?: string
          tier_id?: string | null
          trade_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          claim_reason?: string | null
          created_at?: string | null
          id?: string
          loss_amount?: number
          plan_id?: string | null
          reimbursed_amount?: number | null
          status?: string
          tier_id?: string | null
          trade_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "insurance_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_plans: {
        Row: {
          coverage_ratio: number
          created_at: string | null
          id: string
          is_active: boolean | null
          max_coverage_per_claim: number
          min_loss_threshold: number
          notes: string | null
          plan_name: string
          premium_amount: number
          updated_at: string | null
        }
        Insert: {
          coverage_ratio?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_coverage_per_claim?: number
          min_loss_threshold?: number
          notes?: string | null
          plan_name: string
          premium_amount?: number
          updated_at?: string | null
        }
        Update: {
          coverage_ratio?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_coverage_per_claim?: number
          min_loss_threshold?: number
          notes?: string | null
          plan_name?: string
          premium_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          plan_id: string | null
          premium_paid: number
          status: string
          subscribed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          premium_paid?: number
          status?: string
          subscribed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_id?: string | null
          premium_paid?: number
          status?: string
          subscribed_at?: string | null
          updated_at?: string | null
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
      insurance_subscription_tiers: {
        Row: {
          bonus_rewards: number | null
          coverage_ratio: number
          created_at: string
          id: string
          is_active: boolean | null
          max_claim_per_trade: number
          max_claims_per_month: number | null
          min_loss_threshold: number
          monthly_fee: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          bonus_rewards?: number | null
          coverage_ratio?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_claim_per_trade?: number
          max_claims_per_month?: number | null
          min_loss_threshold?: number
          monthly_fee?: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          bonus_rewards?: number | null
          coverage_ratio?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_claim_per_trade?: number
          max_claims_per_month?: number | null
          min_loss_threshold?: number
          monthly_fee?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ismart_spin_config: {
        Row: {
          allow_holding_balance: boolean
          bsk_inr_rate: number
          cooloff_minutes: number
          created_at: string
          daily_spin_cap_per_user: number | null
          free_spins_count: number
          id: string
          is_enabled: boolean
          lifetime_spin_cap_per_user: number | null
          max_bet_inr: number
          max_daily_liability_bsk: number | null
          min_bet_inr: number
          post_free_fee_bsk: number
          post_free_fee_inr: number
          region_restrictions: Json | null
          risk_free_free_spins: boolean
          updated_at: string
          winning_fee_percent: number
        }
        Insert: {
          allow_holding_balance?: boolean
          bsk_inr_rate?: number
          cooloff_minutes?: number
          created_at?: string
          daily_spin_cap_per_user?: number | null
          free_spins_count?: number
          id?: string
          is_enabled?: boolean
          lifetime_spin_cap_per_user?: number | null
          max_bet_inr?: number
          max_daily_liability_bsk?: number | null
          min_bet_inr?: number
          post_free_fee_bsk?: number
          post_free_fee_inr?: number
          region_restrictions?: Json | null
          risk_free_free_spins?: boolean
          updated_at?: string
          winning_fee_percent?: number
        }
        Update: {
          allow_holding_balance?: boolean
          bsk_inr_rate?: number
          cooloff_minutes?: number
          created_at?: string
          daily_spin_cap_per_user?: number | null
          free_spins_count?: number
          id?: string
          is_enabled?: boolean
          lifetime_spin_cap_per_user?: number | null
          max_bet_inr?: number
          max_daily_liability_bsk?: number | null
          min_bet_inr?: number
          post_free_fee_bsk?: number
          post_free_fee_inr?: number
          region_restrictions?: Json | null
          risk_free_free_spins?: boolean
          updated_at?: string
          winning_fee_percent?: number
        }
        Relationships: []
      }
      ismart_spin_segments: {
        Row: {
          color_hex: string
          config_id: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          multiplier: number
          position_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          color_hex?: string
          config_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          multiplier?: number
          position_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          color_hex?: string
          config_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          multiplier?: number
          position_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ismart_spin_segments_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "ismart_spin_config"
            referencedColumns: ["id"]
          },
        ]
      }
      ismart_spins: {
        Row: {
          bet_bsk: number
          bet_inr_snapshot: number
          bsk_inr_rate_snapshot: number
          client_seed: string
          config_snapshot: Json
          created_at: string
          fee_bsk: number
          fee_inr_snapshot: number
          id: string
          idempotency_key: string | null
          multiplier: number
          nonce: number
          payout_bsk: number
          payout_inr_snapshot: number
          revealed_server_seed: string | null
          segment_id: string
          segment_label: string
          server_seed_hash: string
          settled_at: string | null
          status: string
          user_id: string
          verify_payload: Json | null
          was_free_spin: boolean
          was_risk_free: boolean
        }
        Insert: {
          bet_bsk: number
          bet_inr_snapshot: number
          bsk_inr_rate_snapshot: number
          client_seed: string
          config_snapshot: Json
          created_at?: string
          fee_bsk?: number
          fee_inr_snapshot?: number
          id?: string
          idempotency_key?: string | null
          multiplier: number
          nonce: number
          payout_bsk?: number
          payout_inr_snapshot?: number
          revealed_server_seed?: string | null
          segment_id: string
          segment_label: string
          server_seed_hash: string
          settled_at?: string | null
          status?: string
          user_id: string
          verify_payload?: Json | null
          was_free_spin?: boolean
          was_risk_free?: boolean
        }
        Update: {
          bet_bsk?: number
          bet_inr_snapshot?: number
          bsk_inr_rate_snapshot?: number
          client_seed?: string
          config_snapshot?: Json
          created_at?: string
          fee_bsk?: number
          fee_inr_snapshot?: number
          id?: string
          idempotency_key?: string | null
          multiplier?: number
          nonce?: number
          payout_bsk?: number
          payout_inr_snapshot?: number
          revealed_server_seed?: string | null
          segment_id?: string
          segment_label?: string
          server_seed_hash?: string
          settled_at?: string | null
          status?: string
          user_id?: string
          verify_payload?: Json | null
          was_free_spin?: boolean
          was_risk_free?: boolean
        }
        Relationships: []
      }
      ismart_user_limits: {
        Row: {
          created_at: string
          daily_spins_count: number
          first_spin_at: string | null
          free_spins_remaining: number
          free_spins_used: number
          last_spin_at: string | null
          last_spin_date: string | null
          lifetime_spins_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_spins_count?: number
          first_spin_at?: string | null
          free_spins_remaining?: number
          free_spins_used?: number
          last_spin_at?: string | null
          last_spin_date?: string | null
          lifetime_spins_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_spins_count?: number
          first_spin_at?: string | null
          free_spins_remaining?: number
          free_spins_used?: number
          last_spin_at?: string | null
          last_spin_date?: string | null
          lifetime_spins_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          id_type: string | null
          last_name: string | null
          notes: string | null
          reviewed_at: string | null
          selfie_url: string | null
          status: string | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string | null
          last_name?: string | null
          notes?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string | null
          last_name?: string | null
          notes?: string | null
          reviewed_at?: string | null
          selfie_url?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_audit: {
        Row: {
          agent: string | null
          created_at: string | null
          device_info: Json | null
          event: string
          id: string
          ip: string | null
          user_id: string
        }
        Insert: {
          agent?: string | null
          created_at?: string | null
          device_info?: Json | null
          event: string
          id?: string
          ip?: string | null
          user_id: string
        }
        Update: {
          agent?: string | null
          created_at?: string | null
          device_info?: Json | null
          event?: string
          id?: string
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          base_asset_id: string
          created_at: string | null
          id: string
          is_active: boolean
          lot_size: number
          min_notional: number
          quote_asset_id: string
          tick_size: number
          updated_at: string | null
        }
        Insert: {
          base_asset_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          lot_size?: number
          min_notional?: number
          quote_asset_id: string
          tick_size?: number
          updated_at?: string | null
        }
        Update: {
          base_asset_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          lot_size?: number
          min_notional?: number
          quote_asset_id?: string
          tick_size?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "markets_base_asset_id_fkey"
            columns: ["base_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "markets_quote_asset_id_fkey"
            columns: ["quote_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link_url: string | null
          meta: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link_url?: string | null
          meta?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link_url?: string | null
          meta?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications_prefs: {
        Row: {
          created_at: string | null
          email_marketing: boolean | null
          email_tx: boolean | null
          marketing_push: boolean | null
          tx_push: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_marketing?: boolean | null
          email_tx?: boolean | null
          marketing_push?: boolean | null
          tx_push?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_marketing?: boolean | null
          email_tx?: boolean | null
          marketing_push?: boolean | null
          tx_push?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      notifications_read: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_read_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          average_price: number | null
          cancelled_at: string | null
          client_order_id: string | null
          created_at: string
          execution_reports: Json | null
          expires_at: string | null
          fee_asset: string | null
          fees_paid: number | null
          filled_amount: number
          filled_at: string | null
          id: string
          leverage: number | null
          metadata: Json | null
          order_source: string | null
          order_type: string
          price: number | null
          remaining_amount: number | null
          side: string
          status: string
          stop_price: number | null
          symbol: string
          total_value: number | null
          trading_pair_id: string | null
          trading_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          average_price?: number | null
          cancelled_at?: string | null
          client_order_id?: string | null
          created_at?: string
          execution_reports?: Json | null
          expires_at?: string | null
          fee_asset?: string | null
          fees_paid?: number | null
          filled_amount?: number
          filled_at?: string | null
          id?: string
          leverage?: number | null
          metadata?: Json | null
          order_source?: string | null
          order_type: string
          price?: number | null
          remaining_amount?: number | null
          side: string
          status?: string
          stop_price?: number | null
          symbol: string
          total_value?: number | null
          trading_pair_id?: string | null
          trading_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          average_price?: number | null
          cancelled_at?: string | null
          client_order_id?: string | null
          created_at?: string
          execution_reports?: Json | null
          expires_at?: string | null
          fee_asset?: string | null
          fees_paid?: number | null
          filled_amount?: number
          filled_at?: string | null
          id?: string
          leverage?: number | null
          metadata?: Json | null
          order_source?: string | null
          order_type?: string
          price?: number | null
          remaining_amount?: number | null
          side?: string
          status?: string
          stop_price?: number | null
          symbol?: string
          total_value?: number | null
          trading_pair_id?: string | null
          trading_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_trading_pair_id_fkey"
            columns: ["trading_pair_id"]
            isOneToOne: false
            referencedRelation: "trading_pairs"
            referencedColumns: ["id"]
          },
        ]
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
          wallet_address: string | null
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
          wallet_address?: string | null
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
          wallet_address?: string | null
          withdrawal_locked?: boolean | null
        }
        Relationships: []
      }
      program_audit: {
        Row: {
          action: string
          after_json: Json | null
          before_json: Json | null
          config_id: string | null
          created_at: string
          diff_json: Json | null
          entity_type: string
          id: string
          ip_address: unknown | null
          module_id: string | null
          notes: string | null
          operator_id: string
          operator_role: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          after_json?: Json | null
          before_json?: Json | null
          config_id?: string | null
          created_at?: string
          diff_json?: Json | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          module_id?: string | null
          notes?: string | null
          operator_id: string
          operator_role?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          after_json?: Json | null
          before_json?: Json | null
          config_id?: string | null
          created_at?: string
          diff_json?: Json | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          module_id?: string | null
          notes?: string | null
          operator_id?: string
          operator_role?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_audit_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "program_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_audit_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      program_configs: {
        Row: {
          config_json: Json
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_current: boolean
          module_id: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          schema_json: Json
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          config_json?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_current?: boolean
          module_id: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          schema_json?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          config_json?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_current?: boolean
          module_id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          schema_json?: Json
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_configs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      program_modules: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          enabled_regions: Json
          enabled_roles: Json
          icon: string | null
          id: string
          key: string
          name: string
          order_index: number
          route: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          enabled_regions?: Json
          enabled_roles?: Json
          icon?: string | null
          id?: string
          key: string
          name: string
          order_index?: number
          route?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          enabled_regions?: Json
          enabled_roles?: Json
          icon?: string | null
          id?: string
          key?: string
          name?: string
          order_index?: number
          route?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotion_events_log: {
        Row: {
          admin_user_id: string | null
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          admin_user_id?: string | null
          campaign_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string | null
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_events_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bsk_bonus_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bonus_events: {
        Row: {
          base_filled: number
          base_symbol: string
          bonus_amount: number
          bonus_symbol: string
          created_at: string
          id: string
          order_id: string | null
          rule_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          base_filled: number
          base_symbol: string
          bonus_amount: number
          bonus_symbol: string
          created_at?: string
          id?: string
          order_id?: string | null
          rule_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          base_filled?: number
          base_symbol?: string
          bonus_amount?: number
          bonus_symbol?: string
          created_at?: string
          id?: string
          order_id?: string | null
          rule_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bonus_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "purchase_bonus_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bonus_rules: {
        Row: {
          base_symbol: string
          bonus_symbol: string
          created_at: string
          end_at: string | null
          id: string
          is_active: boolean | null
          max_bonus_per_day_user: number | null
          max_bonus_per_order: number | null
          min_fill_amount: number | null
          notes: string | null
          ratio_base_per_bonus: number
          rounding_mode: string | null
          start_at: string | null
          subscriber_tier_multipliers: Json | null
          updated_at: string
        }
        Insert: {
          base_symbol: string
          bonus_symbol?: string
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean | null
          max_bonus_per_day_user?: number | null
          max_bonus_per_order?: number | null
          min_fill_amount?: number | null
          notes?: string | null
          ratio_base_per_bonus: number
          rounding_mode?: string | null
          start_at?: string | null
          subscriber_tier_multipliers?: Json | null
          updated_at?: string
        }
        Update: {
          base_symbol?: string
          bonus_symbol?: string
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean | null
          max_bonus_per_day_user?: number | null
          max_bonus_per_order?: number | null
          min_fill_amount?: number | null
          notes?: string | null
          ratio_base_per_bonus?: number
          rounding_mode?: string | null
          start_at?: string | null
          subscriber_tier_multipliers?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_balance_slabs: {
        Row: {
          balance_metric: Database["public"]["Enums"]["balance_metric"]
          base_currency: string
          created_at: string
          id: string
          is_active: boolean
          max_balance: number | null
          max_direct_referrals: number
          min_balance: number
          name: string
          notes: string | null
          unlocked_levels: number
          updated_at: string
        }
        Insert: {
          balance_metric?: Database["public"]["Enums"]["balance_metric"]
          base_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_balance?: number | null
          max_direct_referrals?: number
          min_balance?: number
          name: string
          notes?: string | null
          unlocked_levels?: number
          updated_at?: string
        }
        Update: {
          balance_metric?: Database["public"]["Enums"]["balance_metric"]
          base_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_balance?: number | null
          max_direct_referrals?: number
          min_balance?: number
          name?: string
          notes?: string | null
          unlocked_levels?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_configs: {
        Row: {
          bonus_currency: string | null
          commission_rates: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          levels: number
          max_referrals_per_level: number | null
          min_deposit_required: number | null
          name: string
          referee_bonus: number | null
          referrer_bonus: number | null
          updated_at: string
        }
        Insert: {
          bonus_currency?: string | null
          commission_rates?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          levels?: number
          max_referrals_per_level?: number | null
          min_deposit_required?: number | null
          name: string
          referee_bonus?: number | null
          referrer_bonus?: number | null
          updated_at?: string
        }
        Update: {
          bonus_currency?: string | null
          commission_rates?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          levels?: number
          max_referrals_per_level?: number | null
          min_deposit_required?: number | null
          name?: string
          referee_bonus?: number | null
          referrer_bonus?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          action: string
          amount_bonus: number
          bonus_asset_id: string | null
          created_at: string
          id: string
          level: number
          notes: string | null
          referrer_id: string
          tx_status: string
          usd_value: number
          user_id: string
        }
        Insert: {
          action: string
          amount_bonus?: number
          bonus_asset_id?: string | null
          created_at?: string
          id?: string
          level: number
          notes?: string | null
          referrer_id: string
          tx_status?: string
          usd_value?: number
          user_id: string
        }
        Update: {
          action?: string
          amount_bonus?: number
          bonus_asset_id?: string | null
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          referrer_id?: string
          tx_status?: string
          usd_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_bonus_asset_id_fkey"
            columns: ["bonus_asset_id"]
            isOneToOne: false
            referencedRelation: "bonus_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_global_settings: {
        Row: {
          base_currency: string
          created_at: string
          default_balance_metric: Database["public"]["Enums"]["balance_metric"]
          id: string
          invite_policy: Database["public"]["Enums"]["invite_policy"]
          reevaluate_on_balance_change: boolean
          reevaluate_threshold_percent: number
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          default_balance_metric?: Database["public"]["Enums"]["balance_metric"]
          id?: string
          invite_policy?: Database["public"]["Enums"]["invite_policy"]
          reevaluate_on_balance_change?: boolean
          reevaluate_threshold_percent?: number
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          default_balance_metric?: Database["public"]["Enums"]["balance_metric"]
          id?: string
          invite_policy?: Database["public"]["Enums"]["invite_policy"]
          reevaluate_on_balance_change?: boolean
          reevaluate_threshold_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_ledger: {
        Row: {
          badge_at_event: string | null
          bsk_amount: number
          bsk_rate_snapshot: number
          created_at: string
          depth: number | null
          id: string
          inr_amount_snapshot: number
          ledger_type: string
          notes: string | null
          referrer_id: string | null
          settled_at: string | null
          source_user_id: string | null
          status: string
          trigger_type: string | null
          tx_refs: Json | null
          user_id: string
          voided_at: string | null
        }
        Insert: {
          badge_at_event?: string | null
          bsk_amount: number
          bsk_rate_snapshot: number
          created_at?: string
          depth?: number | null
          id?: string
          inr_amount_snapshot: number
          ledger_type: string
          notes?: string | null
          referrer_id?: string | null
          settled_at?: string | null
          source_user_id?: string | null
          status?: string
          trigger_type?: string | null
          tx_refs?: Json | null
          user_id: string
          voided_at?: string | null
        }
        Update: {
          badge_at_event?: string | null
          bsk_amount?: number
          bsk_rate_snapshot?: number
          created_at?: string
          depth?: number | null
          id?: string
          inr_amount_snapshot?: number
          ledger_type?: string
          notes?: string | null
          referrer_id?: string | null
          settled_at?: string | null
          source_user_id?: string | null
          status?: string
          trigger_type?: string | null
          tx_refs?: Json | null
          user_id?: string
          voided_at?: string | null
        }
        Relationships: []
      }
      referral_links: {
        Row: {
          created_at: string | null
          id: string
          locked_at: string
          sponsor_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          locked_at?: string
          sponsor_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          locked_at?: string
          sponsor_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_relationships: {
        Row: {
          created_at: string
          id: string
          referee_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referee_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      referral_rewards_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          level: number
          reward_bsk: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          reward_bsk?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          reward_bsk?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_settings: {
        Row: {
          caps: Json
          created_at: string
          default_asset_id: string | null
          enabled: boolean
          id: string
          levels: Json
          qualifying_actions: Json
          schedule: string
          updated_at: string
        }
        Insert: {
          caps?: Json
          created_at?: string
          default_asset_id?: string | null
          enabled?: boolean
          id?: string
          levels?: Json
          qualifying_actions?: Json
          schedule?: string
          updated_at?: string
        }
        Update: {
          caps?: Json
          created_at?: string
          default_asset_id?: string | null
          enabled?: boolean
          id?: string
          levels?: Json
          qualifying_actions?: Json
          schedule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_settings_default_asset_id_fkey"
            columns: ["default_asset_id"]
            isOneToOne: false
            referencedRelation: "bonus_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_user_state: {
        Row: {
          created_at: string
          current_balance: number
          current_slab_id: string | null
          direct_referral_count: number
          last_evaluated_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          current_slab_id?: string | null
          direct_referral_count?: number
          last_evaluated_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          current_slab_id?: string | null
          direct_referral_count?: number
          last_evaluated_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_user_state_current_slab_id_fkey"
            columns: ["current_slab_id"]
            isOneToOne: false
            referencedRelation: "referral_balance_slabs"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_waitlist: {
        Row: {
          applied_at: string | null
          created_at: string
          expired_at: string | null
          id: string
          notes: string | null
          prospect_email: string | null
          prospect_id: string | null
          prospect_phone: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          expired_at?: string | null
          id?: string
          notes?: string | null
          prospect_email?: string | null
          prospect_id?: string | null
          prospect_phone?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          expired_at?: string | null
          id?: string
          notes?: string | null
          prospect_email?: string | null
          prospect_id?: string | null
          prospect_phone?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          level: number
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number
          parent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rng_seeds: {
        Row: {
          created_at: string
          id: string
          published: boolean
          server_seed: string
          server_seed_hash: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          published?: boolean
          server_seed: string
          server_seed_hash: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          published?: boolean
          server_seed?: string
          server_seed_hash?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      security: {
        Row: {
          anti_phishing_code: string | null
          biometric_enabled: boolean | null
          created_at: string | null
          failed_attempts: number | null
          has_2fa: boolean | null
          last_unlock_at: string | null
          locked_until: string | null
          pin_hash: string | null
          pin_salt: string | null
          pin_set: boolean | null
          spend_daily_limit: number | null
          user_id: string
          withdraw_whitelist_only: boolean | null
        }
        Insert: {
          anti_phishing_code?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          failed_attempts?: number | null
          has_2fa?: boolean | null
          last_unlock_at?: string | null
          locked_until?: string | null
          pin_hash?: string | null
          pin_salt?: string | null
          pin_set?: boolean | null
          spend_daily_limit?: number | null
          user_id: string
          withdraw_whitelist_only?: boolean | null
        }
        Update: {
          anti_phishing_code?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          failed_attempts?: number | null
          has_2fa?: boolean | null
          last_unlock_at?: string | null
          locked_until?: string | null
          pin_hash?: string | null
          pin_salt?: string | null
          pin_set?: boolean | null
          spend_daily_limit?: number | null
          user_id?: string
          withdraw_whitelist_only?: boolean | null
        }
        Relationships: []
      }
      settings_user: {
        Row: {
          created_at: string | null
          display_currency: string | null
          language: string | null
          require_unlock_on_actions: boolean | null
          session_lock_minutes: number | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_currency?: string | null
          language?: string | null
          require_unlock_on_actions?: boolean | null
          session_lock_minutes?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_currency?: string | null
          language?: string | null
          require_unlock_on_actions?: boolean | null
          session_lock_minutes?: number | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spin_grants: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          run_id: string | null
          token: string | null
          type: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          run_id?: string | null
          token?: string | null
          type: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          run_id?: string | null
          token?: string | null
          type?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spin_grants_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "spin_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_runs: {
        Row: {
          created_at: string | null
          id: string
          outcome: Json | null
          segment_id: string | null
          status: string | null
          ticket_cost: number | null
          ticket_currency: string | null
          user_id: string
          wheel_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          outcome?: Json | null
          segment_id?: string | null
          status?: string | null
          ticket_cost?: number | null
          ticket_currency?: string | null
          user_id: string
          wheel_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          outcome?: Json | null
          segment_id?: string | null
          status?: string | null
          ticket_cost?: number | null
          ticket_currency?: string | null
          user_id?: string
          wheel_id?: string | null
        }
        Relationships: []
      }
      staking_pools: {
        Row: {
          active: boolean
          apy: number
          asset_id: string | null
          capacity: number | null
          compound_rewards: boolean
          created_at: string
          created_by: string | null
          current_staked: number
          description: string | null
          early_exit_penalty: number
          has_lock_period: boolean
          id: string
          lock_period_days: number
          max_stake_amount: number | null
          min_stake_amount: number
          name: string
          platform_fee: number
          region_restrictions: Json | null
          reward_distribution: string
          staking_type: string
          terms_conditions: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          apy?: number
          asset_id?: string | null
          capacity?: number | null
          compound_rewards?: boolean
          created_at?: string
          created_by?: string | null
          current_staked?: number
          description?: string | null
          early_exit_penalty?: number
          has_lock_period?: boolean
          id?: string
          lock_period_days?: number
          max_stake_amount?: number | null
          min_stake_amount?: number
          name: string
          platform_fee?: number
          region_restrictions?: Json | null
          reward_distribution?: string
          staking_type?: string
          terms_conditions?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          apy?: number
          asset_id?: string | null
          capacity?: number | null
          compound_rewards?: boolean
          created_at?: string
          created_by?: string | null
          current_staked?: number
          description?: string | null
          early_exit_penalty?: number
          has_lock_period?: boolean
          id?: string
          lock_period_days?: number
          max_stake_amount?: number | null
          min_stake_amount?: number
          name?: string
          platform_fee?: number
          region_restrictions?: Json | null
          reward_distribution?: string
          staking_type?: string
          terms_conditions?: string | null
          updated_at?: string
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
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          cooldown_seconds: number
          created_at: string
          daily_rewarded_clicks: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          cooldown_seconds?: number
          created_at?: string
          daily_rewarded_clicks?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          cooldown_seconds?: number
          created_at?: string
          daily_rewarded_clicks?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          last_msg_at: string
          meta: Json | null
          priority: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          last_msg_at?: string
          meta?: Json | null
          priority?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_msg_at?: string
          meta?: Json | null
          priority?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      swaps: {
        Row: {
          actual_rate: number | null
          completed_at: string | null
          created_at: string
          estimated_rate: number
          from_amount: number
          from_asset: string
          id: string
          intermediate_asset: string | null
          min_receive: number
          order_ids: string[] | null
          platform_fee: number | null
          route_type: string
          slippage_percent: number | null
          status: string
          to_amount: number
          to_asset: string
          total_fees: number | null
          trading_fees: number | null
          user_id: string
        }
        Insert: {
          actual_rate?: number | null
          completed_at?: string | null
          created_at?: string
          estimated_rate: number
          from_amount: number
          from_asset: string
          id?: string
          intermediate_asset?: string | null
          min_receive: number
          order_ids?: string[] | null
          platform_fee?: number | null
          route_type: string
          slippage_percent?: number | null
          status?: string
          to_amount: number
          to_asset: string
          total_fees?: number | null
          trading_fees?: number | null
          user_id: string
        }
        Update: {
          actual_rate?: number | null
          completed_at?: string | null
          created_at?: string
          estimated_rate?: number
          from_amount?: number
          from_asset?: string
          id?: string
          intermediate_asset?: string | null
          min_receive?: number
          order_ids?: string[] | null
          platform_fee?: number | null
          route_type?: string
          slippage_percent?: number | null
          status?: string
          to_amount?: number
          to_asset?: string
          total_fees?: number | null
          trading_fees?: number | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      team_income_levels: {
        Row: {
          balance_type: string
          bsk_reward: number
          created_at: string
          id: string
          is_active: boolean
          level: number
          updated_at: string
        }
        Insert: {
          balance_type?: string
          bsk_reward?: number
          created_at?: string
          id?: string
          is_active?: boolean
          level: number
          updated_at?: string
        }
        Update: {
          balance_type?: string
          bsk_reward?: number
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_referral_settings: {
        Row: {
          apply_requirement_to_vip_milestones: boolean | null
          bsk_inr_rate: number
          commission_scope: string | null
          cooloff_hours: number
          cooloff_hours_for_clawback: number | null
          created_at: string
          daily_cap_per_earner: number | null
          direct_commission_percent: number | null
          direct_referral_percent: number
          eligibility_policy: string | null
          enabled: boolean
          id: string
          max_daily_direct_commission_bsk: number | null
          min_referrer_badge_required: string | null
          payout_destination: string | null
          per_downline_event_cap: number | null
          region_enabled: Json
          retro_window_hours: number | null
          spillover_to_next_eligible_upline: boolean
          trigger_event: string
          updated_at: string
          weekly_cap_per_earner: number | null
        }
        Insert: {
          apply_requirement_to_vip_milestones?: boolean | null
          bsk_inr_rate?: number
          commission_scope?: string | null
          cooloff_hours?: number
          cooloff_hours_for_clawback?: number | null
          created_at?: string
          daily_cap_per_earner?: number | null
          direct_commission_percent?: number | null
          direct_referral_percent?: number
          eligibility_policy?: string | null
          enabled?: boolean
          id?: string
          max_daily_direct_commission_bsk?: number | null
          min_referrer_badge_required?: string | null
          payout_destination?: string | null
          per_downline_event_cap?: number | null
          region_enabled?: Json
          retro_window_hours?: number | null
          spillover_to_next_eligible_upline?: boolean
          trigger_event?: string
          updated_at?: string
          weekly_cap_per_earner?: number | null
        }
        Update: {
          apply_requirement_to_vip_milestones?: boolean | null
          bsk_inr_rate?: number
          commission_scope?: string | null
          cooloff_hours?: number
          cooloff_hours_for_clawback?: number | null
          created_at?: string
          daily_cap_per_earner?: number | null
          direct_commission_percent?: number | null
          direct_referral_percent?: number
          eligibility_policy?: string | null
          enabled?: boolean
          id?: string
          max_daily_direct_commission_bsk?: number | null
          min_referrer_badge_required?: string | null
          payout_destination?: string | null
          per_downline_event_cap?: number | null
          region_enabled?: Json
          retro_window_hours?: number | null
          spillover_to_next_eligible_upline?: boolean
          trigger_event?: string
          updated_at?: string
          weekly_cap_per_earner?: number | null
        }
        Relationships: []
      }
      tiers: {
        Row: {
          color: string | null
          created_at: string | null
          deposit_ipg: number
          icon: string | null
          id: string
          is_active: boolean | null
          max_ref_depth: number
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deposit_ipg: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_ref_depth: number
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deposit_ipg?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_ref_depth?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          buy_order_id: string
          buyer_fee: number
          buyer_id: string
          created_at: string
          fee_asset: string | null
          id: string
          price: number
          quantity: number
          sell_order_id: string
          seller_fee: number
          seller_id: string
          symbol: string
          total_value: number
          trade_time: string
          trading_type: string
        }
        Insert: {
          buy_order_id: string
          buyer_fee?: number
          buyer_id: string
          created_at?: string
          fee_asset?: string | null
          id?: string
          price: number
          quantity: number
          sell_order_id: string
          seller_fee?: number
          seller_id: string
          symbol: string
          total_value: number
          trade_time?: string
          trading_type?: string
        }
        Update: {
          buy_order_id?: string
          buyer_fee?: number
          buyer_id?: string
          created_at?: string
          fee_asset?: string | null
          id?: string
          price?: number
          quantity?: number
          sell_order_id?: string
          seller_fee?: number
          seller_id?: string
          symbol?: string
          total_value?: number
          trade_time?: string
          trading_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_buy_order_id_fkey"
            columns: ["buy_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_sell_order_id_fkey"
            columns: ["sell_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      user_achievements: {
        Row: {
          achievement_type: string
          created_at: string
          id: string
          points_earned: number
          unlocked: boolean
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_type: string
          created_at?: string
          id?: string
          points_earned?: number
          unlocked?: boolean
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          created_at?: string
          id?: string
          points_earned?: number
          unlocked?: boolean
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badge_holdings: {
        Row: {
          created_at: string | null
          current_badge: string
          history: Json | null
          id: string
          payment_ref: string | null
          previous_badge: string | null
          price_bsk: number
          price_inr: number | null
          purchased_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_badge: string
          history?: Json | null
          id?: string
          payment_ref?: string | null
          previous_badge?: string | null
          price_bsk: number
          price_inr?: number | null
          purchased_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_badge?: string
          history?: Json | null
          id?: string
          payment_ref?: string | null
          previous_badge?: string | null
          price_bsk?: number
          price_inr?: number | null
          purchased_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badge_status: {
        Row: {
          achieved_at: string
          created_at: string
          current_badge: string
          referrer_id: string | null
          total_ipg_contributed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          current_badge?: string
          referrer_id?: string | null
          total_ipg_contributed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          current_badge?: string
          referrer_id?: string | null
          total_ipg_contributed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bonus_balances: {
        Row: {
          bsk_available: number
          bsk_pending: number
          id: string
          last_spin_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bsk_available?: number
          bsk_pending?: number
          id?: string
          last_spin_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bsk_available?: number
          bsk_pending?: number
          id?: string
          last_spin_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bsk_balance_summary: {
        Row: {
          created_at: string
          holding_balance: number
          lifetime_holding_earned: number
          lifetime_withdrawable_earned: number
          lifetime_withdrawn: number
          updated_at: string
          user_id: string
          withdrawable_balance: number
        }
        Insert: {
          created_at?: string
          holding_balance?: number
          lifetime_holding_earned?: number
          lifetime_withdrawable_earned?: number
          lifetime_withdrawn?: number
          updated_at?: string
          user_id: string
          withdrawable_balance?: number
        }
        Update: {
          created_at?: string
          holding_balance?: number
          lifetime_holding_earned?: number
          lifetime_withdrawable_earned?: number
          lifetime_withdrawn?: number
          updated_at?: string
          user_id?: string
          withdrawable_balance?: number
        }
        Relationships: []
      }
      user_bsk_balances: {
        Row: {
          created_at: string
          holding_balance: number
          id: string
          total_earned_holding: number
          total_earned_withdrawable: number
          updated_at: string
          user_id: string
          withdrawable_balance: number
        }
        Insert: {
          created_at?: string
          holding_balance?: number
          id?: string
          total_earned_holding?: number
          total_earned_withdrawable?: number
          updated_at?: string
          user_id: string
          withdrawable_balance?: number
        }
        Update: {
          created_at?: string
          holding_balance?: number
          id?: string
          total_earned_holding?: number
          total_earned_withdrawable?: number
          updated_at?: string
          user_id?: string
          withdrawable_balance?: number
        }
        Relationships: []
      }
      user_bsk_vesting: {
        Row: {
          bsk_daily_amount: number
          bsk_pending_total: number
          bsk_released_total: number
          bsk_total_amount: number
          config_id: string | null
          created_at: string
          days_completed: number
          end_date: string
          id: string
          ipg_amount_swapped: number
          is_active: boolean
          is_paused: boolean
          start_date: string
          swap_chain: string
          swap_tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bsk_daily_amount: number
          bsk_pending_total?: number
          bsk_released_total?: number
          bsk_total_amount: number
          config_id?: string | null
          created_at?: string
          days_completed?: number
          end_date: string
          id?: string
          ipg_amount_swapped: number
          is_active?: boolean
          is_paused?: boolean
          start_date: string
          swap_chain?: string
          swap_tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bsk_daily_amount?: number
          bsk_pending_total?: number
          bsk_released_total?: number
          bsk_total_amount?: number
          config_id?: string | null
          created_at?: string
          days_completed?: number
          end_date?: string
          id?: string
          ipg_amount_swapped?: number
          is_active?: boolean
          is_paused?: boolean
          start_date?: string
          swap_chain?: string
          swap_tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bsk_vesting_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "bsk_vesting_config"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_ad_views: {
        Row: {
          created_at: string
          date_key: string
          free_views_used: number
          id: string
          last_view_at: string | null
          subscription_views_used: number
          total_bsk_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_key: string
          free_views_used?: number
          id?: string
          last_view_at?: string | null
          subscription_views_used?: number
          total_bsk_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_key?: string
          free_views_used?: number
          id?: string
          last_view_at?: string | null
          subscription_views_used?: number
          total_bsk_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gamification_stats: {
        Row: {
          created_at: string
          current_login_streak: number
          id: string
          last_daily_reward_claim: string | null
          level: number
          longest_login_streak: number
          total_achievements_unlocked: number
          total_rewards_claimed: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_login_streak?: number
          id?: string
          last_daily_reward_claim?: string | null
          level?: number
          longest_login_streak?: number
          total_achievements_unlocked?: number
          total_rewards_claimed?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_login_streak?: number
          id?: string
          last_daily_reward_claim?: string | null
          level?: number
          longest_login_streak?: number
          total_achievements_unlocked?: number
          total_rewards_claimed?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_insurance_subscriptions: {
        Row: {
          claims_used_this_month: number | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean | null
          last_claim_reset_date: string | null
          subscribed_at: string
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claims_used_this_month?: number | null
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          last_claim_reset_date?: string | null
          subscribed_at?: string
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claims_used_this_month?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          last_claim_reset_date?: string | null
          subscribed_at?: string
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_insurance_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "insurance_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          biometric_enabled: boolean | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          id: string
          kyc_status: string | null
          onboarding_completed: boolean | null
          pin_hash: string | null
          tier_id: string | null
          updated_at: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          biometric_enabled?: boolean | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          id?: string
          kyc_status?: string | null
          onboarding_completed?: boolean | null
          pin_hash?: string | null
          tier_id?: string | null
          updated_at?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          biometric_enabled?: boolean | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          id?: string
          kyc_status?: string | null
          onboarding_completed?: boolean | null
          pin_hash?: string | null
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_promotion_claims: {
        Row: {
          campaign_id: string
          claims_count: number
          created_at: string
          first_claim_at: string | null
          id: string
          last_claim_at: string | null
          total_bonus_bsk: number
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          claims_count?: number
          created_at?: string
          first_claim_at?: string | null
          id?: string
          last_claim_at?: string | null
          total_bonus_bsk?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          claims_count?: number
          created_at?: string
          first_claim_at?: string | null
          id?: string
          last_claim_at?: string | null
          total_bonus_bsk?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_promotion_claims_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bsk_bonus_campaigns"
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
      user_settings: {
        Row: {
          created_at: string
          display_currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_vip_milestones: {
        Row: {
          created_at: string
          direct_vip_count: number
          id: string
          last_vip_referral_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direct_vip_count?: number
          id?: string
          last_vip_referral_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direct_vip_count?: number
          id?: string
          last_vip_referral_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users_app: {
        Row: {
          account_frozen: boolean | null
          country: string | null
          created_at: string | null
          display_name: string | null
          dob: string | null
          email: string | null
          id: string
          phone: string | null
          user_id: string
        }
        Insert: {
          account_frozen?: boolean | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          user_id: string
        }
        Update: {
          account_frozen?: boolean | null
          country?: string | null
          created_at?: string | null
          display_name?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vip_milestone_claims: {
        Row: {
          claimed_at: string
          created_at: string
          fulfillment_notes: string | null
          id: string
          kyc_verified: boolean | null
          milestone_id: string
          shipping_info: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          fulfillment_notes?: string | null
          id?: string
          kyc_verified?: boolean | null
          milestone_id: string
          shipping_info?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          fulfillment_notes?: string | null
          id?: string
          kyc_verified?: boolean | null
          milestone_id?: string
          shipping_info?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_milestone_claims_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "vip_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_milestones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          physical_reward_sku: string | null
          requires_kyc: boolean
          reward_description: string | null
          reward_inr_value: number
          reward_type: string
          updated_at: string
          vip_count_threshold: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          physical_reward_sku?: string | null
          requires_kyc?: boolean
          reward_description?: string | null
          reward_inr_value: number
          reward_type: string
          updated_at?: string
          vip_count_threshold: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          physical_reward_sku?: string | null
          requires_kyc?: boolean
          reward_description?: string | null
          reward_inr_value?: number
          reward_type?: string
          updated_at?: string
          vip_count_threshold?: number
        }
        Relationships: []
      }
      wallet_bonus_balances: {
        Row: {
          asset_id: string
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_bonus_balances_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "bonus_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets_user: {
        Row: {
          address: string
          chain: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          label: string | null
          user_id: string
        }
        Insert: {
          address: string
          chain: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          user_id: string
        }
        Update: {
          address?: string
          chain?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_provable_spin_result: {
        Args: {
          p_client_seed: string
          p_nonce: number
          p_segments: Json
          p_server_seed: string
        }
        Returns: {
          segment_data: Json
          segment_index: number
        }[]
      }
      calculate_user_balance: {
        Args: {
          p_base_currency?: string
          p_metric?: Database["public"]["Enums"]["balance_metric"]
          p_user_id: string
        }
        Returns: number
      }
      calculate_user_balance_internal: {
        Args: {
          p_base_currency?: string
          p_metric?: Database["public"]["Enums"]["balance_metric"]
          p_user_id: string
        }
        Returns: number
      }
      check_badge_eligibility: {
        Args: { required_badge: string; sponsor_badge: string }
        Returns: boolean
      }
      convert_bsk_to_inr: {
        Args: { bsk_amount: number }
        Returns: number
      }
      convert_inr_to_bsk: {
        Args: { inr_amount: number }
        Returns: number
      }
      count_lucky_draw_tickets: {
        Args: { p_config_id: string }
        Returns: number
      }
      create_default_admin: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_lucky_draw_tickets: {
        Args: { p_config_id: string; p_ticket_count: number; p_user_id: string }
        Returns: Json
      }
      create_pool_draw_tickets: {
        Args: {
          p_config_id: string
          p_ipg_amount: number
          p_ticket_count: number
          p_user_id: string
        }
        Returns: Json
      }
      get_asset_logo_url: {
        Args: { asset_row: Database["public"]["Tables"]["assets"]["Row"] }
        Returns: string
      }
      get_badge_from_ipg_amount: {
        Args: { ipg_amount: number }
        Returns: string
      }
      get_badge_tier_value: {
        Args: { badge_name: string }
        Returns: number
      }
      get_current_bsk_rate: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_current_program_config: {
        Args: { p_module_key: string }
        Returns: Json
      }
      get_current_spin_seed: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          server_seed_hash: string
          valid_from: string
        }[]
      }
      get_masked_profile_data: {
        Args: {
          p_email?: string
          p_phone?: string
          p_user_id: string
          p_wallet_address?: string
        }
        Returns: Json
      }
      get_pool_draw_stats: {
        Args: { p_config_id: string }
        Returns: {
          estimated_payouts: Json
          pool_size: number
          spaces_remaining: number
          total_ipg_collected: number
          total_participants: number
        }[]
      }
      get_user_lucky_draw_tickets: {
        Args: { p_config_id: string; p_user_id: string }
        Returns: {
          config_id: string
          created_at: string
          id: string
          prize_amount: number
          status: string
          ticket_number: string
          user_id: string
        }[]
      }
      get_user_slab: {
        Args: { p_user_id: string }
        Returns: string
      }
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
      log_spin_wheel_admin_action: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      process_badge_qualification: {
        Args: {
          p_ipg_amount: number
          p_transaction_chain?: string
          p_transaction_hash?: string
          p_user_id: string
        }
        Returns: Json
      }
      process_bsk_bonus_purchase: {
        Args: {
          p_campaign_id?: string
          p_channel: Database["public"]["Enums"]["purchase_channel"]
          p_purchase_id: string
          p_purchase_inr: number
          p_user_id: string
        }
        Returns: Json
      }
      process_daily_bsk_vesting: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      publish_program_config: {
        Args: { p_config_id: string; p_operator_id: string }
        Returns: Json
      }
      reset_monthly_claim_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      settle_pending_referrer_rewards: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_user_referral_state: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      announcement_type: "carousel" | "ticker"
      app_role: "admin" | "support" | "compliance" | "finance" | "user"
      balance_metric: "MAIN" | "TOTAL" | "BONUS_INCLUDED"
      bonus_destination: "withdrawable" | "holding"
      bonus_event_status: "pending" | "settled" | "void" | "clawed_back"
      bsk_balance_type: "withdrawable" | "holding"
      bsk_loan_status:
        | "pending"
        | "approved"
        | "active"
        | "completed"
        | "rejected"
        | "defaulted"
      claim_status: "PENDING" | "APPROVED" | "REJECTED"
      draw_state:
        | "draft"
        | "open"
        | "full"
        | "drawing"
        | "completed"
        | "expired"
        | "refunding"
        | "closed"
      draw_status: "OPEN" | "CLOSED" | "COMPLETED" | "CANCELLED"
      insurance_type: "ACCIDENT" | "TRADING"
      invite_policy: "BLOCK_WHEN_FULL" | "WAITLIST"
      kyc_status: "unverified" | "pending" | "verified" | "rejected"
      missed_day_policy: "forfeit" | "carry_forward"
      per_user_limit_type: "once" | "once_per_campaign" | "unlimited"
      policy_status: "ACTIVE" | "EXPIRED" | "CANCELLED"
      promotion_status: "draft" | "scheduled" | "live" | "paused" | "ended"
      promotion_type: "INR_BONUS" | "DEPOSIT_BONUS" | "TRADING_BONUS"
      purchase_channel: "inr_onramp" | "swap_ipg_bsk" | "swap_crypto_bsk"
      spin_outcome: "WIN" | "LOSE"
      subscription_status: "active" | "expired" | "cancelled"
      ticket_status: "active" | "won" | "refunded"
      token_bucket: "holding" | "tradable"
      winner_rank: "first" | "second" | "third"
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
      announcement_type: ["carousel", "ticker"],
      app_role: ["admin", "support", "compliance", "finance", "user"],
      balance_metric: ["MAIN", "TOTAL", "BONUS_INCLUDED"],
      bonus_destination: ["withdrawable", "holding"],
      bonus_event_status: ["pending", "settled", "void", "clawed_back"],
      bsk_balance_type: ["withdrawable", "holding"],
      bsk_loan_status: [
        "pending",
        "approved",
        "active",
        "completed",
        "rejected",
        "defaulted",
      ],
      claim_status: ["PENDING", "APPROVED", "REJECTED"],
      draw_state: [
        "draft",
        "open",
        "full",
        "drawing",
        "completed",
        "expired",
        "refunding",
        "closed",
      ],
      draw_status: ["OPEN", "CLOSED", "COMPLETED", "CANCELLED"],
      insurance_type: ["ACCIDENT", "TRADING"],
      invite_policy: ["BLOCK_WHEN_FULL", "WAITLIST"],
      kyc_status: ["unverified", "pending", "verified", "rejected"],
      missed_day_policy: ["forfeit", "carry_forward"],
      per_user_limit_type: ["once", "once_per_campaign", "unlimited"],
      policy_status: ["ACTIVE", "EXPIRED", "CANCELLED"],
      promotion_status: ["draft", "scheduled", "live", "paused", "ended"],
      promotion_type: ["INR_BONUS", "DEPOSIT_BONUS", "TRADING_BONUS"],
      purchase_channel: ["inr_onramp", "swap_ipg_bsk", "swap_crypto_bsk"],
      spin_outcome: ["WIN", "LOSE"],
      subscription_status: ["active", "expired", "cancelled"],
      ticket_status: ["active", "won", "refunded"],
      token_bucket: ["holding", "tradable"],
      winner_rank: ["first", "second", "third"],
    },
  },
} as const

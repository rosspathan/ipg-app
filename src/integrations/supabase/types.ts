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
      ads: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          image_url: string
          max_impressions_per_user_per_day: number | null
          placement: string
          required_view_time: number
          reward_bsk: number
          square_image_url: string | null
          start_at: string | null
          status: string
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          image_url: string
          max_impressions_per_user_per_day?: number | null
          placement?: string
          required_view_time?: number
          reward_bsk?: number
          square_image_url?: string | null
          start_at?: string | null
          status?: string
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          image_url?: string
          max_impressions_per_user_per_day?: number | null
          placement?: string
          required_view_time?: number
          reward_bsk?: number
          square_image_url?: string | null
          start_at?: string | null
          status?: string
          target_url?: string
          title?: string
          updated_at?: string
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
      lucky_draw_configs: {
        Row: {
          admin_fee_percent: number
          auto_execute: boolean
          commit_hash: string | null
          created_at: string | null
          current_participants: number
          executed_at: string | null
          first_place_prize: number
          id: string
          max_winners: number | null
          payout_currency: string
          pool_size: number
          reveal_value: string | null
          second_place_prize: number
          status: string | null
          third_place_prize: number
          ticket_currency: string
          ticket_price: number
        }
        Insert: {
          admin_fee_percent?: number
          auto_execute?: boolean
          commit_hash?: string | null
          created_at?: string | null
          current_participants?: number
          executed_at?: string | null
          first_place_prize?: number
          id?: string
          max_winners?: number | null
          payout_currency?: string
          pool_size?: number
          reveal_value?: string | null
          second_place_prize?: number
          status?: string | null
          third_place_prize?: number
          ticket_currency?: string
          ticket_price: number
        }
        Update: {
          admin_fee_percent?: number
          auto_execute?: boolean
          commit_hash?: string | null
          created_at?: string | null
          current_participants?: number
          executed_at?: string | null
          first_place_prize?: number
          id?: string
          max_winners?: number | null
          payout_currency?: string
          pool_size?: number
          reveal_value?: string | null
          second_place_prize?: number
          status?: string | null
          third_place_prize?: number
          ticket_currency?: string
          ticket_price?: number
        }
        Relationships: []
      }
      lucky_draw_tickets: {
        Row: {
          bsk_payout: number | null
          config_id: string
          created_at: string
          id: string
          ipg_paid: number | null
          prize_amount: number | null
          prize_tier: number | null
          status: string
          ticket_number: string
          updated_at: string
          user_id: string
          verification_data: Json | null
        }
        Insert: {
          bsk_payout?: number | null
          config_id: string
          created_at?: string
          id?: string
          ipg_paid?: number | null
          prize_amount?: number | null
          prize_tier?: number | null
          status?: string
          ticket_number: string
          updated_at?: string
          user_id: string
          verification_data?: Json | null
        }
        Update: {
          bsk_payout?: number | null
          config_id?: string
          created_at?: string
          id?: string
          ipg_paid?: number | null
          prize_amount?: number | null
          prize_tier?: number | null
          status?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
          verification_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lucky_draw_tickets_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "lucky_draw_configs"
            referencedColumns: ["id"]
          },
        ]
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
      provably_fair_spins: {
        Row: {
          bet_amount: number
          bet_token: string
          client_seed: string
          created_at: string
          fee_amount: number | null
          id: string
          is_free_spin: boolean | null
          nonce: number
          payout_amount: number
          payout_token: string | null
          random_number: number
          result_hash: string
          seed_commit_id: string
          server_seed: string
          user_id: string
          winning_segment_id: number
          winning_segment_label: string
        }
        Insert: {
          bet_amount: number
          bet_token?: string
          client_seed: string
          created_at?: string
          fee_amount?: number | null
          id?: string
          is_free_spin?: boolean | null
          nonce: number
          payout_amount?: number
          payout_token?: string | null
          random_number: number
          result_hash: string
          seed_commit_id: string
          server_seed: string
          user_id: string
          winning_segment_id: number
          winning_segment_label: string
        }
        Update: {
          bet_amount?: number
          bet_token?: string
          client_seed?: string
          created_at?: string
          fee_amount?: number | null
          id?: string
          is_free_spin?: boolean | null
          nonce?: number
          payout_amount?: number
          payout_token?: string | null
          random_number?: number
          result_hash?: string
          seed_commit_id?: string
          server_seed?: string
          user_id?: string
          winning_segment_id?: number
          winning_segment_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "provably_fair_spins_seed_commit_id_fkey"
            columns: ["seed_commit_id"]
            isOneToOne: false
            referencedRelation: "spin_seed_commits"
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
      spin_results: {
        Row: {
          auth_method: string
          bet_amount: number
          bsk_delta: number
          created_at: string
          fee_bsk: number
          id: string
          is_free_spin: boolean
          outcome: Json
          segment_label: string
          user_id: string
        }
        Insert: {
          auth_method?: string
          bet_amount?: number
          bsk_delta?: number
          created_at?: string
          fee_bsk?: number
          id?: string
          is_free_spin?: boolean
          outcome: Json
          segment_label: string
          user_id: string
        }
        Update: {
          auth_method?: string
          bet_amount?: number
          bsk_delta?: number
          created_at?: string
          fee_bsk?: number
          id?: string
          is_free_spin?: boolean
          outcome?: Json
          segment_label?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "spin_runs_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "spin_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spin_runs_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "spin_wheels"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_seed_commits: {
        Row: {
          bet_amount: number
          bet_token: string
          client_seed: string | null
          created_at: string
          expires_at: string
          fee_amount: number | null
          id: string
          is_free_spin: boolean | null
          nonce: number | null
          server_seed: string | null
          server_seed_hash: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_amount: number
          bet_token?: string
          client_seed?: string | null
          created_at?: string
          expires_at?: string
          fee_amount?: number | null
          id?: string
          is_free_spin?: boolean | null
          nonce?: number | null
          server_seed?: string | null
          server_seed_hash: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_amount?: number
          bet_token?: string
          client_seed?: string | null
          created_at?: string
          expires_at?: string
          fee_amount?: number | null
          id?: string
          is_free_spin?: boolean | null
          nonce?: number | null
          server_seed?: string | null
          server_seed_hash?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spin_segments: {
        Row: {
          color: string | null
          id: string
          is_enabled: boolean | null
          label: string
          max_per_day: number | null
          max_total: number | null
          reward_token: string | null
          reward_type: string | null
          reward_value: number | null
          weight: number
          wheel_id: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          is_enabled?: boolean | null
          label: string
          max_per_day?: number | null
          max_total?: number | null
          reward_token?: string | null
          reward_type?: string | null
          reward_value?: number | null
          weight: number
          wheel_id?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          is_enabled?: boolean | null
          label?: string
          max_per_day?: number | null
          max_total?: number | null
          reward_token?: string | null
          reward_type?: string | null
          reward_value?: number | null
          weight?: number
          wheel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spin_segments_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "spin_wheels"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_settings: {
        Row: {
          cooldown_seconds: number
          created_at: string
          fee_bp_after_free: number
          free_spins_default: number
          id: string
          is_enabled: boolean
          max_bet_usdt: number
          min_bet_usdt: number
          segments: Json
          updated_at: string
        }
        Insert: {
          cooldown_seconds?: number
          created_at?: string
          fee_bp_after_free?: number
          free_spins_default?: number
          id?: string
          is_enabled?: boolean
          max_bet_usdt?: number
          min_bet_usdt?: number
          segments?: Json
          updated_at?: string
        }
        Update: {
          cooldown_seconds?: number
          created_at?: string
          fee_bp_after_free?: number
          free_spins_default?: number
          id?: string
          is_enabled?: boolean
          max_bet_usdt?: number
          min_bet_usdt?: number
          segments?: Json
          updated_at?: string
        }
        Relationships: []
      }
      spin_user_limits: {
        Row: {
          day: string | null
          id: string
          spins_today: number | null
          user_id: string
          wheel_id: string | null
        }
        Insert: {
          day?: string | null
          id?: string
          spins_today?: number | null
          user_id: string
          wheel_id?: string | null
        }
        Update: {
          day?: string | null
          id?: string
          spins_today?: number | null
          user_id?: string
          wheel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spin_user_limits_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "spin_wheels"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_wheel_config: {
        Row: {
          created_at: string
          daily_spin_limit: number | null
          fee_percentage: number
          house_edge_percentage: number
          id: string
          is_active: boolean
          max_bet_usdt: number
          min_bet_usdt: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_spin_limit?: number | null
          fee_percentage?: number
          house_edge_percentage?: number
          id?: string
          is_active?: boolean
          max_bet_usdt?: number
          min_bet_usdt?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_spin_limit?: number | null
          fee_percentage?: number
          house_edge_percentage?: number
          id?: string
          is_active?: boolean
          max_bet_usdt?: number
          min_bet_usdt?: number
          updated_at?: string
        }
        Relationships: []
      }
      spin_wheel_segments: {
        Row: {
          color_hex: string | null
          created_at: string
          id: number
          is_active: boolean
          label: string
          max_payout: number
          min_payout: number
          payout_token: string
          updated_at: string
          weight: number
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          label: string
          max_payout?: number
          min_payout?: number
          payout_token?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          label?: string
          max_payout?: number
          min_payout?: number
          payout_token?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      spin_wheels: {
        Row: {
          cooldown_seconds: number | null
          created_at: string | null
          end_at: string | null
          free_spins_daily: number | null
          id: string
          is_active: boolean | null
          max_spins_per_user: number | null
          name: string
          seed: string | null
          start_at: string | null
          ticket_currency: string | null
          ticket_price: number | null
          vip_multiplier: number | null
        }
        Insert: {
          cooldown_seconds?: number | null
          created_at?: string | null
          end_at?: string | null
          free_spins_daily?: number | null
          id?: string
          is_active?: boolean | null
          max_spins_per_user?: number | null
          name: string
          seed?: string | null
          start_at?: string | null
          ticket_currency?: string | null
          ticket_price?: number | null
          vip_multiplier?: number | null
        }
        Update: {
          cooldown_seconds?: number | null
          created_at?: string | null
          end_at?: string | null
          free_spins_daily?: number | null
          id?: string
          is_active?: boolean | null
          max_spins_per_user?: number | null
          name?: string
          seed?: string | null
          start_at?: string | null
          ticket_currency?: string | null
          ticket_price?: number | null
          vip_multiplier?: number | null
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
          updated_at: string
          user_id: string
        }
        Insert: {
          bsk_available?: number
          bsk_pending?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bsk_available?: number
          bsk_pending?: number
          id?: string
          updated_at?: string
          user_id?: string
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
      user_free_spins: {
        Row: {
          created_at: string
          first_spin_at: string | null
          free_spins_remaining: number
          free_spins_used: number
          last_spin_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_spin_at?: string | null
          free_spins_remaining?: number
          free_spins_used?: number
          last_spin_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_spin_at?: string | null
          free_spins_remaining?: number
          free_spins_used?: number
          last_spin_at?: string | null
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
      fiat_settings_inr_public: {
        Row: {
          bank_name: string | null
          created_at: string | null
          enabled: boolean | null
          fee_fixed: number | null
          fee_percent: number | null
          id: string | null
          min_deposit: number | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          bank_name?: string | null
          created_at?: string | null
          enabled?: boolean | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string | null
          min_deposit?: number | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_name?: string | null
          created_at?: string | null
          enabled?: boolean | null
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string | null
          min_deposit?: number | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_user_balance: {
        Args: {
          p_base_currency?: string
          p_metric?: Database["public"]["Enums"]["balance_metric"]
          p_user_id: string
        }
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
      process_badge_qualification: {
        Args: {
          p_ipg_amount: number
          p_transaction_chain?: string
          p_transaction_hash?: string
          p_user_id: string
        }
        Returns: Json
      }
      process_daily_bsk_vesting: {
        Args: Record<PropertyKey, never>
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
      claim_status: "PENDING" | "APPROVED" | "REJECTED"
      draw_status: "OPEN" | "CLOSED" | "COMPLETED" | "CANCELLED"
      insurance_type: "ACCIDENT" | "TRADING"
      invite_policy: "BLOCK_WHEN_FULL" | "WAITLIST"
      policy_status: "ACTIVE" | "EXPIRED" | "CANCELLED"
      promotion_type: "INR_BONUS" | "DEPOSIT_BONUS" | "TRADING_BONUS"
      spin_outcome: "WIN" | "LOSE"
      token_bucket: "holding" | "tradable"
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
      claim_status: ["PENDING", "APPROVED", "REJECTED"],
      draw_status: ["OPEN", "CLOSED", "COMPLETED", "CANCELLED"],
      insurance_type: ["ACCIDENT", "TRADING"],
      invite_policy: ["BLOCK_WHEN_FULL", "WAITLIST"],
      policy_status: ["ACTIVE", "EXPIRED", "CANCELLED"],
      promotion_type: ["INR_BONUS", "DEPOSIT_BONUS", "TRADING_BONUS"],
      spin_outcome: ["WIN", "LOSE"],
      token_bucket: ["holding", "tradable"],
    },
  },
} as const

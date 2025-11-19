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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          ip_address: unknown
          placement: string | null
          seen_at: string
          user_id: string
        }
        Insert: {
          ad_id: string
          device_id?: string | null
          id?: string
          ip_address?: unknown
          placement?: string | null
          seen_at?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          device_id?: string | null
          id?: string
          ip_address?: unknown
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
          tier_bsk: number
          tier_bsk_legacy: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_bsk: number
          duration_days?: number
          id?: string
          is_active?: boolean
          tier_bsk?: number
          tier_bsk_legacy: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_bsk?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          tier_bsk?: number
          tier_bsk_legacy?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_user_subscriptions: {
        Row: {
          active_until: string | null
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
          active_until?: string | null
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
          active_until?: string | null
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
      admin_actions_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      admin_balance_adjustments: {
        Row: {
          admin_user_id: string
          after_balance: number | null
          amount: number
          balance_type: string
          before_balance: number | null
          created_at: string | null
          id: string
          operation: string
          reason: string
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          after_balance?: number | null
          amount: number
          balance_type: string
          before_balance?: number | null
          created_at?: string | null
          id?: string
          operation: string
          reason: string
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          after_balance?: number | null
          amount?: number
          balance_type?: string
          before_balance?: number | null
          created_at?: string | null
          id?: string
          operation?: string
          reason?: string
          target_user_id?: string
        }
        Relationships: []
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
      admin_notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          min_amount_threshold: number | null
          notify_crypto_inr_deposit: boolean | null
          notify_crypto_withdrawal: boolean | null
          notify_inr_deposit: boolean | null
          notify_inr_withdrawal: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          min_amount_threshold?: number | null
          notify_crypto_inr_deposit?: boolean | null
          notify_crypto_withdrawal?: boolean | null
          notify_inr_deposit?: boolean | null
          notify_inr_withdrawal?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          min_amount_threshold?: number | null
          notify_crypto_inr_deposit?: boolean | null
          notify_crypto_withdrawal?: boolean | null
          notify_inr_deposit?: boolean | null
          notify_inr_withdrawal?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string | null
          related_resource_id: string | null
          related_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string | null
          related_resource_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          related_resource_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
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
          target_url: string | null
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
          target_url?: string | null
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
          target_url?: string | null
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
      announcements: {
        Row: {
          announcement_type: string
          content: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          end_date: string | null
          id: string
          images: Json | null
          link_url: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_type?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          images?: Json | null
          link_url?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_type?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          images?: Json | null
          link_url?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
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
          auto_deposit_enabled: boolean | null
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
          max_deposit_per_tx: number | null
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
          auto_deposit_enabled?: boolean | null
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
          max_deposit_per_tx?: number | null
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
          auto_deposit_enabled?: boolean | null
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
          max_deposit_per_tx?: number | null
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badge_card_config: {
        Row: {
          border_text: string | null
          created_at: string
          fields_visible: Json
          id: string
          logo_url: string | null
          theme_colors: Json
          updated_at: string
          watermark_text: string | null
        }
        Insert: {
          border_text?: string | null
          created_at?: string
          fields_visible?: Json
          id?: string
          logo_url?: string | null
          theme_colors?: Json
          updated_at?: string
          watermark_text?: string | null
        }
        Update: {
          border_text?: string | null
          created_at?: string
          fields_visible?: Json
          id?: string
          logo_url?: string | null
          theme_colors?: Json
          updated_at?: string
          watermark_text?: string | null
        }
        Relationships: []
      }
      badge_cards_new: {
        Row: {
          card_data: Json
          card_image_path: string | null
          created_at: string
          id: string
          qr_code_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_data?: Json
          card_image_path?: string | null
          created_at?: string
          id?: string
          qr_code_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_data?: Json
          card_image_path?: string | null
          created_at?: string
          id?: string
          qr_code_path?: string | null
          updated_at?: string
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      balance_reconciliation_reports: {
        Row: {
          asset_id: string
          discrepancy: number | null
          id: string
          ledger_sum: number
          report_date: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          user_id: string
          wallet_balance: number
        }
        Insert: {
          asset_id: string
          discrepancy?: number | null
          id?: string
          ledger_sum: number
          report_date?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id: string
          wallet_balance: number
        }
        Update: {
          asset_id?: string
          discrepancy?: number | null
          id?: string
          ledger_sum?: number
          report_date?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "balance_reconciliation_reports_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      banking_inr: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          ifsc: string | null
          is_locked: boolean | null
          updated_at: string | null
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
          is_locked?: boolean | null
          updated_at?: string | null
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
          is_locked?: boolean | null
          updated_at?: string | null
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
      bsk_admin_operations: {
        Row: {
          admin_id: string
          amount: number | null
          config_id: string | null
          created_at: string
          destination: string | null
          id: string
          notes: string | null
          operation_type: string
          recipient_id: string | null
        }
        Insert: {
          admin_id: string
          amount?: number | null
          config_id?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          notes?: string | null
          operation_type: string
          recipient_id?: string | null
        }
        Update: {
          admin_id?: string
          amount?: number | null
          config_id?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          notes?: string | null
          operation_type?: string
          recipient_id?: string | null
        }
        Relationships: []
      }
      bsk_admin_settings: {
        Row: {
          created_at: string
          daily_burn_limit: number
          daily_mint_limit: number
          id: string
          max_withdrawal_amount: number
          min_withdrawal_amount: number
          notes: string | null
          require_kyc_for_withdrawal: boolean
          updated_at: string
          withdrawal_enabled: boolean
          withdrawal_fee_percent: number
        }
        Insert: {
          created_at?: string
          daily_burn_limit?: number
          daily_mint_limit?: number
          id?: string
          max_withdrawal_amount?: number
          min_withdrawal_amount?: number
          notes?: string | null
          require_kyc_for_withdrawal?: boolean
          updated_at?: string
          withdrawal_enabled?: boolean
          withdrawal_fee_percent?: number
        }
        Update: {
          created_at?: string
          daily_burn_limit?: number
          daily_mint_limit?: number
          id?: string
          max_withdrawal_amount?: number
          min_withdrawal_amount?: number
          notes?: string | null
          require_kyc_for_withdrawal?: boolean
          updated_at?: string
          withdrawal_enabled?: boolean
          withdrawal_fee_percent?: number
        }
        Relationships: []
      }
      bsk_balance_audit_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          context: string | null
          id: string
          new_holding: number | null
          new_withdrawable: number | null
          old_holding: number | null
          old_withdrawable: number | null
          operation: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          context?: string | null
          id?: string
          new_holding?: number | null
          new_withdrawable?: number | null
          old_holding?: number | null
          old_withdrawable?: number | null
          operation: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          context?: string | null
          id?: string
          new_holding?: number | null
          new_withdrawable?: number | null
          old_holding?: number | null
          old_withdrawable?: number | null
          operation?: string
          user_id?: string
        }
        Relationships: []
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
          fee_fixed: number
          fee_percent: number
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
          fee_fixed?: number
          fee_percent?: number
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
          fee_fixed?: number
          fee_percent?: number
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
          type: string | null
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
          type?: string | null
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
          type?: string | null
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
      bsk_loan_auto_debit_log: {
        Row: {
          amount_bsk: number
          batch_id: string
          created_at: string | null
          error_message: string | null
          id: string
          installment_id: string | null
          loan_id: string | null
          processed_at: string | null
          scheduled_date: string
          status: string
          user_id: string
        }
        Insert: {
          amount_bsk: number
          batch_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          installment_id?: string | null
          loan_id?: string | null
          processed_at?: string | null
          scheduled_date: string
          status: string
          user_id: string
        }
        Update: {
          amount_bsk?: number
          batch_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          installment_id?: string | null
          loan_id?: string | null
          processed_at?: string | null
          scheduled_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_auto_debit_log_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "bsk_loan_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bsk_loan_auto_debit_log_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "bsk_loans"
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
          auto_debit_attempted_at: string | null
          auto_debit_failed_reason: string | null
          created_at: string
          days_overdue: number | null
          due_date: string
          emi_bsk: number | null
          emi_inr: number | null
          id: string
          installment_number: number
          interest_bsk: number
          late_fee_applied_at: string | null
          late_fee_bsk: number
          loan_id: string
          paid_at: string | null
          paid_bsk: number
          payment_rate_snapshot: number | null
          principal_bsk: number
          retry_count: number | null
          status: string
          total_due_bsk: number
          updated_at: string
        }
        Insert: {
          auto_debit_attempted_at?: string | null
          auto_debit_failed_reason?: string | null
          created_at?: string
          days_overdue?: number | null
          due_date: string
          emi_bsk?: number | null
          emi_inr?: number | null
          id?: string
          installment_number: number
          interest_bsk?: number
          late_fee_applied_at?: string | null
          late_fee_bsk?: number
          loan_id: string
          paid_at?: string | null
          paid_bsk?: number
          payment_rate_snapshot?: number | null
          principal_bsk?: number
          retry_count?: number | null
          status?: string
          total_due_bsk: number
          updated_at?: string
        }
        Update: {
          auto_debit_attempted_at?: string | null
          auto_debit_failed_reason?: string | null
          created_at?: string
          days_overdue?: number | null
          due_date?: string
          emi_bsk?: number | null
          emi_inr?: number | null
          id?: string
          installment_number?: number
          interest_bsk?: number
          late_fee_applied_at?: string | null
          late_fee_bsk?: number
          loan_id?: string
          paid_at?: string | null
          paid_bsk?: number
          payment_rate_snapshot?: number | null
          principal_bsk?: number
          retry_count?: number | null
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
      bsk_loan_late_fee_config: {
        Row: {
          compound_daily: boolean | null
          created_at: string | null
          grace_period_days: number | null
          id: string
          is_active: boolean | null
          late_fee_percent: number | null
          max_late_fee_bsk: number | null
          updated_at: string | null
        }
        Insert: {
          compound_daily?: boolean | null
          created_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          late_fee_percent?: number | null
          max_late_fee_bsk?: number | null
          updated_at?: string | null
        }
        Update: {
          compound_daily?: boolean | null
          created_at?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          late_fee_percent?: number | null
          max_late_fee_bsk?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bsk_loan_late_fee_log: {
        Row: {
          applied_at: string | null
          calculation_date: string
          days_overdue: number
          id: string
          installment_id: string
          late_fee_bsk: number
          loan_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          calculation_date: string
          days_overdue: number
          id?: string
          installment_id: string
          late_fee_bsk: number
          loan_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          calculation_date?: string
          days_overdue?: number
          id?: string
          installment_id?: string
          late_fee_bsk?: number
          loan_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_late_fee_log_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "bsk_loan_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bsk_loan_late_fee_log_loan_id_fkey"
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
      bsk_loan_notification_log: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          installment_id: string | null
          loan_id: string | null
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          channel: string
          error_message?: string | null
          id?: string
          installment_id?: string | null
          loan_id?: string | null
          metadata?: Json | null
          notification_type: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          installment_id?: string | null
          loan_id?: string | null
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_notification_log_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "bsk_loan_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bsk_loan_notification_log_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "bsk_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      bsk_loan_notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          remind_1_day_before: boolean | null
          remind_3_days_before: boolean | null
          remind_on_due_date: boolean | null
          remind_overdue: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          remind_1_day_before?: boolean | null
          remind_3_days_before?: boolean | null
          remind_on_due_date?: boolean | null
          remind_overdue?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          remind_1_day_before?: boolean | null
          remind_3_days_before?: boolean | null
          remind_on_due_date?: boolean | null
          remind_overdue?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      bsk_loan_prepayments: {
        Row: {
          created_at: string | null
          discount_applied_bsk: number | null
          id: string
          installments_cleared: number
          loan_id: string
          notes: string | null
          outstanding_before_bsk: number
          prepayment_amount_bsk: number
          processed_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_applied_bsk?: number | null
          id?: string
          installments_cleared: number
          loan_id: string
          notes?: string | null
          outstanding_before_bsk: number
          prepayment_amount_bsk: number
          processed_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_applied_bsk?: number | null
          id?: string
          installments_cleared?: number
          loan_id?: string
          notes?: string | null
          outstanding_before_bsk?: number
          prepayment_amount_bsk?: number
          processed_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bsk_loan_prepayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "bsk_loans"
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
          max_amount_bsk: number | null
          max_amount_inr: number
          max_concurrent_loans_per_user: number
          min_account_age_days: number
          min_amount_bsk: number | null
          min_amount_inr: number
          origination_fee_percent: number
          per_user_exposure_cap_inr: number | null
          prepayment_allowed: boolean
          prepayment_penalty_percent: number
          processing_fee_fixed_bsk: number | null
          processing_fee_percent: number | null
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
          max_amount_bsk?: number | null
          max_amount_inr?: number
          max_concurrent_loans_per_user?: number
          min_account_age_days?: number
          min_amount_bsk?: number | null
          min_amount_inr?: number
          origination_fee_percent?: number
          per_user_exposure_cap_inr?: number | null
          prepayment_allowed?: boolean
          prepayment_penalty_percent?: number
          processing_fee_fixed_bsk?: number | null
          processing_fee_percent?: number | null
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
          max_amount_bsk?: number | null
          max_amount_inr?: number
          max_concurrent_loans_per_user?: number
          min_account_age_days?: number
          min_amount_bsk?: number | null
          min_amount_inr?: number
          origination_fee_percent?: number
          per_user_exposure_cap_inr?: number | null
          prepayment_allowed?: boolean
          prepayment_penalty_percent?: number
          processing_fee_fixed_bsk?: number | null
          processing_fee_percent?: number | null
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
          prepaid_at: string | null
          prepayment_discount_bsk: number | null
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
          prepaid_at?: string | null
          prepayment_discount_bsk?: number | null
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
          prepaid_at?: string | null
          prepayment_discount_bsk?: number | null
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
        Relationships: [
          {
            foreignKeyName: "bsk_loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bsk_loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
        ]
      }
      bsk_manual_purchase_requests: {
        Row: {
          admin_bep20_address: string
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          bscscan_link: string
          bsk_amount: number | null
          created_at: string
          email: string
          holding_bonus_amount: number | null
          id: string
          ip_address: unknown
          payer_contact: string | null
          payer_name: string | null
          payment_method: string | null
          purchase_amount: number
          rejected_reason: string | null
          screenshot_url: string | null
          status: string
          total_received: number | null
          transaction_hash: string | null
          updated_at: string
          user_id: string
          utr_number: string | null
          withdrawable_amount: number | null
        }
        Insert: {
          admin_bep20_address: string
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bscscan_link: string
          bsk_amount?: number | null
          created_at?: string
          email: string
          holding_bonus_amount?: number | null
          id?: string
          ip_address?: unknown
          payer_contact?: string | null
          payer_name?: string | null
          payment_method?: string | null
          purchase_amount: number
          rejected_reason?: string | null
          screenshot_url?: string | null
          status?: string
          total_received?: number | null
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
          utr_number?: string | null
          withdrawable_amount?: number | null
        }
        Update: {
          admin_bep20_address?: string
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bscscan_link?: string
          bsk_amount?: number | null
          created_at?: string
          email?: string
          holding_bonus_amount?: number | null
          id?: string
          ip_address?: unknown
          payer_contact?: string | null
          payer_name?: string | null
          payment_method?: string | null
          purchase_amount?: number
          rejected_reason?: string | null
          screenshot_url?: string | null
          status?: string
          total_received?: number | null
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
          utr_number?: string | null
          withdrawable_amount?: number | null
        }
        Relationships: []
      }
      bsk_purchase_bonuses: {
        Row: {
          campaign_name: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          end_at: string
          holding_bonus_percent: number
          id: string
          is_active: boolean
          is_featured: boolean
          max_purchase_amount_bsk: number
          min_purchase_amount_bsk: number
          purchase_amount_bsk: number
          start_at: string
          updated_at: string
          withdrawable_bonus_percent: number
        }
        Insert: {
          campaign_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          end_at: string
          holding_bonus_percent: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_purchase_amount_bsk: number
          min_purchase_amount_bsk: number
          purchase_amount_bsk: number
          start_at: string
          updated_at?: string
          withdrawable_bonus_percent: number
        }
        Update: {
          campaign_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          end_at?: string
          holding_bonus_percent?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_purchase_amount_bsk?: number
          min_purchase_amount_bsk?: number
          purchase_amount_bsk?: number
          start_at?: string
          updated_at?: string
          withdrawable_bonus_percent?: number
        }
        Relationships: []
      }
      bsk_purchase_settings: {
        Row: {
          admin_account_holder: string | null
          admin_account_number: string | null
          admin_bank_name: string | null
          admin_bep20_address: string
          admin_ifsc_code: string | null
          admin_upi_id: string | null
          created_at: string
          created_by: string | null
          fee_fixed: number
          fee_percent: number
          id: string
          instructions: string | null
          is_active: boolean
          max_purchase_amount: number
          min_purchase_amount: number
          payment_methods_enabled: string[] | null
          updated_at: string
        }
        Insert: {
          admin_account_holder?: string | null
          admin_account_number?: string | null
          admin_bank_name?: string | null
          admin_bep20_address: string
          admin_ifsc_code?: string | null
          admin_upi_id?: string | null
          created_at?: string
          created_by?: string | null
          fee_fixed?: number
          fee_percent?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_purchase_amount?: number
          min_purchase_amount?: number
          payment_methods_enabled?: string[] | null
          updated_at?: string
        }
        Update: {
          admin_account_holder?: string | null
          admin_account_number?: string | null
          admin_bank_name?: string | null
          admin_bep20_address?: string
          admin_ifsc_code?: string | null
          admin_upi_id?: string | null
          created_at?: string
          created_by?: string | null
          fee_fixed?: number
          fee_percent?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_purchase_amount?: number
          min_purchase_amount?: number
          payment_methods_enabled?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      bsk_rate_history: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          metadata: Json | null
          notes: string | null
          rate_inr_per_bsk: number
          status: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          rate_inr_per_bsk: number
          status?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          rate_inr_per_bsk?: number
          status?: string | null
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
      bsk_release_history: {
        Row: {
          amount_released: number
          created_at: string
          holding_after: number
          holding_before: number
          id: string
          notes: string | null
          percentage: number
          released_by: string
          user_id: string
          withdrawable_after: number
          withdrawable_before: number
        }
        Insert: {
          amount_released: number
          created_at?: string
          holding_after: number
          holding_before: number
          id?: string
          notes?: string | null
          percentage: number
          released_by: string
          user_id: string
          withdrawable_after: number
          withdrawable_before: number
        }
        Update: {
          amount_released?: number
          created_at?: string
          holding_after?: number
          holding_before?: number
          id?: string
          notes?: string | null
          percentage?: number
          released_by?: string
          user_id?: string
          withdrawable_after?: number
          withdrawable_before?: number
        }
        Relationships: []
      }
      bsk_supply_ledger: {
        Row: {
          amount: number
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          performed_by: string | null
          reason: string | null
          target_user_id: string | null
          total_supply_after: number
          total_supply_before: number
        }
        Insert: {
          amount: number
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          reason?: string | null
          target_user_id?: string | null
          total_supply_after: number
          total_supply_before: number
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          reason?: string | null
          target_user_id?: string | null
          total_supply_after?: number
          total_supply_before?: number
        }
        Relationships: []
      }
      bsk_transfers: {
        Row: {
          amount_bsk: number
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          recipient_balance_after: number
          recipient_balance_before: number
          recipient_id: string
          sender_balance_after: number
          sender_balance_before: number
          sender_id: string
          status: string
          transaction_ref: string | null
          updated_at: string | null
        }
        Insert: {
          amount_bsk: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          recipient_balance_after: number
          recipient_balance_before: number
          recipient_id: string
          sender_balance_after: number
          sender_balance_before: number
          sender_id: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_bsk?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          recipient_balance_after?: number
          recipient_balance_before?: number
          recipient_id?: string
          sender_balance_after?: number
          sender_balance_before?: number
          sender_id?: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string | null
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
          type: string | null
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
          type?: string | null
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
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bsk_withdrawal_requests: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          admin_notes: string | null
          amount_bsk: number
          bank_name: string | null
          created_at: string
          crypto_address: string | null
          crypto_network: string | null
          crypto_symbol: string | null
          id: string
          ifsc_code: string | null
          metadata: Json | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
          withdrawal_type: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount_bsk: number
          bank_name?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_network?: string | null
          crypto_symbol?: string | null
          id?: string
          ifsc_code?: string | null
          metadata?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          withdrawal_type: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          admin_notes?: string | null
          amount_bsk?: number
          bank_name?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_network?: string | null
          crypto_symbol?: string | null
          id?: string
          ifsc_code?: string | null
          metadata?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          withdrawal_type?: string
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
      crypto_conversion_requests: {
        Row: {
          admin_notes: string | null
          admin_wallet_address: string
          approved_at: string | null
          blockchain_explorer_link: string | null
          bsk_amount: number
          created_at: string
          crypto_amount: number
          crypto_symbol: string
          email: string
          id: string
          rejected_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          transaction_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_wallet_address: string
          approved_at?: string | null
          blockchain_explorer_link?: string | null
          bsk_amount: number
          created_at?: string
          crypto_amount: number
          crypto_symbol: string
          email: string
          id?: string
          rejected_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          transaction_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_wallet_address?: string
          approved_at?: string | null
          blockchain_explorer_link?: string | null
          bsk_amount?: number
          created_at?: string
          crypto_amount?: number
          crypto_symbol?: string
          email?: string
          id?: string
          rejected_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          transaction_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crypto_conversion_settings: {
        Row: {
          admin_wallet_address: string
          conversion_rate_bsk: number
          created_at: string
          created_by: string | null
          crypto_name: string
          crypto_symbol: string
          fee_fixed: number
          fee_percent: number
          id: string
          instructions: string | null
          is_active: boolean
          max_amount: number
          min_amount: number
          network: string
          updated_at: string
        }
        Insert: {
          admin_wallet_address: string
          conversion_rate_bsk?: number
          created_at?: string
          created_by?: string | null
          crypto_name: string
          crypto_symbol: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          network: string
          updated_at?: string
        }
        Update: {
          admin_wallet_address?: string
          conversion_rate_bsk?: number
          created_at?: string
          created_by?: string | null
          crypto_name?: string
          crypto_symbol?: string
          fee_fixed?: number
          fee_percent?: number
          id?: string
          instructions?: string | null
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          network?: string
          updated_at?: string
        }
        Relationships: []
      }
      crypto_deposit_fee_configs: {
        Row: {
          active: boolean | null
          asset_id: string | null
          auto_approve_threshold: number | null
          created_at: string | null
          fee_fixed: number | null
          fee_percent: number | null
          fee_type: string | null
          id: string
          max_deposit_amount: number | null
          min_deposit_amount: number | null
          network: string | null
          requires_proof: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          asset_id?: string | null
          auto_approve_threshold?: number | null
          created_at?: string | null
          fee_fixed?: number | null
          fee_percent?: number | null
          fee_type?: string | null
          id?: string
          max_deposit_amount?: number | null
          min_deposit_amount?: number | null
          network?: string | null
          requires_proof?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          asset_id?: string | null
          auto_approve_threshold?: number | null
          created_at?: string | null
          fee_fixed?: number | null
          fee_percent?: number | null
          fee_type?: string | null
          id?: string
          max_deposit_amount?: number | null
          min_deposit_amount?: number | null
          network?: string | null
          requires_proof?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposit_fee_configs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_to_inr_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          crypto_amount: number
          crypto_asset_id: string
          crypto_usd_rate: number | null
          decided_at: string | null
          decided_by: string | null
          deposit_fee_fixed: number | null
          deposit_fee_percent: number | null
          deposit_id: string | null
          id: string
          inr_equivalent: number
          inr_usd_rate: number | null
          net_inr_credit: number | null
          network: string
          proof_url: string | null
          status: string
          submitted_at: string | null
          total_fee: number | null
          tx_hash: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          crypto_amount: number
          crypto_asset_id: string
          crypto_usd_rate?: number | null
          decided_at?: string | null
          decided_by?: string | null
          deposit_fee_fixed?: number | null
          deposit_fee_percent?: number | null
          deposit_id?: string | null
          id?: string
          inr_equivalent: number
          inr_usd_rate?: number | null
          net_inr_credit?: number | null
          network: string
          proof_url?: string | null
          status?: string
          submitted_at?: string | null
          total_fee?: number | null
          tx_hash: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          crypto_amount?: number
          crypto_asset_id?: string
          crypto_usd_rate?: number | null
          decided_at?: string | null
          decided_by?: string | null
          deposit_fee_fixed?: number | null
          deposit_fee_percent?: number | null
          deposit_id?: string | null
          id?: string
          inr_equivalent?: number
          inr_usd_rate?: number | null
          net_inr_credit?: number | null
          network?: string
          proof_url?: string | null
          status?: string
          submitted_at?: string | null
          total_fee?: number | null
          tx_hash?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_to_inr_requests_crypto_asset_id_fkey"
            columns: ["crypto_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crypto_to_inr_requests_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
        ]
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
      daily_platform_metrics: {
        Row: {
          active_users_24h: number | null
          bsk_holding_total: number | null
          bsk_total_supply: number | null
          bsk_withdrawable_total: number | null
          calculated_at: string | null
          deposits_amount: number | null
          deposits_count: number | null
          id: string
          inr_total_balance: number | null
          metric_date: string
          new_users: number | null
          total_fees_collected: number | null
          total_users: number | null
          tvl: number | null
          withdrawals_amount: number | null
          withdrawals_count: number | null
        }
        Insert: {
          active_users_24h?: number | null
          bsk_holding_total?: number | null
          bsk_total_supply?: number | null
          bsk_withdrawable_total?: number | null
          calculated_at?: string | null
          deposits_amount?: number | null
          deposits_count?: number | null
          id?: string
          inr_total_balance?: number | null
          metric_date: string
          new_users?: number | null
          total_fees_collected?: number | null
          total_users?: number | null
          tvl?: number | null
          withdrawals_amount?: number | null
          withdrawals_count?: number | null
        }
        Update: {
          active_users_24h?: number | null
          bsk_holding_total?: number | null
          bsk_total_supply?: number | null
          bsk_withdrawable_total?: number | null
          calculated_at?: string | null
          deposits_amount?: number | null
          deposits_count?: number | null
          id?: string
          inr_total_balance?: number | null
          metric_date?: string
          new_users?: number | null
          total_fees_collected?: number | null
          total_users?: number | null
          tvl?: number | null
          withdrawals_amount?: number | null
          withdrawals_count?: number | null
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
      deposits: {
        Row: {
          amount: number
          asset_id: string
          confirmations: number | null
          created_at: string | null
          credited_at: string | null
          id: string
          network: string
          required_confirmations: number | null
          status: string
          tx_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          confirmations?: number | null
          created_at?: string | null
          credited_at?: string | null
          id?: string
          network: string
          required_confirmations?: number | null
          status?: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          confirmations?: number | null
          created_at?: string | null
          credited_at?: string | null
          id?: string
          network?: string
          required_confirmations?: number | null
          status?: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          device_name: string | null
          id: string
          is_verified: boolean | null
          last_ip: string | null
          last_seen: string | null
          trusted: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_name?: string | null
          id?: string
          is_verified?: boolean | null
          last_ip?: string | null
          last_seen?: string | null
          trusted?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_name?: string | null
          id?: string
          is_verified?: boolean | null
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
          ticket_price_bsk: number
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
          ticket_price_bsk: number
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
          ticket_price_bsk?: number
          title?: string
          updated_at?: string | null
          winners_determined_at?: string | null
        }
        Relationships: []
      }
      draw_prizes: {
        Row: {
          amount_bsk: number
          created_at: string | null
          draw_id: string
          id: string
          rank: Database["public"]["Enums"]["winner_rank"]
        }
        Insert: {
          amount_bsk: number
          created_at?: string | null
          draw_id: string
          id?: string
          rank: Database["public"]["Enums"]["winner_rank"]
        }
        Update: {
          amount_bsk?: number
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
          ticket_price_bsk: number
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
          ticket_price_bsk: number
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
          ticket_price_bsk?: number
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
      idempotency_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          key: string
          operation_type: string
          resource_id: string | null
          response_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key: string
          operation_type: string
          resource_id?: string | null
          response_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          operation_type?: string
          resource_id?: string | null
          response_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      image_carousels: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          link_url: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          link_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          link_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inr_balance_ledger: {
        Row: {
          admin_id: string | null
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          id: string
          operation: string
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          id?: string
          operation: string
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          id?: string
          operation?: string
          reason?: string | null
          type?: string
          user_id?: string
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
          requires_manual_review: boolean | null
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
          requires_manual_review?: boolean | null
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
          requires_manual_review?: boolean | null
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
      ipg_admin_settings: {
        Row: {
          contract_address: string
          created_at: string
          decimals: number
          id: string
          is_verified: boolean
          min_trade_amount: number
          network: string
          notes: string | null
          trading_enabled: boolean
          updated_at: string
          withdrawal_enabled: boolean
        }
        Insert: {
          contract_address: string
          created_at?: string
          decimals?: number
          id?: string
          is_verified?: boolean
          min_trade_amount?: number
          network?: string
          notes?: string | null
          trading_enabled?: boolean
          updated_at?: string
          withdrawal_enabled?: boolean
        }
        Update: {
          contract_address?: string
          created_at?: string
          decimals?: number
          id?: string
          is_verified?: boolean
          min_trade_amount?: number
          network?: string
          notes?: string | null
          trading_enabled?: boolean
          updated_at?: string
          withdrawal_enabled?: boolean
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
          max_bet_bsk: number
          max_bet_inr: number
          max_daily_liability_bsk: number | null
          min_bet_bsk: number
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
          max_bet_bsk?: number
          max_bet_inr?: number
          max_daily_liability_bsk?: number | null
          min_bet_bsk?: number
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
          max_bet_bsk?: number
          max_bet_inr?: number
          max_daily_liability_bsk?: number | null
          min_bet_bsk?: number
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
      kyc_admin_config: {
        Row: {
          created_at: string
          encrypt_at_rest: boolean
          id: string
          level_schemas: Json
          liveness_required: boolean
          manual_review_required: boolean
          pii_export_enabled: boolean
          region_rules: Json
          required_levels: string[]
          retention_days: number | null
          selfie_match_threshold: number
          storage_bucket: string
          storage_prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypt_at_rest?: boolean
          id?: string
          level_schemas?: Json
          liveness_required?: boolean
          manual_review_required?: boolean
          pii_export_enabled?: boolean
          region_rules?: Json
          required_levels?: string[]
          retention_days?: number | null
          selfie_match_threshold?: number
          storage_bucket?: string
          storage_prefix?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypt_at_rest?: boolean
          id?: string
          level_schemas?: Json
          liveness_required?: boolean
          manual_review_required?: boolean
          pii_export_enabled?: boolean
          region_rules?: Json
          required_levels?: string[]
          retention_days?: number | null
          selfie_match_threshold?: number
          storage_bucket?: string
          storage_prefix?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_admin_notifications: {
        Row: {
          created_at: string
          id: string
          kyc_profile_id: string
          level: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kyc_profile_id: string
          level: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kyc_profile_id?: string
          level?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_admin_notifications_kyc_profile_id_fkey"
            columns: ["kyc_profile_id"]
            isOneToOne: false
            referencedRelation: "kyc_profiles_new"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: string | null
          notes: string | null
          old_status: string | null
          performed_by: string
          submission_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by: string
          submission_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          performed_by?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_audit_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "kyc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents_new: {
        Row: {
          created_at: string
          doc_type: string
          file_hash: string | null
          file_size_bytes: number | null
          id: string
          level: string
          mime_type: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          level: string
          mime_type?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_hash?: string | null
          file_size_bytes?: number | null
          id?: string
          level?: string
          mime_type?: string | null
          storage_path?: string
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
      kyc_profiles_new: {
        Row: {
          created_at: string
          data_json: Json
          email_computed: string | null
          full_name_computed: string | null
          id: string
          level: string
          phone_computed: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_json?: Json
          email_computed?: string | null
          full_name_computed?: string | null
          id?: string
          level: string
          phone_computed?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_json?: Json
          email_computed?: string | null
          full_name_computed?: string | null
          id?: string
          level?: string
          phone_computed?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          admin_notes: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          id_type: string | null
          nationality: string | null
          phone: string | null
          postal_code: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          selfie_url: string | null
          state: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          admin_notes?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          phone?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          selfie_url?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          admin_notes?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          phone?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          selfie_url?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions_simple: {
        Row: {
          address_line1: string
          address_line2: string | null
          admin_notes: string | null
          city: string
          country: string
          created_at: string
          date_of_birth: string
          full_name: string
          id: string
          id_back_url: string
          id_front_url: string
          id_number: string
          id_type: string
          nationality: string
          phone: string
          postal_code: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string
          state: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          admin_notes?: string | null
          city: string
          country: string
          created_at?: string
          date_of_birth: string
          full_name: string
          id?: string
          id_back_url: string
          id_front_url: string
          id_number: string
          id_type: string
          nationality: string
          phone: string
          postal_code: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url: string
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          admin_notes?: string | null
          city?: string
          country?: string
          created_at?: string
          date_of_birth?: string
          full_name?: string
          id?: string
          id_back_url?: string
          id_front_url?: string
          id_number?: string
          id_type?: string
          nationality?: string
          phone?: string
          postal_code?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
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
      login_audit_new: {
        Row: {
          created_at: string
          event: string
          id: string
          ip_address: unknown
          location_city: string | null
          location_country: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          created_at: string
          current_price: number
          high_24h: number
          id: string
          last_updated: string
          low_24h: number
          market_cap: number | null
          market_id: string
          price_change_24h: number
          price_change_percentage_24h: number
          symbol: string
          updated_at: string
          volume_24h: number
        }
        Insert: {
          created_at?: string
          current_price?: number
          high_24h?: number
          id?: string
          last_updated?: string
          low_24h?: number
          market_cap?: number | null
          market_id: string
          price_change_24h?: number
          price_change_percentage_24h?: number
          symbol: string
          updated_at?: string
          volume_24h?: number
        }
        Update: {
          created_at?: string
          current_price?: number
          high_24h?: number
          id?: string
          last_updated?: string
          low_24h?: number
          market_cap?: number | null
          market_id?: string
          price_change_24h?: number
          price_change_percentage_24h?: number
          symbol?: string
          updated_at?: string
          volume_24h?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: true
            referencedRelation: "markets"
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
      mobile_linking_settings: {
        Row: {
          allow_sponsor_change_before_lock: boolean
          android_package_name_debug: string | null
          android_package_name_release: string | null
          capture_stage: string
          code_length: number
          created_at: string
          custom_scheme: string
          host: string
          id: string
          lock_policy: string
          play_store_fallback_url: string | null
          ref_base_path: string
          self_referral_block: boolean
          sha256_fingerprints_debug: string[] | null
          sha256_fingerprints_release: string[] | null
          updated_at: string
          whatsapp_template: string
        }
        Insert: {
          allow_sponsor_change_before_lock?: boolean
          android_package_name_debug?: string | null
          android_package_name_release?: string | null
          capture_stage?: string
          code_length?: number
          created_at?: string
          custom_scheme?: string
          host?: string
          id?: string
          lock_policy?: string
          play_store_fallback_url?: string | null
          ref_base_path?: string
          self_referral_block?: boolean
          sha256_fingerprints_debug?: string[] | null
          sha256_fingerprints_release?: string[] | null
          updated_at?: string
          whatsapp_template?: string
        }
        Update: {
          allow_sponsor_change_before_lock?: boolean
          android_package_name_debug?: string | null
          android_package_name_release?: string | null
          capture_stage?: string
          code_length?: number
          created_at?: string
          custom_scheme?: string
          host?: string
          id?: string
          lock_policy?: string
          play_store_fallback_url?: string | null
          ref_base_path?: string
          self_referral_block?: boolean
          sha256_fingerprints_debug?: string[] | null
          sha256_fingerprints_release?: string[] | null
          updated_at?: string
          whatsapp_template?: string
        }
        Relationships: []
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
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profile_completion_new: {
        Row: {
          completion_score: number
          has_avatar: boolean
          has_display_name: boolean
          has_phone: boolean
          kyc_level: string | null
          last_calculated_at: string
          user_id: string
        }
        Insert: {
          completion_score?: number
          has_avatar?: boolean
          has_display_name?: boolean
          has_phone?: boolean
          kyc_level?: string | null
          last_calculated_at?: string
          user_id: string
        }
        Update: {
          completion_score?: number
          has_avatar?: boolean
          has_display_name?: boolean
          has_phone?: boolean
          kyc_level?: string | null
          last_calculated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          bsc_wallet_address: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          is_kyc_approved: boolean | null
          kyc_status: string | null
          onboarding_completed_at: string | null
          onboarding_step: string | null
          phone: string | null
          referral_code: string
          setup_complete: boolean | null
          sponsor_id: string | null
          two_fa_enabled: boolean | null
          updated_at: string | null
          user_id: string
          username: string | null
          wallet_address: string | null
          wallet_addresses: Json | null
          withdrawal_locked: boolean | null
        }
        Insert: {
          account_status?: string | null
          bsc_wallet_address?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_kyc_approved?: boolean | null
          kyc_status?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          phone?: string | null
          referral_code: string
          setup_complete?: boolean | null
          sponsor_id?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          wallet_address?: string | null
          wallet_addresses?: Json | null
          withdrawal_locked?: boolean | null
        }
        Update: {
          account_status?: string | null
          bsc_wallet_address?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_kyc_approved?: boolean | null
          kyc_status?: string | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          phone?: string | null
          referral_code?: string
          setup_complete?: boolean | null
          sponsor_id?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          wallet_address?: string | null
          wallet_addresses?: Json | null
          withdrawal_locked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
        ]
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      program_flags: {
        Row: {
          enabled: boolean
          program_code: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          program_code: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          program_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_media: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number | null
          file_path: string
          file_url: string | null
          id: string
          is_active: boolean | null
          media_type: string
          module_id: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number | null
          file_path: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          media_type: string
          module_id?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number | null
          file_path?: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string
          module_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_media_module_id_fkey"
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
          description: string | null
          enabled_regions: Json
          enabled_roles: Json
          faqs: Json | null
          featured: boolean | null
          icon: string | null
          id: string
          key: string
          localized_content: Json | null
          maintenance_mode: boolean | null
          min_app_version: string | null
          name: string
          order_index: number
          route: string | null
          seasonal: boolean | null
          seo_metadata: Json | null
          status: string
          tags: Json | null
          terms_conditions: string | null
          trending: boolean | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled_regions?: Json
          enabled_roles?: Json
          faqs?: Json | null
          featured?: boolean | null
          icon?: string | null
          id?: string
          key: string
          localized_content?: Json | null
          maintenance_mode?: boolean | null
          min_app_version?: string | null
          name: string
          order_index?: number
          route?: string | null
          seasonal?: boolean | null
          seo_metadata?: Json | null
          status?: string
          tags?: Json | null
          terms_conditions?: string | null
          trending?: boolean | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled_regions?: Json
          enabled_roles?: Json
          faqs?: Json | null
          featured?: boolean | null
          icon?: string | null
          id?: string
          key?: string
          localized_content?: Json | null
          maintenance_mode?: boolean | null
          min_app_version?: string | null
          name?: string
          order_index?: number
          route?: string | null
          seasonal?: boolean | null
          seo_metadata?: Json | null
          status?: string
          tags?: Json | null
          terms_conditions?: string | null
          trending?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      program_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          name: string
          template_config: Json
          template_schema: Json
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          template_config?: Json
          template_schema?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          template_config?: Json
          template_schema?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      program_visibility_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          module_id: string | null
          priority: number | null
          rule_config: Json
          rule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          priority?: number | null
          rule_config?: Json
          rule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          module_id?: string | null
          priority?: number | null
          rule_config?: Json
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_visibility_rules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_events_log: {
        Row: {
          admin_user_id: string | null
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      referral_admin_config: {
        Row: {
          android_package_id: string | null
          android_sha256_fingerprint: string | null
          app_host: string
          created_at: string
          deep_link_scheme: string
          id: string
          qr_code_size: number
          ref_route_web: string
          self_referral_prevention: boolean
          sponsor_locking_policy: string
          updated_at: string
          whatsapp_support_url: string | null
        }
        Insert: {
          android_package_id?: string | null
          android_sha256_fingerprint?: string | null
          app_host?: string
          created_at?: string
          deep_link_scheme?: string
          id?: string
          qr_code_size?: number
          ref_route_web?: string
          self_referral_prevention?: boolean
          sponsor_locking_policy?: string
          updated_at?: string
          whatsapp_support_url?: string | null
        }
        Update: {
          android_package_id?: string | null
          android_sha256_fingerprint?: string | null
          app_host?: string
          created_at?: string
          deep_link_scheme?: string
          id?: string
          qr_code_size?: number
          ref_route_web?: string
          self_referral_prevention?: boolean
          sponsor_locking_policy?: string
          updated_at?: string
          whatsapp_support_url?: string | null
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
      referral_commissions: {
        Row: {
          amount_inr: number | null
          bsk_amount: number
          commission_type: string | null
          created_at: string | null
          destination: string
          earner_badge_at_event: string
          earner_id: string
          event_id: string
          event_type: string
          id: string
          idempotency_key: string | null
          level: number
          payer_id: string
          settled_at: string | null
          status: string
        }
        Insert: {
          amount_inr?: number | null
          bsk_amount: number
          commission_type?: string | null
          created_at?: string | null
          destination: string
          earner_badge_at_event: string
          earner_id: string
          event_id: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          level: number
          payer_id: string
          settled_at?: string | null
          status?: string
        }
        Update: {
          amount_inr?: number | null
          bsk_amount?: number
          commission_type?: string | null
          created_at?: string | null
          destination?: string
          earner_badge_at_event?: string
          earner_id?: string
          event_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          level?: number
          payer_id?: string
          settled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_earner_id_fkey"
            columns: ["earner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_commissions_earner_id_fkey"
            columns: ["earner_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
          {
            foreignKeyName: "referral_commissions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_commissions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
        ]
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
      referral_level_rewards: {
        Row: {
          balance_type: string
          bsk_amount: number
          is_active: boolean | null
          level: number
          updated_at: string | null
        }
        Insert: {
          balance_type: string
          bsk_amount?: number
          is_active?: boolean | null
          level: number
          updated_at?: string | null
        }
        Update: {
          balance_type?: string
          bsk_amount?: number
          is_active?: boolean | null
          level?: number
          updated_at?: string | null
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
      referral_links_new: {
        Row: {
          capture_stage: string | null
          created_at: string
          first_touch_at: string | null
          id: string
          locked_at: string | null
          source: string | null
          sponsor_code_used: string | null
          sponsor_id: string | null
          total_commissions: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          capture_stage?: string | null
          created_at?: string
          first_touch_at?: string | null
          id?: string
          locked_at?: string | null
          source?: string | null
          sponsor_code_used?: string | null
          sponsor_id?: string | null
          total_commissions?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          capture_stage?: string | null
          created_at?: string
          first_touch_at?: string | null
          id?: string
          locked_at?: string | null
          source?: string | null
          sponsor_code_used?: string | null
          sponsor_id?: string | null
          total_commissions?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sponsor_profile"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_sponsor_profile"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
          {
            foreignKeyName: "referral_links_new_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_links_new_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
          {
            foreignKeyName: "referral_links_new_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_links_new_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
        ]
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
      referral_tree: {
        Row: {
          ancestor_id: string
          created_at: string | null
          direct_sponsor_id: string | null
          id: string
          level: number
          path: string[]
          user_id: string
        }
        Insert: {
          ancestor_id: string
          created_at?: string | null
          direct_sponsor_id?: string | null
          id?: string
          level: number
          path: string[]
          user_id: string
        }
        Update: {
          ancestor_id?: string
          created_at?: string | null
          direct_sponsor_id?: string | null
          id?: string
          level?: number
          path?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_tree_ancestor_id_fkey"
            columns: ["ancestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tree_ancestor_id_fkey"
            columns: ["ancestor_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
          {
            foreignKeyName: "referral_tree_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_tree_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
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
      regional_restrictions: {
        Row: {
          blocked_features: Json | null
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          is_blocked: boolean
          restriction_reason: string | null
          updated_at: string
        }
        Insert: {
          blocked_features?: Json | null
          country_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          restriction_reason?: string | null
          updated_at?: string
        }
        Update: {
          blocked_features?: Json | null
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_blocked?: boolean
          restriction_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_snapshots: {
        Row: {
          date_range_end: string
          date_range_start: string
          file_path: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          report_id: string | null
          snapshot_data: Json
        }
        Insert: {
          date_range_end: string
          date_range_start: string
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_id?: string | null
          snapshot_data: Json
        }
        Update: {
          date_range_end?: string
          date_range_start?: string
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_id?: string | null
          snapshot_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      retroactive_commission_audit: {
        Row: {
          executed_by: string | null
          execution_completed_at: string | null
          execution_started_at: string
          id: string
          notes: string | null
          status: string | null
          total_commissions_paid: number | null
          total_entries_created: number | null
          total_sponsors_credited: number | null
        }
        Insert: {
          executed_by?: string | null
          execution_completed_at?: string | null
          execution_started_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          total_commissions_paid?: number | null
          total_entries_created?: number | null
          total_sponsors_credited?: number | null
        }
        Update: {
          executed_by?: string | null
          execution_completed_at?: string | null
          execution_started_at?: string
          id?: string
          notes?: string | null
          status?: string | null
          total_commissions_paid?: number | null
          total_entries_created?: number | null
          total_sponsors_credited?: number | null
        }
        Relationships: []
      }
      retroactive_processing_log: {
        Row: {
          batch_id: string
          bsk_distributed: number | null
          commissions_created: number | null
          error_message: string | null
          id: string
          processed_at: string | null
          processing_type: string
          purchase_id: string | null
          status: string
        }
        Insert: {
          batch_id: string
          bsk_distributed?: number | null
          commissions_created?: number | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          processing_type: string
          purchase_id?: string | null
          status: string
        }
        Update: {
          batch_id?: string
          bsk_distributed?: number | null
          commissions_created?: number | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          processing_type?: string
          purchase_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "retroactive_processing_log_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "badge_purchases"
            referencedColumns: ["id"]
          },
        ]
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
      saved_reports: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_scheduled: boolean | null
          last_generated_at: string | null
          report_name: string
          report_type: string
          schedule_cron: string | null
          updated_at: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_scheduled?: boolean | null
          last_generated_at?: string | null
          report_name: string
          report_type: string
          schedule_cron?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_scheduled?: boolean | null
          last_generated_at?: string | null
          report_name?: string
          report_type?: string
          schedule_cron?: string | null
          updated_at?: string | null
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
      security_admin_config: {
        Row: {
          created_at: string
          id: string
          lockout_duration_minutes: number
          max_failed_attempts: number
          require_2fa_for_withdrawals: boolean
          require_pin_on_open: boolean
          session_timeout_minutes: number
          transaction_approval_threshold: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lockout_duration_minutes?: number
          max_failed_attempts?: number
          require_2fa_for_withdrawals?: boolean
          require_pin_on_open?: boolean
          session_timeout_minutes?: number
          transaction_approval_threshold?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lockout_duration_minutes?: number
          max_failed_attempts?: number
          require_2fa_for_withdrawals?: boolean
          require_pin_on_open?: boolean
          session_timeout_minutes?: number
          transaction_approval_threshold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_devices_new: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          ip_address: unknown
          last_seen: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          ip_address?: unknown
          last_seen?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          ip_address?: unknown
          last_seen?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_sessions_new: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          ip_address: unknown
          last_seen: string
          revoked_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: unknown
          last_seen?: string
          revoked_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          ip_address?: unknown
          last_seen?: string
          revoked_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
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
      spin_config: {
        Row: {
          created_at: string
          free_spins_per_user: number
          id: string
          is_active: boolean
          max_bet_bsk: number
          min_bet_bsk: number
          post_free_spin_fee_bsk: number
          updated_at: string
          winner_profit_fee_percent: number
        }
        Insert: {
          created_at?: string
          free_spins_per_user?: number
          id?: string
          is_active?: boolean
          max_bet_bsk?: number
          min_bet_bsk?: number
          post_free_spin_fee_bsk?: number
          updated_at?: string
          winner_profit_fee_percent?: number
        }
        Update: {
          created_at?: string
          free_spins_per_user?: number
          id?: string
          is_active?: boolean
          max_bet_bsk?: number
          min_bet_bsk?: number
          post_free_spin_fee_bsk?: number
          updated_at?: string
          winner_profit_fee_percent?: number
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
      spin_history: {
        Row: {
          bet_bsk: number
          client_seed: string
          created_at: string
          id: string
          multiplier: number
          net_change_bsk: number
          net_payout_bsk: number
          nonce: number
          payout_bsk: number
          profit_fee_bsk: number
          result_value: number
          segment_id: string
          server_seed_hash: string
          spin_fee_bsk: number
          user_id: string
          was_free_spin: boolean
        }
        Insert: {
          bet_bsk: number
          client_seed: string
          created_at?: string
          id?: string
          multiplier: number
          net_change_bsk: number
          net_payout_bsk?: number
          nonce: number
          payout_bsk?: number
          profit_fee_bsk?: number
          result_value: number
          segment_id: string
          server_seed_hash: string
          spin_fee_bsk?: number
          user_id: string
          was_free_spin?: boolean
        }
        Update: {
          bet_bsk?: number
          client_seed?: string
          created_at?: string
          id?: string
          multiplier?: number
          net_change_bsk?: number
          net_payout_bsk?: number
          nonce?: number
          payout_bsk?: number
          profit_fee_bsk?: number
          result_value?: number
          segment_id?: string
          server_seed_hash?: string
          spin_fee_bsk?: number
          user_id?: string
          was_free_spin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "spin_history_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "spin_segments"
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
      spin_segments: {
        Row: {
          color_hex: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          multiplier: number
          updated_at: string
          weight: number
        }
        Insert: {
          color_hex: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          multiplier?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          color_hex?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          multiplier?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      spin_user_limits: {
        Row: {
          created_at: string
          free_spins_remaining: number
          id: string
          total_bet_bsk: number
          total_spins: number
          total_won_bsk: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          free_spins_remaining?: number
          id?: string
          total_bet_bsk?: number
          total_spins?: number
          total_won_bsk?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          free_spins_remaining?: number
          id?: string
          total_bet_bsk?: number
          total_spins?: number
          total_won_bsk?: number
          updated_at?: string
          user_id?: string
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
          reward_period_unit: string | null
          reward_period_value: number | null
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
          reward_period_unit?: string | null
          reward_period_value?: number | null
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
          reward_period_unit?: string | null
          reward_period_value?: number | null
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
      staking_reward_distributions: {
        Row: {
          admin_id: string
          completed_at: string | null
          created_at: string
          distribution_type: string
          error_message: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          pool_id: string | null
          reward_ids: string[]
          status: string
          total_bsk_distributed: number
          total_users: number
        }
        Insert: {
          admin_id: string
          completed_at?: string | null
          created_at?: string
          distribution_type?: string
          error_message?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          pool_id?: string | null
          reward_ids?: string[]
          status?: string
          total_bsk_distributed?: number
          total_users?: number
        }
        Update: {
          admin_id?: string
          completed_at?: string | null
          created_at?: string
          distribution_type?: string
          error_message?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          pool_id?: string | null
          reward_ids?: string[]
          status?: string
          total_bsk_distributed?: number
          total_users?: number
        }
        Relationships: [
          {
            foreignKeyName: "staking_reward_distributions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "staking_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      staking_rewards: {
        Row: {
          apy_used: number
          created_at: string
          distributed_at: string | null
          distributed_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          pool_id: string
          reward_amount: number
          stake_amount: number
          status: string
          submission_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apy_used: number
          created_at?: string
          distributed_at?: string | null
          distributed_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          pool_id: string
          reward_amount?: number
          stake_amount: number
          status?: string
          submission_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apy_used?: number
          created_at?: string
          distributed_at?: string | null
          distributed_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          pool_id?: string
          reward_amount?: number
          stake_amount?: number
          status?: string
          submission_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staking_rewards_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "staking_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staking_rewards_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "user_staking_submissions"
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
      support_links: {
        Row: {
          created_at: string
          created_by: string | null
          custom_scheme: string
          default_message: string
          host: string
          id: string
          is_active: boolean
          open_target: string
          play_fallback_url: string
          updated_at: string
          updated_by: string | null
          web_fallback_url: string
          whatsapp_phone_e164: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_scheme?: string
          default_message?: string
          host?: string
          id?: string
          is_active?: boolean
          open_target?: string
          play_fallback_url?: string
          updated_at?: string
          updated_by?: string | null
          web_fallback_url?: string
          whatsapp_phone_e164?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_scheme?: string
          default_message?: string
          host?: string
          id?: string
          is_active?: boolean
          open_target?: string
          play_fallback_url?: string
          updated_at?: string
          updated_by?: string | null
          web_fallback_url?: string
          whatsapp_phone_e164?: string
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
      system_errors: {
        Row: {
          context: Json | null
          created_at: string | null
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          max_retries: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          severity: string | null
          source_function: string | null
          stack_trace: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          max_retries?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          severity?: string | null
          source_function?: string | null
          stack_trace?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          max_retries?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          severity?: string | null
          source_function?: string | null
          stack_trace?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          level_percentages: Json | null
          max_daily_direct_commission_bsk: number | null
          max_levels: number | null
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
          level_percentages?: Json | null
          max_daily_direct_commission_bsk?: number | null
          max_levels?: number | null
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
          level_percentages?: Json | null
          max_daily_direct_commission_bsk?: number | null
          max_levels?: number | null
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
      terms_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          is_current: boolean
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          id?: string
          is_current?: boolean
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          is_current?: boolean
          title?: string
          updated_at?: string
          version?: string
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
      totp_secrets_new: {
        Row: {
          backup_codes_encrypted: string[] | null
          created_at: string
          enabled: boolean
          id: string
          secret_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes_encrypted?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          secret_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes_encrypted?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          secret_encrypted?: string
          updated_at?: string
          user_id?: string
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
      trading_engine_settings: {
        Row: {
          auto_matching_enabled: boolean
          circuit_breaker_active: boolean
          created_at: string
          id: string
          maker_fee_percent: number
          matching_interval_seconds: number
          max_orders_per_user_per_minute: number
          taker_fee_percent: number
          updated_at: string
        }
        Insert: {
          auto_matching_enabled?: boolean
          circuit_breaker_active?: boolean
          created_at?: string
          id?: string
          maker_fee_percent?: number
          matching_interval_seconds?: number
          max_orders_per_user_per_minute?: number
          taker_fee_percent?: number
          updated_at?: string
        }
        Update: {
          auto_matching_enabled?: boolean
          circuit_breaker_active?: boolean
          created_at?: string
          id?: string
          maker_fee_percent?: number
          matching_interval_seconds?: number
          max_orders_per_user_per_minute?: number
          taker_fee_percent?: number
          updated_at?: string
        }
        Relationships: []
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
      unified_bsk_ledger: {
        Row: {
          amount_bsk: number
          balance_type: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string
          meta_json: Json | null
          notes: string | null
          processed_at: string
          related_transaction_id: string | null
          related_user_id: string | null
          tx_subtype: string
          tx_type: string
          user_id: string
        }
        Insert: {
          amount_bsk: number
          balance_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key: string
          meta_json?: Json | null
          notes?: string | null
          processed_at?: string
          related_transaction_id?: string | null
          related_user_id?: string | null
          tx_subtype: string
          tx_type: string
          user_id: string
        }
        Update: {
          amount_bsk?: number
          balance_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string
          meta_json?: Json | null
          notes?: string | null
          processed_at?: string
          related_transaction_id?: string | null
          related_user_id?: string | null
          tx_subtype?: string
          tx_type?: string
          user_id?: string
        }
        Relationships: []
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
      user_avatars_new: {
        Row: {
          created_at: string
          id: string
          original_path: string
          thumb_1x_path: string
          thumb_2x_path: string | null
          thumb_3x_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_path: string
          thumb_1x_path: string
          thumb_2x_path?: string | null
          thumb_3x_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          original_path?: string
          thumb_1x_path?: string
          thumb_2x_path?: string | null
          thumb_3x_path?: string | null
          updated_at?: string
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
          unlock_levels: number
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
          unlock_levels?: number
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
          unlock_levels?: number
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
      user_compliance_acceptances: {
        Row: {
          accepted_at: string
          compliance_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          accepted_at?: string
          compliance_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          accepted_at?: string
          compliance_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: []
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
      user_inr_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          locked: number
          total_deposited: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          locked?: number
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          locked?: number
          total_deposited?: number
          total_withdrawn?: number
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
      user_notification_preferences: {
        Row: {
          created_at: string
          email_on_deposit_confirmation: boolean
          email_on_insurance_claim: boolean
          email_on_kyc_decision: boolean
          email_on_loan_decision: boolean
          email_on_withdrawal_decision: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_on_deposit_confirmation?: boolean
          email_on_insurance_claim?: boolean
          email_on_kyc_decision?: boolean
          email_on_loan_decision?: boolean
          email_on_withdrawal_decision?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_on_deposit_confirmation?: boolean
          email_on_insurance_claim?: boolean
          email_on_kyc_decision?: boolean
          email_on_loan_decision?: boolean
          email_on_withdrawal_decision?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_program_participations: {
        Row: {
          amount_earned: number | null
          amount_paid: number | null
          completed_at: string | null
          created_at: string
          id: string
          input_data: Json | null
          is_verified: boolean | null
          metadata: Json | null
          module_id: string
          outcome: string | null
          output_data: Json | null
          participation_type: string
          rewards: Json | null
          started_at: string
          state_id: string | null
          status: string
          user_id: string
          verification_data: Json | null
        }
        Insert: {
          amount_earned?: number | null
          amount_paid?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          input_data?: Json | null
          is_verified?: boolean | null
          metadata?: Json | null
          module_id: string
          outcome?: string | null
          output_data?: Json | null
          participation_type: string
          rewards?: Json | null
          started_at?: string
          state_id?: string | null
          status?: string
          user_id: string
          verification_data?: Json | null
        }
        Update: {
          amount_earned?: number | null
          amount_paid?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          input_data?: Json | null
          is_verified?: boolean | null
          metadata?: Json | null
          module_id?: string
          outcome?: string | null
          output_data?: Json | null
          participation_type?: string
          rewards?: Json | null
          started_at?: string
          state_id?: string | null
          status?: string
          user_id?: string
          verification_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_program_participations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_program_participations_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "user_program_states"
            referencedColumns: ["id"]
          },
        ]
      }
      user_program_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number | null
          id: string
          is_completed: boolean | null
          metadata: Json | null
          milestone_key: string
          milestone_type: string
          module_id: string
          state_id: string | null
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          metadata?: Json | null
          milestone_key: string
          milestone_type: string
          module_id: string
          state_id?: string | null
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          metadata?: Json | null
          milestone_key?: string
          milestone_type?: string
          module_id?: string
          state_id?: string | null
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_program_progress_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "user_program_states"
            referencedColumns: ["id"]
          },
        ]
      }
      user_program_states: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string | null
          first_participated_at: string | null
          id: string
          last_participated_at: string | null
          metadata: Json | null
          module_id: string
          participation_count: number | null
          progress_data: Json | null
          status: string
          total_earned: number | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          first_participated_at?: string | null
          id?: string
          last_participated_at?: string | null
          metadata?: Json | null
          module_id: string
          participation_count?: number | null
          progress_data?: Json | null
          status?: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          first_participated_at?: string | null
          id?: string
          last_participated_at?: string | null
          metadata?: Json | null
          module_id?: string
          participation_count?: number | null
          progress_data?: Json | null
          status?: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_states_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "program_modules"
            referencedColumns: ["id"]
          },
        ]
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
      user_purchase_bonus_claims: {
        Row: {
          bonus_id: string
          claimed_at: string
          holding_bonus_bsk: number
          id: string
          order_id: string
          purchase_amount_bsk: number
          user_id: string
          withdrawable_bonus_bsk: number
        }
        Insert: {
          bonus_id: string
          claimed_at?: string
          holding_bonus_bsk: number
          id?: string
          order_id: string
          purchase_amount_bsk: number
          user_id: string
          withdrawable_bonus_bsk: number
        }
        Update: {
          bonus_id?: string
          claimed_at?: string
          holding_bonus_bsk?: number
          id?: string
          order_id?: string
          purchase_amount_bsk?: number
          user_id?: string
          withdrawable_bonus_bsk?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_purchase_bonus_claims_bonus_id_fkey"
            columns: ["bonus_id"]
            isOneToOne: false
            referencedRelation: "bsk_purchase_bonuses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_audit: {
        Row: {
          action: string
          created_at: string | null
          id: string
          performed_by: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          performed_by: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          performed_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      user_staking_submissions: {
        Row: {
          admin_bep20_address: string
          admin_notes: string | null
          created_at: string | null
          currency: string
          id: string
          pool_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string
          stake_amount: number
          status: string
          updated_at: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          admin_bep20_address: string
          admin_notes?: string | null
          created_at?: string | null
          currency: string
          id?: string
          pool_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url: string
          stake_amount: number
          status?: string
          updated_at?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          admin_bep20_address?: string
          admin_notes?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          pool_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string
          stake_amount?: number
          status?: string
          updated_at?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_staking_submissions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "staking_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vip_milestone_claims: {
        Row: {
          bsk_rewarded: number
          claimed_at: string | null
          id: string
          milestone_id: string
          user_id: string
          vip_count_at_claim: number
        }
        Insert: {
          bsk_rewarded: number
          claimed_at?: string | null
          id?: string
          milestone_id: string
          user_id: string
          vip_count_at_claim: number
        }
        Update: {
          bsk_rewarded?: number
          claimed_at?: string | null
          id?: string
          milestone_id?: string
          user_id?: string
          vip_count_at_claim?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_vip_milestone_claims_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "vip_milestones"
            referencedColumns: ["id"]
          },
        ]
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
      user_wallets: {
        Row: {
          created_at: string
          encrypted_mnemonic: string
          encryption_salt: string
          id: string
          last_used_at: string | null
          public_key: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          encrypted_mnemonic: string
          encryption_salt: string
          id?: string
          last_used_at?: string | null
          public_key: string
          user_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          encrypted_mnemonic?: string
          encryption_salt?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          user_id?: string
          wallet_address?: string
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
      vip_milestone_tracker: {
        Row: {
          direct_vip_count_after_vip: number | null
          milestone_10_claimed: boolean | null
          milestone_10_claimed_at: string | null
          milestone_100_claimed: boolean | null
          milestone_100_claimed_at: string | null
          milestone_250_claimed: boolean | null
          milestone_250_claimed_at: string | null
          milestone_50_claimed: boolean | null
          milestone_50_claimed_at: string | null
          milestone_500_claimed: boolean | null
          milestone_500_claimed_at: string | null
          updated_at: string | null
          user_id: string
          vip_badge_acquired_at: string
        }
        Insert: {
          direct_vip_count_after_vip?: number | null
          milestone_10_claimed?: boolean | null
          milestone_10_claimed_at?: string | null
          milestone_100_claimed?: boolean | null
          milestone_100_claimed_at?: string | null
          milestone_250_claimed?: boolean | null
          milestone_250_claimed_at?: string | null
          milestone_50_claimed?: boolean | null
          milestone_50_claimed_at?: string | null
          milestone_500_claimed?: boolean | null
          milestone_500_claimed_at?: string | null
          updated_at?: string | null
          user_id: string
          vip_badge_acquired_at: string
        }
        Update: {
          direct_vip_count_after_vip?: number | null
          milestone_10_claimed?: boolean | null
          milestone_10_claimed_at?: string | null
          milestone_100_claimed?: boolean | null
          milestone_100_claimed_at?: string | null
          milestone_250_claimed?: boolean | null
          milestone_250_claimed_at?: string | null
          milestone_50_claimed?: boolean | null
          milestone_50_claimed_at?: string | null
          milestone_500_claimed?: boolean | null
          milestone_500_claimed_at?: string | null
          updated_at?: string | null
          user_id?: string
          vip_badge_acquired_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_milestone_tracker_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vip_milestone_tracker_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
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
      wallet_balances: {
        Row: {
          asset_id: string
          available: number
          created_at: string
          id: string
          locked: number
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          available?: number
          created_at?: string
          id?: string
          locked?: number
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          available?: number
          created_at?: string
          id?: string
          locked?: number
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_balances_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
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
      withdrawals: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          created_at: string | null
          fee: number
          id: string
          net_amount: number
          network: string
          rejected_reason: string | null
          status: string
          to_address: string
          tx_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          created_at?: string | null
          fee?: number
          id?: string
          net_amount: number
          network: string
          rejected_reason?: string | null
          status?: string
          to_address: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          created_at?: string | null
          fee?: number
          id?: string
          net_amount?: number
          network?: string
          rejected_reason?: string | null
          status?: string
          to_address?: string
          tx_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_user_bsk_balances: {
        Row: {
          holding_balance: number | null
          last_transaction_at: string | null
          refreshed_at: string | null
          today_earned: number | null
          total_earned_holding: number | null
          total_earned_withdrawable: number | null
          total_transactions: number | null
          user_id: string | null
          week_earned: number | null
          withdrawable_balance: number | null
        }
        Relationships: []
      }
      referral_relationships: {
        Row: {
          first_touch_at: string | null
          locked_at: string | null
          referee_code: string | null
          referee_id: string | null
          referee_username: string | null
          source: string | null
          sponsor_code: string | null
          sponsor_code_used: string | null
          sponsor_id: string | null
          sponsor_username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sponsor_profile"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_sponsor_profile"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
          {
            foreignKeyName: "referral_links_new_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_links_new_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "referral_relationships"
            referencedColumns: ["referee_id"]
          },
        ]
      }
      unified_bsk_transactions: {
        Row: {
          amount: number | null
          balance_after: number | null
          balance_type: string | null
          created_at: string | null
          description: string | null
          id: string | null
          metadata: Json | null
          transaction_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_user_balance: {
        Args: {
          p_amount: number
          p_balance_type: string
          p_operation: string
          p_reason: string
          p_subtype?: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_credit_bsk_manual: {
        Args: {
          p_amount: number
          p_balance_type?: string
          p_notes?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_credit_manual_purchase: {
        Args: {
          p_holding_amount: number
          p_user_id: string
          p_withdrawable_amount: number
        }
        Returns: Json
      }
      admin_debit_bsk_manual: {
        Args: {
          p_amount: number
          p_balance_type?: string
          p_notes?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_mint_bsk: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_config_id?: string
          p_destination: string
          p_notes?: string
          p_recipient_id?: string
        }
        Returns: Json
      }
      admin_reset_all_user_balances: { Args: never; Returns: Json }
      admin_update_bsk_rate: {
        Args: { p_admin_id: string; p_new_rate: number; p_notes?: string }
        Returns: Json
      }
      atomic_badge_purchase: {
        Args: {
          p_badge_name: string
          p_paid_amount_bsk?: number
          p_payment_method?: string
          p_payment_ref?: string
          p_previous_badge?: string
          p_user_id: string
        }
        Returns: Json
      }
      auto_disable_expired_offers: { Args: never; Returns: undefined }
      award_bsk_standard: {
        Args: {
          p_amount: number
          p_destination: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_notes?: string
          p_reference_id?: string
          p_tx_subtype?: string
          p_tx_type: string
          p_user_id: string
        }
        Returns: string
      }
      build_user_referral_tree: { Args: { p_user_id: string }; Returns: number }
      bulk_update_program_status: {
        Args: {
          p_module_ids: string[]
          p_new_status: string
          p_operator_id: string
        }
        Returns: number
      }
      calculate_daily_metrics: { Args: { p_date: string }; Returns: Json }
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
      calculate_retroactive_commissions: {
        Args: never
        Returns: {
          badge_name: string
          buyer_id: string
          missing_commission: number
          purchase_amount: number
          purchase_date: string
          purchase_id: string
          sponsor_id: string
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
      can_view_profile: {
        Args: { profile_user_id: string; viewer_id: string }
        Returns: boolean
      }
      check_badge_eligibility: {
        Args: { required_badge: string; sponsor_badge: string }
        Returns: boolean
      }
      check_bsk_balance_reconciliation: {
        Args: { p_user_id: string }
        Returns: {
          balance_type: string
          database_balance: number
          difference: number
          is_reconciled: boolean
          ledger_sum: number
        }[]
      }
      cleanup_expired_idempotency_keys: { Args: never; Returns: number }
      clone_program_module: {
        Args: {
          p_module_id: string
          p_new_key: string
          p_new_name: string
          p_operator_id: string
        }
        Returns: string
      }
      complete_withdrawal_balance_deduction: {
        Args: { p_amount: number; p_asset_id: string; p_user_id: string }
        Returns: boolean
      }
      convert_bsk_to_inr: { Args: { bsk_amount: number }; Returns: number }
      convert_inr_to_bsk: { Args: { inr_amount: number }; Returns: number }
      count_lucky_draw_tickets: {
        Args: { p_config_id: string }
        Returns: number
      }
      create_default_admin: { Args: never; Returns: Json }
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
      create_trading_pair: {
        Args: {
          p_base_symbol: string
          p_lot_size?: number
          p_min_notional?: number
          p_quote_symbol: string
          p_tick_size?: number
        }
        Returns: string
      }
      credit_deposit_balance: {
        Args: { p_amount: number; p_asset_symbol: string; p_user_id: string }
        Returns: boolean
      }
      execute_bsk_transfer: {
        Args: { p_amount: number; p_recipient_id: string; p_sender_id: string }
        Returns: Json
      }
      execute_internal_crypto_transfer: {
        Args: {
          p_amount: number
          p_asset_id: string
          p_fee: number
          p_recipient_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      find_users_missing_referral_tree: {
        Args: never
        Returns: {
          created_at: string
          email: string
          locked_at: string
          sponsor_id: string
          user_id: string
          username: string
        }[]
      }
      generate_referral_code: {
        Args: { code_length?: number }
        Returns: string
      }
      generate_report_data: {
        Args: {
          p_date_end: string
          p_date_start: string
          p_filters?: Json
          p_report_type: string
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
      get_badge_tier_value: { Args: { badge_name: string }; Returns: number }
      get_commission_rate_for_level: {
        Args: { p_level: number; p_level_percentages: Json }
        Returns: number
      }
      get_current_bsk_rate: { Args: never; Returns: number }
      get_current_program_config: {
        Args: { p_module_key: string }
        Returns: Json
      }
      get_current_spin_seed: {
        Args: never
        Returns: {
          id: string
          server_seed_hash: string
          valid_from: string
        }[]
      }
      get_downline_badges: {
        Args: never
        Returns: {
          current_badge: string
          price_bsk: number
          purchased_at: string
          user_id: string
        }[]
      }
      get_inr_stats: {
        Args: never
        Returns: {
          total_balance: number
          total_deposited: number
          total_locked: number
          total_withdrawn: number
          user_count: number
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
      get_my_bsk_balance: {
        Args: never
        Returns: {
          holding_balance: number
          last_transaction_at: string
          today_earned: number
          total_earned_holding: number
          total_earned_withdrawable: number
          total_transactions: number
          week_earned: number
          withdrawable_balance: number
        }[]
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
      get_program_flag: {
        Args: { p_program_code: string }
        Returns: {
          enabled: boolean
          program_code: string
          updated_at: string
        }[]
      }
      get_program_flags: {
        Args: never
        Returns: {
          enabled: boolean
          program_code: string
          updated_at: string
        }[]
      }
      get_total_bsk_circulation: {
        Args: never
        Returns: {
          total_holding: number
          total_supply: number
          total_withdrawable: number
          user_count: number
        }[]
      }
      get_transaction_stats: { Args: never; Returns: Json }
      get_unresolved_error_count: {
        Args: never
        Returns: {
          critical_count: number
          error_count: number
          total_count: number
          warning_count: number
        }[]
      }
      get_user_bsk_balance: {
        Args: { target_user_id: string }
        Returns: {
          holding_balance: number
          last_transaction_at: string
          today_earned: number
          total_earned_holding: number
          total_earned_withdrawable: number
          total_transactions: number
          week_earned: number
          withdrawable_balance: number
        }[]
      }
      get_user_display_info: {
        Args: { p_user_id: string }
        Returns: {
          display_name: string
          email: string
          username: string
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
      get_user_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_user_referral_stats: { Args: { p_user_id: string }; Returns: Json }
      get_user_slab: { Args: { p_user_id: string }; Returns: string }
      get_user_wallets: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          is_primary: boolean
          last_used_at: string
          public_key: string
          wallet_address: string
        }[]
      }
      has_accepted_compliance: {
        Args: {
          p_compliance_type: string
          p_user_id: string
          p_version?: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_user_program_state: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: string
      }
      lock_balance_for_order: {
        Args: { p_amount: number; p_asset_symbol: string; p_user_id: string }
        Returns: boolean
      }
      lock_bsk_for_withdrawal: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
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
      log_system_error: {
        Args: {
          p_context?: Json
          p_error_details?: Json
          p_error_message: string
          p_error_type: string
          p_severity?: string
          p_source_function?: string
          p_stack_trace?: string
          p_user_id?: string
        }
        Returns: string
      }
      lookup_user_by_referral_code: {
        Args: { p_referral_code: string }
        Returns: {
          display_name: string
          referral_code: string
          user_id: string
          username: string
        }[]
      }
      pay_retroactive_commissions: {
        Args: never
        Returns: {
          total_commissions_paid: number
          total_entries_created: number
          total_sponsors_credited: number
        }[]
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
      process_daily_bsk_vesting: { Args: never; Returns: Json }
      process_overdue_loan_payments: { Args: never; Returns: Json }
      publish_program_config: {
        Args: { p_config_id: string; p_operator_id: string }
        Returns: Json
      }
      reconcile_bsk_balance: { Args: { p_user_id: string }; Returns: Json }
      reconcile_bsk_balances: {
        Args: never
        Returns: {
          holding_diff: number
          ledger_holding: number
          ledger_withdrawable: number
          old_holding: number
          old_withdrawable: number
          status: string
          user_id: string
          withdrawable_diff: number
        }[]
      }
      record_bsk_transaction: {
        Args: {
          p_amount_bsk: number
          p_balance_type: string
          p_idempotency_key: string
          p_meta_json?: Json
          p_notes?: string
          p_related_transaction_id?: string
          p_related_user_id?: string
          p_tx_subtype: string
          p_tx_type: string
          p_user_id: string
        }
        Returns: string
      }
      record_program_participation: {
        Args: {
          p_amount_earned?: number
          p_amount_paid?: number
          p_input_data?: Json
          p_module_id: string
          p_output_data?: Json
          p_participation_type: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_bsk_balances_view: { Args: never; Returns: undefined }
      refund_failed_badge_purchases: {
        Args: never
        Returns: {
          refund_amount: number
          refund_badge_name: string
          refund_status: string
          refund_user_id: string
        }[]
      }
      reset_monthly_claim_counts: { Args: never; Returns: undefined }
      resolve_system_error: {
        Args: { p_error_id: string; p_resolution_notes?: string }
        Returns: boolean
      }
      run_balance_reconciliation: {
        Args: never
        Returns: {
          asset_symbol: string
          discrepancy: number
          ledger_total: number
          user_id: string
          wallet_total: number
        }[]
      }
      select_draw_winners: { Args: { p_draw_id: string }; Returns: Json }
      settle_pending_referrer_rewards: { Args: never; Returns: Json }
      settle_trade: {
        Args: {
          p_base_symbol: string
          p_buyer_fee: number
          p_buyer_id: string
          p_price: number
          p_quantity: number
          p_quote_symbol: string
          p_seller_fee: number
          p_seller_id: string
        }
        Returns: boolean
      }
      sync_kyc_approval_status: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      sync_old_balances_from_ledger: { Args: never; Returns: undefined }
      system_update_bonus_balance: {
        Args: { p_asset_id: string; p_balance_delta: number; p_user_id: string }
        Returns: boolean
      }
      unlock_balance_for_order: {
        Args: { p_amount: number; p_asset_symbol: string; p_user_id: string }
        Returns: boolean
      }
      unlock_banking_details: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      update_user_referral_state: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      upsert_program_flag: {
        Args: { p_enabled: boolean; p_program_code: string }
        Returns: undefined
      }
      upsert_referral_tree: {
        Args: { p_tree_records: Json; p_user_id: string }
        Returns: undefined
      }
      validate_referral_code: { Args: { code: string }; Returns: boolean }
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
      bsk_transaction_category:
        | "badge_bonus"
        | "referral_commission"
        | "staking_reward"
        | "insurance_claim"
        | "ad_reward"
        | "promotion_bonus"
        | "admin_credit"
        | "badge_purchase"
        | "withdrawal"
        | "transfer_out"
        | "admin_debit"
        | "vesting_release"
        | "holding_to_withdrawable"
        | "balance_correction"
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
      bsk_transaction_category: [
        "badge_bonus",
        "referral_commission",
        "staking_reward",
        "insurance_claim",
        "ad_reward",
        "promotion_bonus",
        "admin_credit",
        "badge_purchase",
        "withdrawal",
        "transfer_out",
        "admin_debit",
        "vesting_release",
        "holding_to_withdrawable",
        "balance_correction",
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

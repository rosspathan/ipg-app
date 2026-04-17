
DO $$
DECLARE
  v_user_id uuid := '105a8811-2c93-428a-9979-e44a1022fe95';
  v_table text;
  v_tables text[] := ARRAY[
    'referral_commissions','referral_events','referral_tree','referral_links_new',
    'user_badge_holdings','badge_purchases','badge_purchase_events','user_badge_status',
    'badge_qualification_events','badge_qualification_audit','direct_referrer_rewards',
    'badge_cards_new',
    'user_bsk_balances','user_bsk_vesting','bsk_vesting_releases','bsk_vesting_referral_rewards',
    'bsk_holding_ledger','bsk_bonus_events','bsk_bonus_vesting_schedules',
    'bsk_loan_applications','bsk_loan_installments','bsk_loan_late_fee_log','bsk_loan_auto_debit_log','bsk_loan_ledger','bsk_loans',
    'unified_bsk_ledger','unified_bsk_transfers',
    'wallet_bonus_balances','bonus_ledger',
    'user_wallets','wallet_balances','onchain_balances','encrypted_wallet_backups',
    'orders','trades','trading_balance_ledger',
    'internal_balance_transfers','custodial_deposits','custodial_withdrawals','onchain_transactions',
    'user_gamification_stats','user_achievements','daily_rewards',
    'kyc_submissions','kyc_profiles_new','banking_inr',
    'ad_clicks','ad_impressions','ad_user_subscriptions',
    'allowlist_addresses','beneficiaries','api_keys','audit_logs','login_history',
    'user_promotion_claims',
    'user_roles'
  ];
BEGIN
  -- Special-case: referral_tree has user_id AND ancestor_id
  BEGIN EXECUTE 'DELETE FROM public.referral_tree WHERE ancestor_id = $1' USING v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Special-case: referral_commissions has earner_id AND payer_id
  BEGIN EXECUTE 'DELETE FROM public.referral_commissions WHERE earner_id = $1' USING v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'DELETE FROM public.referral_commissions WHERE payer_id = $1' USING v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Special-case: referral_links_new has user_id AND sponsor_id
  BEGIN EXECUTE 'DELETE FROM public.referral_links_new WHERE sponsor_id = $1' USING v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Generic loop: delete by user_id (skip tables that don't exist or don't have user_id)
  FOREACH v_table IN ARRAY v_tables LOOP
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', v_table) USING v_user_id;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    WHEN undefined_column THEN
      NULL;
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not purge %: %', v_table, SQLERRM;
    END;
  END LOOP;

  -- Profile last (FK target for many tables)
  BEGIN DELETE FROM public.profiles WHERE user_id = v_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Finally: auth.users (cascades to identities, sessions, refresh_tokens)
  BEGIN DELETE FROM auth.users WHERE id = v_user_id; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'auth.users delete: %', SQLERRM; END;

  RAISE NOTICE 'User % deleted', v_user_id;
END $$;

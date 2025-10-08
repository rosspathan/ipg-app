-- ============================================================================
-- CLEAN-SLATE Migration: Username Backfill + Balance Reset Infrastructure
-- ============================================================================

-- PART 1: Backfill username for existing users where null
-- Extract username from auth.users.email where profiles.username is null or 'User'
UPDATE public.profiles
SET 
  username = LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(au.email, ''), '@', 1), '[^a-z0-9._]', '', 'g')),
  updated_at = NOW()
FROM auth.users au
WHERE profiles.user_id = au.id
  AND (profiles.username IS NULL OR profiles.username = '' OR profiles.username = 'User')
  AND au.email IS NOT NULL;

-- PART 2: Disable demo seeding in handle_new_user trigger
-- Update function to ensure new users start with 0 balances
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_full_name text;
  v_referral_code text;
BEGIN
  -- Extract username from email (part before @)
  v_username := LOWER(REGEXP_REPLACE(
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    '[^a-z0-9._]', '', 'g'
  ));
  
  -- Limit to 20 chars
  v_username := SUBSTRING(v_username FROM 1 FOR 20);
  
  -- Fallback if empty
  IF v_username = '' OR v_username IS NULL THEN
    v_username := 'user' || SUBSTRING(NEW.id::text FROM 1 FOR 6);
  END IF;
  
  -- Set full_name
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    v_username
  );
  
  -- Generate referral code (8 chars)
  v_referral_code := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8));
  
  -- Insert profile WITH ZERO BALANCES (no demo seeding)
  INSERT INTO public.profiles (
    user_id, 
    email, 
    username,
    full_name, 
    display_name,
    referral_code,
    wallet_address,
    wallet_addresses,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_full_name,
    v_full_name,
    v_referral_code,
    NEW.raw_user_meta_data ->> 'wallet_address',
    COALESCE(
      (NEW.raw_user_meta_data -> 'wallet_addresses')::jsonb,
      '{}'::jsonb
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username),
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name),
    referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
    wallet_address = COALESCE(NULLIF(profiles.wallet_address, ''), EXCLUDED.wallet_address),
    wallet_addresses = COALESCE(profiles.wallet_addresses, EXCLUDED.wallet_addresses),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- PART 3: Create helper function for admin balance reset
-- This will be called by the edge function
CREATE OR REPLACE FUNCTION public.admin_reset_all_user_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_users INTEGER := 0;
  v_balance_records INTEGER := 0;
  v_ledger_records INTEGER := 0;
BEGIN
  -- Security check: only admins can execute
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Reset user_bsk_balances to zero
  UPDATE public.user_bsk_balances
  SET 
    withdrawable_balance = 0,
    holding_balance = 0,
    updated_at = NOW()
  WHERE withdrawable_balance != 0 OR holding_balance != 0;
  
  GET DIAGNOSTICS v_balance_records = ROW_COUNT;

  -- Reset wallet_balances to zero
  UPDATE public.wallet_balances
  SET 
    balance = 0,
    updated_at = NOW()
  WHERE balance != 0;
  
  GET DIAGNOSTICS v_affected_users = ROW_COUNT;

  -- Insert reversing ledger entries (for audit trail, don't delete existing)
  -- This preserves history but zeroes out computed totals
  INSERT INTO public.bsk_withdrawable_ledger (
    user_id, amount_bsk, amount_inr, rate_snapshot, 
    tx_type, tx_subtype, balance_before, balance_after, notes
  )
  SELECT 
    user_id,
    -withdrawable_balance AS amount_bsk,
    -withdrawable_balance * 1.0 AS amount_inr,
    1.0 AS rate_snapshot,
    'admin_adjustment' AS tx_type,
    'clean_slate_reset' AS tx_subtype,
    withdrawable_balance AS balance_before,
    0 AS balance_after,
    'CLEAN-SLATE reset executed by admin'
  FROM public.user_bsk_balances
  WHERE withdrawable_balance != 0;

  INSERT INTO public.bsk_holding_ledger (
    user_id, amount_bsk, amount_inr, rate_snapshot, 
    tx_type, tx_subtype, balance_before, balance_after, notes
  )
  SELECT 
    user_id,
    -holding_balance AS amount_bsk,
    -holding_balance * 1.0 AS amount_inr,
    1.0 AS rate_snapshot,
    'admin_adjustment' AS tx_type,
    'clean_slate_reset' AS tx_subtype,
    holding_balance AS balance_before,
    0 AS balance_after,
    'CLEAN-SLATE reset executed by admin'
  FROM public.user_bsk_balances
  WHERE holding_balance != 0;
  
  GET DIAGNOSTICS v_ledger_records = ROW_COUNT;

  -- Log the reset action
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, 
    new_values, created_at
  ) VALUES (
    auth.uid(),
    'admin_reset_all_balances',
    'system_maintenance',
    jsonb_build_object(
      'balance_records_reset', v_balance_records,
      'wallet_records_reset', v_affected_users,
      'ledger_entries_created', v_ledger_records,
      'executed_at', NOW(),
      'executed_by', auth.uid()
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_records_reset', v_balance_records,
    'wallet_records_reset', v_affected_users,
    'ledger_entries_created', v_ledger_records,
    'message', 'All user balances have been reset to zero'
  );
END;
$$;

-- PART 4: Add helpful comments
COMMENT ON FUNCTION public.admin_reset_all_user_balances() IS 
  'CLEAN-SLATE: Resets all user balances to zero. Admin-only. Creates reversing ledger entries for audit trail.';

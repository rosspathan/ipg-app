-- Update admin_reset_all_user_balances to reset all balance tables including crypto
CREATE OR REPLACE FUNCTION public.admin_reset_all_user_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bsk_balance_records INTEGER := 0;
  v_bonus_balance_records INTEGER := 0;
  v_wallet_bonus_records INTEGER := 0;
  v_total_users_affected INTEGER := 0;
BEGIN
  -- Security check: only admins can execute
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Reset user_bsk_balances (BSK token balances) to zero
  UPDATE public.user_bsk_balances
  SET 
    withdrawable_balance = 0,
    holding_balance = 0,
    total_earned_withdrawable = 0,
    total_earned_holding = 0,
    updated_at = NOW()
  WHERE withdrawable_balance != 0 
     OR holding_balance != 0
     OR total_earned_withdrawable != 0
     OR total_earned_holding != 0;
  
  GET DIAGNOSTICS v_bsk_balance_records = ROW_COUNT;

  -- Reset user_bonus_balances to zero
  UPDATE public.user_bonus_balances
  SET 
    balance = 0,
    updated_at = NOW()
  WHERE balance != 0;
  
  GET DIAGNOSTICS v_bonus_balance_records = ROW_COUNT;

  -- Reset wallet_bonus_balances (crypto bonus balances) to zero
  UPDATE public.wallet_bonus_balances
  SET 
    balance = 0,
    updated_at = NOW()
  WHERE balance != 0;
  
  GET DIAGNOSTICS v_wallet_bonus_records = ROW_COUNT;

  -- Count total unique users affected
  SELECT COUNT(DISTINCT user_id) INTO v_total_users_affected
  FROM (
    SELECT user_id FROM public.user_bsk_balances
    UNION
    SELECT user_id FROM public.user_bonus_balances
    UNION
    SELECT user_id FROM public.wallet_bonus_balances
  ) AS all_users;

  -- Create audit log entry
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'admin_reset_all_balances',
    'system',
    'all_users',
    jsonb_build_object(
      'bsk_records_reset', v_bsk_balance_records,
      'bonus_records_reset', v_bonus_balance_records,
      'wallet_bonus_records_reset', v_wallet_bonus_records,
      'users_affected', v_total_users_affected,
      'timestamp', NOW()
    ),
    NOW()
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'bsk_balance_records_reset', v_bsk_balance_records,
    'crypto_balance_records_reset', v_bonus_balance_records + v_wallet_bonus_records,
    'total_users_affected', v_total_users_affected,
    'message', 'All user balances (BSK and crypto) have been reset to zero'
  );
END;
$$;
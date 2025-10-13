-- Fix admin_reset_all_user_balances to only reset existing tables
CREATE OR REPLACE FUNCTION public.admin_reset_all_user_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bsk_balance_records INTEGER := 0;
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

  -- Count total unique users affected
  SELECT COUNT(DISTINCT user_id) INTO v_total_users_affected
  FROM public.user_bsk_balances;

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
      'users_affected', v_total_users_affected,
      'timestamp', NOW()
    ),
    NOW()
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'bsk_balance_records_reset', v_bsk_balance_records,
    'crypto_balance_records_reset', 0,
    'total_users_affected', v_total_users_affected,
    'message', 'All user BSK balances have been reset to zero'
  );
END;
$$;
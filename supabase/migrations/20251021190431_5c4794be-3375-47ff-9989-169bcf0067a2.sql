-- Fix race condition in admin_adjust_user_balance function
-- Replace SELECT-then-INSERT with pure UPSERT logic

CREATE OR REPLACE FUNCTION public.admin_adjust_user_balance(
  p_target_user_id UUID,
  p_balance_type TEXT,
  p_operation TEXT,
  p_amount NUMERIC,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  admin_user_id UUID := auth.uid();
  adj_amount NUMERIC;
  new_balance NUMERIC;
  result JSONB;
BEGIN
  -- Verify admin role
  IF NOT has_role(admin_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can adjust user balances';
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Calculate adjustment amount
  adj_amount := CASE WHEN p_operation = 'add' THEN p_amount ELSE -p_amount END;

  -- Process BSK balance adjustment
  IF p_balance_type = 'bsk' THEN
    -- Atomic UPSERT with balance check
    INSERT INTO public.user_bsk_balances (
      user_id, 
      withdrawable_balance, 
      total_earned_withdrawable,
      holding_balance,
      total_earned_holding
    )
    VALUES (
      p_target_user_id, 
      GREATEST(0, adj_amount),
      CASE WHEN adj_amount > 0 THEN adj_amount ELSE 0 END,
      0,
      0
    )
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = user_bsk_balances.withdrawable_balance + adj_amount,
      total_earned_withdrawable = CASE 
        WHEN adj_amount > 0 
        THEN user_bsk_balances.total_earned_withdrawable + adj_amount
        ELSE user_bsk_balances.total_earned_withdrawable
      END,
      updated_at = now()
    WHERE user_bsk_balances.withdrawable_balance + adj_amount >= 0
    RETURNING withdrawable_balance INTO new_balance;

    -- Check if update succeeded
    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'Insufficient BSK balance for deduction';
    END IF;

    -- Create ledger entry
    INSERT INTO public.bsk_withdrawable_ledger (
      user_id, 
      type, 
      amount, 
      balance_after,
      description
    ) VALUES (
      p_target_user_id,
      CASE WHEN p_operation = 'add' THEN 'admin_credit' ELSE 'admin_debit' END,
      adj_amount,
      new_balance,
      p_reason
    );

  -- Process INR balance adjustment
  ELSIF p_balance_type = 'inr' THEN
    -- Atomic UPSERT with balance check
    INSERT INTO public.user_inr_balances (
      user_id, 
      balance,
      total_deposited,
      total_withdrawn
    )
    VALUES (
      p_target_user_id, 
      GREATEST(0, adj_amount),
      CASE WHEN adj_amount > 0 THEN adj_amount ELSE 0 END,
      0
    )
    ON CONFLICT (user_id) DO UPDATE SET
      balance = user_inr_balances.balance + adj_amount,
      total_deposited = CASE 
        WHEN adj_amount > 0 
        THEN user_inr_balances.total_deposited + adj_amount
        ELSE user_inr_balances.total_deposited
      END,
      total_withdrawn = CASE 
        WHEN adj_amount < 0 
        THEN user_inr_balances.total_withdrawn + ABS(adj_amount)
        ELSE user_inr_balances.total_withdrawn
      END,
      updated_at = now()
    WHERE user_inr_balances.balance + adj_amount >= 0
    RETURNING balance INTO new_balance;

    -- Check if update succeeded
    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'Insufficient INR balance for deduction';
    END IF;

    -- Create ledger entry
    INSERT INTO public.inr_ledger (
      user_id, 
      type, 
      amount, 
      balance_after,
      description
    ) VALUES (
      p_target_user_id,
      CASE WHEN p_operation = 'add' THEN 'admin_credit' ELSE 'admin_debit' END,
      adj_amount,
      new_balance,
      p_reason
    );

  ELSE
    RAISE EXCEPTION 'Invalid balance type: %', p_balance_type;
  END IF;

  -- Create audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    created_at
  ) VALUES (
    admin_user_id,
    'admin_balance_adjustment',
    p_balance_type || '_balance',
    p_target_user_id::TEXT,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'balance_type', p_balance_type,
      'operation', p_operation,
      'amount', p_amount,
      'adjustment_amount', adj_amount,
      'new_balance', new_balance,
      'reason', p_reason
    ),
    now()
  );

  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'balance_type', p_balance_type,
    'operation', p_operation,
    'amount', p_amount,
    'new_balance', new_balance,
    'message', 'Balance adjusted successfully'
  );

  RETURN result;
END;
$function$;
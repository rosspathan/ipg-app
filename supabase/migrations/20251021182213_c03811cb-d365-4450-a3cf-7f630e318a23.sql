-- Fix #1: Admin Manual Purchase - Atomic BSK Credit
CREATE OR REPLACE FUNCTION public.admin_credit_manual_purchase(
  p_user_id UUID,
  p_withdrawable_amount NUMERIC,
  p_holding_amount NUMERIC
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_new_withdrawable NUMERIC;
  v_new_holding NUMERIC;
BEGIN
  -- Atomic update with row-level locking
  UPDATE public.user_bsk_balances
  SET 
    withdrawable_balance = withdrawable_balance + p_withdrawable_amount,
    holding_balance = holding_balance + p_holding_amount,
    total_earned_withdrawable = total_earned_withdrawable + p_withdrawable_amount,
    total_earned_holding = total_earned_holding + p_holding_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING withdrawable_balance, holding_balance INTO v_new_withdrawable, v_new_holding;
  
  -- If no row exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_bsk_balances (
      user_id, withdrawable_balance, holding_balance, 
      total_earned_withdrawable, total_earned_holding
    )
    VALUES (
      p_user_id, p_withdrawable_amount, p_holding_amount,
      p_withdrawable_amount, p_holding_amount
    )
    RETURNING withdrawable_balance, holding_balance INTO v_new_withdrawable, v_new_holding;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'withdrawable_balance', v_new_withdrawable,
    'holding_balance', v_new_holding
  );
END;
$$;

-- Fix #2: BSK Withdrawal - Atomic Balance Lock
CREATE OR REPLACE FUNCTION public.lock_bsk_for_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
BEGIN
  -- Atomic deduction with balance check and row lock
  UPDATE public.user_bsk_balances
  SET withdrawable_balance = withdrawable_balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id 
    AND withdrawable_balance >= p_amount
  RETURNING withdrawable_balance + p_amount, withdrawable_balance 
  INTO v_balance_before, v_balance_after;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance or user not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
END;
$$;

-- Fix #3: Crypto Internal Transfer - Atomic Sender/Recipient Update
CREATE OR REPLACE FUNCTION public.execute_internal_crypto_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC,
  p_fee NUMERIC
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_sender_balance_before NUMERIC;
  v_sender_balance_after NUMERIC;
  v_recipient_balance_after NUMERIC;
  v_net_amount NUMERIC;
BEGIN
  v_net_amount := p_amount - p_fee;
  
  -- Lock and deduct from sender atomically
  UPDATE public.wallet_balances
  SET available = available - p_amount,
      updated_at = now()
  WHERE user_id = p_sender_id 
    AND asset_id = p_asset_id
    AND available >= p_amount
  RETURNING available + p_amount, available 
  INTO v_sender_balance_before, v_sender_balance_after;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient sender balance'
    );
  END IF;
  
  -- Credit recipient atomically (upsert)
  INSERT INTO public.wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_recipient_id, p_asset_id, v_net_amount, 0)
  ON CONFLICT (user_id, asset_id) 
  DO UPDATE SET 
    available = wallet_balances.available + v_net_amount,
    updated_at = now()
  RETURNING available INTO v_recipient_balance_after;
  
  RETURN jsonb_build_object(
    'success', true,
    'sender_balance_after', v_sender_balance_after,
    'recipient_balance_after', v_recipient_balance_after,
    'net_amount', v_net_amount,
    'fee', p_fee
  );
END;
$$;
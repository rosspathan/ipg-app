-- Create admin manual operation functions for BSK transactions

-- Admin manual credit function
CREATE OR REPLACE FUNCTION admin_credit_bsk_manual(
  p_user_id UUID,
  p_amount NUMERIC,
  p_balance_type TEXT DEFAULT 'withdrawable',
  p_notes TEXT DEFAULT ''
) RETURNS jsonb AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Update user balance
  IF p_balance_type = 'withdrawable' THEN
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = user_bsk_balances.withdrawable_balance + p_amount,
      total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + p_amount,
      updated_at = NOW();
  ELSE
    INSERT INTO user_bsk_balances (user_id, holding_balance, total_earned_holding)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      holding_balance = user_bsk_balances.holding_balance + p_amount,
      total_earned_holding = user_bsk_balances.total_earned_holding + p_amount,
      updated_at = NOW();
  END IF;
  
  -- Record transaction in bonus_ledger
  INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
  VALUES (
    p_user_id,
    'manual_credit',
    p_amount,
    jsonb_build_object(
      'balance_type', p_balance_type,
      'admin_id', v_admin_id,
      'admin_notes', p_notes,
      'description', 'Admin Manual Credit'
    )
  );
  
  -- Log in admin operations
  INSERT INTO bsk_admin_operations (admin_id, operation_type, amount, metadata)
  VALUES (
    v_admin_id,
    'mint',
    p_amount,
    jsonb_build_object(
      'user_id', p_user_id,
      'balance_type', p_balance_type,
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin manual debit function
CREATE OR REPLACE FUNCTION admin_debit_bsk_manual(
  p_user_id UUID,
  p_amount NUMERIC,
  p_balance_type TEXT DEFAULT 'withdrawable',
  p_notes TEXT DEFAULT ''
) RETURNS jsonb AS $$
DECLARE
  v_admin_id UUID;
  v_current_balance NUMERIC;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check balance
  IF p_balance_type = 'withdrawable' THEN
    SELECT withdrawable_balance INTO v_current_balance FROM user_bsk_balances WHERE user_id = p_user_id;
  ELSE
    SELECT holding_balance INTO v_current_balance FROM user_bsk_balances WHERE user_id = p_user_id;
  END IF;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Deduct balance
  IF p_balance_type = 'withdrawable' THEN
    UPDATE user_bsk_balances SET withdrawable_balance = withdrawable_balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_bsk_balances SET holding_balance = holding_balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Record transaction
  INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
  VALUES (
    p_user_id,
    'manual_debit',
    -p_amount,
    jsonb_build_object(
      'balance_type', p_balance_type,
      'admin_id', v_admin_id,
      'admin_notes', p_notes,
      'description', 'Admin Manual Debit'
    )
  );
  
  -- Log admin operation
  INSERT INTO bsk_admin_operations (admin_id, operation_type, amount, metadata)
  VALUES (
    v_admin_id,
    'burn',
    p_amount,
    jsonb_build_object(
      'user_id', p_user_id,
      'balance_type', p_balance_type,
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the admin_credit_manual_purchase to record transactions in bonus_ledger
CREATE OR REPLACE FUNCTION admin_credit_manual_purchase(
  p_user_id UUID,
  p_withdrawable_amount NUMERIC,
  p_holding_amount NUMERIC
) RETURNS jsonb AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Credit withdrawable
  INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
  VALUES (p_user_id, p_withdrawable_amount, p_withdrawable_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    withdrawable_balance = user_bsk_balances.withdrawable_balance + p_withdrawable_amount,
    total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + p_withdrawable_amount,
    updated_at = NOW();
  
  -- Credit holding
  INSERT INTO user_bsk_balances (user_id, holding_balance, total_earned_holding)
  VALUES (p_user_id, p_holding_amount, p_holding_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    holding_balance = user_bsk_balances.holding_balance + p_holding_amount,
    total_earned_holding = user_bsk_balances.total_earned_holding + p_holding_amount,
    updated_at = NOW();
  
  -- Record withdrawable transaction
  INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
  VALUES (
    p_user_id,
    'purchase',
    p_withdrawable_amount,
    jsonb_build_object(
      'balance_type', 'withdrawable',
      'admin_id', v_admin_id,
      'description', 'BSK Purchase (Withdrawable)'
    )
  );
  
  -- Record holding bonus
  INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
  VALUES (
    p_user_id,
    'purchase_bonus',
    p_holding_amount,
    jsonb_build_object(
      'balance_type', 'holding',
      'admin_id', v_admin_id,
      'description', 'BSK Purchase Bonus (+50% Holding)'
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
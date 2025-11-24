-- Create unified BSK transaction recording function
CREATE OR REPLACE FUNCTION public.record_bsk_transaction(
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_tx_type TEXT,
  p_tx_subtype TEXT,
  p_balance_type TEXT,
  p_amount_bsk NUMERIC,
  p_related_user_id UUID DEFAULT NULL,
  p_meta_json JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_ledger_id UUID;
  v_result JSONB;
BEGIN
  -- Check for duplicate transaction (idempotency)
  IF EXISTS (
    SELECT 1 FROM unified_bsk_ledger 
    WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'duplicate_transaction',
      'message', 'Transaction already processed'
    );
  END IF;

  -- Get current balance
  IF p_balance_type = 'withdrawable' THEN
    SELECT COALESCE(withdrawable_balance, 0) INTO v_balance_before
    FROM user_bsk_balances
    WHERE user_id = p_user_id;
  ELSIF p_balance_type = 'holding' THEN
    SELECT COALESCE(holding_balance, 0) INTO v_balance_before
    FROM user_bsk_balances
    WHERE user_id = p_user_id;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_balance_type',
      'message', 'Balance type must be withdrawable or holding'
    );
  END IF;

  -- Calculate new balance
  IF p_tx_type = 'debit' THEN
    v_balance_after := v_balance_before - p_amount_bsk;
    
    -- Check sufficient balance
    IF v_balance_after < 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'insufficient_balance',
        'message', 'Insufficient balance',
        'balance', v_balance_before,
        'required', p_amount_bsk
      );
    END IF;
  ELSIF p_tx_type = 'credit' THEN
    v_balance_after := v_balance_before + p_amount_bsk;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_tx_type',
      'message', 'Transaction type must be debit or credit'
    );
  END IF;

  -- Insert ledger entry
  INSERT INTO unified_bsk_ledger (
    user_id,
    idempotency_key,
    tx_type,
    tx_subtype,
    balance_type,
    amount_bsk,
    balance_before,
    balance_after,
    related_user_id,
    metadata
  ) VALUES (
    p_user_id,
    p_idempotency_key,
    p_tx_type,
    p_tx_subtype,
    p_balance_type,
    p_amount_bsk,
    v_balance_before,
    v_balance_after,
    p_related_user_id,
    p_meta_json
  )
  RETURNING id INTO v_ledger_id;

  -- Update user balance
  IF p_balance_type = 'withdrawable' THEN
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance)
    VALUES (p_user_id, v_balance_after)
    ON CONFLICT (user_id)
    DO UPDATE SET
      withdrawable_balance = v_balance_after,
      updated_at = now();
  ELSIF p_balance_type = 'holding' THEN
    INSERT INTO user_bsk_balances (user_id, holding_balance)
    VALUES (p_user_id, v_balance_after)
    ON CONFLICT (user_id)
    DO UPDATE SET
      holding_balance = v_balance_after,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', v_ledger_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after
  );
END;
$$;
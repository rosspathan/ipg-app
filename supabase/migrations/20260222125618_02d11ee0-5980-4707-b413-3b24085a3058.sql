
-- Create an RPC function that atomically validates and records a withdrawal in the trading_balance_ledger.
-- This ensures withdrawals cannot exceed the ledger-verified balance.

CREATE OR REPLACE FUNCTION public.validate_and_record_withdrawal(
  p_user_id uuid,
  p_asset_symbol text,
  p_asset_id uuid,
  p_amount numeric,
  p_fee numeric DEFAULT 0,
  p_reference_type text DEFAULT 'withdrawal',
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_net numeric;
  v_current_available numeric;
  v_current_locked numeric;
  v_total_debit numeric;
  v_new_available numeric;
BEGIN
  v_total_debit := p_amount + p_fee;

  -- 1. Calculate the ledger-verified net available balance
  -- This is the sum of all delta_available entries in the ledger
  SELECT COALESCE(SUM(delta_available), 0)
  INTO v_ledger_net
  FROM trading_balance_ledger
  WHERE user_id = p_user_id
    AND asset_symbol = p_asset_symbol;

  -- 2. Get current wallet_balances for snapshot
  SELECT available, locked
  INTO v_current_available, v_current_locked
  FROM wallet_balances
  WHERE user_id = p_user_id AND asset_id = p_asset_id;

  IF v_current_available IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'No balance found for this asset'
    );
  END IF;

  -- 3. Validate: both wallet_balances AND ledger must have sufficient funds
  IF v_current_available < v_total_debit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Insufficient available balance: %s < %s', v_current_available, v_total_debit)
    );
  END IF;

  IF v_ledger_net < v_total_debit THEN
    -- CRITICAL: Ledger says user doesn't have enough, even if wallet_balances.available says they do
    -- This catches the exploit where wallet_balances was inflated without ledger backing
    RAISE WARNING '[WITHDRAWAL_LEDGER_MISMATCH] user=%, asset=%, ledger_net=%, wallet_available=%, requested=%',
      p_user_id, p_asset_symbol, v_ledger_net, v_current_available, v_total_debit;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Balance verification failed. Please contact support.',
      'ledger_net', v_ledger_net,
      'wallet_available', v_current_available
    );
  END IF;

  -- 4. Deduct from wallet_balances
  v_new_available := v_current_available - v_total_debit;

  UPDATE wallet_balances
  SET available = v_new_available,
      updated_at = now()
  WHERE user_id = p_user_id AND asset_id = p_asset_id;

  -- 5. Record in trading_balance_ledger (the missing piece!)
  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol,
    delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes
  ) VALUES (
    p_user_id, p_asset_symbol,
    -v_total_debit, 0,
    v_new_available, v_current_locked,
    'WITHDRAWAL', p_reference_type, p_reference_id, p_notes
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'debited', v_total_debit,
    'new_available', v_new_available,
    'ledger_net_before', v_ledger_net,
    'ledger_net_after', v_ledger_net - v_total_debit
  );
END;
$$;

-- Also create an RPC to refund a failed withdrawal back to the ledger
CREATE OR REPLACE FUNCTION public.refund_failed_withdrawal(
  p_user_id uuid,
  p_asset_symbol text,
  p_asset_id uuid,
  p_amount numeric,
  p_fee numeric DEFAULT 0,
  p_reference_type text DEFAULT 'withdrawal_refund',
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_available numeric;
  v_current_locked numeric;
  v_total_refund numeric;
  v_new_available numeric;
BEGIN
  v_total_refund := p_amount + p_fee;

  SELECT available, locked
  INTO v_current_available, v_current_locked
  FROM wallet_balances
  WHERE user_id = p_user_id AND asset_id = p_asset_id;

  IF v_current_available IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'No balance found');
  END IF;

  v_new_available := v_current_available + v_total_refund;

  UPDATE wallet_balances
  SET available = v_new_available,
      updated_at = now()
  WHERE user_id = p_user_id AND asset_id = p_asset_id;

  -- Record refund in ledger
  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol,
    delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes
  ) VALUES (
    p_user_id, p_asset_symbol,
    v_total_refund, 0,
    v_new_available, v_current_locked,
    'WITHDRAWAL_REFUND', p_reference_type, p_reference_id, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'refunded', v_total_refund,
    'new_available', v_new_available
  );
END;
$$;


-- =============================================
-- #1: Atomic RPC for Internal Balance Transfer
-- Prevents race conditions with FOR UPDATE locking
-- =============================================
CREATE OR REPLACE FUNCTION public.execute_internal_balance_transfer(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC,
  p_direction TEXT  -- 'to_trading' or 'from_trading'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_new_available NUMERIC;
  v_transfer_id UUID;
BEGIN
  -- Validate direction
  IF p_direction NOT IN ('to_trading', 'from_trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid direction');
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  -- Round to 8 decimals
  p_amount := ROUND(p_amount, 8);

  IF p_direction = 'to_trading' THEN
    -- WALLET → TRADING: upsert with lock
    SELECT id, available, locked
      INTO v_balance
      FROM wallet_balances
     WHERE user_id = p_user_id AND asset_id = p_asset_id
       FOR UPDATE;

    IF v_balance IS NULL THEN
      -- Create new row
      INSERT INTO wallet_balances (user_id, asset_id, available, locked)
      VALUES (p_user_id, p_asset_id, p_amount, 0);
    ELSE
      v_new_available := ROUND(v_balance.available + p_amount, 8);
      UPDATE wallet_balances
         SET available = v_new_available,
             updated_at = now()
       WHERE id = v_balance.id;
    END IF;

  ELSE
    -- TRADING → WALLET: lock row, check balance, debit
    SELECT id, available, locked
      INTO v_balance
      FROM wallet_balances
     WHERE user_id = p_user_id AND asset_id = p_asset_id
       FOR UPDATE;

    IF v_balance IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No trading balance found');
    END IF;

    IF v_balance.available < p_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient trading balance. Available: %s', ROUND(v_balance.available, 8))
      );
    END IF;

    v_new_available := ROUND(v_balance.available - p_amount, 8);
    UPDATE wallet_balances
       SET available = v_new_available,
           updated_at = now()
     WHERE id = v_balance.id;
  END IF;

  -- Record the transfer
  INSERT INTO trading_balance_transfers (user_id, asset_id, direction, amount, status, completed_at)
  VALUES (p_user_id, p_asset_id, p_direction, p_amount, 'completed', now())
  RETURNING id INTO v_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'amount', p_amount,
    'direction', p_direction
  );
END;
$$;

-- =============================================
-- #2: Atomic RPC for Custodial Withdrawal Request
-- Prevents race conditions with FOR UPDATE locking
-- =============================================
CREATE OR REPLACE FUNCTION public.execute_withdrawal_request(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC,
  p_fee NUMERIC,
  p_to_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_total_required NUMERIC;
  v_new_available NUMERIC;
  v_withdrawal_id UUID;
BEGIN
  -- Validate
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  p_amount := ROUND(p_amount, 8);
  p_fee := ROUND(COALESCE(p_fee, 0), 8);
  v_total_required := p_amount + p_fee;

  -- Lock the balance row
  SELECT id, available, locked
    INTO v_balance
    FROM wallet_balances
   WHERE user_id = p_user_id AND asset_id = p_asset_id
     FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No trading balance found');
  END IF;

  IF v_balance.available < v_total_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient balance. Available: %s, Required: %s (includes %s fee)',
                      ROUND(v_balance.available, 8), v_total_required, p_fee)
    );
  END IF;

  -- Deduct balance
  v_new_available := ROUND(v_balance.available - v_total_required, 8);
  UPDATE wallet_balances
     SET available = v_new_available,
         updated_at = now()
   WHERE id = v_balance.id;

  -- Create withdrawal record atomically in same transaction
  INSERT INTO custodial_withdrawals (user_id, asset_id, amount, to_address, fee_amount, status)
  VALUES (p_user_id, p_asset_id, p_amount, p_to_address, p_fee, 'pending')
  RETURNING id INTO v_withdrawal_id;

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'amount', p_amount,
    'fee', p_fee,
    'new_available', v_new_available
  );
END;
$$;

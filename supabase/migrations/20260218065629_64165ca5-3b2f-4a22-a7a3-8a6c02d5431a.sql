CREATE OR REPLACE FUNCTION public.execute_internal_balance_transfer(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC,
  p_direction TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance RECORD;
  v_onchain RECORD;
  v_new_available NUMERIC;
  v_new_onchain NUMERIC;
  v_transfer_id UUID;
  v_available_rounded NUMERIC;
BEGIN
  IF p_direction NOT IN ('to_trading', 'from_trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid direction');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  p_amount := ROUND(p_amount, 8);

  IF p_direction = 'to_trading' THEN
    -- ===== WALLET → TRADING =====
    -- Verify on-chain source balance
    SELECT id, balance INTO v_onchain
      FROM onchain_balances
     WHERE user_id = p_user_id AND asset_id = p_asset_id
       FOR UPDATE;

    IF v_onchain IS NULL OR ROUND(v_onchain.balance, 8) < p_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient wallet balance. Available: %s', 
                        COALESCE(ROUND(v_onchain.balance, 8)::text, '0'))
      );
    END IF;

    -- Debit onchain_balances (user moved funds to hot wallet)
    v_new_onchain := ROUND(v_onchain.balance - p_amount, 8);
    IF v_new_onchain < 0 THEN v_new_onchain := 0; END IF;
    UPDATE onchain_balances
       SET balance = v_new_onchain, last_synced_at = now()
     WHERE id = v_onchain.id;

    -- Credit trading wallet_balances
    SELECT id, available, locked INTO v_balance
      FROM wallet_balances
     WHERE user_id = p_user_id AND asset_id = p_asset_id
       FOR UPDATE;

    IF v_balance IS NULL THEN
      INSERT INTO wallet_balances (user_id, asset_id, available, locked)
      VALUES (p_user_id, p_asset_id, p_amount, 0);
    ELSE
      v_new_available := ROUND(v_balance.available + p_amount, 8);
      UPDATE wallet_balances
         SET available = v_new_available, updated_at = now()
       WHERE id = v_balance.id;
    END IF;

  ELSE
    -- ===== TRADING → WALLET =====
    -- Only debit wallet_balances. Do NOT credit onchain_balances here.
    -- The sync-bep20-balances function handles display balance via
    -- net transfer calculation (blockchain_balance - netTransferredToTrading).
    SELECT id, available, locked INTO v_balance
      FROM wallet_balances
     WHERE user_id = p_user_id AND asset_id = p_asset_id
       FOR UPDATE;

    IF v_balance IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No trading balance found');
    END IF;

    v_available_rounded := ROUND(v_balance.available, 8);

    IF v_available_rounded < p_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient trading balance. Available: %s', v_available_rounded)
      );
    END IF;

    v_new_available := ROUND(v_balance.available - p_amount, 8);
    IF v_new_available < 0 THEN v_new_available := 0; END IF;
    UPDATE wallet_balances
       SET available = v_new_available, updated_at = now()
     WHERE id = v_balance.id;

    -- Do NOT touch onchain_balances - sync function handles it
  END IF;

  -- Record the transfer (sync uses this for net calculation)
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
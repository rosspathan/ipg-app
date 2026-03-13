CREATE OR REPLACE FUNCTION public.execute_internal_balance_transfer(
  p_user_id uuid, p_asset_id uuid, p_amount numeric, p_direction text, p_tx_hash text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance RECORD;
  v_onchain RECORD;
  v_deposit RECORD;
  v_new_available NUMERIC;
  v_new_onchain NUMERIC;
  v_transfer_id UUID;
  v_available_rounded NUMERIC;
  v_asset_symbol TEXT;
  v_ledger_id UUID;
BEGIN
  IF p_direction NOT IN ('to_trading', 'from_trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid direction');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  p_amount := ROUND(p_amount, 8);

  SELECT symbol INTO v_asset_symbol FROM assets WHERE id = p_asset_id;
  IF v_asset_symbol IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found');
  END IF;

  IF p_direction = 'to_trading' THEN
    IF p_tx_hash IS NULL OR p_tx_hash = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'tx_hash is required for to_trading transfers. On-chain deposit proof is mandatory.');
    END IF;

    SELECT * INTO v_deposit
    FROM custodial_deposits
    WHERE tx_hash = p_tx_hash
      AND user_id = p_user_id
      AND asset_id = p_asset_id
    FOR UPDATE;

    IF v_deposit IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No verified custodial deposit found for this transaction hash.');
    END IF;

    IF EXISTS (
      SELECT 1 FROM trading_balance_ledger
      WHERE reference_type = 'custodial_deposit'
        AND reference_id = v_deposit.id
        AND entry_type = 'DEPOSIT'
        AND user_id = p_user_id
    ) THEN
      RETURN jsonb_build_object('success', true, 'status', 'already_credited', 'message', 'This deposit was already credited to trading balance.');
    END IF;

    IF ABS(ROUND(v_deposit.amount, 8) - p_amount) > 0.00000001 THEN
      RETURN jsonb_build_object('success', false, 'error', format('Amount mismatch. Deposit amount: %s, requested: %s', ROUND(v_deposit.amount, 8), p_amount));
    END IF;

    SELECT id, balance INTO v_onchain
      FROM onchain_balances
     WHERE user_id = p_user_id AND asset_id = p_asset_id
       FOR UPDATE;

    IF v_onchain IS NOT NULL AND ROUND(v_onchain.balance, 8) >= p_amount THEN
      v_new_onchain := ROUND(v_onchain.balance - p_amount, 8);
      IF v_new_onchain < 0 THEN v_new_onchain := 0; END IF;
      UPDATE onchain_balances
         SET balance = v_new_onchain, last_synced_at = now()
       WHERE id = v_onchain.id;
    END IF;

    SELECT id, available, locked INTO v_balance
      FROM wallet_balances
     WHERE user_id = p_user_id AND asset_id = p_asset_id
       FOR UPDATE;

    IF v_balance IS NULL THEN
      INSERT INTO wallet_balances (user_id, asset_id, available, locked)
      VALUES (p_user_id, p_asset_id, p_amount, 0);
      v_new_available := p_amount;
    ELSE
      v_new_available := ROUND(v_balance.available + p_amount, 8);
      UPDATE wallet_balances
         SET available = v_new_available, updated_at = now()
       WHERE id = v_balance.id;
    END IF;

    INSERT INTO trading_balance_ledger (
      user_id, asset_symbol, delta_available, delta_locked,
      balance_available_after, balance_locked_after,
      entry_type, reference_type, reference_id, notes, created_at
    ) VALUES (
      p_user_id, v_asset_symbol, p_amount, 0,
      v_new_available, COALESCE(v_balance.locked, 0),
      'DEPOSIT', 'custodial_deposit', v_deposit.id,
      format('Verified on-chain deposit TX: %s', p_tx_hash), now()
    ) ON CONFLICT (reference_type, reference_id, entry_type, user_id) WHERE reference_id IS NOT NULL DO NOTHING;

    UPDATE custodial_deposits
    SET status = 'credited', credited_at = COALESCE(credited_at, now()), updated_at = now()
    WHERE id = v_deposit.id AND status != 'credited';

    INSERT INTO trading_balance_transfers (user_id, asset_id, direction, amount, status, completed_at, tx_hash)
    VALUES (p_user_id, p_asset_id, p_direction, p_amount, 'completed', now(), p_tx_hash)
    RETURNING id INTO v_transfer_id;

  ELSE
    -- ===== TRADING → WALLET (from_trading) =====
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

    -- Record the transfer first to get transfer_id
    INSERT INTO trading_balance_transfers (user_id, asset_id, direction, amount, status, completed_at, tx_hash)
    VALUES (p_user_id, p_asset_id, p_direction, p_amount, 'completed', now(), p_tx_hash)
    RETURNING id INTO v_transfer_id;

    -- *** FIX: Record ledger entry for from_trading withdrawal ***
    -- Previously missing — caused wallet_balances to drift from ledger
    INSERT INTO trading_balance_ledger (
      user_id, asset_symbol, delta_available, delta_locked,
      balance_available_after, balance_locked_after,
      entry_type, reference_type, reference_id, notes, created_at
    ) VALUES (
      p_user_id, v_asset_symbol, -p_amount, 0,
      v_new_available, COALESCE(v_balance.locked, 0),
      'WITHDRAWAL', 'internal_transfer_to_wallet', v_transfer_id,
      format('Trading → Wallet transfer: %s %s (ref: %s)', p_amount, v_asset_symbol, v_transfer_id),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'amount', p_amount,
    'direction', p_direction
  );
END;
$function$;
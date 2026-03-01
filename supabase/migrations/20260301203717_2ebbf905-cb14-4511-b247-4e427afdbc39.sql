
-- ===========================================
-- 1. Harden execute_internal_balance_transfer RPC
--    Require p_tx_hash for to_trading direction
--    Verify it exists in custodial_deposits
-- ===========================================
CREATE OR REPLACE FUNCTION public.execute_internal_balance_transfer(
  p_user_id uuid,
  p_asset_id uuid,
  p_amount numeric,
  p_direction text,
  p_tx_hash text DEFAULT NULL
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
    -- SECURITY: Require a verified custodial_deposits record with tx_hash
    IF p_tx_hash IS NULL OR p_tx_hash = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'tx_hash is required for to_trading transfers. On-chain deposit proof is mandatory.');
    END IF;

    -- Verify the custodial deposit exists, belongs to this user/asset, and has valid tx_hash
    SELECT * INTO v_deposit
    FROM custodial_deposits
    WHERE tx_hash = p_tx_hash
      AND user_id = p_user_id
      AND asset_id = p_asset_id
    FOR UPDATE;

    IF v_deposit IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No verified custodial deposit found for this transaction hash. Deposit must be confirmed on-chain first.');
    END IF;

    -- Prevent double-crediting via ledger check
    IF EXISTS (
      SELECT 1 FROM trading_balance_ledger
      WHERE reference_type = 'custodial_deposit'
        AND reference_id = v_deposit.id::text
        AND entry_type = 'DEPOSIT'
        AND user_id = p_user_id
    ) THEN
      RETURN jsonb_build_object('success', true, 'status', 'already_credited', 'message', 'This deposit was already credited to trading balance.');
    END IF;

    -- Verify amount matches (within rounding tolerance)
    IF ABS(ROUND(v_deposit.amount, 8) - p_amount) > 0.00000001 THEN
      RETURN jsonb_build_object('success', false, 'error', format('Amount mismatch. Deposit amount: %s, requested: %s', ROUND(v_deposit.amount, 8), p_amount));
    END IF;

    -- Debit on-chain display balance (best effort)
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

    -- Credit trading wallet_balances
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

    -- Record ledger entry for this deposit (idempotent)
    INSERT INTO trading_balance_ledger (
      user_id, asset_symbol, delta_available, delta_locked,
      balance_available_after, balance_locked_after,
      entry_type, reference_type, reference_id, notes, created_at
    ) VALUES (
      p_user_id,
      (SELECT symbol FROM assets WHERE id = p_asset_id),
      p_amount, 0,
      v_new_available, COALESCE(v_balance.locked, 0),
      'DEPOSIT', 'custodial_deposit', v_deposit.id::text,
      format('Verified on-chain deposit TX: %s', p_tx_hash),
      now()
    ) ON CONFLICT (reference_type, reference_id, entry_type, user_id) WHERE reference_id IS NOT NULL DO NOTHING;

    -- Mark deposit as credited
    UPDATE custodial_deposits
    SET status = 'credited', credited_at = COALESCE(credited_at, now()), updated_at = now()
    WHERE id = v_deposit.id AND status != 'credited';

  ELSE
    -- ===== TRADING → WALLET =====
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
  END IF;

  -- Record the transfer
  INSERT INTO trading_balance_transfers (user_id, asset_id, direction, amount, status, completed_at, tx_hash)
  VALUES (p_user_id, p_asset_id, p_direction, p_amount, 'completed', now(), p_tx_hash)
  RETURNING id INTO v_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'amount', p_amount,
    'direction', p_direction
  );
END;
$function$;


-- ===========================================
-- 2. Guard trigger on wallet_balances
-- ===========================================
CREATE OR REPLACE FUNCTION public.guard_wallet_balance_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $guard$
BEGIN
  -- Allow decreases (withdrawals, locks) - only block increases
  IF TG_OP = 'UPDATE' THEN
    IF NEW.available <= OLD.available AND NEW.locked <= OLD.locked THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Allow service_role and superuser operations
  IF current_setting('role', true) = 'service_role' 
     OR current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('is_superuser', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Block authenticated users from direct balance increases
  IF current_setting('role', true) = 'authenticated' 
     OR current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Direct wallet_balances INSERT not allowed. Use authorized deposit functions.';
    END IF;
    
    IF TG_OP = 'UPDATE' AND (NEW.available > OLD.available OR NEW.locked > OLD.locked) THEN
      RAISE EXCEPTION 'Direct wallet_balances balance increase not allowed. Use authorized deposit functions.';
    END IF;
  END IF;

  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS trg_guard_wallet_balance ON wallet_balances;

CREATE TRIGGER trg_guard_wallet_balance
  BEFORE INSERT OR UPDATE ON wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION guard_wallet_balance_modification();


-- Enhancement 2: Early unstake with 10% penalty function
CREATE OR REPLACE FUNCTION public.execute_early_unstake(
  p_user_id UUID,
  p_stake_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stake RECORD;
  v_account RECORD;
  v_config RECORD;
  v_early_penalty_pct NUMERIC := 10; -- 10% early exit penalty on principal
  v_total_amount NUMERIC;
  v_fee NUMERIC;
  v_net_return NUMERIC;
  v_avail_before NUMERIC;
  v_idem_key TEXT;
BEGIN
  -- Idempotency check
  v_idem_key := COALESCE(p_idempotency_key, 'early_unstake_' || p_stake_id || '_' || p_user_id);
  IF EXISTS (SELECT 1 FROM crypto_staking_ledger WHERE idempotency_key = v_idem_key) THEN
    RAISE EXCEPTION 'Duplicate request: already processed';
  END IF;

  -- 1. Lock the stake row
  SELECT * INTO v_stake
    FROM user_crypto_stakes
    WHERE id = p_stake_id AND user_id = p_user_id AND status = 'active'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active stake not found or already withdrawn';
  END IF;

  -- 2. Must still be locked (early exit only applies before lock_until)
  IF v_stake.lock_until <= now() THEN
    RAISE EXCEPTION 'Stake is already unlocked. Use normal unstake instead.';
  END IF;

  -- 3. Get config for normal unstaking fee too
  SELECT * INTO v_config FROM crypto_staking_config LIMIT 1;

  -- 4. Early exit: principal only, rewards are FORFEITED
  --    Penalty = 10% on stake_amount (principal)
  v_total_amount := v_stake.stake_amount; -- rewards forfeited
  v_fee := v_total_amount * (v_early_penalty_pct / 100);
  v_net_return := v_total_amount - v_fee;

  -- 5. Lock staking account
  SELECT * INTO v_account
    FROM user_staking_accounts
    WHERE id = v_stake.staking_account_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staking account not found';
  END IF;

  v_avail_before := v_account.available_balance;

  -- 6. Return net principal to available, deduct full staked_balance (principal + rewards)
  UPDATE user_staking_accounts
    SET available_balance = available_balance + v_net_return,
        staked_balance = GREATEST(0, staked_balance - (v_stake.stake_amount + COALESCE(v_stake.total_rewards, 0))),
        updated_at = now()
    WHERE id = v_account.id;

  -- 7. Mark stake as early_withdrawn
  UPDATE user_crypto_stakes
    SET status = 'early_withdrawn',
        withdrawn_at = now(),
        updated_at = now()
    WHERE id = v_stake.id;

  -- 8. Record in ledger
  INSERT INTO crypto_staking_ledger (
    user_id, staking_account_id, stake_id, tx_type, amount, fee_amount,
    currency, balance_before, balance_after, notes, idempotency_key
  ) VALUES (
    p_user_id, v_account.id, v_stake.id, 'early_unstake', v_net_return, v_fee,
    v_stake.currency, v_avail_before, v_avail_before + v_net_return,
    format('Early exit: %s principal returned (10%% penalty: %s, rewards forfeited: %s)', 
      v_net_return, v_fee, v_stake.total_rewards),
    v_idem_key
  );

  RETURN jsonb_build_object(
    'success', true,
    'returned_amount', v_net_return,
    'penalty', v_fee,
    'penalty_percent', v_early_penalty_pct,
    'rewards_forfeited', v_stake.total_rewards,
    'original_principal', v_stake.stake_amount
  );
END;
$$;

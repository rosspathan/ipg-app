
-- Atomic staking RPC with FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.execute_staking_stake(
  p_user_id UUID,
  p_plan_id UUID,
  p_amount NUMERIC,
  p_staking_fee_percent NUMERIC DEFAULT 0.5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
  v_plan RECORD;
  v_config RECORD;
  v_fee NUMERIC;
  v_net_staked NUMERIC;
  v_lock_until TIMESTAMPTZ;
  v_stake_id UUID;
  v_avail_before NUMERIC;
BEGIN
  -- 1. Validate plan exists and is active
  SELECT * INTO v_plan FROM crypto_staking_plans WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- 2. Validate amount against plan limits
  IF p_amount < v_plan.min_amount THEN
    RAISE EXCEPTION 'Amount below minimum: %', v_plan.min_amount;
  END IF;
  IF v_plan.max_amount IS NOT NULL AND p_amount > v_plan.max_amount THEN
    RAISE EXCEPTION 'Amount above maximum: %', v_plan.max_amount;
  END IF;

  -- 3. Get staking config
  SELECT * INTO v_config FROM crypto_staking_config LIMIT 1;
  IF v_config IS NOT NULL AND v_config.is_active = false THEN
    RAISE EXCEPTION 'Staking is currently disabled';
  END IF;

  -- 4. Lock user's staking account row (FOR UPDATE prevents concurrent modifications)
  SELECT * INTO v_account
    FROM user_staking_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staking account not found. Please deposit first.';
  END IF;

  -- 5. Calculate fee and net amount
  v_fee := p_amount * (COALESCE(v_config.staking_fee_percent, p_staking_fee_percent) / 100);
  v_net_staked := p_amount - v_fee;
  v_avail_before := v_account.available_balance;

  -- 6. Check sufficient balance (atomic - no race condition possible due to FOR UPDATE)
  IF v_account.available_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_account.available_balance, p_amount;
  END IF;

  -- 7. Deduct from available, add to staked (single atomic UPDATE)
  UPDATE user_staking_accounts
    SET available_balance = available_balance - p_amount,
        staked_balance = staked_balance + v_net_staked,
        updated_at = now()
    WHERE id = v_account.id;

  -- 8. Calculate lock period
  v_lock_until := now() + (v_plan.lock_period_days || ' days')::INTERVAL;

  -- 9. Create stake record
  INSERT INTO user_crypto_stakes (
    user_id, plan_id, staking_account_id, stake_amount, fee_paid,
    monthly_reward_percent, currency, status, staked_at, lock_until
  ) VALUES (
    p_user_id, p_plan_id, v_account.id, v_net_staked, v_fee,
    v_plan.monthly_reward_percent, v_plan.currency, 'active', now(), v_lock_until
  ) RETURNING id INTO v_stake_id;

  -- 10. Record in ledger
  INSERT INTO crypto_staking_ledger (
    user_id, staking_account_id, stake_id, tx_type, amount, fee_amount,
    currency, balance_before, balance_after, notes
  ) VALUES (
    p_user_id, v_account.id, v_stake_id, 'stake', v_net_staked, v_fee,
    v_plan.currency, v_avail_before, v_avail_before - p_amount,
    format('Staked %s (fee: %s) in plan: %s', v_net_staked, v_fee, v_plan.name)
  );

  -- 11. Return result
  RETURN jsonb_build_object(
    'success', true,
    'stake_id', v_stake_id,
    'net_staked', v_net_staked,
    'fee', v_fee,
    'lock_until', v_lock_until,
    'plan_name', v_plan.name
  );
END;
$$;

-- Atomic unstaking RPC with FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.execute_staking_unstake(
  p_user_id UUID,
  p_stake_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stake RECORD;
  v_account RECORD;
  v_config RECORD;
  v_unstaking_fee_pct NUMERIC;
  v_total_amount NUMERIC;
  v_fee NUMERIC;
  v_net_return NUMERIC;
  v_avail_before NUMERIC;
BEGIN
  -- 1. Lock the stake row to prevent double-unstake
  SELECT * INTO v_stake
    FROM user_crypto_stakes
    WHERE id = p_stake_id AND user_id = p_user_id AND status = 'active'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active stake not found or already withdrawn';
  END IF;

  -- 2. Check lock period
  IF v_stake.lock_until > now() THEN
    RAISE EXCEPTION 'Stake locked until %', v_stake.lock_until;
  END IF;

  -- 3. Get config
  SELECT * INTO v_config FROM crypto_staking_config LIMIT 1;
  v_unstaking_fee_pct := COALESCE(v_config.unstaking_fee_percent, 0.5);

  -- 4. Calculate return amounts
  v_total_amount := v_stake.stake_amount + v_stake.total_rewards;
  v_fee := v_total_amount * (v_unstaking_fee_pct / 100);
  v_net_return := v_total_amount - v_fee;

  -- 5. Lock staking account row
  SELECT * INTO v_account
    FROM user_staking_accounts
    WHERE id = v_stake.staking_account_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staking account not found';
  END IF;

  v_avail_before := v_account.available_balance;

  -- 6. Update balances atomically
  UPDATE user_staking_accounts
    SET available_balance = available_balance + v_net_return,
        staked_balance = GREATEST(0, staked_balance - v_stake.stake_amount),
        total_rewards_earned = total_rewards_earned + v_stake.total_rewards,
        updated_at = now()
    WHERE id = v_account.id;

  -- 7. Mark stake as withdrawn (atomic with the lock)
  UPDATE user_crypto_stakes
    SET status = 'withdrawn',
        withdrawn_at = now(),
        updated_at = now()
    WHERE id = v_stake.id;

  -- 8. Record in ledger
  INSERT INTO crypto_staking_ledger (
    user_id, staking_account_id, stake_id, tx_type, amount, fee_amount,
    currency, balance_before, balance_after, notes
  ) VALUES (
    p_user_id, v_account.id, v_stake.id, 'unstake', v_net_return, v_fee,
    v_stake.currency, v_avail_before, v_avail_before + v_net_return,
    format('Unstaked %s + %s rewards (fee: %s)', v_stake.stake_amount, v_stake.total_rewards, v_fee)
  );

  RETURN jsonb_build_object(
    'success', true,
    'returned_amount', v_net_return,
    'fee', v_fee,
    'rewards_earned', v_stake.total_rewards
  );
END;
$$;

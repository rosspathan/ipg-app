
-- =============================================
-- 1. Add idempotency_key to both staking RPCs
-- =============================================

-- Add idempotency_key column to crypto_staking_ledger if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crypto_staking_ledger' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.crypto_staking_ledger ADD COLUMN idempotency_key TEXT UNIQUE;
  END IF;
END $$;

-- Recreate execute_staking_stake with idempotency
CREATE OR REPLACE FUNCTION public.execute_staking_stake(
  p_user_id UUID,
  p_plan_id UUID,
  p_amount NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL,
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
  v_existing RECORD;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM crypto_staking_ledger WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'duplicate', true, 'stake_id', v_existing.stake_id);
    END IF;
  END IF;

  SELECT * INTO v_plan FROM crypto_staking_plans WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found or inactive'; END IF;

  IF p_amount < v_plan.min_amount THEN RAISE EXCEPTION 'Amount below minimum: %', v_plan.min_amount; END IF;
  IF v_plan.max_amount IS NOT NULL AND p_amount > v_plan.max_amount THEN RAISE EXCEPTION 'Amount above maximum: %', v_plan.max_amount; END IF;

  SELECT * INTO v_config FROM crypto_staking_config LIMIT 1;
  IF v_config IS NOT NULL AND v_config.is_active = false THEN RAISE EXCEPTION 'Staking is currently disabled'; END IF;

  SELECT * INTO v_account FROM user_staking_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staking account not found. Please deposit first.'; END IF;

  v_fee := p_amount * (COALESCE(v_config.staking_fee_percent, p_staking_fee_percent) / 100);
  v_net_staked := p_amount - v_fee;
  v_avail_before := v_account.available_balance;

  IF v_account.available_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_account.available_balance, p_amount;
  END IF;

  UPDATE user_staking_accounts
    SET available_balance = available_balance - p_amount,
        staked_balance = staked_balance + v_net_staked,
        updated_at = now()
    WHERE id = v_account.id;

  v_lock_until := now() + (v_plan.lock_period_days || ' days')::INTERVAL;

  INSERT INTO user_crypto_stakes (
    user_id, plan_id, staking_account_id, stake_amount, fee_paid,
    monthly_reward_percent, currency, status, staked_at, lock_until
  ) VALUES (
    p_user_id, p_plan_id, v_account.id, v_net_staked, v_fee,
    v_plan.monthly_reward_percent, v_plan.currency, 'active', now(), v_lock_until
  ) RETURNING id INTO v_stake_id;

  INSERT INTO crypto_staking_ledger (
    user_id, staking_account_id, stake_id, tx_type, amount, fee_amount,
    currency, balance_before, balance_after, notes, idempotency_key
  ) VALUES (
    p_user_id, v_account.id, v_stake_id, 'stake', v_net_staked, v_fee,
    v_plan.currency, v_avail_before, v_avail_before - p_amount,
    format('Staked %s (fee: %s) in plan: %s', v_net_staked, v_fee, v_plan.name),
    p_idempotency_key
  );

  RETURN jsonb_build_object(
    'success', true, 'stake_id', v_stake_id, 'net_staked', v_net_staked,
    'fee', v_fee, 'lock_until', v_lock_until, 'plan_name', v_plan.name
  );
END;
$$;

-- Recreate execute_staking_unstake with idempotency
CREATE OR REPLACE FUNCTION public.execute_staking_unstake(
  p_user_id UUID,
  p_stake_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
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
  v_existing RECORD;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM crypto_staking_ledger WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'duplicate', true, 'returned_amount', v_existing.amount);
    END IF;
  END IF;

  SELECT * INTO v_stake FROM user_crypto_stakes
    WHERE id = p_stake_id AND user_id = p_user_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active stake not found or already withdrawn'; END IF;

  IF v_stake.lock_until > now() THEN RAISE EXCEPTION 'Stake locked until %', v_stake.lock_until; END IF;

  SELECT * INTO v_config FROM crypto_staking_config LIMIT 1;
  v_unstaking_fee_pct := COALESCE(v_config.unstaking_fee_percent, 0.5);

  v_total_amount := v_stake.stake_amount + v_stake.total_rewards;
  v_fee := v_total_amount * (v_unstaking_fee_pct / 100);
  v_net_return := v_total_amount - v_fee;

  SELECT * INTO v_account FROM user_staking_accounts WHERE id = v_stake.staking_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staking account not found'; END IF;

  v_avail_before := v_account.available_balance;

  UPDATE user_staking_accounts
    SET available_balance = available_balance + v_net_return,
        staked_balance = GREATEST(0, staked_balance - v_stake.stake_amount),
        total_rewards_earned = total_rewards_earned + v_stake.total_rewards,
        updated_at = now()
    WHERE id = v_account.id;

  UPDATE user_crypto_stakes
    SET status = 'withdrawn', withdrawn_at = now(), updated_at = now()
    WHERE id = v_stake.id;

  INSERT INTO crypto_staking_ledger (
    user_id, staking_account_id, stake_id, tx_type, amount, fee_amount,
    currency, balance_before, balance_after, notes, idempotency_key
  ) VALUES (
    p_user_id, v_account.id, v_stake.id, 'unstake', v_net_return, v_fee,
    v_stake.currency, v_avail_before, v_avail_before + v_net_return,
    format('Unstaked %s + %s rewards (fee: %s)', v_stake.stake_amount, v_stake.total_rewards, v_fee),
    p_idempotency_key
  );

  RETURN jsonb_build_object(
    'success', true, 'returned_amount', v_net_return,
    'fee', v_fee, 'rewards_earned', v_stake.total_rewards
  );
END;
$$;

-- =============================================
-- 2. Reward distribution RPC (atomic per-stake)
-- =============================================
CREATE OR REPLACE FUNCTION public.distribute_staking_rewards_batch()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stake RECORD;
  v_account RECORD;
  v_daily_reward NUMERIC;
  v_today TEXT;
  v_idem_key TEXT;
  v_existing RECORD;
  v_total_distributed NUMERIC := 0;
  v_count INT := 0;
BEGIN
  v_today := to_char(now(), 'YYYY-MM-DD');

  FOR v_stake IN
    SELECT s.*, p.name as plan_name
    FROM user_crypto_stakes s
    JOIN crypto_staking_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
  LOOP
    -- Idempotency: one reward per stake per day
    v_idem_key := 'reward_' || v_stake.id || '_' || v_today;
    SELECT id INTO v_existing FROM crypto_staking_ledger WHERE idempotency_key = v_idem_key;
    IF FOUND THEN CONTINUE; END IF;

    -- Calculate daily reward from monthly_reward_percent
    v_daily_reward := v_stake.stake_amount * (v_stake.monthly_reward_percent / 100 / 30);

    IF v_daily_reward <= 0 THEN CONTINUE; END IF;

    -- Lock staking account
    SELECT * INTO v_account FROM user_staking_accounts WHERE id = v_stake.staking_account_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Credit reward to staked_balance (compounds)
    UPDATE user_staking_accounts
      SET staked_balance = staked_balance + v_daily_reward,
          total_rewards_earned = total_rewards_earned + v_daily_reward,
          updated_at = now()
      WHERE id = v_account.id;

    -- Update stake's total_rewards
    UPDATE user_crypto_stakes
      SET total_rewards = total_rewards + v_daily_reward,
          last_reward_at = now(),
          updated_at = now()
      WHERE id = v_stake.id;

    -- Ledger entry
    INSERT INTO crypto_staking_ledger (
      user_id, staking_account_id, stake_id, tx_type, amount, fee_amount,
      currency, balance_before, balance_after, notes, idempotency_key
    ) VALUES (
      v_stake.user_id, v_account.id, v_stake.id, 'reward', v_daily_reward, 0,
      v_stake.currency, v_account.staked_balance, v_account.staked_balance + v_daily_reward,
      format('Daily reward for %s (%s%%/mo)', v_stake.plan_name, v_stake.monthly_reward_percent),
      v_idem_key
    );

    v_total_distributed := v_total_distributed + v_daily_reward;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'rewards_distributed', v_total_distributed,
    'stakes_processed', v_count,
    'date', v_today
  );
END;
$$;

-- =============================================
-- 3. Auto-unstake RPC for expired locks
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_unstake_expired()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stake RECORD;
  v_account RECORD;
  v_config RECORD;
  v_fee_pct NUMERIC;
  v_total_amount NUMERIC;
  v_fee NUMERIC;
  v_net_return NUMERIC;
  v_count INT := 0;
  v_total_returned NUMERIC := 0;
BEGIN
  SELECT * INTO v_config FROM crypto_staking_config LIMIT 1;
  v_fee_pct := COALESCE(v_config.unstaking_fee_percent, 0.5);

  FOR v_stake IN
    SELECT * FROM user_crypto_stakes
    WHERE status = 'active' AND lock_until <= now()
    FOR UPDATE
  LOOP
    SELECT * INTO v_account FROM user_staking_accounts WHERE id = v_stake.staking_account_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_total_amount := v_stake.stake_amount + v_stake.total_rewards;
    v_fee := v_total_amount * (v_fee_pct / 100);
    v_net_return := v_total_amount - v_fee;

    UPDATE user_staking_accounts
      SET available_balance = available_balance + v_net_return,
          staked_balance = GREATEST(0, staked_balance - v_stake.stake_amount),
          total_rewards_earned = total_rewards_earned + v_stake.total_rewards,
          updated_at = now()
      WHERE id = v_account.id;

    UPDATE user_crypto_stakes
      SET status = 'withdrawn', withdrawn_at = now(), updated_at = now()
      WHERE id = v_stake.id;

    INSERT INTO crypto_staking_ledger (
      user_id, staking_account_id, stake_id, tx_type, amount, fee_amount,
      currency, balance_before, balance_after, notes, idempotency_key
    ) VALUES (
      v_stake.user_id, v_account.id, v_stake.id, 'auto_unstake', v_net_return, v_fee,
      v_stake.currency, v_account.available_balance, v_account.available_balance + v_net_return,
      format('Auto-unstake after lock expiry. Returned %s (fee: %s)', v_net_return, v_fee),
      'auto_unstake_' || v_stake.id || '_' || to_char(now(), 'YYYY-MM-DD')
    );

    v_count := v_count + 1;
    v_total_returned := v_total_returned + v_net_return;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'stakes_released', v_count,
    'total_returned', v_total_returned
  );
END;
$$;

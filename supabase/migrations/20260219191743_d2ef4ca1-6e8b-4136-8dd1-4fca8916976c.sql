-- 1. Update execute_early_unstake to use 5% penalty (was 10%)
CREATE OR REPLACE FUNCTION public.execute_early_unstake(
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
  v_penalty_pct NUMERIC := 0.05; -- 5% early exit penalty
  v_fee NUMERIC;
  v_net_return NUMERIC;
  v_idem_key TEXT;
BEGIN
  -- Idempotency key
  v_idem_key := COALESCE(p_idempotency_key, 'early_unstake_' || p_stake_id || '_' || extract(epoch from now())::bigint);

  -- Check for duplicate execution
  IF EXISTS (
    SELECT 1 FROM crypto_staking_ledger
    WHERE notes LIKE '%idempotency:' || v_idem_key || '%'
  ) THEN
    RAISE EXCEPTION 'Duplicate request: idempotency key already used';
  END IF;

  -- Lock and fetch stake
  SELECT * INTO v_stake
  FROM user_crypto_stakes
  WHERE id = p_stake_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stake not found or does not belong to user';
  END IF;

  IF v_stake.status != 'active' THEN
    RAISE EXCEPTION 'Stake is not active (status: %)', v_stake.status;
  END IF;

  IF v_stake.lock_until <= now() THEN
    RAISE EXCEPTION 'Lock period has already expired. Use normal unstake instead.';
  END IF;

  -- Lock and fetch staking account
  SELECT * INTO v_account
  FROM user_staking_accounts
  WHERE id = v_stake.staking_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staking account not found';
  END IF;

  -- Calculate penalty (5% of principal only, rewards fully forfeited)
  v_fee := ROUND(v_stake.stake_amount * v_penalty_pct, 8);
  v_net_return := v_stake.stake_amount - v_fee;

  -- Mark stake as early_exited
  UPDATE user_crypto_stakes
  SET 
    status = 'early_exited',
    withdrawn_at = now(),
    updated_at = now()
  WHERE id = p_stake_id;

  -- Return only principal minus penalty (rewards forfeited)
  UPDATE user_staking_accounts
  SET 
    available_balance = available_balance + v_net_return,
    staked_balance = GREATEST(0, staked_balance - (v_stake.stake_amount + v_stake.total_rewards)),
    updated_at = now()
  WHERE id = v_account.id;

  -- Ledger: credit net return
  INSERT INTO crypto_staking_ledger (
    user_id, staking_account_id, stake_id,
    tx_type, amount, fee_amount, currency,
    balance_before, balance_after,
    notes, metadata
  ) VALUES (
    p_user_id, v_account.id, p_stake_id,
    'early_unstake',
    v_net_return,
    v_fee,
    v_stake.currency,
    v_account.available_balance,
    v_account.available_balance + v_net_return,
    'Early exit - 5% penalty applied. Rewards forfeited. idempotency:' || v_idem_key,
    jsonb_build_object(
      'penalty_pct', v_penalty_pct,
      'penalty_amount', v_fee,
      'original_stake', v_stake.stake_amount,
      'rewards_forfeited', v_stake.total_rewards,
      'idempotency_key', v_idem_key
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'returned_amount', v_net_return,
    'penalty', v_fee,
    'penalty_percent', (v_penalty_pct * 100)::int,
    'rewards_forfeited', v_stake.total_rewards
  );
END;
$$;

-- 2. Add notification helper: insert user notification for staking events
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (edge functions)
DROP POLICY IF EXISTS "Service can insert notifications" ON public.user_notifications;
CREATE POLICY "Service can insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;

-- 3. Function: notify user when reward credited
CREATE OR REPLACE FUNCTION public.notify_staking_reward()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tx_type = 'reward' THEN
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'staking_reward',
      '✨ Staking Reward Credited',
      'You earned ' || ROUND(NEW.amount::numeric, 6) || ' IPG from staking rewards.',
      jsonb_build_object('amount', NEW.amount, 'stake_id', NEW.stake_id, 'ledger_id', NEW.id)
    );
  ELSIF NEW.tx_type = 'deposit' THEN
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'staking_deposit',
      '⬇️ IPG Deposit Detected',
      ROUND(NEW.amount::numeric, 6) || ' IPG has been credited to your staking account.',
      jsonb_build_object('amount', NEW.amount, 'tx_hash', NEW.tx_hash, 'ledger_id', NEW.id)
    );
  ELSIF NEW.tx_type = 'unstake' THEN
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'staking_unlocked',
      '🔓 Stake Unlocked & Returned',
      ROUND(NEW.amount::numeric, 6) || ' IPG has been returned to your staking balance.',
      jsonb_build_object('amount', NEW.amount, 'stake_id', NEW.stake_id, 'ledger_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staking_events ON public.crypto_staking_ledger;
CREATE TRIGGER trg_notify_staking_events
  AFTER INSERT ON public.crypto_staking_ledger
  FOR EACH ROW EXECUTE FUNCTION public.notify_staking_reward();


-- ============================================================
-- EXCHANGE-GRADE SECURITY HARDENING — PART 2 (tables + constraints)
-- ============================================================

-- 2. WITHDRAWAL RETRY QUEUE TABLE
CREATE TABLE IF NOT EXISTS public.withdrawal_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'failed_permanent', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(withdrawal_id)
);

ALTER TABLE public.withdrawal_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on retry queue"
  ON public.withdrawal_retry_queue FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_withdrawal_retry_status ON withdrawal_retry_queue(status, next_retry_at);

-- 3. DAILY RECONCILIATION SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS public.daily_reconciliation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  asset_symbol TEXT NOT NULL,
  total_available NUMERIC NOT NULL DEFAULT 0,
  total_locked NUMERIC NOT NULL DEFAULT 0,
  hot_wallet_balance NUMERIC,
  total_fees_collected NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawals_amount NUMERIC NOT NULL DEFAULT 0,
  drift_amount NUMERIC,
  reconciliation_status TEXT NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN ('balanced', 'drift_detected', 'pending', 'resolved')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(snapshot_date, asset_symbol)
);

ALTER TABLE public.daily_reconciliation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access snapshots"
  ON public.daily_reconciliation_snapshots FOR ALL USING (true);

-- 4. CONFIGURABLE DRIFT THRESHOLD
ALTER TABLE public.trading_engine_settings
  ADD COLUMN IF NOT EXISTS drift_threshold_percent NUMERIC NOT NULL DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS drift_absolute_minimum NUMERIC NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS auto_freeze_on_drift BOOLEAN NOT NULL DEFAULT true;

-- 5. UNIQUE CONSTRAINT ON CUSTODIAL DEPOSITS (tx_hash only — no log_index column)
CREATE UNIQUE INDEX IF NOT EXISTS idx_custodial_deposits_tx_unique
  ON custodial_deposits(tx_hash)
  WHERE tx_hash IS NOT NULL;

-- 6. DB-LEVEL WITHDRAWAL RATE LIMITING TABLE
CREATE TABLE IF NOT EXISTS public.withdrawal_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  withdrawal_count INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(user_id, window_start)
);

ALTER TABLE public.withdrawal_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access withdrawal rate limits"
  ON public.withdrawal_rate_limits FOR ALL USING (true);

-- 7. FULL PRE-WITHDRAWAL VALIDATION RPC (no stale bypass)
CREATE OR REPLACE FUNCTION public.validate_withdrawal_full(
  p_user_id UUID,
  p_withdrawal_id UUID,
  p_amount NUMERIC,
  p_asset_symbol TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id UUID;
  v_available NUMERIC;
  v_withdrawals_enabled BOOLEAN;
  v_daily_total NUMERIC;
  v_max_daily NUMERIC := 50000;
  v_max_per_hour INTEGER := 10;
  v_hourly_count INTEGER;
  v_drift_count INTEGER;
BEGIN
  -- 1. System-level check
  SELECT (value = 'true') INTO v_withdrawals_enabled
  FROM system_settings WHERE key = 'withdrawals_enabled';
  
  IF NOT COALESCE(v_withdrawals_enabled, true) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Withdrawals are currently disabled');
  END IF;

  -- 2. Asset lookup
  SELECT id INTO v_asset_id FROM assets WHERE symbol = p_asset_symbol;
  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Asset not found');
  END IF;

  -- 3. Balance check with row lock
  SELECT available INTO v_available
  FROM wallet_balances WHERE user_id = p_user_id AND asset_id = v_asset_id FOR UPDATE;
  
  IF COALESCE(v_available, 0) < p_amount THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Insufficient available balance');
  END IF;

  -- 4. Daily limit
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_total
  FROM withdrawals
  WHERE user_id = p_user_id AND created_at >= CURRENT_DATE
    AND status NOT IN ('failed', 'cancelled', 'refunded');
  
  IF v_daily_total + p_amount > v_max_daily THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Daily withdrawal limit exceeded');
  END IF;

  -- 5. Hourly rate limit
  SELECT COUNT(*) INTO v_hourly_count
  FROM withdrawals
  WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '1 hour'
    AND status NOT IN ('failed', 'cancelled', 'refunded');
  
  IF v_hourly_count >= v_max_per_hour THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Hourly withdrawal rate limit exceeded');
  END IF;

  -- 6. Drift check
  SELECT COUNT(*) INTO v_drift_count
  FROM daily_reconciliation_snapshots
  WHERE asset_symbol = p_asset_symbol
    AND reconciliation_status = 'drift_detected'
    AND snapshot_date >= CURRENT_DATE - 1;
  
  IF v_drift_count > 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Asset under reconciliation review');
  END IF;

  RETURN jsonb_build_object('valid', true);
END;
$$;

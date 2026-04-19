
-- ============================================================================
-- TRADING HOT WALLET SOLVENCY VERIFICATION & PERMANENT PREVENTION SYSTEM
-- ============================================================================

-- 1. REFILL HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.hot_wallet_refills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  asset_id UUID REFERENCES public.assets(id),
  expected_amount NUMERIC NOT NULL,
  detected_amount NUMERIC,
  tx_hash TEXT UNIQUE,
  from_address TEXT,
  block_number BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  shortfall_before NUMERIC,
  surplus_after NUMERIC,
  initiated_by UUID,
  notes TEXT,
  detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refills_status ON public.hot_wallet_refills(status, asset_symbol);
CREATE INDEX IF NOT EXISTS idx_refills_created ON public.hot_wallet_refills(created_at DESC);
ALTER TABLE public.hot_wallet_refills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage refills" ON public.hot_wallet_refills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. SOLVENCY SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.hot_wallet_solvency_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_symbol TEXT NOT NULL,
  user_available NUMERIC NOT NULL DEFAULT 0,
  user_locked NUMERIC NOT NULL DEFAULT 0,
  total_user_liability NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawals NUMERIC NOT NULL DEFAULT 0,
  platform_fees_owed NUMERIC NOT NULL DEFAULT 0,
  required_balance NUMERIC NOT NULL DEFAULT 0,
  actual_onchain_balance NUMERIC NOT NULL DEFAULT 0,
  surplus_or_deficit NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  drift_users_count INT DEFAULT 0,
  total_drift_amount NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solvency_snap_asset ON public.hot_wallet_solvency_snapshots(asset_symbol, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_solvency_snap_status ON public.hot_wallet_solvency_snapshots(status, snapshot_at DESC);
ALTER TABLE public.hot_wallet_solvency_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read solvency snapshots" ON public.hot_wallet_solvency_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins write solvency snapshots" ON public.hot_wallet_solvency_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. DRIFT REPAIR LEDGER
CREATE TABLE IF NOT EXISTS public.balance_drift_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  asset_symbol TEXT NOT NULL,
  before_available NUMERIC NOT NULL,
  before_locked NUMERIC NOT NULL,
  ledger_derived_available NUMERIC NOT NULL,
  ledger_derived_locked NUMERIC NOT NULL,
  after_available NUMERIC NOT NULL,
  after_locked NUMERIC NOT NULL,
  drift_available NUMERIC NOT NULL,
  drift_locked NUMERIC NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  ledger_entry_id UUID,
  repaired_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drift_repairs_batch ON public.balance_drift_repairs(batch_id);
CREATE INDEX IF NOT EXISTS idx_drift_repairs_user ON public.balance_drift_repairs(user_id, asset_symbol);
ALTER TABLE public.balance_drift_repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage drift repairs" ON public.balance_drift_repairs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. PLATFORM FEE LEDGER
CREATE TABLE IF NOT EXISTS public.platform_fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_symbol TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'accrued',
  swept_tx_hash TEXT,
  swept_to_address TEXT,
  swept_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_asset ON public.platform_fee_ledger(asset_symbol, status);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_created ON public.platform_fee_ledger(created_at DESC);
ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read fee ledger" ON public.platform_fee_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins write fee ledger" ON public.platform_fee_ledger FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update fee ledger" ON public.platform_fee_ledger FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- 5. COMPUTE TOKEN-WISE SOLVENCY
CREATE OR REPLACE FUNCTION public.compute_token_solvency(
  p_asset_symbol TEXT,
  p_actual_onchain_balance NUMERIC
)
RETURNS TABLE (
  asset_symbol TEXT,
  user_available NUMERIC,
  user_locked NUMERIC,
  total_user_liability NUMERIC,
  pending_withdrawals NUMERIC,
  platform_fees_owed NUMERIC,
  required_balance NUMERIC,
  actual_onchain_balance NUMERIC,
  surplus_or_deficit NUMERIC,
  status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avail NUMERIC := 0; v_lock NUMERIC := 0;
  v_pending NUMERIC := 0; v_fees NUMERIC := 0;
  v_required NUMERIC := 0; v_diff NUMERIC := 0; v_status TEXT;
BEGIN
  SELECT COALESCE(SUM(wb.available),0), COALESCE(SUM(wb.locked),0)
    INTO v_avail, v_lock
  FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id
  WHERE a.symbol = p_asset_symbol;

  SELECT COALESCE(SUM(w.amount),0) INTO v_pending
  FROM withdrawals w JOIN assets a ON a.id = w.asset_id
  WHERE a.symbol = p_asset_symbol
    AND w.status IN ('pending','processing','queued','broadcasting','approved');

  SELECT COALESCE(SUM(fee_amount),0) INTO v_fees
  FROM trading_fees_collected
  WHERE fee_asset = p_asset_symbol
    AND (status IN ('pending','collected') OR status IS NULL);

  v_required := v_avail + v_lock + v_pending + v_fees;
  v_diff := p_actual_onchain_balance - v_required;

  IF v_diff >= 0 THEN v_status := 'solvent';
  ELSIF v_required > 0 AND v_diff >= -0.0001 * v_required THEN v_status := 'warning';
  ELSE v_status := 'insolvent';
  END IF;

  RETURN QUERY SELECT p_asset_symbol, v_avail, v_lock, (v_avail + v_lock),
    v_pending, v_fees, v_required, p_actual_onchain_balance, v_diff, v_status;
END;
$$;

-- 6. WITHDRAWAL SOLVENCY GUARD
CREATE OR REPLACE FUNCTION public.check_withdrawal_solvency(
  p_asset_symbol TEXT,
  p_withdrawal_amount NUMERIC,
  p_actual_onchain_balance NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_required NUMERIC; v_after NUMERIC; v_breaker BOOLEAN := false;
BEGIN
  SELECT is_frozen INTO v_breaker
  FROM withdrawal_circuit_breaker
  WHERE asset_symbol = p_asset_symbol
  ORDER BY created_at DESC LIMIT 1;

  IF COALESCE(v_breaker, false) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'circuit_breaker_active',
      'message', 'Withdrawals temporarily paused for reconciliation.');
  END IF;

  SELECT required_balance INTO v_required
  FROM compute_token_solvency(p_asset_symbol, p_actual_onchain_balance);

  v_after := p_actual_onchain_balance - p_withdrawal_amount;

  IF v_after < (v_required - p_withdrawal_amount) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'insufficient_solvency',
      'required', v_required, 'after_balance', v_after,
      'message', 'Withdrawal would create hot wallet insolvency.');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'required', v_required,
    'after_balance', v_after, 'surplus', v_after - (v_required - p_withdrawal_amount));
END;
$$;

-- 7. REPAIR USER BALANCE DRIFT (ATOMIC, AUDITED)
CREATE OR REPLACE FUNCTION public.repair_user_balance_drift(
  p_user_id UUID,
  p_asset_symbol TEXT,
  p_decision TEXT,
  p_reason TEXT,
  p_batch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset_id UUID;
  v_before_avail NUMERIC; v_before_lock NUMERIC;
  v_ledger_avail NUMERIC; v_ledger_lock NUMERIC;
  v_after_avail NUMERIC; v_after_lock NUMERIC;
  v_ledger_entry_id UUID;
  v_admin UUID := auth.uid();
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT id INTO v_asset_id FROM assets WHERE symbol = p_asset_symbol;
  IF v_asset_id IS NULL THEN RAISE EXCEPTION 'Asset not found: %', p_asset_symbol; END IF;

  SELECT available, locked INTO v_before_avail, v_before_lock
  FROM wallet_balances
  WHERE user_id = p_user_id AND asset_id = v_asset_id
  FOR UPDATE;

  v_before_avail := COALESCE(v_before_avail, 0);
  v_before_lock := COALESCE(v_before_lock, 0);

  -- Compute ledger-derived balance from sum of deltas
  SELECT 
    COALESCE(SUM(delta_available), 0),
    COALESCE(SUM(delta_locked), 0)
  INTO v_ledger_avail, v_ledger_lock
  FROM trading_balance_ledger
  WHERE user_id = p_user_id AND asset_symbol = p_asset_symbol;

  IF p_decision = 'trust_balance_table' THEN
    v_after_avail := v_before_avail;
    v_after_lock := v_before_lock;

    INSERT INTO trading_balance_ledger (
      user_id, asset_symbol, delta_available, delta_locked,
      balance_available_after, balance_locked_after,
      entry_type, reference_type, reference_id, notes
    ) VALUES (
      p_user_id, p_asset_symbol,
      (v_before_avail - v_ledger_avail),
      (v_before_lock - v_ledger_lock),
      v_before_avail, v_before_lock,
      'reconciliation_adjustment', 'drift_repair', p_batch_id,
      'Drift repair (trust_balance): ' || p_reason
    ) RETURNING id INTO v_ledger_entry_id;

  ELSIF p_decision = 'trust_ledger' THEN
    v_after_avail := v_ledger_avail;
    v_after_lock := v_ledger_lock;

    UPDATE wallet_balances
    SET available = v_after_avail, locked = v_after_lock, updated_at = now()
    WHERE user_id = p_user_id AND asset_id = v_asset_id;

    INSERT INTO trading_balance_ledger (
      user_id, asset_symbol, delta_available, delta_locked,
      balance_available_after, balance_locked_after,
      entry_type, reference_type, reference_id, notes
    ) VALUES (
      p_user_id, p_asset_symbol,
      -(v_before_avail - v_ledger_avail),
      -(v_before_lock - v_ledger_lock),
      v_after_avail, v_after_lock,
      'reconciliation_adjustment', 'drift_repair', p_batch_id,
      'Drift repair (trust_ledger): ' || p_reason
    ) RETURNING id INTO v_ledger_entry_id;

  ELSE
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  INSERT INTO balance_drift_repairs (
    batch_id, user_id, asset_id, asset_symbol,
    before_available, before_locked,
    ledger_derived_available, ledger_derived_locked,
    after_available, after_locked,
    drift_available, drift_locked,
    decision, reason, ledger_entry_id, repaired_by
  ) VALUES (
    p_batch_id, p_user_id, v_asset_id, p_asset_symbol,
    v_before_avail, v_before_lock,
    v_ledger_avail, v_ledger_lock,
    v_after_avail, v_after_lock,
    (v_before_avail - v_ledger_avail), (v_before_lock - v_ledger_lock),
    p_decision, p_reason, v_ledger_entry_id, v_admin
  );

  RETURN jsonb_build_object('success', true,
    'before_available', v_before_avail, 'after_available', v_after_avail,
    'ledger_entry_id', v_ledger_entry_id);
END;
$$;

-- 8. CIRCUIT BREAKER MANAGEMENT
CREATE OR REPLACE FUNCTION public.set_withdrawal_circuit_breaker(
  p_asset_symbol TEXT, p_freeze BOOLEAN, p_reason TEXT,
  p_drift_amount NUMERIC DEFAULT NULL, p_drift_percent NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_admin UUID := auth.uid();
BEGIN
  IF v_admin IS NOT NULL AND NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF p_freeze THEN
    INSERT INTO withdrawal_circuit_breaker (asset_symbol, is_frozen, frozen_at, frozen_reason, drift_amount, drift_percent)
    VALUES (p_asset_symbol, true, now(), p_reason, p_drift_amount, p_drift_percent)
    RETURNING id INTO v_id;
  ELSE
    UPDATE withdrawal_circuit_breaker
    SET is_frozen = false, unfrozen_at = now(), unfrozen_by = v_admin, updated_at = now()
    WHERE asset_symbol = p_asset_symbol AND is_frozen = true
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- 9. FEE OWNERSHIP REPORT
CREATE OR REPLACE FUNCTION public.get_fee_ownership_report()
RETURNS TABLE (asset_symbol TEXT, accrued_fees NUMERIC, swept_fees NUMERIC, outstanding_fees NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT asset_symbol,
    COALESCE(SUM(amount) FILTER (WHERE status = 'accrued'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'swept'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status IN ('accrued','swept')), 0)
  FROM platform_fee_ledger GROUP BY asset_symbol ORDER BY asset_symbol;
$$;

-- 10. DETECT DRIFT USERS
CREATE OR REPLACE FUNCTION public.detect_balance_drift_users(p_asset_symbol TEXT)
RETURNS TABLE (
  user_id UUID, username TEXT, asset_symbol TEXT,
  table_available NUMERIC, table_locked NUMERIC,
  ledger_available NUMERIC, ledger_locked NUMERIC,
  drift_available NUMERIC, drift_locked NUMERIC, total_drift NUMERIC
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH bal AS (
    SELECT wb.user_id, wb.available, wb.locked
    FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id
    WHERE a.symbol = p_asset_symbol AND (wb.available > 0 OR wb.locked > 0)
  ),
  led AS (
    SELECT tbl.user_id,
      COALESCE(SUM(delta_available),0) as l_avail,
      COALESCE(SUM(delta_locked),0) as l_lock
    FROM trading_balance_ledger tbl
    WHERE tbl.asset_symbol = p_asset_symbol
    GROUP BY tbl.user_id
  )
  SELECT 
    bal.user_id,
    COALESCE(p.username, p.email, bal.user_id::text),
    p_asset_symbol,
    bal.available, bal.locked,
    COALESCE(led.l_avail, 0), COALESCE(led.l_lock, 0),
    bal.available - COALESCE(led.l_avail, 0),
    bal.locked - COALESCE(led.l_lock, 0),
    (bal.available + bal.locked) - (COALESCE(led.l_avail, 0) + COALESCE(led.l_lock, 0))
  FROM bal
  LEFT JOIN led ON led.user_id = bal.user_id
  LEFT JOIN profiles p ON p.user_id = bal.user_id
  WHERE ABS((bal.available + bal.locked) - (COALESCE(led.l_avail, 0) + COALESCE(led.l_lock, 0))) > 0.0001
  ORDER BY ABS((bal.available + bal.locked) - (COALESCE(led.l_avail, 0) + COALESCE(led.l_lock, 0))) DESC;
$$;

-- 11. RECORD A REFILL DETECTION
CREATE OR REPLACE FUNCTION public.record_hot_wallet_refill(
  p_wallet_address TEXT, p_asset_symbol TEXT,
  p_expected_amount NUMERIC, p_detected_amount NUMERIC,
  p_tx_hash TEXT, p_from_address TEXT, p_block_number BIGINT,
  p_shortfall_before NUMERIC, p_surplus_after NUMERIC, p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_asset_id UUID; v_status TEXT;
BEGIN
  SELECT id INTO v_asset_id FROM assets WHERE symbol = p_asset_symbol;
  IF p_detected_amount >= p_expected_amount * 0.999 THEN v_status := 'confirmed';
  ELSE v_status := 'mismatched'; END IF;
  INSERT INTO hot_wallet_refills (
    wallet_address, asset_symbol, asset_id, expected_amount, detected_amount,
    tx_hash, from_address, block_number, status, shortfall_before, surplus_after,
    initiated_by, notes, detected_at
  ) VALUES (
    p_wallet_address, p_asset_symbol, v_asset_id, p_expected_amount, p_detected_amount,
    p_tx_hash, p_from_address, p_block_number, v_status, p_shortfall_before, p_surplus_after,
    auth.uid(), p_notes, now()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

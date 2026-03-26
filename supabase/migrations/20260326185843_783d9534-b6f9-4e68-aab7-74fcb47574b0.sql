
-- ============================================================
-- FIX 4: USDT + USDI DRIFT CORRECTION
-- Root cause: Same class as BSK - OPENING_BALANCE inaccuracies
-- and pre-ledger fund movements. Wallet_balances = source of truth.
-- ============================================================

-- USDT corrections (7 users with drift > 0.001)
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes, created_at)
VALUES
  -- user 36a55640: wallet=1201.71, ledger=1179.30, drift=+22.41
  ('36a55640-da73-43a5-a544-93e5ec504e7c', 'USDT', 22.40995992, 0, 1201.70794767, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: pre-ledger historical balance not captured in OPENING_BALANCE', now()),
  -- user 767c05f3: wallet=1115.05, ledger=1098.49, drift=+16.55
  ('767c05f3-097c-403b-bf76-a56314e54dd8', 'USDT', 16.55304590, 0, 1115.04737412, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: pre-ledger historical balance not captured in OPENING_BALANCE', now()),
  -- user 00000000 (fees): wallet=163.43, ledger=157.85, drift=+5.58
  ('00000000-0000-0000-0000-000000000001', 'USDT', 5.57999000, 0, 163.43086952, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: fee account pre-ledger delta', now()),
  -- user da546ee5: wallet=232.51, ledger=232.01, drift=+0.50
  ('da546ee5-d918-42df-9255-dcd8c83b08c9', 'USDT', 0.49999999, 0, 232.51032047, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: pre-ledger historical balance', now()),
  -- user 25dff29c: wallet=32.22, ledger=32.22, drift=-0.007
  ('25dff29c-fef3-4ee9-b1f4-957685feafc3', 'USDT', -0.00700000, 0, 32.21720335, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: rounding artifact from historical transactions', now()),
  -- user 9751f40e: wallet=242.37, ledger=244.37, drift=-2.0
  ('9751f40e-b9d8-41f1-856e-bedd9a44fd55', 'USDT', -1.99999293, 0, 242.36777219, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: ledger overstated vs actual wallet', now()),
  -- user ea2f73fa: wallet=0, ledger=2.0002, drift=-2.0002
  ('ea2f73fa-3ad5-48d5-8f3c-ebfbb183087d', 'USDT', -2.00020002, 0, 0, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: user withdrew/transferred funds outside ledger era', now());

-- USDI correction (1 user)
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes, created_at)
VALUES
  -- user 7cb086ff: wallet=0, ledger=2.0, drift=-2.0
  ('7cb086ff-369a-45e9-bb94-3d394177ff30', 'USDI', -2.00000000, 0, 0, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Drift correction: user withdrew/transferred funds outside ledger era', now());

-- ============================================================
-- FIX 5: PATCH validate_withdrawal_full TO CHECK CIRCUIT BREAKER
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_withdrawal_full(
  p_user_id UUID,
  p_asset_symbol TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
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
  v_is_frozen BOOLEAN;
BEGIN
  -- 0. Circuit breaker check (HIGHEST PRIORITY)
  SELECT is_frozen INTO v_is_frozen
  FROM withdrawal_circuit_breaker
  WHERE asset_symbol = p_asset_symbol;
  
  IF v_is_frozen IS TRUE THEN
    RETURN jsonb_build_object('valid', false, 'reason', format('Withdrawals for %s are frozen by circuit breaker due to detected solvency drift', p_asset_symbol));
  END IF;

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

  -- 6. Drift check (legacy)
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

-- ============================================================
-- FIX 6: ALERTING - Stuck deposit/withdrawal monitoring function
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_stuck_transfers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stuck_deposits INTEGER;
  v_stuck_withdrawals INTEGER;
  v_result JSONB;
BEGIN
  -- Check deposits pending > 1 hour
  SELECT COUNT(*) INTO v_stuck_deposits
  FROM custodial_deposits
  WHERE status = 'pending' AND created_at < now() - interval '1 hour';

  -- Check withdrawals processing > 30 min
  SELECT COUNT(*) INTO v_stuck_withdrawals
  FROM withdrawals
  WHERE status = 'processing' AND created_at < now() - interval '30 minutes';

  -- Alert for stuck deposits
  IF v_stuck_deposits > 0 THEN
    INSERT INTO admin_notifications (type, priority, title, message)
    VALUES (
      'stuck_transfer', 'high',
      format('⚠️ %s Deposits Stuck > 1 Hour', v_stuck_deposits),
      format('%s deposits have been pending for over 1 hour. Manual review required.', v_stuck_deposits)
    );
  END IF;

  -- Alert for stuck withdrawals
  IF v_stuck_withdrawals > 0 THEN
    INSERT INTO admin_notifications (type, priority, title, message)
    VALUES (
      'stuck_transfer', 'high',
      format('⚠️ %s Withdrawals Stuck > 30 Min', v_stuck_withdrawals),
      format('%s withdrawals have been processing for over 30 minutes. Check hot wallet and broadcast status.', v_stuck_withdrawals)
    );
  END IF;

  v_result := jsonb_build_object(
    'stuck_deposits', v_stuck_deposits,
    'stuck_withdrawals', v_stuck_withdrawals,
    'checked_at', now()
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- FIX 6b: Full reconciliation check function (for cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_full_reconciliation_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset RECORD;
  v_total_wallet NUMERIC;
  v_total_ledger NUMERIC;
  v_drift NUMERIC;
  v_drift_percent NUMERIC;
  v_results JSONB := '[]'::JSONB;
BEGIN
  FOR v_asset IN SELECT DISTINCT symbol FROM assets WHERE is_active = true AND symbol IN ('BSK', 'USDT', 'USDI', 'IPG')
  LOOP
    SELECT COALESCE(SUM(available + locked), 0)
    INTO v_total_wallet
    FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id
    WHERE a.symbol = v_asset.symbol;

    SELECT COALESCE(SUM(delta_available + delta_locked), 0)
    INTO v_total_ledger
    FROM trading_balance_ledger
    WHERE asset_symbol = v_asset.symbol;

    v_drift := ABS(v_total_wallet - v_total_ledger);
    v_drift_percent := CASE WHEN v_total_wallet > 0 THEN (v_drift / v_total_wallet) * 100 ELSE 0 END;

    v_results := v_results || jsonb_build_object(
      'asset', v_asset.symbol,
      'wallet_total', ROUND(v_total_wallet, 8),
      'ledger_total', ROUND(v_total_ledger, 8),
      'drift', ROUND(v_drift, 8),
      'drift_percent', ROUND(v_drift_percent, 6),
      'status', CASE WHEN v_drift_percent > 0.01 AND v_drift > 1 THEN 'DRIFT_DETECTED' ELSE 'OK' END
    );

    -- Auto-freeze if drift exceeds threshold
    IF v_drift_percent > 0.01 AND v_drift > 1 THEN
      PERFORM check_solvency_before_withdrawal(v_asset.symbol);
    END IF;
  END LOOP;

  -- Also check stuck transfers
  PERFORM check_stuck_transfers();

  RETURN jsonb_build_object('reconciliation', v_results, 'checked_at', now());
END;
$$;

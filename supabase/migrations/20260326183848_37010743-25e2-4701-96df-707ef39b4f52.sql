
-- ============================================================
-- FIX 1: SOLVENCY AUTO-FREEZE — CREATE CIRCUIT BREAKER TABLE
-- ============================================================

-- Create a dedicated circuit breaker table for withdrawal freezes
CREATE TABLE IF NOT EXISTS public.withdrawal_circuit_breaker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_symbol TEXT NOT NULL,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_at TIMESTAMPTZ,
  frozen_reason TEXT,
  drift_amount NUMERIC,
  drift_percent NUMERIC,
  unfrozen_at TIMESTAMPTZ,
  unfrozen_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_symbol)
);

ALTER TABLE public.withdrawal_circuit_breaker ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write
CREATE POLICY "Service role full access" ON public.withdrawal_circuit_breaker
  FOR ALL USING (false);

-- Seed rows for each active trading asset
INSERT INTO public.withdrawal_circuit_breaker (asset_symbol, is_frozen)
VALUES ('BSK', false), ('USDT', false), ('USDI', false), ('IPG', false)
ON CONFLICT (asset_symbol) DO NOTHING;

-- ============================================================
-- FIX 1b: PATCH check_solvency_before_withdrawal RPC
-- Now writes to the real withdrawal_circuit_breaker table
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_solvency_before_withdrawal(
  p_asset_symbol TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_internal NUMERIC;
  v_total_ledger NUMERIC;
  v_drift NUMERIC;
  v_drift_percent NUMERIC;
  v_threshold_percent NUMERIC := 0.01; -- 0.01%
  v_is_frozen BOOLEAN;
BEGIN
  -- Check if already frozen
  SELECT is_frozen INTO v_is_frozen
  FROM withdrawal_circuit_breaker
  WHERE asset_symbol = p_asset_symbol;

  IF v_is_frozen IS TRUE THEN
    RETURN jsonb_build_object(
      'solvent', false,
      'drift', 0,
      'drift_percent', 0,
      'action', 'already_frozen',
      'message', format('Withdrawals for %s are frozen by circuit breaker', p_asset_symbol)
    );
  END IF;

  -- Get total internal balances
  SELECT COALESCE(SUM(available + locked), 0)
  INTO v_total_internal
  FROM wallet_balances wb
  JOIN assets a ON a.id = wb.asset_id
  WHERE a.symbol = p_asset_symbol;
  
  -- Get total ledger sum
  SELECT COALESCE(SUM(delta_available + delta_locked), 0)
  INTO v_total_ledger
  FROM trading_balance_ledger
  WHERE asset_symbol = p_asset_symbol;
  
  v_drift := ABS(v_total_internal - v_total_ledger);
  v_drift_percent := CASE WHEN v_total_internal > 0 
    THEN (v_drift / v_total_internal) * 100 
    ELSE 0 END;
  
  -- Check if drift exceeds threshold
  IF v_drift_percent > v_threshold_percent AND v_drift > 1 THEN
    -- FREEZE withdrawals for this asset via circuit breaker
    INSERT INTO withdrawal_circuit_breaker (asset_symbol, is_frozen, frozen_at, frozen_reason, drift_amount, drift_percent, updated_at)
    VALUES (p_asset_symbol, true, now(), 
            format('Auto-frozen: drift=%s (%s%%)', v_drift::TEXT, ROUND(v_drift_percent, 4)::TEXT),
            v_drift, v_drift_percent, now())
    ON CONFLICT (asset_symbol) 
    DO UPDATE SET 
      is_frozen = true, 
      frozen_at = now(),
      frozen_reason = format('Auto-frozen: drift=%s (%s%%)', v_drift::TEXT, ROUND(v_drift_percent, 4)::TEXT),
      drift_amount = v_drift,
      drift_percent = v_drift_percent,
      updated_at = now();
    
    -- Log critical alert
    INSERT INTO security_audit_log (event_type, severity, source, details)
    VALUES (
      'SOLVENCY_DRIFT_DETECTED',
      'critical',
      'check_solvency_before_withdrawal',
      jsonb_build_object(
        'asset', p_asset_symbol,
        'total_internal', v_total_internal,
        'total_ledger', v_total_ledger,
        'drift', v_drift,
        'drift_percent', v_drift_percent,
        'action', 'withdrawals_frozen_via_circuit_breaker'
      )
    );
    
    -- Admin notification
    INSERT INTO admin_notifications (type, priority, title, message)
    VALUES (
      'solvency_alert',
      'critical',
      format('CIRCUIT BREAKER: %s Withdrawals Frozen', p_asset_symbol),
      format('Asset %s drift: %s (%s%%). Internal=%s, Ledger=%s. Withdrawals auto-frozen.',
        p_asset_symbol, ROUND(v_drift, 4)::TEXT, ROUND(v_drift_percent, 4)::TEXT, 
        ROUND(v_total_internal, 4)::TEXT, ROUND(v_total_ledger, 4)::TEXT)
    );
    
    RETURN jsonb_build_object(
      'solvent', false,
      'drift', v_drift,
      'drift_percent', v_drift_percent,
      'action', 'withdrawals_frozen_via_circuit_breaker'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'solvent', true,
    'drift', v_drift,
    'drift_percent', v_drift_percent
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_solvency_before_withdrawal FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_solvency_before_withdrawal TO service_role;

-- ============================================================
-- FIX 1c: Admin unfreeze function (manual override)
-- ============================================================

CREATE OR REPLACE FUNCTION public.unfreeze_withdrawals(
  p_asset_symbol TEXT,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE withdrawal_circuit_breaker
  SET is_frozen = false, 
      unfrozen_at = now(), 
      unfrozen_by = p_admin_user_id,
      frozen_reason = frozen_reason || ' | Unfrozen by admin',
      updated_at = now()
  WHERE asset_symbol = p_asset_symbol AND is_frozen = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not frozen or not found');
  END IF;

  INSERT INTO security_audit_log (event_type, severity, source, details)
  VALUES ('WITHDRAWAL_UNFREEZE', 'high', 'unfreeze_withdrawals',
    jsonb_build_object('asset', p_asset_symbol, 'admin_id', p_admin_user_id));

  INSERT INTO admin_notifications (type, priority, title, message)
  VALUES ('solvency_alert', 'high',
    format('%s Withdrawals Unfrozen', p_asset_symbol),
    format('Admin %s unfroze withdrawals for %s', p_admin_user_id::TEXT, p_asset_symbol));

  RETURN jsonb_build_object('success', true, 'asset', p_asset_symbol, 'status', 'unfrozen');
END;
$$;

REVOKE ALL ON FUNCTION public.unfreeze_withdrawals FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unfreeze_withdrawals TO service_role;


-- Daily reconciliation snapshots table
CREATE TABLE IF NOT EXISTS public.daily_trading_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  asset_symbol TEXT NOT NULL,
  ledger_available NUMERIC NOT NULL DEFAULT 0,
  ledger_locked NUMERIC NOT NULL DEFAULT 0,
  table_available NUMERIC NOT NULL DEFAULT 0,
  table_locked NUMERIC NOT NULL DEFAULT 0,
  available_drift NUMERIC NOT NULL DEFAULT 0,
  locked_drift NUMERIC NOT NULL DEFAULT 0,
  total_drift NUMERIC NOT NULL DEFAULT 0,
  total_inflows NUMERIC NOT NULL DEFAULT 0,
  total_outflows NUMERIC NOT NULL DEFAULT 0,
  fees_collected NUMERIC NOT NULL DEFAULT 0,
  user_liability NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawals NUMERIC NOT NULL DEFAULT 0,
  platform_fee_balance NUMERIC NOT NULL DEFAULT 0,
  discrepancy_user_count INT NOT NULL DEFAULT 0,
  discrepancy_users JSONB DEFAULT '[]'::jsonb,
  circuit_breaker_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_date, asset_symbol)
);

ALTER TABLE public.daily_trading_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view reconciliation snapshots"
ON public.daily_trading_reconciliation FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Circuit breaker log table
CREATE TABLE IF NOT EXISTS public.reconciliation_circuit_breaker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_symbol TEXT NOT NULL,
  drift_amount NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL DEFAULT 500,
  triggered_action TEXT NOT NULL DEFAULT 'freeze_withdrawals',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_circuit_breaker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view circuit breaker logs"
ON public.reconciliation_circuit_breaker FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RPC function: run_daily_trading_reconciliation
CREATE OR REPLACE FUNCTION public.run_daily_trading_reconciliation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_row RECORD;
  v_cb_triggered BOOLEAN := false;
  v_threshold NUMERIC := 500;
  v_discrepancy_users JSONB;
  v_disc_count INT;
BEGIN
  -- For each active token with any balance or ledger activity
  FOR v_row IN
    WITH ledger_agg AS (
      SELECT 
        asset_symbol,
        SUM(delta_available) as ledger_available,
        SUM(delta_locked) as ledger_locked,
        SUM(CASE WHEN entry_type IN ('DEPOSIT', 'OPENING_BALANCE', 'ADJUSTMENT', 'REFUND', 'FILL_CREDIT', 'FEE_CREDIT') AND delta_available > 0 THEN delta_available ELSE 0 END) as total_inflows,
        SUM(CASE WHEN entry_type IN ('WITHDRAWAL', 'WITHDRAWAL_QUEUED') THEN ABS(delta_available) ELSE 0 END) as total_outflows,
        SUM(CASE WHEN entry_type = 'FEE_CREDIT' THEN delta_available ELSE 0 END) as fees_collected
      FROM trading_balance_ledger
      GROUP BY asset_symbol
    ),
    balance_agg AS (
      SELECT 
        a.symbol as asset_symbol,
        SUM(CASE WHEN wb.user_id != '00000000-0000-0000-0000-000000000001' THEN wb.available ELSE 0 END) as table_available,
        SUM(CASE WHEN wb.user_id != '00000000-0000-0000-0000-000000000001' THEN wb.locked ELSE 0 END) as table_locked,
        SUM(CASE WHEN wb.user_id = '00000000-0000-0000-0000-000000000001' THEN wb.available ELSE 0 END) as platform_fee_balance
      FROM wallet_balances wb
      JOIN assets a ON a.id = wb.asset_id
      GROUP BY a.symbol
    ),
    pending_wd AS (
      SELECT asset_symbol, COALESCE(SUM(amount), 0) as pending_amount
      FROM internal_balance_transfers
      WHERE direction = 'to_wallet' AND status = 'pending'
      GROUP BY asset_symbol
    )
    SELECT 
      COALESCE(l.asset_symbol, b.asset_symbol) as asset_symbol,
      COALESCE(l.ledger_available, 0) as ledger_available,
      COALESCE(l.ledger_locked, 0) as ledger_locked,
      COALESCE(b.table_available, 0) as table_available,
      COALESCE(b.table_locked, 0) as table_locked,
      COALESCE(b.table_available, 0) - COALESCE(l.ledger_available, 0) as available_drift,
      COALESCE(b.table_locked, 0) - COALESCE(l.ledger_locked, 0) as locked_drift,
      (COALESCE(b.table_available, 0) + COALESCE(b.table_locked, 0)) - (COALESCE(l.ledger_available, 0) + COALESCE(l.ledger_locked, 0)) as total_drift,
      COALESCE(l.total_inflows, 0) as total_inflows,
      COALESCE(l.total_outflows, 0) as total_outflows,
      COALESCE(l.fees_collected, 0) as fees_collected,
      COALESCE(b.table_available, 0) + COALESCE(b.table_locked, 0) as user_liability,
      COALESCE(p.pending_amount, 0) as pending_withdrawals,
      COALESCE(b.platform_fee_balance, 0) as platform_fee_balance
    FROM ledger_agg l
    FULL OUTER JOIN balance_agg b ON l.asset_symbol = b.asset_symbol
    LEFT JOIN pending_wd p ON p.asset_symbol = COALESCE(l.asset_symbol, b.asset_symbol)
    WHERE COALESCE(l.ledger_available, 0) != 0 
       OR COALESCE(b.table_available, 0) != 0
       OR COALESCE(b.table_locked, 0) != 0
  LOOP
    -- Find affected users for this token
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', sub.user_id,
      'drift', sub.drift
    )), COUNT(*)
    INTO v_discrepancy_users, v_disc_count
    FROM (
      SELECT 
        tbl.user_id,
        (COALESCE(wb.available, 0) + COALESCE(wb.locked, 0)) - (SUM(tbl.delta_available) + SUM(tbl.delta_locked)) as drift
      FROM trading_balance_ledger tbl
      JOIN assets a ON a.symbol = tbl.asset_symbol
      LEFT JOIN wallet_balances wb ON wb.user_id = tbl.user_id AND wb.asset_id = a.id
      WHERE tbl.asset_symbol = v_row.asset_symbol
      GROUP BY tbl.user_id, wb.available, wb.locked
      HAVING ABS((COALESCE(wb.available, 0) + COALESCE(wb.locked, 0)) - (SUM(tbl.delta_available) + SUM(tbl.delta_locked))) > 0.001
    ) sub;

    -- Insert snapshot
    INSERT INTO daily_trading_reconciliation (
      run_date, asset_symbol, ledger_available, ledger_locked, table_available, table_locked,
      available_drift, locked_drift, total_drift, total_inflows, total_outflows, fees_collected,
      user_liability, pending_withdrawals, platform_fee_balance,
      discrepancy_user_count, discrepancy_users, circuit_breaker_triggered
    ) VALUES (
      CURRENT_DATE, v_row.asset_symbol, v_row.ledger_available, v_row.ledger_locked,
      v_row.table_available, v_row.table_locked,
      v_row.available_drift, v_row.locked_drift, v_row.total_drift,
      v_row.total_inflows, v_row.total_outflows, v_row.fees_collected,
      v_row.user_liability, v_row.pending_withdrawals, v_row.platform_fee_balance,
      COALESCE(v_disc_count, 0), COALESCE(v_discrepancy_users, '[]'::jsonb),
      ABS(v_row.total_drift) > v_threshold
    )
    ON CONFLICT (run_date, asset_symbol) DO UPDATE SET
      ledger_available = EXCLUDED.ledger_available,
      ledger_locked = EXCLUDED.ledger_locked,
      table_available = EXCLUDED.table_available,
      table_locked = EXCLUDED.table_locked,
      available_drift = EXCLUDED.available_drift,
      locked_drift = EXCLUDED.locked_drift,
      total_drift = EXCLUDED.total_drift,
      total_inflows = EXCLUDED.total_inflows,
      total_outflows = EXCLUDED.total_outflows,
      fees_collected = EXCLUDED.fees_collected,
      user_liability = EXCLUDED.user_liability,
      pending_withdrawals = EXCLUDED.pending_withdrawals,
      platform_fee_balance = EXCLUDED.platform_fee_balance,
      discrepancy_user_count = EXCLUDED.discrepancy_user_count,
      discrepancy_users = EXCLUDED.discrepancy_users,
      circuit_breaker_triggered = EXCLUDED.circuit_breaker_triggered,
      created_at = now();

    -- Circuit breaker
    IF ABS(v_row.total_drift) > v_threshold THEN
      v_cb_triggered := true;
      INSERT INTO reconciliation_circuit_breaker (asset_symbol, drift_amount, threshold, triggered_action)
      VALUES (v_row.asset_symbol, v_row.total_drift, v_threshold, 'freeze_withdrawals');
    END IF;

    v_result := v_result || jsonb_build_object(
      'asset', v_row.asset_symbol,
      'total_drift', v_row.total_drift,
      'discrepancy_users', COALESCE(v_disc_count, 0),
      'circuit_breaker', ABS(v_row.total_drift) > v_threshold
    );
  END LOOP;

  -- If circuit breaker triggered, freeze withdrawals
  IF v_cb_triggered THEN
    UPDATE system_settings SET value = 'false', updated_at = now() WHERE key = 'withdrawals_enabled';
    
    INSERT INTO security_audit_log (event_type, actor_id, details)
    VALUES ('RECONCILIATION_CIRCUIT_BREAKER', '00000000-0000-0000-0000-000000000001', jsonb_build_object(
      'reason', 'Daily reconciliation detected drift exceeding threshold',
      'results', v_result
    ));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'run_date', CURRENT_DATE,
    'circuit_breaker_triggered', v_cb_triggered,
    'tokens', v_result
  );
END;
$$;

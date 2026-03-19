
-- ============================================================
-- PHASE 1: DEPOSIT SECURITY HARDENING
-- ============================================================

-- 1a. UNIQUE constraint on custodial_deposits.tx_hash (prevent double-credit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_custodial_deposits_tx_hash_unique 
  ON public.custodial_deposits (tx_hash) 
  WHERE tx_hash IS NOT NULL;

-- 1b. Block frontend/authenticated users from inserting into custodial_deposits
-- Only service_role / SECURITY DEFINER functions can insert
CREATE OR REPLACE FUNCTION public.guard_custodial_deposits_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role, postgres, superuser
  IF current_setting('role', true) IN ('service_role', 'supabase_admin')
     OR current_setting('is_superuser', true) = 'on'
     OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Direct inserts into custodial_deposits are forbidden. Use server-side deposit monitor.';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_custodial_deposits_insert ON public.custodial_deposits;
CREATE TRIGGER trg_guard_custodial_deposits_insert
  BEFORE INSERT ON public.custodial_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_custodial_deposits_insert();

-- 1c. Block direct inserts into wallet_balances by authenticated users
-- (reinforces existing trg_guard_wallet_balance if present)
CREATE OR REPLACE FUNCTION public.guard_wallet_balances_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'supabase_admin')
     OR current_setting('is_superuser', true) = 'on'
     OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Direct modifications to wallet_balances are forbidden. Use authorized RPCs only.';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_wallet_balances_insert ON public.wallet_balances;
CREATE TRIGGER trg_guard_wallet_balances_insert
  BEFORE INSERT OR UPDATE ON public.wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_wallet_balances_insert();

-- ============================================================
-- PHASE 5: AUDIT TRAIL LOCKDOWN
-- ============================================================

-- 5a. trading_balance_ledger: append-only (no UPDATE or DELETE)
CREATE OR REPLACE FUNCTION public.guard_trading_ledger_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'trading_balance_ledger is append-only. UPDATE and DELETE are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS trg_trading_ledger_no_update ON public.trading_balance_ledger;
CREATE TRIGGER trg_trading_ledger_no_update
  BEFORE UPDATE OR DELETE ON public.trading_balance_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_trading_ledger_immutable();

-- 5b. trading_balance_ledger: only SECURITY DEFINER / service_role can insert
CREATE OR REPLACE FUNCTION public.guard_trading_ledger_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'supabase_admin')
     OR current_setting('is_superuser', true) = 'on'
     OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Direct inserts into trading_balance_ledger are forbidden. Use authorized RPCs only.';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_trading_ledger_insert ON public.trading_balance_ledger;
CREATE TRIGGER trg_guard_trading_ledger_insert
  BEFORE INSERT ON public.trading_balance_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_trading_ledger_insert();

-- 5c. custodial_deposits: immutable after credited
CREATE OR REPLACE FUNCTION public.guard_custodial_deposits_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If record is already credited, block any modification
  IF OLD.status = 'credited' THEN
    RAISE EXCEPTION 'custodial_deposits records are immutable after status=credited';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_custodial_deposits_immutable ON public.custodial_deposits;
CREATE TRIGGER trg_guard_custodial_deposits_immutable
  BEFORE UPDATE ON public.custodial_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_custodial_deposits_immutable();

-- 5d. trading_fees_collected: insert-only
CREATE OR REPLACE FUNCTION public.guard_trading_fees_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'trading_fees_collected is insert-only. UPDATE and DELETE are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS trg_trading_fees_no_modify ON public.trading_fees_collected;
CREATE TRIGGER trg_trading_fees_no_modify
  BEFORE UPDATE OR DELETE ON public.trading_fees_collected
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_trading_fees_immutable();

-- 5e. trading_fees_collected: only service_role can insert
CREATE OR REPLACE FUNCTION public.guard_trading_fees_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'supabase_admin')
     OR current_setting('is_superuser', true) = 'on'
     OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Direct inserts into trading_fees_collected are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_trading_fees_insert ON public.trading_fees_collected;
CREATE TRIGGER trg_guard_trading_fees_insert
  BEFORE INSERT ON public.trading_fees_collected
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_trading_fees_insert();

-- ============================================================
-- PHASE 3: CONCURRENCY SAFETY — CHECK constraints
-- ============================================================

-- Ensure available and locked can never go negative
DO $$
BEGIN
  -- Add CHECK constraint if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wallet_balances_available_non_negative' 
    AND conrelid = 'public.wallet_balances'::regclass
  ) THEN
    ALTER TABLE public.wallet_balances ADD CONSTRAINT wallet_balances_available_non_negative CHECK (available >= 0);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wallet_balances_locked_non_negative' 
    AND conrelid = 'public.wallet_balances'::regclass
  ) THEN
    ALTER TABLE public.wallet_balances ADD CONSTRAINT wallet_balances_locked_non_negative CHECK (locked >= 0);
  END IF;
END $$;

-- ============================================================
-- PHASE 4: DAILY RECONCILIATION SNAPSHOTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_reconciliation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  asset_symbol TEXT NOT NULL,
  total_internal_available NUMERIC NOT NULL DEFAULT 0,
  total_internal_locked NUMERIC NOT NULL DEFAULT 0,
  total_ledger_sum NUMERIC NOT NULL DEFAULT 0,
  hot_wallet_balance NUMERIC,
  total_fees_collected NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawals_sum NUMERIC NOT NULL DEFAULT 0,
  drift_amount NUMERIC NOT NULL DEFAULT 0,
  drift_percent NUMERIC NOT NULL DEFAULT 0,
  solvency_status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, asset_symbol)
);

ALTER TABLE public.daily_reconciliation_snapshots ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write snapshots
CREATE POLICY "Service role only" ON public.daily_reconciliation_snapshots
  FOR ALL USING (false);

-- ============================================================
-- PHASE 2: SERIALIZABLE ISOLATION WRAPPER FOR execute_trade
-- ============================================================

-- Create a wrapper that sets serializable isolation and retries on serialization failure
CREATE OR REPLACE FUNCTION public.execute_trade_serializable(
  p_buy_order_id UUID,
  p_sell_order_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_symbol TEXT,
  p_base_asset TEXT,
  p_quote_asset TEXT,
  p_base_amount NUMERIC,
  p_quote_amount NUMERIC,
  p_buyer_fee NUMERIC,
  p_seller_fee NUMERIC,
  p_trading_type TEXT DEFAULT 'spot'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade_id UUID;
  v_attempt INT := 0;
  v_max_retries INT := 3;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    BEGIN
      -- Set serializable isolation for this transaction
      SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
      
      -- Delegate to the existing execute_trade function
      SELECT public.execute_trade(
        p_buy_order_id, p_sell_order_id,
        p_buyer_id, p_seller_id,
        p_symbol, p_base_asset, p_quote_asset,
        p_base_amount, p_quote_amount,
        p_buyer_fee, p_seller_fee,
        p_trading_type
      ) INTO v_trade_id;
      
      RETURN v_trade_id;
      
    EXCEPTION
      WHEN serialization_failure OR deadlock_detected THEN
        IF v_attempt >= v_max_retries THEN
          RAISE EXCEPTION 'Trade failed after % serialization retries for orders % / %', 
            v_max_retries, p_buy_order_id, p_sell_order_id;
        END IF;
        -- Brief pause before retry
        PERFORM pg_sleep(0.1 * v_attempt);
    END;
  END LOOP;
END;
$$;

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION public.execute_trade_serializable FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_trade_serializable TO service_role;

-- ============================================================
-- PHASE 4: SOLVENCY CHECK RPC (enhanced validate_withdrawal_full)
-- ============================================================

-- Create/replace the solvency enforcement function
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
  v_threshold_percent NUMERIC := 0.01; -- 0.01% threshold
  v_withdrawals_enabled BOOLEAN;
BEGIN
  -- Get total internal balances for this asset
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
    -- Auto-freeze withdrawals
    UPDATE system_settings 
    SET withdrawals_enabled = false, 
        updated_at = now()
    WHERE id = (SELECT id FROM system_settings LIMIT 1);
    
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
        'action', 'withdrawals_frozen'
      )
    );
    
    -- Admin notification
    INSERT INTO admin_notifications (type, priority, title, message)
    VALUES (
      'solvency_alert',
      'critical',
      'SOLVENCY DRIFT — Withdrawals Auto-Frozen',
      format('Asset %s drift: %s (%s%%). Internal=%s, Ledger=%s. Withdrawals disabled.',
        p_asset_symbol, v_drift::TEXT, v_drift_percent::TEXT, v_total_internal::TEXT, v_total_ledger::TEXT)
    );
    
    RETURN jsonb_build_object(
      'solvent', false,
      'drift', v_drift,
      'drift_percent', v_drift_percent,
      'action', 'withdrawals_frozen'
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
-- RLS: Revoke direct INSERT on critical tables from anon/authenticated
-- ============================================================

-- Ensure no INSERT policies exist for authenticated on custodial_deposits
DROP POLICY IF EXISTS "Users can insert own deposits" ON public.custodial_deposits;
DROP POLICY IF EXISTS "Users can insert custodial deposits" ON public.custodial_deposits;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.custodial_deposits;

-- Ensure no INSERT policies on trading_balance_ledger for authenticated
DROP POLICY IF EXISTS "Users can insert ledger entries" ON public.trading_balance_ledger;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.trading_balance_ledger;

-- Ensure no INSERT/UPDATE policies on wallet_balances for authenticated
DROP POLICY IF EXISTS "Users can insert wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can update wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.wallet_balances;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.wallet_balances;

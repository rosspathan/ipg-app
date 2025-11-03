-- Phase 2.3: Add Idempotency Keys Infrastructure
-- Phase 2.5: Add Balance Reconciliation System
-- Phase 3.3: Add Missing Foreign Key CASCADE Rules

-- Idempotency tracking table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('deposit', 'withdrawal', 'order', 'swap', 'transfer')),
  resource_id UUID,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours',
  CONSTRAINT valid_operation_type CHECK (operation_type IN ('deposit', 'withdrawal', 'order', 'swap', 'transfer'))
);

CREATE INDEX idx_idempotency_keys_key ON public.idempotency_keys(key);
CREATE INDEX idx_idempotency_keys_user ON public.idempotency_keys(user_id);
CREATE INDEX idx_idempotency_keys_expires ON public.idempotency_keys(expires_at);

-- Enable RLS on idempotency_keys
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own idempotency keys"
ON public.idempotency_keys FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own idempotency keys"
ON public.idempotency_keys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Cleanup function for expired idempotency keys (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Balance reconciliation reports table
CREATE TABLE IF NOT EXISTS public.balance_reconciliation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  wallet_balance NUMERIC NOT NULL,
  ledger_sum NUMERIC NOT NULL,
  discrepancy NUMERIC GENERATED ALWAYS AS (wallet_balance - ledger_sum) STORED,
  report_date TIMESTAMPTZ DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_balance_recon_user ON public.balance_reconciliation_reports(user_id);
CREATE INDEX idx_balance_recon_asset ON public.balance_reconciliation_reports(asset_id);
CREATE INDEX idx_balance_recon_unresolved ON public.balance_reconciliation_reports(resolved) WHERE resolved = false;
CREATE INDEX idx_balance_recon_date ON public.balance_reconciliation_reports(report_date);

-- Enable RLS on balance reconciliation reports
ALTER TABLE public.balance_reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reconciliation reports"
ON public.balance_reconciliation_reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update reconciliation reports"
ON public.balance_reconciliation_reports FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Reconciliation function (run daily via cron)
CREATE OR REPLACE FUNCTION public.run_balance_reconciliation()
RETURNS TABLE(
  user_id UUID, 
  asset_symbol TEXT, 
  wallet_total NUMERIC,
  ledger_total NUMERIC,
  discrepancy NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compare wallet_balances.total vs expected balance from ledger
  RETURN QUERY
  WITH wallet_totals AS (
    SELECT wb.user_id, wb.asset_id, COALESCE(wb.total, 0) as wallet_total
    FROM wallet_balances wb
  ),
  -- Simplified ledger calculation (would need to be expanded based on actual ledger structure)
  ledger_sums AS (
    SELECT 
      user_id, 
      asset_id, 
      COALESCE(SUM(amount), 0) as ledger_total
    FROM (
      -- Deposits (positive)
      SELECT d.user_id, a.id as asset_id, d.amount
      FROM deposits d
      JOIN assets a ON a.symbol = 'USDT' -- Simplified, would need proper asset mapping
      WHERE d.status = 'completed'
      
      UNION ALL
      
      -- Withdrawals (negative)
      SELECT w.user_id, a.id as asset_id, -w.amount
      FROM withdrawals w
      JOIN assets a ON a.symbol = 'USDT' -- Simplified
      WHERE w.status = 'completed'
    ) combined
    GROUP BY user_id, asset_id
  )
  SELECT 
    wt.user_id,
    a.symbol,
    wt.wallet_total,
    COALESCE(ls.ledger_total, 0) as ledger_total,
    (wt.wallet_total - COALESCE(ls.ledger_total, 0)) as discrepancy
  FROM wallet_totals wt
  LEFT JOIN ledger_sums ls ON wt.user_id = ls.user_id AND wt.asset_id = ls.asset_id
  JOIN assets a ON wt.asset_id = a.id
  WHERE ABS(wt.wallet_total - COALESCE(ls.ledger_total, 0)) > 0.000001; -- Tolerance for floating point
END;
$$;

-- Phase 3.3: Add CASCADE to foreign keys to prevent orphaned records

-- Drop and recreate foreign key constraints with CASCADE
-- wallet_balances
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'wallet_balances_user_id_fkey' 
    AND table_name = 'wallet_balances'
  ) THEN
    ALTER TABLE wallet_balances DROP CONSTRAINT wallet_balances_user_id_fkey;
  END IF;
END $$;

ALTER TABLE wallet_balances 
ADD CONSTRAINT wallet_balances_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_bsk_balances
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_bsk_balances_user_id_fkey' 
    AND table_name = 'user_bsk_balances'
  ) THEN
    ALTER TABLE user_bsk_balances DROP CONSTRAINT user_bsk_balances_user_id_fkey;
  END IF;
END $$;

ALTER TABLE user_bsk_balances
ADD CONSTRAINT user_bsk_balances_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_inr_balances
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_inr_balances_user_id_fkey' 
    AND table_name = 'user_inr_balances'
  ) THEN
    ALTER TABLE user_inr_balances DROP CONSTRAINT user_inr_balances_user_id_fkey;
  END IF;
END $$;

ALTER TABLE user_inr_balances
ADD CONSTRAINT user_inr_balances_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- orders
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_user_id_fkey' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
  END IF;
END $$;

ALTER TABLE orders
ADD CONSTRAINT orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- trades
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trades_buyer_id_fkey' 
    AND table_name = 'trades'
  ) THEN
    ALTER TABLE trades DROP CONSTRAINT trades_buyer_id_fkey;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trades_seller_id_fkey' 
    AND table_name = 'trades'
  ) THEN
    ALTER TABLE trades DROP CONSTRAINT trades_seller_id_fkey;
  END IF;
END $$;

ALTER TABLE trades
ADD CONSTRAINT trades_buyer_id_fkey
FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE trades
ADD CONSTRAINT trades_seller_id_fkey
FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- deposits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deposits_user_id_fkey' 
    AND table_name = 'deposits'
  ) THEN
    ALTER TABLE deposits DROP CONSTRAINT deposits_user_id_fkey;
  END IF;
END $$;

ALTER TABLE deposits
ADD CONSTRAINT deposits_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- withdrawals
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'withdrawals_user_id_fkey' 
    AND table_name = 'withdrawals'
  ) THEN
    ALTER TABLE withdrawals DROP CONSTRAINT withdrawals_user_id_fkey;
  END IF;
END $$;

ALTER TABLE withdrawals
ADD CONSTRAINT withdrawals_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
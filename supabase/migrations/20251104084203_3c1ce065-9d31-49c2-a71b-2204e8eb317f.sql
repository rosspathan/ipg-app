-- ============================================================================
-- PHASE 1: UNIFIED LEDGER-FIRST ACCOUNTING ARCHITECTURE (FIXED)
-- ============================================================================

-- 1. CREATE UNIFIED BSK LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.unified_bsk_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('credit', 'debit')),
  tx_subtype TEXT NOT NULL,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('withdrawable', 'holding')),
  amount_bsk NUMERIC(20, 8) NOT NULL CHECK (amount_bsk > 0),
  notes TEXT,
  meta_json JSONB DEFAULT '{}'::jsonb,
  related_user_id UUID,
  related_transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  CONSTRAINT unified_bsk_ledger_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unified_bsk_ledger_related_user_id_fkey FOREIGN KEY (related_user_id) 
    REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_user_id ON public.unified_bsk_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_created_at ON public.unified_bsk_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_tx_type ON public.unified_bsk_ledger(tx_type);
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_balance_type ON public.unified_bsk_ledger(balance_type);
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_idempotency ON public.unified_bsk_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_unified_bsk_ledger_user_created ON public.unified_bsk_ledger(user_id, created_at DESC);

-- RLS
ALTER TABLE public.unified_bsk_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ledger entries" ON public.unified_bsk_ledger;
CREATE POLICY "Users can view their own ledger entries"
  ON public.unified_bsk_ledger FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only system can insert ledger entries" ON public.unified_bsk_ledger;
CREATE POLICY "Only system can insert ledger entries"
  ON public.unified_bsk_ledger FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Admins can view all ledger entries" ON public.unified_bsk_ledger;
CREATE POLICY "Admins can view all ledger entries"
  ON public.unified_bsk_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. MIGRATE FROM OLD LEDGERS (with proper column mapping)
INSERT INTO public.unified_bsk_ledger (
  user_id, 
  idempotency_key, 
  tx_type, 
  tx_subtype, 
  balance_type, 
  amount_bsk, 
  notes, 
  created_at,
  processed_at
)
SELECT 
  user_id,
  'legacy_w_' || id::text AS idempotency_key,
  tx_type,
  COALESCE(tx_subtype, 'legacy_migration') AS tx_subtype,
  'withdrawable' AS balance_type,
  ABS(amount_bsk) AS amount_bsk,
  notes,
  created_at,
  created_at AS processed_at
FROM public.bsk_withdrawable_ledger
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_bsk_ledger 
  WHERE idempotency_key = 'legacy_w_' || bsk_withdrawable_ledger.id::text
);

INSERT INTO public.unified_bsk_ledger (
  user_id, 
  idempotency_key, 
  tx_type, 
  tx_subtype, 
  balance_type, 
  amount_bsk, 
  notes, 
  created_at,
  processed_at
)
SELECT 
  user_id,
  'legacy_h_' || id::text AS idempotency_key,
  tx_type,
  COALESCE(tx_subtype, 'legacy_migration') AS tx_subtype,
  'holding' AS balance_type,
  ABS(amount_bsk) AS amount_bsk,
  notes,
  created_at,
  created_at AS processed_at
FROM public.bsk_holding_ledger
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_bsk_ledger 
  WHERE idempotency_key = 'legacy_h_' || bsk_holding_ledger.id::text
);

-- 3. MATERIALIZED VIEW FOR BALANCES
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_bsk_balances CASCADE;

CREATE MATERIALIZED VIEW public.mv_user_bsk_balances AS
SELECT 
  user_id,
  
  COALESCE(SUM(
    CASE 
      WHEN balance_type = 'withdrawable' AND tx_type = 'credit' THEN amount_bsk
      WHEN balance_type = 'withdrawable' AND tx_type = 'debit' THEN -amount_bsk
      ELSE 0
    END
  ), 0) AS withdrawable_balance,
  
  COALESCE(SUM(
    CASE 
      WHEN balance_type = 'holding' AND tx_type = 'credit' THEN amount_bsk
      WHEN balance_type = 'holding' AND tx_type = 'debit' THEN -amount_bsk
      ELSE 0
    END
  ), 0) AS holding_balance,
  
  COALESCE(SUM(
    CASE 
      WHEN balance_type = 'withdrawable' AND tx_type = 'credit' THEN amount_bsk
      ELSE 0
    END
  ), 0) AS total_earned_withdrawable,
  
  COALESCE(SUM(
    CASE 
      WHEN balance_type = 'holding' AND tx_type = 'credit' THEN amount_bsk
      ELSE 0
    END
  ), 0) AS total_earned_holding,
  
  COALESCE(SUM(
    CASE 
      WHEN tx_type = 'credit' 
        AND DATE(created_at) = CURRENT_DATE 
      THEN amount_bsk
      ELSE 0
    END
  ), 0) AS today_earned,
  
  COALESCE(SUM(
    CASE 
      WHEN tx_type = 'credit' 
        AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
      THEN amount_bsk
      ELSE 0
    END
  ), 0) AS week_earned,
  
  MAX(created_at) AS last_transaction_at,
  COUNT(*) AS total_transactions,
  now() AS refreshed_at
  
FROM public.unified_bsk_ledger
GROUP BY user_id;

CREATE UNIQUE INDEX idx_mv_user_bsk_balances_user_id 
  ON public.mv_user_bsk_balances(user_id);

-- 4. REFRESH FUNCTION
CREATE OR REPLACE FUNCTION public.refresh_bsk_balances_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_bsk_balances;
END;
$$;

-- 5. RECONCILIATION FUNCTION
CREATE OR REPLACE FUNCTION public.reconcile_bsk_balances()
RETURNS TABLE(
  user_id UUID,
  ledger_withdrawable NUMERIC,
  old_withdrawable NUMERIC,
  withdrawable_diff NUMERIC,
  ledger_holding NUMERIC,
  old_holding NUMERIC,
  holding_diff NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ledger_balances AS (
    SELECT 
      l.user_id,
      COALESCE(SUM(
        CASE 
          WHEN l.balance_type = 'withdrawable' AND l.tx_type = 'credit' THEN l.amount_bsk
          WHEN l.balance_type = 'withdrawable' AND l.tx_type = 'debit' THEN -l.amount_bsk
          ELSE 0
        END
      ), 0) AS withdrawable_balance,
      COALESCE(SUM(
        CASE 
          WHEN l.balance_type = 'holding' AND l.tx_type = 'credit' THEN l.amount_bsk
          WHEN l.balance_type = 'holding' AND l.tx_type = 'debit' THEN -l.amount_bsk
          ELSE 0
        END
      ), 0) AS holding_balance
    FROM public.unified_bsk_ledger l
    GROUP BY l.user_id
  )
  SELECT 
    COALESCE(lb.user_id, ub.user_id) AS user_id,
    COALESCE(lb.withdrawable_balance, 0) AS ledger_withdrawable,
    COALESCE(ub.withdrawable_balance, 0) AS old_withdrawable,
    COALESCE(lb.withdrawable_balance, 0) - COALESCE(ub.withdrawable_balance, 0) AS withdrawable_diff,
    COALESCE(lb.holding_balance, 0) AS ledger_holding,
    COALESCE(ub.holding_balance, 0) AS old_holding,
    COALESCE(lb.holding_balance, 0) - COALESCE(ub.holding_balance, 0) AS holding_diff,
    CASE 
      WHEN ABS(COALESCE(lb.withdrawable_balance, 0) - COALESCE(ub.withdrawable_balance, 0)) > 0.00000001
        OR ABS(COALESCE(lb.holding_balance, 0) - COALESCE(ub.holding_balance, 0)) > 0.00000001
      THEN '⚠️ DRIFT DETECTED'
      ELSE '✅ BALANCED'
    END AS status
  FROM ledger_balances lb
  FULL OUTER JOIN public.user_bsk_balances ub ON lb.user_id = ub.user_id
  WHERE ABS(COALESCE(lb.withdrawable_balance, 0) - COALESCE(ub.withdrawable_balance, 0)) > 0.00000001
     OR ABS(COALESCE(lb.holding_balance, 0) - COALESCE(ub.holding_balance, 0)) > 0.00000001
  ORDER BY withdrawable_diff DESC;
END;
$$;

-- 6. ATOMIC TRANSACTION FUNCTION (with advisory locks & idempotency)
CREATE OR REPLACE FUNCTION public.record_bsk_transaction(
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_tx_type TEXT,
  p_tx_subtype TEXT,
  p_balance_type TEXT,
  p_amount_bsk NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_meta_json JSONB DEFAULT '{}'::jsonb,
  p_related_user_id UUID DEFAULT NULL,
  p_related_transaction_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- Advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_balance_type));
  
  -- Idempotency check
  SELECT id INTO v_transaction_id
  FROM public.unified_bsk_ledger
  WHERE idempotency_key = p_idempotency_key;
  
  IF v_transaction_id IS NOT NULL THEN
    RETURN v_transaction_id; -- Already processed
  END IF;
  
  -- Validation
  IF p_balance_type NOT IN ('withdrawable', 'holding') THEN
    RAISE EXCEPTION 'Invalid balance_type: %', p_balance_type;
  END IF;
  
  IF p_tx_type NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Invalid tx_type: %', p_tx_type;
  END IF;
  
  -- Balance check for debits
  IF p_tx_type = 'debit' THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN tx_type = 'credit' THEN amount_bsk
        WHEN tx_type = 'debit' THEN -amount_bsk
      END
    ), 0) INTO v_current_balance
    FROM public.unified_bsk_ledger
    WHERE user_id = p_user_id AND balance_type = p_balance_type;
    
    IF v_current_balance < p_amount_bsk THEN
      RAISE EXCEPTION 'Insufficient balance: required %, available %', p_amount_bsk, v_current_balance;
    END IF;
  END IF;
  
  -- Insert transaction
  INSERT INTO public.unified_bsk_ledger (
    user_id, idempotency_key, tx_type, tx_subtype, balance_type,
    amount_bsk, notes, meta_json, related_user_id, related_transaction_id, created_by
  ) VALUES (
    p_user_id, p_idempotency_key, p_tx_type, p_tx_subtype, p_balance_type,
    p_amount_bsk, p_notes, p_meta_json, p_related_user_id, p_related_transaction_id, auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- 7. SYNC OLD BALANCES (temporary during migration)
CREATE OR REPLACE FUNCTION public.sync_old_balances_from_ledger()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_bsk_balances (
    user_id, withdrawable_balance, holding_balance,
    total_earned_withdrawable, total_earned_holding, updated_at
  )
  SELECT 
    user_id, withdrawable_balance, holding_balance,
    total_earned_withdrawable, total_earned_holding, now()
  FROM public.mv_user_bsk_balances
  ON CONFLICT (user_id) DO UPDATE SET
    withdrawable_balance = EXCLUDED.withdrawable_balance,
    holding_balance = EXCLUDED.holding_balance,
    total_earned_withdrawable = EXCLUDED.total_earned_withdrawable,
    total_earned_holding = EXCLUDED.total_earned_holding,
    updated_at = now();
END;
$$;

-- 8. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.reconcile_bsk_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_bsk_balances_view() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_bsk_transaction FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_bsk_transaction TO service_role;

-- STEP 1: Fix record_bsk_transaction to atomically sync user_bsk_balances
CREATE OR REPLACE FUNCTION public.record_bsk_transaction(
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_tx_type TEXT,
  p_tx_subtype TEXT,
  p_balance_type TEXT,
  p_amount_bsk NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_meta_json JSONB DEFAULT NULL,
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
  v_delta NUMERIC;
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
  
  -- HOLDING BSK SUNSET ENFORCEMENT
  IF p_balance_type = 'holding' THEN
    IF p_tx_subtype NOT IN ('forensic_repair', 'legacy_correction') THEN
      RAISE EXCEPTION 'HOLDING_BSK_SUNSET: balance_type=holding is permanently discontinued. Use withdrawable instead. Attempted subtype: %', p_tx_subtype;
    END IF;
  END IF;
  
  IF p_tx_type NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Invalid tx_type: %', p_tx_type;
  END IF;
  
  -- Calculate delta
  IF p_tx_type = 'credit' THEN
    v_delta := p_amount_bsk;
  ELSE
    v_delta := -p_amount_bsk;
  END IF;
  
  -- Balance check for debits (strict — no clamping)
  IF p_tx_type = 'debit' THEN
    -- Get current balance from balance table (faster than full ledger scan)
    SELECT CASE 
      WHEN p_balance_type = 'withdrawable' THEN COALESCE(withdrawable_balance, 0)
      WHEN p_balance_type = 'holding' THEN COALESCE(holding_balance, 0)
    END INTO v_current_balance
    FROM public.user_bsk_balances
    WHERE user_id = p_user_id
    FOR UPDATE;  -- Lock the row
    
    -- If no balance row exists, balance is 0
    IF v_current_balance IS NULL THEN
      v_current_balance := 0;
    END IF;
    
    IF v_current_balance < p_amount_bsk THEN
      RAISE EXCEPTION 'Insufficient balance: required %, available %', p_amount_bsk, v_current_balance;
    END IF;
  END IF;
  
  -- Insert ledger entry
  INSERT INTO public.unified_bsk_ledger (
    user_id, idempotency_key, tx_type, tx_subtype, balance_type,
    amount_bsk, notes, meta_json, related_user_id, related_transaction_id, created_by
  ) VALUES (
    p_user_id, p_idempotency_key, p_tx_type, p_tx_subtype, p_balance_type,
    p_amount_bsk, p_notes, p_meta_json, p_related_user_id, p_related_transaction_id, auth.uid()
  ) RETURNING id INTO v_transaction_id;
  
  -- ===== ATOMICALLY SYNC user_bsk_balances =====
  IF p_balance_type = 'withdrawable' THEN
    INSERT INTO public.user_bsk_balances (user_id, withdrawable_balance, holding_balance, updated_at)
    VALUES (p_user_id, GREATEST(0, v_delta), 0, now())
    ON CONFLICT (user_id) DO UPDATE SET
      withdrawable_balance = GREATEST(0, public.user_bsk_balances.withdrawable_balance + v_delta),
      updated_at = now();
  ELSIF p_balance_type = 'holding' THEN
    INSERT INTO public.user_bsk_balances (user_id, withdrawable_balance, holding_balance, updated_at)
    VALUES (p_user_id, 0, GREATEST(0, v_delta), 0)
    ON CONFLICT (user_id) DO UPDATE SET
      holding_balance = GREATEST(0, public.user_bsk_balances.holding_balance + v_delta),
      updated_at = now();
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- STEP 2: One-time reconciliation — fix all stale balances from ledger truth
WITH ledger_sums AS (
  SELECT 
    user_id,
    COALESCE(SUM(CASE WHEN tx_type = 'credit' THEN amount_bsk ELSE -amount_bsk END), 0) as correct_balance
  FROM public.unified_bsk_ledger
  WHERE balance_type = 'withdrawable'
  AND status = 'completed'
  GROUP BY user_id
)
UPDATE public.user_bsk_balances b
SET 
  withdrawable_balance = GREATEST(0, ls.correct_balance),
  updated_at = now()
FROM ledger_sums ls
WHERE b.user_id = ls.user_id
AND ABS(b.withdrawable_balance - ls.correct_balance) > 0.001;

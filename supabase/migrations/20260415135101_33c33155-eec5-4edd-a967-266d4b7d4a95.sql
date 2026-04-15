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
  
  -- HOLDING BSK SUNSET ENFORCEMENT: Block all holding writes except forensic repairs
  IF p_balance_type = 'holding' THEN
    IF p_tx_subtype NOT IN ('forensic_repair', 'legacy_correction') THEN
      RAISE EXCEPTION 'HOLDING_BSK_SUNSET: balance_type=holding is permanently discontinued. Use withdrawable instead. Attempted subtype: %', p_tx_subtype;
    END IF;
  END IF;
  
  IF p_tx_type NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Invalid tx_type: %', p_tx_type;
  END IF;
  
  -- Balance check for debits (strict — no clamping)
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
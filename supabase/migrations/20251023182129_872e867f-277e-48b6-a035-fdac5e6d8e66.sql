-- Phase 1: Professional BSK Transaction System
-- Create unified view, standard award function, and integrity checks

-- 1. Create transaction category ENUM for standardization
CREATE TYPE bsk_transaction_category AS ENUM (
  -- Earnings
  'badge_bonus',
  'referral_commission',
  'staking_reward',
  'insurance_claim',
  'ad_reward',
  'promotion_bonus',
  'admin_credit',
  
  -- Spending
  'badge_purchase',
  'withdrawal',
  'transfer_out',
  'admin_debit',
  
  -- Internal
  'vesting_release',
  'holding_to_withdrawable',
  'balance_correction'
);

-- 2. Create unified view aggregating ALL BSK transactions
CREATE OR REPLACE VIEW unified_bsk_transactions AS
-- Withdrawable Ledger
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  tx_type as transaction_type,
  tx_subtype as transaction_subtype,
  'withdrawable' as balance_type,
  reference_id,
  notes as description,
  metadata,
  balance_before,
  balance_after,
  idempotency_key,
  'bsk_withdrawable_ledger' as source_table
FROM bsk_withdrawable_ledger

UNION ALL

-- Holding Ledger
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  tx_type as transaction_type,
  tx_subtype as transaction_subtype,
  'holding' as balance_type,
  reference_id,
  notes as description,
  metadata,
  balance_before,
  balance_after,
  idempotency_key,
  'bsk_holding_ledger' as source_table
FROM bsk_holding_ledger

UNION ALL

-- Insurance BSK Ledger
SELECT 
  id,
  user_id,
  created_at,
  bsk_amount as amount_bsk,
  type as transaction_type,
  plan_type as transaction_subtype,
  destination as balance_type,
  claim_id as reference_id,
  COALESCE(metadata->>'note', 'Insurance transaction') as description,
  metadata,
  NULL::numeric as balance_before,
  NULL::numeric as balance_after,
  idempotency_key,
  'insurance_bsk_ledger' as source_table
FROM insurance_bsk_ledger

UNION ALL

-- Referral Commissions
SELECT 
  id,
  earner_id as user_id,
  created_at,
  bsk_amount as amount_bsk,
  event_type as transaction_type,
  'Level ' || level::text as transaction_subtype,
  destination as balance_type,
  event_id as reference_id,
  'Referral commission from ' || event_type as description,
  jsonb_build_object(
    'payer_id', payer_id,
    'level', level,
    'badge_at_event', earner_badge_at_event,
    'status', status
  ) as metadata,
  NULL::numeric as balance_before,
  NULL::numeric as balance_after,
  NULL::text as idempotency_key,
  'referral_commissions' as source_table
FROM referral_commissions

UNION ALL

-- Legacy Bonus Ledger (for historical data)
SELECT 
  id,
  user_id,
  created_at,
  amount_bsk,
  type as transaction_type,
  NULL::text as transaction_subtype,
  CASE 
    WHEN type IN ('badge_bonus', 'referral_bonus', 'promotion') THEN 'withdrawable'
    ELSE 'withdrawable'
  END as balance_type,
  NULL::uuid as reference_id,
  COALESCE(meta_json->>'note', type) as description,
  meta_json as metadata,
  NULL::numeric as balance_before,
  NULL::numeric as balance_after,
  NULL::text as idempotency_key,
  'bonus_ledger' as source_table
FROM bonus_ledger

ORDER BY created_at DESC;

-- 3. Enable RLS on the unified view
ALTER VIEW unified_bsk_transactions SET (security_invoker = true);

-- 4. Create standardized award function
CREATE OR REPLACE FUNCTION award_bsk_standard(
  p_user_id uuid,
  p_amount numeric,
  p_destination text, -- 'withdrawable' or 'holding'
  p_tx_type text,
  p_tx_subtype text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id uuid;
  v_current_balance numeric;
  v_new_balance numeric;
  v_rate numeric;
BEGIN
  -- Get current BSK rate
  SELECT rate_inr_per_bsk INTO v_rate
  FROM bsk_rates
  ORDER BY created_at DESC
  LIMIT 1;
  
  v_rate := COALESCE(v_rate, 1.0);
  
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF p_destination = 'withdrawable' THEN
      SELECT id INTO v_ledger_id
      FROM bsk_withdrawable_ledger
      WHERE idempotency_key = p_idempotency_key;
    ELSE
      SELECT id INTO v_ledger_id
      FROM bsk_holding_ledger
      WHERE idempotency_key = p_idempotency_key;
    END IF;
    
    IF v_ledger_id IS NOT NULL THEN
      RETURN v_ledger_id; -- Already processed
    END IF;
  END IF;
  
  -- Lock balance row and process transaction
  IF p_destination = 'withdrawable' THEN
    SELECT withdrawable_balance INTO v_current_balance
    FROM user_bsk_balances
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    v_new_balance := COALESCE(v_current_balance, 0) + p_amount;
    
    -- Insert ledger entry
    INSERT INTO bsk_withdrawable_ledger (
      user_id, amount_bsk, amount_inr, rate_snapshot,
      tx_type, tx_subtype, reference_id, notes, metadata,
      balance_before, balance_after, idempotency_key
    ) VALUES (
      p_user_id, p_amount, p_amount * v_rate, v_rate,
      p_tx_type, p_tx_subtype, p_reference_id, p_notes, p_metadata,
      COALESCE(v_current_balance, 0), v_new_balance, p_idempotency_key
    ) RETURNING id INTO v_ledger_id;
    
    -- Update balance
    UPDATE user_bsk_balances
    SET 
      withdrawable_balance = v_new_balance,
      total_earned_withdrawable = total_earned_withdrawable + GREATEST(p_amount, 0),
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
  ELSE -- holding
    SELECT holding_balance INTO v_current_balance
    FROM user_bsk_balances
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    v_new_balance := COALESCE(v_current_balance, 0) + p_amount;
    
    -- Insert ledger entry
    INSERT INTO bsk_holding_ledger (
      user_id, amount_bsk, amount_inr, rate_snapshot,
      tx_type, tx_subtype, reference_id, notes, metadata,
      balance_before, balance_after, idempotency_key
    ) VALUES (
      p_user_id, p_amount, p_amount * v_rate, v_rate,
      p_tx_type, p_tx_subtype, p_reference_id, p_notes, p_metadata,
      COALESCE(v_current_balance, 0), v_new_balance, p_idempotency_key
    ) RETURNING id INTO v_ledger_id;
    
    -- Update balance
    UPDATE user_bsk_balances
    SET 
      holding_balance = v_new_balance,
      total_earned_holding = total_earned_holding + GREATEST(p_amount, 0),
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_ledger_id;
END;
$$;

-- 5. Create balance reconciliation function
CREATE OR REPLACE FUNCTION reconcile_bsk_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ledger_withdrawable numeric;
  ledger_holding numeric;
  balance_withdrawable numeric;
  balance_holding numeric;
  result jsonb;
BEGIN
  -- Calculate from ledgers
  SELECT COALESCE(SUM(amount_bsk), 0) INTO ledger_withdrawable
  FROM bsk_withdrawable_ledger
  WHERE user_id = p_user_id;
  
  SELECT COALESCE(SUM(amount_bsk), 0) INTO ledger_holding
  FROM bsk_holding_ledger
  WHERE user_id = p_user_id;
  
  -- Get balance table values
  SELECT 
    COALESCE(withdrawable_balance, 0),
    COALESCE(holding_balance, 0)
  INTO balance_withdrawable, balance_holding
  FROM user_bsk_balances
  WHERE user_id = p_user_id;
  
  result := jsonb_build_object(
    'user_id', p_user_id,
    'ledger_withdrawable', ledger_withdrawable,
    'ledger_holding', ledger_holding,
    'balance_withdrawable', balance_withdrawable,
    'balance_holding', balance_holding,
    'withdrawable_match', (ledger_withdrawable = balance_withdrawable),
    'holding_match', (ledger_holding = balance_holding),
    'withdrawable_diff', (balance_withdrawable - ledger_withdrawable),
    'holding_diff', (balance_holding - ledger_holding)
  );
  
  RETURN result;
END;
$$;

-- 6. Grant necessary permissions
GRANT SELECT ON unified_bsk_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION award_bsk_standard TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_bsk_balance TO authenticated;
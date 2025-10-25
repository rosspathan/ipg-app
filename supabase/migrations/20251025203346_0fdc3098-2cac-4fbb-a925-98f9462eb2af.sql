-- Backfill missing BSK ledger entries for reconciliation
DO $$
DECLARE
  v_current_rate numeric;
BEGIN
  -- Get the most recent BSK rate
  SELECT rate_inr_per_bsk INTO v_current_rate
  FROM bsk_rates
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no rate exists, use a default of 1
  IF v_current_rate IS NULL THEN
    v_current_rate := 1;
  END IF;

  -- Backfill missing holding ledger entries
  INSERT INTO bsk_holding_ledger (
    user_id,
    amount_bsk,
    amount_inr,
    rate_snapshot,
    tx_type,
    tx_subtype,
    notes,
    balance_before,
    balance_after,
    created_at,
    metadata
  )
  SELECT 
    ub.user_id,
    ub.holding_balance,
    ub.holding_balance * v_current_rate,
    v_current_rate,
    'opening_balance',
    'reconciliation',
    'Opening balance - reconciled from user_bsk_balances',
    0,
    ub.holding_balance,
    COALESCE(ub.created_at, NOW()),
    jsonb_build_object(
      'reconciliation_date', NOW(),
      'source', 'data_reconciliation_migration',
      'original_balance', ub.holding_balance,
      'rate_used', v_current_rate
    )
  FROM user_bsk_balances ub
  WHERE ub.holding_balance > 0
    AND NOT EXISTS (
      SELECT 1 
      FROM bsk_holding_ledger bhl 
      WHERE bhl.user_id = ub.user_id
    );

  -- Backfill missing withdrawable ledger entries
  INSERT INTO bsk_withdrawable_ledger (
    user_id,
    amount_bsk,
    amount_inr,
    rate_snapshot,
    tx_type,
    tx_subtype,
    notes,
    balance_before,
    balance_after,
    created_at,
    metadata
  )
  SELECT 
    ub.user_id,
    ub.withdrawable_balance,
    ub.withdrawable_balance * v_current_rate,
    v_current_rate,
    'opening_balance',
    'reconciliation',
    'Opening balance - reconciled from user_bsk_balances',
    0,
    ub.withdrawable_balance,
    COALESCE(ub.created_at, NOW()),
    jsonb_build_object(
      'reconciliation_date', NOW(),
      'source', 'data_reconciliation_migration',
      'original_balance', ub.withdrawable_balance,
      'rate_used', v_current_rate
    )
  FROM user_bsk_balances ub
  WHERE ub.withdrawable_balance > 0
    AND NOT EXISTS (
      SELECT 1 
      FROM bsk_withdrawable_ledger bwl 
      WHERE bwl.user_id = ub.user_id
    );
END $$;

-- Create function to check balance reconciliation (useful for debugging)
CREATE OR REPLACE FUNCTION check_bsk_balance_reconciliation(p_user_id UUID)
RETURNS TABLE (
  balance_type TEXT,
  database_balance NUMERIC,
  ledger_sum NUMERIC,
  difference NUMERIC,
  is_reconciled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH user_balances AS (
    SELECT withdrawable_balance, holding_balance
    FROM user_bsk_balances
    WHERE user_id = p_user_id
  ),
  withdrawable_sum AS (
    SELECT COALESCE(SUM(amount_bsk), 0) as total
    FROM bsk_withdrawable_ledger
    WHERE user_id = p_user_id
  ),
  holding_sum AS (
    SELECT COALESCE(SUM(amount_bsk), 0) as total
    FROM bsk_holding_ledger
    WHERE user_id = p_user_id
  )
  SELECT 
    'withdrawable'::TEXT,
    COALESCE(ub.withdrawable_balance, 0),
    ws.total,
    COALESCE(ub.withdrawable_balance, 0) - ws.total,
    ABS(COALESCE(ub.withdrawable_balance, 0) - ws.total) < 0.01
  FROM user_balances ub, withdrawable_sum ws
  UNION ALL
  SELECT 
    'holding'::TEXT,
    COALESCE(ub.holding_balance, 0),
    hs.total,
    COALESCE(ub.holding_balance, 0) - hs.total,
    ABS(COALESCE(ub.holding_balance, 0) - hs.total) < 0.01
  FROM user_balances ub, holding_sum hs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_bsk_balance_reconciliation(UUID) TO authenticated;
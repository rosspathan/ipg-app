-- Fix search_path security issue for check_bsk_balance_reconciliation function
CREATE OR REPLACE FUNCTION check_bsk_balance_reconciliation(p_user_id UUID)
RETURNS TABLE (
  balance_type TEXT,
  database_balance NUMERIC,
  ledger_sum NUMERIC,
  difference NUMERIC,
  is_reconciled BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
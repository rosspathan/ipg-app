-- ONE-TIME CLEANUP: Fix all balance discrepancies
-- This runs the reconciliation for all users with locked balances

DO $$
DECLARE
  r RECORD;
  v_result JSONB;
  v_fixed_count INTEGER := 0;
BEGIN
  -- Loop through all users with any locked balance
  FOR r IN 
    SELECT DISTINCT wb.user_id, a.symbol
    FROM wallet_balances wb
    JOIN assets a ON a.id = wb.asset_id
    WHERE wb.locked > 0.00000001 OR wb.available < 0
  LOOP
    -- Call the reconcile function for each user/asset pair
    SELECT reconcile_locked_balance(r.user_id, r.symbol) INTO v_result;
    
    IF (v_result->>'reconciled')::boolean = true THEN
      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE 'Fixed: user=%, asset=%, discrepancy=%', 
        r.user_id, r.symbol, v_result->>'discrepancy';
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total balances fixed: %', v_fixed_count;
END $$;
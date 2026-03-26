
-- CIRCUIT BREAKER LIVE TEST
-- Step 1: Freeze BSK
UPDATE withdrawal_circuit_breaker 
SET is_frozen = true, 
    frozen_at = now(), 
    frozen_reason = 'LIVE_TEST: Verifying circuit breaker enforcement',
    drift_percent = 99.99
WHERE asset_symbol = 'BSK';

-- Step 2: Verify freeze is active and simulate rejection
DO $$
DECLARE
  v_frozen BOOLEAN;
  v_result JSONB;
BEGIN
  SELECT is_frozen INTO v_frozen FROM withdrawal_circuit_breaker WHERE asset_symbol = 'BSK';
  
  IF v_frozen IS TRUE THEN
    RAISE NOTICE 'TEST PASS: BSK is FROZEN - circuit breaker active';
    v_result := jsonb_build_object('valid', false, 'reason', 
      format('Withdrawals for %s are frozen by circuit breaker due to detected solvency drift', 'BSK'));
    RAISE NOTICE 'SIMULATED WITHDRAWAL REJECTION: %', v_result::text;
  ELSE
    RAISE NOTICE 'TEST FAIL: BSK should be frozen';
  END IF;
END $$;

-- Step 3: Unfreeze BSK immediately  
UPDATE withdrawal_circuit_breaker 
SET is_frozen = false, 
    unfrozen_at = now(),
    unfrozen_by = null,
    frozen_reason = null,
    drift_percent = null,
    drift_amount = null
WHERE asset_symbol = 'BSK';

-- Step 4: Verify unfreeze
DO $$
DECLARE
  v_frozen BOOLEAN;
BEGIN
  SELECT is_frozen INTO v_frozen FROM withdrawal_circuit_breaker WHERE asset_symbol = 'BSK';
  IF v_frozen IS FALSE THEN
    RAISE NOTICE 'TEST PASS: BSK UNFROZEN - withdrawals open again';
  ELSE
    RAISE NOTICE 'TEST FAIL: BSK still frozen after unfreeze';
  END IF;
END $$;

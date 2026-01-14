-- Fix the remaining orphan lock for user 66d8b4cb-c765-4b3c-bc6f-b3e9fddc5186
DO $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT reconcile_locked_balance('66d8b4cb-c765-4b3c-bc6f-b3e9fddc5186'::uuid, 'USDT') INTO v_result;
  RAISE NOTICE 'Reconciliation result: %', v_result;
END $$;
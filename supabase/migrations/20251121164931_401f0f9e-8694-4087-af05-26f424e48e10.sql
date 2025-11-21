
-- Fix data drift: backfill unified_bsk_ledger for users with UI balances but no ledger entries
-- This ensures record_bsk_transaction can validate balances correctly

DO $$
DECLARE
  user_record RECORD;
  ledger_withdrawable NUMERIC;
  ledger_holding NUMERIC;
  backfill_withdrawable NUMERIC;
  backfill_holding NUMERIC;
BEGIN
  -- Iterate through all users with balances
  FOR user_record IN 
    SELECT user_id, withdrawable_balance, holding_balance 
    FROM user_bsk_balances 
    WHERE withdrawable_balance > 0 OR holding_balance > 0
  LOOP
    -- Calculate current ledger balances
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN balance_type = 'withdrawable' AND tx_type = 'credit' THEN amount_bsk
          WHEN balance_type = 'withdrawable' AND tx_type = 'debit' THEN -amount_bsk
          ELSE 0
        END
      ), 0),
      COALESCE(SUM(
        CASE 
          WHEN balance_type = 'holding' AND tx_type = 'credit' THEN amount_bsk
          WHEN balance_type = 'holding' AND tx_type = 'debit' THEN -amount_bsk
          ELSE 0
        END
      ), 0)
    INTO ledger_withdrawable, ledger_holding
    FROM unified_bsk_ledger
    WHERE user_id = user_record.user_id;
    
    -- Calculate what needs to be backfilled
    backfill_withdrawable := user_record.withdrawable_balance - ledger_withdrawable;
    backfill_holding := user_record.holding_balance - ledger_holding;
    
    -- Insert backfill credit for withdrawable if needed
    IF backfill_withdrawable > 0.00000001 THEN
      INSERT INTO unified_bsk_ledger (
        user_id,
        idempotency_key,
        tx_type,
        tx_subtype,
        balance_type,
        amount_bsk,
        notes,
        meta_json,
        created_at
      ) VALUES (
        user_record.user_id,
        'backfill:withdrawable:' || user_record.user_id || ':' || extract(epoch from now()),
        'credit',
        'balance_backfill',
        'withdrawable',
        backfill_withdrawable,
        'Balance backfill to sync UI with ledger',
        jsonb_build_object(
          'reason', 'data_drift_fix',
          'ui_balance', user_record.withdrawable_balance,
          'ledger_balance', ledger_withdrawable,
          'backfill_amount', backfill_withdrawable
        ),
        now()
      ) ON CONFLICT (idempotency_key) DO NOTHING;
      
      RAISE NOTICE 'Backfilled % BSK withdrawable for user %', backfill_withdrawable, user_record.user_id;
    END IF;
    
    -- Insert backfill credit for holding if needed
    IF backfill_holding > 0.00000001 THEN
      INSERT INTO unified_bsk_ledger (
        user_id,
        idempotency_key,
        tx_type,
        tx_subtype,
        balance_type,
        amount_bsk,
        notes,
        meta_json,
        created_at
      ) VALUES (
        user_record.user_id,
        'backfill:holding:' || user_record.user_id || ':' || extract(epoch from now()),
        'credit',
        'balance_backfill',
        'holding',
        backfill_holding,
        'Balance backfill to sync UI with ledger',
        jsonb_build_object(
          'reason', 'data_drift_fix',
          'ui_balance', user_record.holding_balance,
          'ledger_balance', ledger_holding,
          'backfill_amount', backfill_holding
        ),
        now()
      ) ON CONFLICT (idempotency_key) DO NOTHING;
      
      RAISE NOTICE 'Backfilled % BSK holding for user %', backfill_holding, user_record.user_id;
    END IF;
  END LOOP;
  
  -- Refresh materialized view and sync
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_bsk_balances;
  
  -- Sync back to user_bsk_balances
  INSERT INTO user_bsk_balances (
    user_id, withdrawable_balance, holding_balance,
    total_earned_withdrawable, total_earned_holding, updated_at
  )
  SELECT 
    user_id, withdrawable_balance, holding_balance,
    total_earned_withdrawable, total_earned_holding, now()
  FROM mv_user_bsk_balances
  ON CONFLICT (user_id) DO UPDATE SET
    withdrawable_balance = EXCLUDED.withdrawable_balance,
    holding_balance = EXCLUDED.holding_balance,
    total_earned_withdrawable = EXCLUDED.total_earned_withdrawable,
    total_earned_holding = EXCLUDED.total_earned_holding,
    updated_at = now();
    
  RAISE NOTICE 'Ledger backfill complete. All balances synchronized.';
END $$;

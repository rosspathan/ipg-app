
DO $$
DECLARE
  r RECORD;
  v_ledger_withdrawable NUMERIC;
  v_ledger_holding NUMERIC;
BEGIN
  FOR r IN 
    SELECT b.user_id, b.withdrawable_balance, b.holding_balance
    FROM user_bsk_balances b
  LOOP
    SELECT 
      COALESCE(SUM(CASE WHEN balance_type = 'withdrawable' THEN
        CASE WHEN tx_type = 'credit' THEN amount_bsk WHEN tx_type = 'debit' THEN -amount_bsk ELSE 0 END
      ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN balance_type = 'holding' THEN
        CASE WHEN tx_type = 'credit' THEN amount_bsk WHEN tx_type = 'debit' THEN -amount_bsk ELSE 0 END
      ELSE 0 END), 0)
    INTO v_ledger_withdrawable, v_ledger_holding
    FROM unified_bsk_ledger
    WHERE user_id = r.user_id;

    IF ROUND(r.withdrawable_balance, 8) != ROUND(GREATEST(v_ledger_withdrawable, 0), 8) 
       OR ROUND(r.holding_balance, 8) != ROUND(GREATEST(v_ledger_holding, 0), 8) THEN
      
      INSERT INTO bsk_balance_integrity_repairs (
        target_user_id, issue_type, reason,
        old_withdrawable_balance, new_withdrawable_balance, ledger_withdrawable_balance,
        old_holding_balance, new_holding_balance, ledger_holding_balance,
        diagnostic_snapshot, repaired_by, status
      ) VALUES (
        r.user_id,
        'phantom_balance_post_migration',
        'Reconciliation: user_bsk_balances did not reflect ledger debits from completed migrations',
        r.withdrawable_balance, GREATEST(v_ledger_withdrawable, 0), v_ledger_withdrawable,
        r.holding_balance, GREATEST(v_ledger_holding, 0), v_ledger_holding,
        jsonb_build_object(
          'old_withdrawable', r.withdrawable_balance,
          'old_holding', r.holding_balance,
          'ledger_withdrawable', v_ledger_withdrawable,
          'ledger_holding', v_ledger_holding,
          'reconciled_at', now()
        ),
        NULL,
        'completed'
      );

      UPDATE user_bsk_balances
      SET withdrawable_balance = GREATEST(v_ledger_withdrawable, 0),
          holding_balance = GREATEST(v_ledger_holding, 0),
          updated_at = now()
      WHERE user_id = r.user_id;
    END IF;
  END LOOP;
END;
$$;


DO $$
DECLARE
  r RECORD;
  v_ledger_w NUMERIC;
  v_ledger_h NUMERIC;
BEGIN
  FOR r IN 
    SELECT b.user_id, b.withdrawable_balance, b.holding_balance
    FROM user_bsk_balances b
    LEFT JOIN LATERAL (
      SELECT 
        COALESCE(SUM(CASE WHEN balance_type='withdrawable' THEN CASE WHEN tx_type='credit' THEN amount_bsk WHEN tx_type='debit' THEN -amount_bsk ELSE 0 END ELSE 0 END), 0) as lw,
        COALESCE(SUM(CASE WHEN balance_type='holding' THEN CASE WHEN tx_type='credit' THEN amount_bsk WHEN tx_type='debit' THEN -amount_bsk ELSE 0 END ELSE 0 END), 0) as lh
      FROM unified_bsk_ledger WHERE user_id = b.user_id
    ) l ON TRUE
    WHERE ROUND(b.withdrawable_balance::numeric, 4) != ROUND(COALESCE(l.lw, 0)::numeric, 4)
       OR ROUND(b.holding_balance::numeric, 4) != ROUND(COALESCE(l.lh, 0)::numeric, 4)
  LOOP
    SELECT 
      COALESCE(SUM(CASE WHEN balance_type='withdrawable' THEN CASE WHEN tx_type='credit' THEN amount_bsk WHEN tx_type='debit' THEN -amount_bsk ELSE 0 END ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN balance_type='holding' THEN CASE WHEN tx_type='credit' THEN amount_bsk WHEN tx_type='debit' THEN -amount_bsk ELSE 0 END ELSE 0 END), 0)
    INTO v_ledger_w, v_ledger_h
    FROM unified_bsk_ledger WHERE user_id = r.user_id;

    IF v_ledger_w < 0 OR v_ledger_h < 0 THEN
      -- Flag for manual review (negative ledger = data integrity issue)
      INSERT INTO bsk_balance_integrity_repairs (
        target_user_id, issue_type, reason,
        old_withdrawable_balance, new_withdrawable_balance, ledger_withdrawable_balance,
        old_holding_balance, new_holding_balance, ledger_holding_balance,
        diagnostic_snapshot, status
      ) VALUES (
        r.user_id, 'negative_ledger_balance', 'Ledger sum is negative — requires manual investigation',
        r.withdrawable_balance, r.withdrawable_balance, v_ledger_w,
        r.holding_balance, r.holding_balance, v_ledger_h,
        jsonb_build_object('ledger_w', v_ledger_w, 'ledger_h', v_ledger_h, 'flagged_at', now()),
        'pending_review'
      );
      CONTINUE;
    END IF;

    INSERT INTO bsk_balance_integrity_repairs (
      target_user_id, issue_type, reason,
      old_withdrawable_balance, new_withdrawable_balance, ledger_withdrawable_balance,
      old_holding_balance, new_holding_balance, ledger_holding_balance,
      diagnostic_snapshot, status
    ) VALUES (
      r.user_id, 'post_migration_balance_drift', 'Balance did not sync after migration — RPC lacked atomic update',
      r.withdrawable_balance, v_ledger_w, v_ledger_w,
      r.holding_balance, v_ledger_h, v_ledger_h,
      jsonb_build_object('old_w', r.withdrawable_balance, 'old_h', r.holding_balance, 'ledger_w', v_ledger_w, 'ledger_h', v_ledger_h, 'reconciled_at', now()),
      'completed'
    );

    UPDATE user_bsk_balances
    SET withdrawable_balance = v_ledger_w,
        holding_balance = v_ledger_h,
        updated_at = now()
    WHERE user_id = r.user_id;
  END LOOP;
END;
$$;

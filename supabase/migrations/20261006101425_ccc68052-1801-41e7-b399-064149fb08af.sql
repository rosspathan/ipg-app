DO $$
DECLARE
  v_u uuid := 'c66168cb-d8de-47ea-9239-052364871280';
  v_admin uuid := 'd0687e3e-f309-4f2f-90a0-8d23e87da8ee';
  v_bsk numeric;
  r record;
  v_after numeric;
BEGIN
  -- BSK: move full withdrawable balance via the atomic ledger RPC
  SELECT withdrawable_balance INTO v_bsk FROM user_bsk_balances WHERE user_id = v_u;
  IF COALESCE(v_bsk,0) > 0 THEN
    PERFORM record_bsk_transaction(v_u, 'fraud_seize_debit_'||v_u, 'debit', 'admin_debit', 'withdrawable', v_bsk,
      'Fraud seizure: balance moved to admin account', '{"reason":"fraud_investigation"}'::jsonb, v_admin, NULL);
    PERFORM record_bsk_transaction(v_admin, 'fraud_seize_credit_'||v_u, 'credit', 'admin_credit', 'withdrawable', v_bsk,
      'Fraud seizure from ipgtest1790715185@proton.me', '{"reason":"fraud_investigation"}'::jsonb, v_u, NULL);
  END IF;

  -- Exchange crypto balances: move available amounts to admin, logged in the trading audit ledger
  FOR r IN SELECT wb.asset_id, a.symbol, wb.available FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id
           WHERE wb.user_id = v_u AND wb.available > 0 LOOP
    UPDATE wallet_balances SET available = 0, updated_at = now() WHERE user_id = v_u AND asset_id = r.asset_id;
    INSERT INTO trading_balance_ledger(user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
      SELECT v_u, r.symbol, -r.available, 0, 0, locked, 'ADMIN_SEIZURE', 'fraud_investigation', 'Moved to admin account' FROM wallet_balances WHERE user_id = v_u AND asset_id = r.asset_id;

    INSERT INTO wallet_balances(user_id, asset_id, available, locked) VALUES (v_admin, r.asset_id, r.available, 0)
      ON CONFLICT (user_id, asset_id) DO UPDATE SET available = wallet_balances.available + EXCLUDED.available, updated_at = now()
      RETURNING available INTO v_after;
    INSERT INTO trading_balance_ledger(user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
      VALUES (v_admin, r.symbol, r.available, 0, v_after, 0, 'ADMIN_SEIZURE', 'fraud_investigation', 'Seized from ipgtest1790715185@proton.me');
  END LOOP;

  -- Cancel open orders
  UPDATE orders SET status = 'cancelled' WHERE user_id = v_u AND status IN ('pending','open','partially_filled');

  -- Full suspension + sign-in ban
  UPDATE profiles SET account_status = 'suspended', is_suspended = true, withdrawal_locked = true WHERE user_id = v_u;
  UPDATE auth.users SET banned_until = '2999-01-01' WHERE id = v_u;
  DELETE FROM auth.sessions WHERE user_id = v_u;
  DELETE FROM auth.refresh_tokens WHERE user_id::uuid = v_u;
END $$;

-- FINAL DUST CORRECTIONS: Sub-$1 residual drifts
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes, created_at)
VALUES
  -- USDT: fee account +0.42 (accumulated fee rounding)
  ('00000000-0000-0000-0000-000000000001', 'USDT', 0.42017314, 0, 163.85104266, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Final dust correction: fee rounding accumulation', now()),
  -- IPG: user 36a55640 +0.22
  ('36a55640-da73-43a5-a544-93e5ec504e7c', 'IPG', 0.22296200, 0, 18.50668200, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Final dust correction: pre-ledger IPG balance', now()),
  -- IPG: user 767c05f3 +0.016
  ('767c05f3-097c-403b-bf76-a56314e54dd8', 'IPG', 0.01595000, 0, 0.08510000, 0, 'ADJUSTMENT', 'RECONCILIATION', 'Final dust correction: pre-ledger IPG balance', now());

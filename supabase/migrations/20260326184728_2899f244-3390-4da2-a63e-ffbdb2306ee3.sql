
-- ============================================================
-- FIX 4: BSK LEDGER DRIFT CORRECTION
-- Insert ADJUSTMENT entries to align ledger with wallet_balances
-- wallet_balances is treated as source of truth per established policy
-- ============================================================

-- The trading_balance_ledger has an append-only trigger that blocks UPDATE/DELETE.
-- We insert corrective ADJUSTMENT entries via SECURITY DEFINER context.

-- User 1: banalasathish143143@gmail.com — drift +4490.4766
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT '36a55640-da73-43a5-a544-93e5ec504e7c', 'BSK', 4490.4766, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: historical unledgered BSK balance. Drift=+4490.4766. wallet_balances is source of truth.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = '36a55640-da73-43a5-a544-93e5ec504e7c' AND a.symbol = 'BSK';

-- User 2: dhanu143bng@gmail.com — drift +500.0000
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT 'c5de8275-e4e0-4955-8f23-0248f5cba905', 'BSK', 500.0000, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: historical unledgered BSK balance. Drift=+500.0000.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = 'c5de8275-e4e0-4955-8f23-0248f5cba905' AND a.symbol = 'BSK';

-- User 3: balasubbaiah1980@gmail.com — drift +403.0000
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT '64c9ddf9-755f-4abf-b9cf-225dcfdff99c', 'BSK', 403.0000, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: historical unledgered BSK balance. Drift=+403.0000.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = '64c9ddf9-755f-4abf-b9cf-225dcfdff99c' AND a.symbol = 'BSK';

-- User 4: suryanarayanayarra234@gmail.com — drift +235.0928
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT 'd9a5d184-82d4-4fd2-8a14-dcba262399d2', 'BSK', 235.0928, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: historical unledgered BSK balance. Drift=+235.0928.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = 'd9a5d184-82d4-4fd2-8a14-dcba262399d2' AND a.symbol = 'BSK';

-- User 5: ramakrishnadharavat@gmail.com — drift +200.0000
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT 'da546ee5-d918-42df-9255-dcd8c83b08c9', 'BSK', 200.0000, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: historical unledgered BSK balance. Drift=+200.0000.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = 'da546ee5-d918-42df-9255-dcd8c83b08c9' AND a.symbol = 'BSK';

-- User 6: kbshadu@gmail.com — drift +63.7052
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT '767c05f3-097c-403b-bf76-a56314e54dd8', 'BSK', 63.7052, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: historical unledgered BSK balance. Drift=+63.7052.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = '767c05f3-097c-403b-bf76-a56314e54dd8' AND a.symbol = 'BSK';

-- User 7: prashanthitheppavari@gmail.com — drift +10.0000
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT '2df17413-6455-4718-b089-63e721b075f3', 'BSK', 10.0000, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: historical unledgered BSK balance. Drift=+10.0000.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = '2df17413-6455-4718-b089-63e721b075f3' AND a.symbol = 'BSK';

-- User 8: karumuru.raju007@gmail.com — drift -395.0000 (ledger excess, wallet=0)
INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, balance_available_after, balance_locked_after, entry_type, reference_type, notes)
SELECT '1d559e04-23c8-4d8e-b63b-95cfd0f77ebb', 'BSK', -395.0000, 0, wb.available, wb.locked, 'ADJUSTMENT', 'reconciliation_correction',
  'Corrective adjustment: ledger exceeds wallet by 395 BSK. Historical over-ledgered entries.'
FROM wallet_balances wb JOIN assets a ON a.id = wb.asset_id WHERE wb.user_id = '1d559e04-23c8-4d8e-b63b-95cfd0f77ebb' AND a.symbol = 'BSK';

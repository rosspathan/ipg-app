-- 1. Correct palinaganesh6's balance (debit 8.442 USDT)
UPDATE wallet_balances 
SET available = GREATEST(0, available - 8.442),
    updated_at = now()
WHERE user_id = '74a03ba9-caf4-4a00-a7a5-b7a0d76d3e89'
  AND asset_id = (SELECT id FROM assets WHERE symbol = 'USDT');

-- 2. Credit muddadalucky972 with the correct 14.5 USDT deposit
UPDATE wallet_balances 
SET available = available + 14.5,
    updated_at = now()
WHERE user_id = '66f0cb12-5b60-4b32-88bb-f3cf5a45a9e9'
  AND asset_id = (SELECT id FROM assets WHERE symbol = 'USDT');

-- 3. Mark the incorrect custodial_deposits record as failed
UPDATE custodial_deposits 
SET status = 'failed'
WHERE id = '59a184c8-d693-42c6-b56c-c21d02b3f8cb';

-- 4. Log to admin_notifications for audit trail (using valid type)
INSERT INTO admin_notifications (type, title, message, priority, metadata)
VALUES (
  'system',
  'Balance Correction: Deposit Attribution Fix',
  'Corrected incorrectly attributed deposit. Debited 8.442 USDT from palinaganesh6 and credited 14.5 USDT to muddadalucky972 (rightful owner of wallet 0x24dBd62E).',
  'high',
  jsonb_build_object(
    'tx_hash', '0xa269a811c46e8f4e02c2b9a9da54b6a70acb9f3bdc95a20b18b7d79e88a58dbc',
    'wrong_user', 'palinaganesh6',
    'correct_user', 'muddadalucky972',
    'amount_debited', 8.442,
    'amount_credited', 14.5,
    'corrected_at', now()
  )
);
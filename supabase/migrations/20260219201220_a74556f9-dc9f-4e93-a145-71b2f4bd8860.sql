
-- CORRECTION: 0.63 IPG was credited to wrong user (74852950 / banalasathish143@gmail.com)
-- It should have gone to 36a55640 / banalasathish143143@gmail.com

-- Step 1: Reverse 0.63 from wrong user (74852950)
UPDATE user_staking_accounts
SET available_balance = available_balance - 0.63,
    updated_at = now()
WHERE user_id = '74852950-2a85-4079-8d28-877e561c255a';

-- Step 2: Add reversal ledger entry for wrong user
INSERT INTO crypto_staking_ledger (
  user_id, staking_account_id, tx_type, amount, currency,
  fee_amount, balance_before, balance_after, tx_hash, notes, created_at
)
SELECT 
  '74852950-2a85-4079-8d28-877e561c255a',
  id,
  'withdraw',
  0.63,
  'IPG',
  0,
  0.63,
  0,
  'ADMIN-REVERSAL-0x1ee37bd0ad',
  'Admin correction: 0.63 IPG credited here by mistake. Real depositor: banalasathish143143@gmail.com (36a55640)',
  now()
FROM user_staking_accounts
WHERE user_id = '74852950-2a85-4079-8d28-877e561c255a';

-- Step 3: Credit 0.63 to correct user (36a55640)
UPDATE user_staking_accounts
SET available_balance = available_balance + 0.63,
    updated_at = now()
WHERE user_id = '36a55640-da73-43a5-a544-93e5ec504e7c';

-- Step 4: Add deposit ledger entry for correct user
INSERT INTO crypto_staking_ledger (
  user_id, staking_account_id, tx_type, amount, currency,
  fee_amount, balance_before, balance_after, tx_hash, notes, created_at
)
SELECT 
  '36a55640-da73-43a5-a544-93e5ec504e7c',
  id,
  'deposit',
  0.63,
  'IPG',
  0,
  available_balance - 0.63,
  available_balance,
  '0x1ee37bd0ad',
  'Admin correction: 0.63 IPG on-chain deposit from 0x670b9A012493260ba94d4493DEB83Fe8E24C8192 (re-credited to correct user)',
  now()
FROM user_staking_accounts
WHERE user_id = '36a55640-da73-43a5-a544-93e5ec504e7c';

-- Step 5: Add user notification for correct user
INSERT INTO user_notifications (user_id, type, title, message, metadata)
VALUES (
  '36a55640-da73-43a5-a544-93e5ec504e7c',
  'staking_deposit',
  '⬇️ IPG Deposit Credited',
  '0.630000 IPG has been credited to your staking account.',
  '{"amount": 0.63, "tx_hash": "0x1ee37bd0ad", "note": "admin_correction"}'::jsonb
);


-- 1. Zero out the incorrectly credited balance for banalasathish143@gmail.com
UPDATE user_staking_accounts
SET available_balance = 0, updated_at = now()
WHERE user_id = '74852950-2a85-4079-8d28-877e561c255a';

-- 2. Log the reversal using 'withdraw' as the tx_type (debit from account)
INSERT INTO crypto_staking_ledger (
  user_id,
  staking_account_id,
  tx_type,
  amount,
  fee_amount,
  currency,
  balance_before,
  balance_after,
  tx_hash,
  notes
) VALUES (
  '74852950-2a85-4079-8d28-877e561c255a',
  'c06f7ecf-a545-4d39-8524-f4097f518fa1',
  'withdraw',
  1,
  0,
  'IPG',
  1,
  0,
  'ADMIN-REVERSAL-0x0d833bc44a',
  'Admin reversal: 1 IPG incorrectly credited to this account. Real depositor: banalasathish143143@gmail.com (0x670b9A012493260ba94d4493DEB83Fe8E24C8192)'
);

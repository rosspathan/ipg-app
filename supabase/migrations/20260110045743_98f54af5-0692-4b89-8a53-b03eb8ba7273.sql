-- Credit 5 USDT deposit for user 74852950-2a85-4079-8d28-877e561c255a
-- Transaction: 0xb9556743c001ec273c8ed17bda3d88210ae2cc637f7da2580183abae6e1aaaf8

-- 1. Insert the custodial deposit record
INSERT INTO custodial_deposits (
  user_id,
  tx_hash,
  asset_id,
  amount,
  from_address,
  status,
  credited_at
) VALUES (
  '74852950-2a85-4079-8d28-877e561c255a',
  '0xb9556743c001ec273c8ed17bda3d88210ae2cc637f7da2580183abae6e1aaaf8',
  'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0',
  5,
  '0x97e07a738600a6f13527fae0cacb0a592fbeafb1',
  'credited',
  NOW()
) ON CONFLICT (tx_hash) DO NOTHING;

-- 2. Upsert the wallet balance
INSERT INTO wallet_balances (user_id, asset_id, available, locked, updated_at)
VALUES (
  '74852950-2a85-4079-8d28-877e561c255a',
  'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0',
  5,
  0,
  NOW()
)
ON CONFLICT (user_id, asset_id) 
DO UPDATE SET 
  available = wallet_balances.available + 5,
  updated_at = NOW();
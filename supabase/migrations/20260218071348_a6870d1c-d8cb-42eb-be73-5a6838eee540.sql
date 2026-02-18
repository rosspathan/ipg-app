
-- Credit the verified on-chain deposit: tx 0xc563b5...8e51da
-- Amount: 21.26612124 USDT from user wallet to hot wallet 0x4a6A2066...

-- 1. Update onchain_balances to reflect tokens left the wallet (now 0)
UPDATE onchain_balances
SET balance = 0, last_synced_at = now()
WHERE user_id = '74852950-2a85-4079-8d28-877e561c255a'
  AND asset_id = 'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0';

-- 2. Credit trading balance
INSERT INTO wallet_balances (user_id, asset_id, available, locked)
VALUES ('74852950-2a85-4079-8d28-877e561c255a', 'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0', 21.26612124, 0)
ON CONFLICT (user_id, asset_id) 
DO UPDATE SET available = wallet_balances.available + 21.26612124, updated_at = now();

-- 3. Record the transfer for audit trail
INSERT INTO trading_balance_transfers (user_id, asset_id, direction, amount, status, completed_at)
VALUES ('74852950-2a85-4079-8d28-877e561c255a', 'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0', 'to_trading', 21.26612124, 'completed', now());

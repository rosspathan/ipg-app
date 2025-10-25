-- Unlock withdrawals for user
UPDATE profiles 
SET withdrawal_locked = false 
WHERE user_id = '364415f7-fa4b-42ff-b416-8eab8e4402c4';

-- Credit 1 USDT balance to user
INSERT INTO wallet_balances (user_id, asset_id, available, locked, updated_at)
SELECT 
  '364415f7-fa4b-42ff-b416-8eab8e4402c4'::uuid,
  id,
  1,
  0,
  now()
FROM assets 
WHERE symbol = 'USDT' AND network = 'BEP20'
ON CONFLICT (user_id, asset_id) 
DO UPDATE SET
  available = wallet_balances.available + 1,
  updated_at = now();
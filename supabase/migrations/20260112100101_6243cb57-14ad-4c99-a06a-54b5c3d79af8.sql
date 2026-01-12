-- Fix orphaned locked balance for user narsimhaaenugula1986@gmail.com
-- User has 39.2251 USDT locked but 0 pending orders

-- Fix: Set locked to 0 and move all to available for this specific user
UPDATE wallet_balances
SET locked = 0,
    available = available + locked,
    updated_at = NOW()
WHERE user_id = 'd94fe876-df16-42f9-bcbe-6b72f7c6c337'
  AND asset_id IN (SELECT id FROM assets WHERE symbol = 'USDT')
  AND locked > 0;
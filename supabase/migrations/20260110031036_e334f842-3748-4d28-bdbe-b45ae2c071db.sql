-- Clean up fake trading balances from legacy sync-onchain-to-trading
-- These balances were created by the old model and have signature value ~0.02884699

-- First, cancel any open orders for users with fake balances (to prevent locked balance mismatch)
UPDATE orders
SET status = 'cancelled', updated_at = now()
WHERE status IN ('pending', 'open', 'partially_filled')
  AND user_id IN (
    SELECT DISTINCT user_id FROM wallet_balances
    WHERE available BETWEEN 0.0288 AND 0.0290
      AND locked = 0
      AND user_id != '3796eebf-e515-4885-895f-ca74903cca86'
  );

-- Delete all fake balances with the signature value (preserving market maker)
DELETE FROM wallet_balances
WHERE available BETWEEN 0.0288 AND 0.0290
  AND locked = 0
  AND user_id != '3796eebf-e515-4885-895f-ca74903cca86';

-- Also clean up any zero or near-zero balances that serve no purpose
DELETE FROM wallet_balances
WHERE available < 0.000001
  AND locked < 0.000001
  AND user_id != '3796eebf-e515-4885-895f-ca74903cca86';
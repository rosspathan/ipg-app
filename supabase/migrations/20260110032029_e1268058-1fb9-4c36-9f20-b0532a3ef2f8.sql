-- Complete Trading Ledger Reset
-- Cancel ALL open orders except market maker
UPDATE orders
SET status = 'cancelled', 
    cancelled_at = now(), 
    updated_at = now()
WHERE status IN ('pending', 'open', 'partially_filled')
  AND user_id != '3796eebf-e515-4885-895f-ca74903cca86';

-- Delete ALL wallet_balances except market maker (all are fake since no real deposits exist)
DELETE FROM wallet_balances
WHERE user_id != '3796eebf-e515-4885-895f-ca74903cca86';

-- Clear pending trading_balance_transfers that will never complete
DELETE FROM trading_balance_transfers
WHERE status IN ('pending', 'awaiting_deposit');
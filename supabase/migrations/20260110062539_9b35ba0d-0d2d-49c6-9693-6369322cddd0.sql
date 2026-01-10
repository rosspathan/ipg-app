-- Credit 10 USDT back to user's wallet balance (failed refund from withdrawal ca910507-4167-4b10-a82f-11ce8e332f0a)
UPDATE wallet_balances
SET 
  available = available + 10,
  updated_at = now()
WHERE user_id = 'b69ebce6-2608-482b-b0ed-cb9001e7d41f'
  AND asset_id = 'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0';
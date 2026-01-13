-- Correct palinaganesh6's balance (debit 8.442 USDT) - using correct user_id
UPDATE wallet_balances 
SET available = GREATEST(0, available - 8.442),
    updated_at = now()
WHERE user_id = '73c18943-2d36-45ff-81aa-d2e38f09a86b'
  AND asset_id = (SELECT id FROM assets WHERE symbol = 'USDT');

-- Credit muddadalucky972 with the correct 14.5 USDT deposit - using correct user_id
UPDATE wallet_balances 
SET available = available + 14.5,
    updated_at = now()
WHERE user_id = 'b0d4504d-9022-4507-871a-c9806c40b066'
  AND asset_id = (SELECT id FROM assets WHERE symbol = 'USDT');
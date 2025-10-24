-- Credit the 1 USDT deposit for user 364415f7-fa4b-42ff-b416-8eab8e4402c4
-- Transaction: 0x6544f08acce2cdd61275e403d57ed5edbb989147b147554cfba863fed6462fd5

WITH usdt_asset AS (
  SELECT id FROM assets 
  WHERE symbol = 'USDT' 
  AND network ILIKE '%bsc%'
  LIMIT 1
)
INSERT INTO deposits (
  user_id,
  asset_id,
  amount,
  tx_hash,
  network,
  status,
  confirmations,
  required_confirmations,
  created_at
)
SELECT 
  '364415f7-fa4b-42ff-b416-8eab8e4402c4'::uuid,
  id,
  1.0,
  '0x6544f08acce2cdd61275e403d57ed5edbb989147b147554cfba863fed6462fd5',
  'bsc',
  'confirmed',
  225286,
  2,
  '2025-01-22 08:08:08+00'::timestamptz
FROM usdt_asset
ON CONFLICT (tx_hash) DO NOTHING;
-- Enable realtime for wallet_balances (Critical fix)
ALTER TABLE wallet_balances REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_balances;

-- Fix IPG logo path
UPDATE assets 
SET logo_url = '/assets/ipg.png'
WHERE symbol = 'IPG' AND network = 'BEP20';

-- Add deposit record for audit trail
INSERT INTO deposits (user_id, asset_id, amount, network, status, tx_hash, created_at, credited_at)
SELECT 
  '364415f7-fa4b-42ff-b416-8eab8e4402c4'::uuid,
  id,
  1,
  'BEP20',
  'completed',
  'manual-credit-' || NOW()::text,
  NOW(),
  NOW()
FROM assets 
WHERE symbol = 'USDT' AND network = 'BEP20';
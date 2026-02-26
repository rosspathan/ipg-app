
-- Backfill withdrawal records for all stuck to_wallet internal transfers
-- These transfers debited trading balances but never created withdrawal records for on-chain processing
-- Only create for users WITH a registered wallet address

INSERT INTO withdrawals (user_id, asset_id, amount, fee, net_amount, to_address, network, status)
SELECT 
  ibt.user_id,
  a.id as asset_id,
  ibt.amount,
  0 as fee,
  ibt.amount as net_amount,
  COALESCE(p.bsc_wallet_address, p.wallet_address) as to_address,
  'BEP20' as network,
  'processing' as status
FROM internal_balance_transfers ibt
JOIN assets a ON a.symbol = ibt.asset_symbol AND a.is_active = true
JOIN profiles p ON p.user_id = ibt.user_id
WHERE ibt.direction = 'to_wallet' 
  AND ibt.status = 'success' 
  AND ibt.tx_hash IS NULL
  AND COALESCE(p.bsc_wallet_address, p.wallet_address) IS NOT NULL
  AND COALESCE(p.bsc_wallet_address, p.wallet_address) != '';

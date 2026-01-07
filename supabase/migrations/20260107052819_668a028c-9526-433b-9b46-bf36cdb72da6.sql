-- Create unified crypto transactions view for deposits and withdrawals
CREATE OR REPLACE VIEW crypto_transactions AS
SELECT 
  d.id,
  d.user_id,
  d.created_at,
  d.amount,
  a.symbol,
  a.name as asset_name,
  a.logo_url,
  'deposit'::text as transaction_type,
  d.status,
  d.tx_hash,
  d.network,
  d.confirmations,
  d.required_confirmations,
  NULL::text as to_address,
  NULL::numeric as fee,
  d.credited_at as completed_at
FROM deposits d
LEFT JOIN assets a ON d.asset_id = a.id
UNION ALL
SELECT 
  w.id,
  w.user_id,
  w.created_at,
  w.amount,
  a.symbol,
  a.name as asset_name,
  a.logo_url,
  'withdrawal'::text as transaction_type,
  w.status,
  w.tx_hash,
  w.network,
  NULL::integer as confirmations,
  12 as required_confirmations,
  w.to_address,
  w.fee,
  w.approved_at as completed_at
FROM withdrawals w
LEFT JOIN assets a ON w.asset_id = a.id;

-- Grant access to the view
GRANT SELECT ON crypto_transactions TO authenticated;
GRANT SELECT ON crypto_transactions TO anon;

-- Backfill wallet_address in profiles from wallets_user table for users without one
UPDATE profiles p
SET 
  wallet_address = COALESCE(p.wallet_address, wu.address),
  bsc_wallet_address = COALESCE(p.bsc_wallet_address, wu.address)
FROM wallets_user wu
WHERE wu.user_id = p.user_id
  AND wu.address IS NOT NULL
  AND wu.chain IN ('bsc', 'bep20', 'BSC', 'BEP20', 'bsc-mainnet')
  AND (p.wallet_address IS NULL OR p.bsc_wallet_address IS NULL);

-- Mark deposits with invalid tx_hash as failed
UPDATE deposits
SET 
  status = 'failed',
  updated_at = NOW()
WHERE 
  status IN ('pending', 'confirming')
  AND (tx_hash IS NULL OR LENGTH(tx_hash) < 66)
  AND created_at < NOW() - INTERVAL '24 hours';
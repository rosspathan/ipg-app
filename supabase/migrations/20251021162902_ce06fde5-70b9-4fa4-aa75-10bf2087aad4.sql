-- Backfill profiles.wallet_address from user_wallets for users missing addresses
UPDATE profiles p
SET 
  wallet_address = uw.wallet_address,
  wallet_addresses = jsonb_build_object(
    'evm', jsonb_build_object(
      'mainnet', uw.wallet_address,
      'bsc', uw.wallet_address
    )
  ),
  updated_at = now()
FROM (
  SELECT DISTINCT ON (user_id) 
    user_id, 
    wallet_address
  FROM user_wallets
  WHERE wallet_address IS NOT NULL
  ORDER BY user_id, last_used_at DESC NULLS LAST, created_at DESC
) uw
WHERE p.user_id = uw.user_id
  AND (p.wallet_address IS NULL OR p.wallet_address = '')
  AND uw.wallet_address IS NOT NULL;
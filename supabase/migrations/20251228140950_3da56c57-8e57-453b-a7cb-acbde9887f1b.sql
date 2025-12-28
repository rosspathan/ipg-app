-- Backfill bsc_wallet_address for users who have wallet_address but missing bsc_wallet_address
UPDATE profiles 
SET bsc_wallet_address = wallet_address 
WHERE wallet_address IS NOT NULL 
  AND bsc_wallet_address IS NULL;

-- Also backfill from wallet_addresses JSON if it contains addresses
UPDATE profiles 
SET bsc_wallet_address = COALESCE(
  wallet_addresses->>'bsc-mainnet',
  wallet_addresses->>'evm-mainnet',
  wallet_addresses->'evm'->>'mainnet',
  wallet_addresses->'evm'->>'bsc'
)
WHERE bsc_wallet_address IS NULL 
  AND wallet_addresses IS NOT NULL
  AND wallet_addresses != '{}'::jsonb
  AND (
    wallet_addresses->>'bsc-mainnet' IS NOT NULL OR
    wallet_addresses->>'evm-mainnet' IS NOT NULL OR
    wallet_addresses->'evm'->>'mainnet' IS NOT NULL OR
    wallet_addresses->'evm'->>'bsc' IS NOT NULL
  );
-- CRITICAL SECURITY FIX: Clear duplicate wallet addresses and add unique constraint
-- This prevents multiple users from sharing the same wallet address

-- Step 1: Identify and clear duplicate wallet addresses (keep oldest entry)
-- First, let's clear the known test wallet address from all users except the oldest
UPDATE profiles 
SET wallet_address = NULL, updated_at = now()
WHERE wallet_address ILIKE '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
AND user_id NOT IN (
  SELECT user_id FROM profiles 
  WHERE wallet_address ILIKE '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
  ORDER BY created_at ASC
  LIMIT 1
);

-- Step 2: Clear any other duplicate wallet addresses (keep oldest for each address)
WITH duplicates AS (
  SELECT wallet_address, user_id,
    ROW_NUMBER() OVER (PARTITION BY LOWER(wallet_address) ORDER BY created_at ASC) as rn
  FROM profiles
  WHERE wallet_address IS NOT NULL
)
UPDATE profiles p
SET wallet_address = NULL, updated_at = now()
FROM duplicates d
WHERE p.user_id = d.user_id AND d.rn > 1;

-- Step 3: Clean up encrypted_wallet_backups table for duplicate addresses
DELETE FROM encrypted_wallet_backups
WHERE wallet_address ILIKE '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
AND id NOT IN (
  SELECT id FROM encrypted_wallet_backups 
  WHERE wallet_address ILIKE '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
  ORDER BY created_at ASC
  LIMIT 1
);

-- Step 4: Add unique constraint on wallet_address in profiles table
-- This prevents future duplicates
DROP INDEX IF EXISTS profiles_wallet_address_unique_idx;
CREATE UNIQUE INDEX profiles_wallet_address_unique_idx 
ON profiles (LOWER(wallet_address)) 
WHERE wallet_address IS NOT NULL;

-- Step 5: Add unique constraint on wallet_address in encrypted_wallet_backups table
DROP INDEX IF EXISTS encrypted_wallet_backups_address_unique_idx;
CREATE UNIQUE INDEX encrypted_wallet_backups_address_unique_idx 
ON encrypted_wallet_backups (LOWER(wallet_address)) 
WHERE wallet_address IS NOT NULL;
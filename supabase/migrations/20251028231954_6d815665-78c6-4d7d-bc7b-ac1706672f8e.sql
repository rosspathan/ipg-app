-- Fix inflated IPG balance from invalid auto-discovered deposit
-- User: 364415f7-fa4b-42ff-b416-8eab8e4402c4
-- Asset: IPG (e4ce7e45-5215-4a84-8189-3139f55c8983)
-- Invalid deposit: ecf67793-1221-4618-b5b9-3bc409d10a92

-- Step 1: Reverse the bogus credit (9,999,907.94669644 IPG)
-- Note: total is a generated column (available + locked), so we only update available
UPDATE public.wallet_balances
SET 
  available = available - 9999907.94669644,
  updated_at = now()
WHERE user_id = '364415f7-fa4b-42ff-b416-8eab8e4402c4'
  AND asset_id = 'e4ce7e45-5215-4a84-8189-3139f55c8983';

-- Step 2: Mark the invalid deposit as failed
UPDATE public.deposits
SET 
  status = 'failed',
  updated_at = now()
WHERE id = 'ecf67793-1221-4618-b5b9-3bc409d10a92';

-- Step 3: Add max_deposit_per_tx column to assets table for sanity checks
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS max_deposit_per_tx NUMERIC DEFAULT NULL;

COMMENT ON COLUMN public.assets.max_deposit_per_tx IS 'Maximum allowed deposit amount per transaction (null = no limit). Used to prevent auto-crediting of invalid/absurd amounts.';

-- Step 4: Set reasonable defaults for existing assets
-- IPG: max 100,000 per transaction
UPDATE public.assets
SET max_deposit_per_tx = 100000
WHERE symbol = 'IPG';

-- USDT: max 50,000 per transaction
UPDATE public.assets
SET max_deposit_per_tx = 50000
WHERE symbol = 'USDT';
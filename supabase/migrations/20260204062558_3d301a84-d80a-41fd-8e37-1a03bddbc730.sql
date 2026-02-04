-- Update migration wallet address to match the actual wallet being used
-- Based on BscScan screenshot showing 0x2Cf8BE4237de51C5F35e1D0A35adf4137Aecd899
UPDATE public.bsk_migration_settings 
SET migration_wallet_address = '0x2Cf8BE4237de51C5F35e1D0A35adf4137Aecd899'
WHERE id IS NOT NULL;

-- Also lower the minimum gas threshold since 0.01 BNB is enough for a few transactions
UPDATE public.bsk_migration_settings 
SET min_gas_balance_bnb = 0.005
WHERE id IS NOT NULL;
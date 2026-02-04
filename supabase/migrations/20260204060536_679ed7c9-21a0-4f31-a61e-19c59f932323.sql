-- Set the migration wallet address from the existing hot wallet
UPDATE public.bsk_migration_settings 
SET migration_wallet_address = '0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5'
WHERE migration_wallet_address IS NULL;
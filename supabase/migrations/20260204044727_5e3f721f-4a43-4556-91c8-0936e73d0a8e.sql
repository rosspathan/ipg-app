-- Add migration fee columns to bsk_onchain_migrations table
ALTER TABLE public.bsk_onchain_migrations 
ADD COLUMN IF NOT EXISTS migration_fee_bsk NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS migration_fee_percent NUMERIC DEFAULT 5;
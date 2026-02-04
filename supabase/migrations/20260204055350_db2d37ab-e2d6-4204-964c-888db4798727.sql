-- Add maintenance mode fields to bsk_migration_settings
ALTER TABLE public.bsk_migration_settings 
ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS maintenance_message TEXT;

-- Add migration_wallet_address field for explicit configuration
ALTER TABLE public.bsk_migration_settings 
ADD COLUMN IF NOT EXISTS migration_wallet_address TEXT;

-- Add private_key_configured tracking (computed on read, not stored)
COMMENT ON TABLE public.bsk_migration_settings IS 'BSK on-chain migration configuration. MIGRATION_WALLET_PRIVATE_KEY must be set as a Supabase secret.';
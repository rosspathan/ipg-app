-- Add username and wallet_addresses to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS wallet_addresses jsonb DEFAULT '{}'::jsonb;

-- Optional: maintain updated_at if column exists
-- (Assumes profiles already has updated_at and trigger)

-- Helpful index for wallet lookups (JSONB)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_profiles_wallet_addresses'
  ) THEN
    CREATE INDEX idx_profiles_wallet_addresses 
      ON public.profiles USING GIN (wallet_addresses);
  END IF;
END $$;
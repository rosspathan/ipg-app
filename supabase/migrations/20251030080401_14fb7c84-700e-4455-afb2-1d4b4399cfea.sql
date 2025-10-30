-- Add missing BSC wallet address field to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bsc_wallet_address text;

-- Index for faster lookups by wallet address
CREATE INDEX IF NOT EXISTS idx_profiles_bsc_wallet_address
  ON public.profiles (bsc_wallet_address);

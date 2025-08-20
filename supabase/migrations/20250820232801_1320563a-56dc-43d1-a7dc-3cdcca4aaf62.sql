-- Add wallet_address column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Create index for wallet_address lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address);

-- Add constraint to ensure wallet_address is unique (optional but recommended)
ALTER TABLE public.profiles ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address);
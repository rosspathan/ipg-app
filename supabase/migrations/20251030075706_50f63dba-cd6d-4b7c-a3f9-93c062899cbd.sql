-- Add bsc_wallet_address column to profiles table for BSC wallet integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bsc_wallet_address text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_bsc_wallet 
ON public.profiles(bsc_wallet_address) 
WHERE bsc_wallet_address IS NOT NULL;

COMMENT ON COLUMN public.profiles.bsc_wallet_address IS 'User BSC (Binance Smart Chain) wallet address for native BNB balance sync';
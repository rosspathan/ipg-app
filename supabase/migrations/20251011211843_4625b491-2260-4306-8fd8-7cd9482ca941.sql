-- Enable multiple wallets per user account
-- This allows users to link multiple Web3 wallets to one Web2 account

-- Drop the old unique constraint that limited users to one wallet
ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS unique_user_wallet;

-- Remove the UNIQUE constraint from wallet_address column
-- (we'll replace it with a composite unique constraint)
ALTER TABLE public.user_wallets DROP CONSTRAINT IF EXISTS user_wallets_wallet_address_key;

-- Add composite unique constraint: one user can have multiple wallets,
-- but each wallet can only belong to one user
ALTER TABLE public.user_wallets 
ADD CONSTRAINT unique_user_wallet_address UNIQUE (user_id, wallet_address);

-- Add index for efficient wallet lookups
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_wallet_address ON public.user_wallets(lower(wallet_address));

-- Update profiles table to store primary wallet address
-- (the first wallet added will be considered primary)
COMMENT ON COLUMN public.profiles.wallet_address IS 'Primary wallet address for this user account';

-- Add function to get all wallets for a user
CREATE OR REPLACE FUNCTION public.get_user_wallets(p_user_id UUID)
RETURNS TABLE (
  wallet_address TEXT,
  public_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    uw.wallet_address,
    uw.public_key,
    uw.created_at,
    uw.last_used_at,
    (uw.wallet_address = p.wallet_address) as is_primary
  FROM public.user_wallets uw
  LEFT JOIN public.profiles p ON p.user_id = uw.user_id
  WHERE uw.user_id = p_user_id
  ORDER BY uw.created_at ASC;
$$;
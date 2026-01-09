-- Create onchain_balances table for display purposes only (not for trading)
CREATE TABLE public.onchain_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  balance DECIMAL NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_id)
);

-- Enable RLS
ALTER TABLE public.onchain_balances ENABLE ROW LEVEL SECURITY;

-- Users can only see their own on-chain balances
CREATE POLICY "Users can view their own onchain balances"
ON public.onchain_balances
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all balances (for sync function)
CREATE POLICY "Service role can manage onchain balances"
ON public.onchain_balances
FOR ALL
USING (true)
WITH CHECK (true);

-- Clean up orphan wallet_balances that have no corresponding custodial deposit
-- These are fake balances created by the sync function
DELETE FROM public.wallet_balances wb
WHERE NOT EXISTS (
  SELECT 1 FROM public.custodial_deposits cd 
  WHERE cd.user_id = wb.user_id 
  AND cd.status = 'credited'
)
-- Preserve any balances that have locked amounts (active trades)
AND wb.locked = 0;

-- Add index for faster queries
CREATE INDEX idx_onchain_balances_user_id ON public.onchain_balances(user_id);
CREATE INDEX idx_onchain_balances_asset_id ON public.onchain_balances(asset_id);
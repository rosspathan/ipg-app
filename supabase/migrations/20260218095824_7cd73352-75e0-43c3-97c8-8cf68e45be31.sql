
-- Dedicated table for internal balance transfers (on-chain <-> trading)
CREATE TABLE public.internal_balance_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  asset_symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('to_trading', 'to_wallet')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  fee NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  tx_hash TEXT,
  reference_id TEXT,
  balance_after NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user queries
CREATE INDEX idx_internal_balance_transfers_user ON public.internal_balance_transfers(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.internal_balance_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers
CREATE POLICY "Users can view own internal transfers"
ON public.internal_balance_transfers FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own transfers
CREATE POLICY "Users can insert own internal transfers"
ON public.internal_balance_transfers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own transfers (status updates)
CREATE POLICY "Users can update own internal transfers"
ON public.internal_balance_transfers FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_internal_balance_transfers_updated_at
BEFORE UPDATE ON public.internal_balance_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

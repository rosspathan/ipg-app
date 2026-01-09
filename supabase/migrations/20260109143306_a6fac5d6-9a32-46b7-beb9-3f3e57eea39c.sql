-- Table for tracking custodial deposits to hot wallet
CREATE TABLE IF NOT EXISTS public.custodial_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  amount NUMERIC NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'credited', 'failed')),
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 15,
  credited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for tracking custodial withdrawals from hot wallet
CREATE TABLE IF NOT EXISTS public.custodial_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  amount NUMERIC NOT NULL,
  to_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  fee_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.custodial_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custodial_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custodial_deposits
CREATE POLICY "Users can view their own custodial deposits"
ON public.custodial_deposits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert custodial deposits"
ON public.custodial_deposits FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role can update custodial deposits"
ON public.custodial_deposits FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies for custodial_withdrawals
CREATE POLICY "Users can view their own custodial withdrawals"
ON public.custodial_withdrawals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custodial withdrawals"
ON public.custodial_withdrawals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update custodial withdrawals"
ON public.custodial_withdrawals FOR UPDATE
TO authenticated
USING (true);

-- Index for efficient lookups
CREATE INDEX idx_custodial_deposits_user_status ON public.custodial_deposits(user_id, status);
CREATE INDEX idx_custodial_deposits_tx_hash ON public.custodial_deposits(tx_hash);
CREATE INDEX idx_custodial_withdrawals_user_status ON public.custodial_withdrawals(user_id, status);
CREATE INDEX idx_custodial_withdrawals_status ON public.custodial_withdrawals(status);
-- Create settlement_requests table for P2P on-chain settlements
CREATE TABLE public.settlement_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL,
  user_id UUID NOT NULL,
  counterparty_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('send', 'receive')),
  asset_symbol TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed', 'expired')),
  tx_hash TEXT,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settlement_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own settlement requests
CREATE POLICY "Users can view own settlement requests"
  ON public.settlement_requests
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = counterparty_id);

-- Users can update their own pending settlement requests (to submit tx_hash)
CREATE POLICY "Users can update own pending settlements"
  ON public.settlement_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Create index for efficient queries
CREATE INDEX idx_settlement_requests_user_id ON public.settlement_requests(user_id);
CREATE INDEX idx_settlement_requests_trade_id ON public.settlement_requests(trade_id);
CREATE INDEX idx_settlement_requests_status ON public.settlement_requests(status);

-- Update timestamp trigger
CREATE TRIGGER update_settlement_requests_updated_at
  BEFORE UPDATE ON public.settlement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
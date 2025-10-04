-- Create BSK transfers table for user-to-user transfers
CREATE TABLE public.bsk_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  amount_bsk NUMERIC NOT NULL CHECK (amount_bsk > 0),
  sender_balance_before NUMERIC NOT NULL,
  sender_balance_after NUMERIC NOT NULL,
  recipient_balance_before NUMERIC NOT NULL,
  recipient_balance_after NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  transaction_ref TEXT UNIQUE DEFAULT 'TRF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12))
);

-- Enable RLS
ALTER TABLE public.bsk_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers (sent or received)
CREATE POLICY "Users can view own transfers"
ON public.bsk_transfers
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can create transfers (as sender)
CREATE POLICY "Users can create transfers"
ON public.bsk_transfers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Admin can view all transfers
CREATE POLICY "Admin can view all transfers"
ON public.bsk_transfers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_bsk_transfers_sender ON public.bsk_transfers(sender_id, created_at DESC);
CREATE INDEX idx_bsk_transfers_recipient ON public.bsk_transfers(recipient_id, created_at DESC);
CREATE INDEX idx_bsk_transfers_status ON public.bsk_transfers(status);

-- Create trigger for updated_at
CREATE TRIGGER update_bsk_transfers_updated_at
  BEFORE UPDATE ON public.bsk_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
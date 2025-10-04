-- Create BSK withdrawal requests table
CREATE TABLE IF NOT EXISTS public.bsk_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_bsk NUMERIC NOT NULL CHECK (amount_bsk > 0),
  withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('bank', 'crypto')),
  
  -- Bank withdrawal details
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  account_holder_name TEXT,
  
  -- Crypto withdrawal details
  crypto_symbol TEXT,
  crypto_address TEXT,
  crypto_network TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bsk_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own requests
CREATE POLICY "Users can create own withdrawal requests"
ON public.bsk_withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawal requests"
ON public.bsk_withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all requests
CREATE POLICY "Admins can manage all withdrawal requests"
ON public.bsk_withdrawal_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_bsk_withdrawal_requests_user_id ON public.bsk_withdrawal_requests(user_id);
CREATE INDEX idx_bsk_withdrawal_requests_status ON public.bsk_withdrawal_requests(status);

-- Add trigger for updated_at
CREATE TRIGGER update_bsk_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.bsk_withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
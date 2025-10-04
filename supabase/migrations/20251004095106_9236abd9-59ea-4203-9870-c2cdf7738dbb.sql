-- Create crypto conversion settings table for admin wallet addresses
CREATE TABLE IF NOT EXISTS public.crypto_conversion_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_symbol TEXT NOT NULL UNIQUE,
  crypto_name TEXT NOT NULL,
  admin_wallet_address TEXT NOT NULL,
  network TEXT NOT NULL,
  conversion_rate_bsk NUMERIC NOT NULL DEFAULT 1,
  min_amount NUMERIC NOT NULL DEFAULT 0.01,
  max_amount NUMERIC NOT NULL DEFAULT 1000,
  fee_percent NUMERIC NOT NULL DEFAULT 0,
  fee_fixed NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create crypto conversion requests table
CREATE TABLE IF NOT EXISTS public.crypto_conversion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  crypto_amount NUMERIC NOT NULL,
  bsk_amount NUMERIC NOT NULL,
  transaction_hash TEXT NOT NULL,
  blockchain_explorer_link TEXT,
  screenshot_url TEXT,
  admin_wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_conversion_status CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'completed'))
);

-- Enable RLS
ALTER TABLE public.crypto_conversion_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_conversion_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crypto_conversion_settings
CREATE POLICY "Admin can manage conversion settings"
  ON public.crypto_conversion_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active conversion settings"
  ON public.crypto_conversion_settings
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for crypto_conversion_requests
CREATE POLICY "Users can create own conversion requests"
  ON public.crypto_conversion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own conversion requests"
  ON public.crypto_conversion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all conversion requests"
  ON public.crypto_conversion_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update conversion requests"
  ON public.crypto_conversion_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for conversion proofs (reuse purchase-proofs bucket)
CREATE POLICY "Users can upload conversion proofs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'purchase-proofs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes
CREATE INDEX idx_crypto_conversion_status ON public.crypto_conversion_requests(status);
CREATE INDEX idx_crypto_conversion_user ON public.crypto_conversion_requests(user_id);
CREATE INDEX idx_crypto_conversion_created ON public.crypto_conversion_requests(created_at DESC);
CREATE INDEX idx_crypto_conversion_symbol ON public.crypto_conversion_requests(crypto_symbol);

-- Insert default crypto options
INSERT INTO public.crypto_conversion_settings (crypto_symbol, crypto_name, admin_wallet_address, network, conversion_rate_bsk, instructions)
VALUES 
  ('BTC', 'Bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'Bitcoin Mainnet', 100000, 'Send BTC to this address and provide transaction proof'),
  ('ETH', 'Ethereum', '0x0000000000000000000000000000000000000000', 'Ethereum Mainnet', 10000, 'Send ETH to this address and provide transaction proof'),
  ('USDT', 'Tether', '0x0000000000000000000000000000000000000000', 'BEP20', 1, 'Send USDT (BEP20) to this address and provide transaction proof')
ON CONFLICT (crypto_symbol) DO NOTHING;

-- Add comments
COMMENT ON TABLE public.crypto_conversion_settings IS 'Admin configuration for crypto-to-BSK conversion system';
COMMENT ON TABLE public.crypto_conversion_requests IS 'User requests to convert cryptocurrency to BSK tokens';
COMMENT ON COLUMN public.crypto_conversion_requests.status IS 'pending, reviewing, approved, rejected, completed';
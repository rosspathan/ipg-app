-- Create admin settings table for BEP20 address
CREATE TABLE IF NOT EXISTS public.bsk_purchase_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_bep20_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_purchase_amount NUMERIC NOT NULL DEFAULT 1000,
  max_purchase_amount NUMERIC NOT NULL DEFAULT 100000,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create manual purchase requests table
CREATE TABLE IF NOT EXISTS public.bsk_manual_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  purchase_amount NUMERIC NOT NULL,
  bscscan_link TEXT NOT NULL,
  screenshot_url TEXT,
  transaction_hash TEXT,
  admin_bep20_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  bsk_amount NUMERIC,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'completed'))
);

-- Enable RLS
ALTER TABLE public.bsk_purchase_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsk_manual_purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bsk_purchase_settings
CREATE POLICY "Admin can manage purchase settings"
  ON public.bsk_purchase_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active settings"
  ON public.bsk_purchase_settings
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for bsk_manual_purchase_requests
CREATE POLICY "Users can create own requests"
  ON public.bsk_manual_purchase_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests"
  ON public.bsk_manual_purchase_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all requests"
  ON public.bsk_manual_purchase_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update requests"
  ON public.bsk_manual_purchase_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for purchase proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-proofs', 'purchase-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for purchase proofs
CREATE POLICY "Users can upload own purchase proofs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'purchase-proofs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own purchase proofs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'purchase-proofs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admin can view all purchase proofs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'purchase-proofs' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Create indexes
CREATE INDEX idx_manual_purchase_status ON public.bsk_manual_purchase_requests(status);
CREATE INDEX idx_manual_purchase_user ON public.bsk_manual_purchase_requests(user_id);
CREATE INDEX idx_manual_purchase_created ON public.bsk_manual_purchase_requests(created_at DESC);

-- Add comments
COMMENT ON TABLE public.bsk_purchase_settings IS 'Admin settings for manual BSK purchase system';
COMMENT ON TABLE public.bsk_manual_purchase_requests IS 'User requests for manual BSK purchases with proof of payment';
COMMENT ON COLUMN public.bsk_manual_purchase_requests.status IS 'pending, reviewing, approved, rejected, completed';
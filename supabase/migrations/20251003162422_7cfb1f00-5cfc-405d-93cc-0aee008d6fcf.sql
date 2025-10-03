-- Add admin BEP20 address to system settings for staking
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'staking_admin_bep20_address',
  '0x0000000000000000000000000000000000000000',
  'BEP20 wallet address where users send staking deposits'
)
ON CONFLICT (key) DO NOTHING;

-- Create user staking submissions table
CREATE TABLE IF NOT EXISTS public.user_staking_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_id UUID NOT NULL REFERENCES public.staking_pools(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  stake_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  screenshot_url TEXT NOT NULL,
  admin_bep20_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_staking_submissions ENABLE ROW LEVEL SECURITY;

-- Users can create their own submissions
CREATE POLICY "Users can create staking submissions"
ON public.user_staking_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own submissions
CREATE POLICY "Users can view own staking submissions"
ON public.user_staking_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all staking submissions"
ON public.user_staking_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update submissions (approve/reject)
CREATE POLICY "Admins can update staking submissions"
ON public.user_staking_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create storage bucket for staking screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('staking-proofs', 'staking-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for screenshots
CREATE POLICY "Users can upload their staking proof screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'staking-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own staking proof screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'staking-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all staking proof screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'staking-proofs' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add index for better query performance
CREATE INDEX idx_staking_submissions_user_id ON public.user_staking_submissions(user_id);
CREATE INDEX idx_staking_submissions_pool_id ON public.user_staking_submissions(pool_id);
CREATE INDEX idx_staking_submissions_status ON public.user_staking_submissions(status);

COMMENT ON TABLE public.user_staking_submissions IS 'Stores user staking submissions with proof of BEP20 transfer';
COMMENT ON COLUMN public.user_staking_submissions.screenshot_url IS 'URL to storage bucket containing transfer proof screenshot';
COMMENT ON COLUMN public.user_staking_submissions.admin_bep20_address IS 'The BEP20 address users were instructed to send funds to';
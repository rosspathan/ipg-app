-- 1) Create enum for KYC status
DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Create kyc_profiles table
CREATE TABLE IF NOT EXISTS public.kyc_profiles (
  user_id UUID PRIMARY KEY,
  status public.kyc_status NOT NULL DEFAULT 'unverified',
  first_name TEXT,
  last_name TEXT,
  id_type TEXT,
  id_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Enable RLS
ALTER TABLE public.kyc_profiles ENABLE ROW LEVEL SECURITY;

-- 4) Policies
-- Admin can manage all
DO $$ BEGIN
  CREATE POLICY "Admin can manage kyc profiles"
  ON public.kyc_profiles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can view their own
DO $$ BEGIN
  CREATE POLICY "Users can view own kyc"
  ON public.kyc_profiles
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can insert their own
DO $$ BEGIN
  CREATE POLICY "Users can insert own kyc"
  ON public.kyc_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can update their own (e.g., resubmission)
DO $$ BEGIN
  CREATE POLICY "Users can update own kyc"
  ON public.kyc_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Trigger to maintain updated_at
DO $$ BEGIN
  CREATE TRIGGER update_kyc_profiles_updated_at
  BEFORE UPDATE ON public.kyc_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Storage bucket for KYC files (public for now to match existing code behavior)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc', 'kyc', true)
ON CONFLICT (id) DO NOTHING;

-- 7) Storage RLS policies for kyc bucket
-- Public can read objects in kyc bucket (aligns with public bucket + existing getPublicUrl usage)
DO $$ BEGIN
  CREATE POLICY "Public read KYC objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can upload their own (path prefix = auth.uid())
DO $$ BEGIN
  CREATE POLICY "Users can upload own KYC"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can update their own KYC
DO $$ BEGIN
  CREATE POLICY "Users can update own KYC"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kyc'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'kyc'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin can manage all objects in kyc bucket
DO $$ BEGIN
  CREATE POLICY "Admin manage KYC objects"
  ON storage.objects FOR ALL
  USING (bucket_id = 'kyc' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'kyc' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

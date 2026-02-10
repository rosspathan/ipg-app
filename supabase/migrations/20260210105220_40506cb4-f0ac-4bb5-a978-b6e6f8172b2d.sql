
-- Make KYC bucket public so uploaded document URLs work reliably
-- Documents are already stored with public URLs in data_json
UPDATE storage.buckets SET public = true WHERE id = 'kyc';

-- Clean up duplicate/conflicting storage policies for kyc bucket
DROP POLICY IF EXISTS "Public read KYC objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own KYC files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC files" ON storage.objects;

-- Keep clean policies:
-- "Users can upload own KYC" (INSERT) - already exists
-- "Users can update own KYC" (UPDATE) - already exists
-- "Admin manage KYC objects" (ALL) - already exists

-- Also ensure kyc_profiles_new has proper update policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own KYC" ON public.kyc_profiles_new;
CREATE POLICY "Users can update own KYC"
  ON public.kyc_profiles_new
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add index for faster admin queries on kyc_profiles_new
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_new_status ON public.kyc_profiles_new(status);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_new_submitted_at ON public.kyc_profiles_new(submitted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_new_user_level ON public.kyc_profiles_new(user_id, level);

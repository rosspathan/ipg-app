
-- Make the KYC storage bucket private to prevent public access to sensitive identity documents
UPDATE storage.buckets SET public = false WHERE id = 'kyc';

-- Ensure RLS policies are in place for the kyc bucket objects
-- Users can upload their own KYC documents
DO $$
BEGIN
  -- Drop existing policies if they exist to recreate cleanly
  DROP POLICY IF EXISTS "Users can upload own KYC documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own KYC documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own KYC documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own KYC documents" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete KYC documents" ON storage.objects;
END $$;

-- Users can upload their own documents (path starts with their user_id)
CREATE POLICY "Users can upload own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents
CREATE POLICY "Users can view own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update/replace their own documents
CREATE POLICY "Users can update own KYC documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc' AND
  public.has_role(auth.uid(), 'admin')
);

-- Admins can delete KYC documents
CREATE POLICY "Admins can delete KYC documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc' AND
  public.has_role(auth.uid(), 'admin')
);

-- Drop existing conflicting policies first
DROP POLICY IF EXISTS "Admin can upload crypto logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update crypto logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete crypto logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view crypto logos" ON storage.objects;

-- Create proper storage policies for crypto-logos bucket
CREATE POLICY "Admin can upload to crypto-logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crypto-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update crypto-logos"  
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'crypto-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete crypto-logos"
ON storage.objects  
FOR DELETE
TO authenticated
USING (bucket_id = 'crypto-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view crypto-logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'crypto-logos');
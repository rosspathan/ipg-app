-- Fix storage policies for crypto-logos bucket to allow admin uploads
CREATE POLICY "Admin can upload crypto logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crypto-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update crypto logos"  
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'crypto-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete crypto logos"
ON storage.objects  
FOR DELETE
TO authenticated
USING (bucket_id = 'crypto-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view crypto logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'crypto-logos');
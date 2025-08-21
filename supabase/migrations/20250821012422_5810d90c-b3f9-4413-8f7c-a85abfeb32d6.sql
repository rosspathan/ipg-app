-- First, let's check if we need to create the admin role type (it should exist from previous migrations)
-- Add admin role to current authenticated user if none exists
DO $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get the current authenticated user ID (this will be the first user to run this)
    SELECT auth.uid() INTO current_user_id;
    
    -- If there's an authenticated user and no admin exists, make them admin
    IF current_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin') THEN
        INSERT INTO user_roles (user_id, role, assigned_by, assigned_at)
        VALUES (current_user_id, 'admin', current_user_id, now());
    END IF;
END
$$;

-- Fix storage RLS policies for crypto-logos bucket
-- Allow admins to upload/manage logos
CREATE POLICY "Admin can upload crypto logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'crypto-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can update crypto logos" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'crypto-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can delete crypto logos" 
ON storage.objects 
FOR DELETE 
USING (
    bucket_id = 'crypto-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view crypto logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'crypto-logos');
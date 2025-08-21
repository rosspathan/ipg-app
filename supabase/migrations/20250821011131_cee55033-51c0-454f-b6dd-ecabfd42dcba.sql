-- Create storage bucket for crypto logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crypto-logos', 
  'crypto-logos', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Create RLS policies for crypto logos bucket
CREATE POLICY "Public can view crypto logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'crypto-logos');

CREATE POLICY "Admin can upload crypto logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'crypto-logos' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can update crypto logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'crypto-logos' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can delete crypto logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'crypto-logos' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update assets table to better handle logo URLs
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS logo_file_path TEXT,
ADD COLUMN IF NOT EXISTS logo_file_name TEXT;

-- Create index for better logo queries
CREATE INDEX IF NOT EXISTS idx_assets_logo_file_path ON public.assets(logo_file_path);

-- Function to get full logo URL
CREATE OR REPLACE FUNCTION public.get_asset_logo_url(asset_row public.assets)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE 
      WHEN asset_row.logo_file_path IS NOT NULL THEN 
        'https://ocblgldglqhlrmtnynmu.supabase.co/storage/v1/object/public/crypto-logos/' || asset_row.logo_file_path
      ELSE asset_row.logo_url
    END;
$$;
-- Fix security warning by updating function with proper search_path
CREATE OR REPLACE FUNCTION public.get_asset_logo_url(asset_row public.assets)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN asset_row.logo_file_path IS NOT NULL THEN 
        'https://ocblgldglqhlrmtnynmu.supabase.co/storage/v1/object/public/crypto-logos/' || asset_row.logo_file_path
      ELSE asset_row.logo_url
    END;
$$;
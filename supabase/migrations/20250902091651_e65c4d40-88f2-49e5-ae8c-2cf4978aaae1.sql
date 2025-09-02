-- Fix search_path for existing functions that don't have it set
CREATE OR REPLACE FUNCTION public.get_masked_profile_data(p_user_id uuid, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_wallet_address text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return full data if user owns the profile or is admin
  IF auth.uid() = p_user_id OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object(
      'email', p_email,
      'phone', p_phone,
      'wallet_address', p_wallet_address,
      'masked', false
    );
  ELSE
    -- Return masked data for security
    RETURN jsonb_build_object(
      'email', CASE WHEN p_email IS NOT NULL THEN '***@***.***' ELSE NULL END,
      'phone', CASE WHEN p_phone IS NOT NULL THEN '***-***-****' ELSE NULL END,
      'wallet_address', CASE WHEN p_wallet_address IS NOT NULL THEN '0x***...***' ELSE NULL END,
      'masked', true
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_asset_logo_url(asset_row assets)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN asset_row.logo_file_path IS NOT NULL THEN 
        'https://ocblgldglqhlrmtnynmu.supabase.co/storage/v1/object/public/crypto-logos/' || asset_row.logo_file_path
      ELSE asset_row.logo_url
    END;
$function$;
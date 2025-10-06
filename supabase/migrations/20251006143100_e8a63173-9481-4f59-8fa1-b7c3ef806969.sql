-- Update handle_new_user_profile to ensure full_name is set from email username for verified users
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
BEGIN
  -- Extract username from email (part before @)
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  
  INSERT INTO public.profiles (user_id, email, full_name, wallet_address)
  VALUES (
    NEW.id, 
    NEW.email, 
    v_full_name,
    NEW.raw_user_meta_data ->> 'wallet_address'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    email = EXCLUDED.email,
    -- Update full_name if it's currently null or empty, or if email was just verified
    full_name = CASE 
      WHEN profiles.full_name IS NULL OR profiles.full_name = '' OR profiles.full_name = 'User' 
      THEN EXCLUDED.full_name
      ELSE profiles.full_name
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;
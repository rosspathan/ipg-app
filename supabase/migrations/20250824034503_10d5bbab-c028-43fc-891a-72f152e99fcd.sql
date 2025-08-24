-- Create profiles for existing web3 users that don't have profiles
INSERT INTO public.profiles (user_id, email, full_name, wallet_address)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  ) as full_name,
  u.raw_user_meta_data ->> 'wallet_address' as wallet_address
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
AND u.email_confirmed_at IS NOT NULL;

-- Update the trigger function to also handle wallet address
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, wallet_address)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'wallet_address'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$$;
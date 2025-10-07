-- Fix profiles table constraints and user creation flow (v2)
-- This resolves "ON CONFLICT specification" error

-- 1. Drop and recreate UNIQUE constraint on user_id with CASCADE
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_key CASCADE;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 2. Re-add foreign key for bsk_loans if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bsk_loans') THEN
    ALTER TABLE public.bsk_loans 
    DROP CONSTRAINT IF EXISTS bsk_loans_user_id_fkey;
    
    ALTER TABLE public.bsk_loans
    ADD CONSTRAINT bsk_loans_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Add missing columns if they don't exist  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. Create index on referral_code for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- 5. Consolidate user creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_full_name text;
  v_referral_code text;
BEGIN
  -- Extract username from email (part before @)
  v_username := LOWER(REGEXP_REPLACE(
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    '[^a-z0-9._]', '', 'g'
  ));
  
  -- Limit to 20 chars
  v_username := SUBSTRING(v_username FROM 1 FOR 20);
  
  -- Fallback if empty
  IF v_username = '' OR v_username IS NULL THEN
    v_username := 'user' || SUBSTRING(NEW.id::text FROM 1 FOR 6);
  END IF;
  
  -- Set full_name
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    v_username
  );
  
  -- Generate referral code (8 chars)
  v_referral_code := UPPER(SUBSTRING(MD5(NEW.id::text || NOW()::text) FROM 1 FOR 8));
  
  -- Insert or update profile
  INSERT INTO public.profiles (
    user_id, 
    email, 
    username,
    full_name, 
    display_name,
    referral_code,
    wallet_address,
    wallet_addresses,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_full_name,
    v_full_name,
    v_referral_code,
    NEW.raw_user_meta_data ->> 'wallet_address',
    COALESCE(
      (NEW.raw_user_meta_data -> 'wallet_addresses')::jsonb,
      '{}'::jsonb
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username),
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name),
    referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
    wallet_address = COALESCE(NULLIF(profiles.wallet_address, ''), EXCLUDED.wallet_address),
    wallet_addresses = COALESCE(profiles.wallet_addresses, EXCLUDED.wallet_addresses),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- 6. Drop old triggers and create single consolidated trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Backfill existing users without username or referral_code
UPDATE public.profiles
SET 
  username = LOWER(REGEXP_REPLACE(
    SPLIT_PART(COALESCE(email, ''), '@', 1),
    '[^a-z0-9._]', '', 'g'
  )),
  referral_code = UPPER(SUBSTRING(MD5(user_id::text || NOW()::text) FROM 1 FOR 8))
WHERE username IS NULL OR referral_code IS NULL;
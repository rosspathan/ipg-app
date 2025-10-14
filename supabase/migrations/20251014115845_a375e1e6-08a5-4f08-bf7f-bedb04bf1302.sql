-- =====================================================
-- Phase 3: Consolidate referral codes to profiles table
-- =====================================================

-- 1. Migrate existing data from referral_codes to profiles (if any)
UPDATE public.profiles p
SET referral_code = rc.code
FROM public.referral_codes rc
WHERE p.user_id = rc.user_id
  AND (p.referral_code IS NULL OR p.referral_code = '');

-- 2. For profiles without codes, generate one
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(MD5(user_id::text || NOW()::text) FROM 1 FOR 8))
WHERE referral_code IS NULL OR referral_code = '';

-- 3. Add unique constraint to prevent duplicates (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_referral_code_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_referral_code_unique UNIQUE (referral_code);
  END IF;
END $$;

-- 4. Make referral_code NOT NULL (since all users should have one)
ALTER TABLE public.profiles 
ALTER COLUMN referral_code SET NOT NULL;

-- 5. Optional: Add sponsor_id column to track who referred each user
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sponsor_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_sponsor_id ON public.profiles(sponsor_id);

-- 6. Update generate_referral_code function to check profiles table
CREATE OR REPLACE FUNCTION public.generate_referral_code(code_length integer DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude O,0,I,1
  result text := '';
  i integer;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..code_length LOOP
      result := result || substr(charset, floor(random() * length(charset) + 1)::integer, 1);
    END LOOP;
    
    -- Check uniqueness in profiles table instead of referral_codes
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- 7. Drop get_or_create_referral_code function (no longer needed)
DROP FUNCTION IF EXISTS public.get_or_create_referral_code(uuid);

-- 8. Drop referral_codes table and its dependencies
DROP TABLE IF EXISTS public.referral_codes CASCADE;

-- 9. Update handle_new_user trigger to ensure code generation
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
  -- Extract username from email
  v_username := LOWER(REGEXP_REPLACE(
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    '[^a-z0-9._]', '', 'g'
  ));
  
  v_username := SUBSTRING(v_username FROM 1 FOR 20);
  
  IF v_username = '' OR v_username IS NULL THEN
    v_username := 'user' || SUBSTRING(NEW.id::text FROM 1 FOR 6);
  END IF;
  
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    v_username
  );
  
  -- Generate unique referral code using the helper function
  v_referral_code := public.generate_referral_code(8);
  
  INSERT INTO public.profiles (
    user_id, email, username, full_name, display_name,
    referral_code, wallet_address, wallet_addresses,
    created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_username, v_full_name, v_full_name,
    v_referral_code,
    NEW.raw_user_meta_data ->> 'wallet_address',
    COALESCE((NEW.raw_user_meta_data -> 'wallet_addresses')::jsonb, '{}'::jsonb),
    NOW(), NOW()
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

-- 10. Add RLS policy for public to read referral codes (for validation)
DROP POLICY IF EXISTS "Anyone can view referral codes for validation" ON public.profiles;
CREATE POLICY "Anyone can view referral codes for validation"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 11. Rename referral_code column in referral_links_new to sponsor_code_used for clarity
ALTER TABLE public.referral_links_new 
RENAME COLUMN referral_code TO sponsor_code_used;

COMMENT ON COLUMN public.referral_links_new.sponsor_code_used IS 
'The actual referral code that this user entered during signup';

COMMENT ON TABLE public.profiles IS 'User profiles with referral codes stored directly. Each user has a unique 8-character referral code.';

-- 12. Drop existing referral_relationships (whether table or view) and recreate as view
DROP TABLE IF EXISTS public.referral_relationships CASCADE;
DROP VIEW IF EXISTS public.referral_relationships CASCADE;

CREATE VIEW public.referral_relationships AS
SELECT 
  p1.user_id as referee_id,
  p1.username as referee_username,
  p1.referral_code as referee_code,
  rl.sponsor_id,
  p2.username as sponsor_username,
  p2.referral_code as sponsor_code,
  rl.sponsor_code_used,
  rl.locked_at,
  rl.first_touch_at,
  rl.source
FROM public.referral_links_new rl
JOIN public.profiles p1 ON rl.user_id = p1.user_id
LEFT JOIN public.profiles p2 ON rl.sponsor_id = p2.user_id;

GRANT SELECT ON public.referral_relationships TO authenticated;

-- Fix 1: Restrict profiles table - users can only read their own profile, admins can read all
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Fix 2: Restrict password_reset_codes - no public access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Anyone can read password_reset_codes" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Users can read password_reset_codes" ON public.password_reset_codes;
DROP POLICY IF EXISTS "password_reset_codes_select_policy" ON public.password_reset_codes;
DROP POLICY IF EXISTS "password_reset_codes_insert_policy" ON public.password_reset_codes;
DROP POLICY IF EXISTS "password_reset_codes_update_policy" ON public.password_reset_codes;
DROP POLICY IF EXISTS "password_reset_codes_delete_policy" ON public.password_reset_codes;
DROP POLICY IF EXISTS "System can manage password_reset_codes" ON public.password_reset_codes;
DROP POLICY IF EXISTS "Allow all access to password_reset_codes" ON public.password_reset_codes;

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reset codes"
  ON public.password_reset_codes FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own reset codes"
  ON public.password_reset_codes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own reset codes"
  ON public.password_reset_codes FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Fix 3: Restrict totp_secrets_new - only owner can access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "Anyone can read totp_secrets_new" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "Users can read totp_secrets_new" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "totp_secrets_select_policy" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "totp_secrets_insert_policy" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "totp_secrets_update_policy" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "totp_secrets_delete_policy" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "System can manage totp_secrets" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "Allow all access to totp_secrets_new" ON public.totp_secrets_new;
DROP POLICY IF EXISTS "Users manage own TOTP secrets" ON public.totp_secrets_new;

ALTER TABLE public.totp_secrets_new ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own TOTP secrets"
  ON public.totp_secrets_new FOR ALL
  USING (auth.uid() = user_id);


-- =============================================
-- FIX: Restrict profiles table - remove downline viewing of sensitive data
-- =============================================

-- Drop the permissive downline SELECT policy that exposes all columns
DROP POLICY IF EXISTS "Users can view downline member profiles" ON public.profiles;

-- Drop duplicate policies (cleanup)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Keep only clean, minimal policies on base table
-- Users can only see their OWN profile (all columns)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see all profiles
CREATE POLICY "profiles_admin_select"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a safe public view for downline viewing (no sensitive data)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT 
    user_id,
    username,
    display_name,
    full_name,
    referral_code,
    created_at
  FROM public.profiles;
-- This view excludes: email, phone, wallet_address, wallet_addresses, 
-- bsc_wallet_address, kyc_status, account_status, two_fa_enabled, withdrawal_locked

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

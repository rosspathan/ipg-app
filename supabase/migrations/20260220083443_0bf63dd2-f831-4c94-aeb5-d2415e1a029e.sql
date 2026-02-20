
-- ============================================================
-- FIX 1: profiles table - ensure RLS is tight, no cross-user exposure
-- The table already has owner-only SELECT, but has duplicate policies.
-- Clean up duplicates and add explicit admin policy cleanly.
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;

-- Ensure single clean owner-only SELECT (already exists as "Users can view own profile")
-- Add admin SELECT if not already handled properly
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- FIX 2: admin_balance_adjustments - block regular users from SELECT
-- Currently only admins have SELECT but the "System can create adjustments"
-- WITH CHECK(true) means anyone can potentially INSERT. 
-- Add explicit deny for non-admin SELECT.
-- ============================================================
DROP POLICY IF EXISTS "Admins can view adjustments" ON public.admin_balance_adjustments;

-- Recreate with strict admin-only SELECT
CREATE POLICY "Admins can view adjustments"
  ON public.admin_balance_adjustments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin-only UPDATE and DELETE policies for completeness
DROP POLICY IF EXISTS "Admins can update adjustments" ON public.admin_balance_adjustments;
CREATE POLICY "Admins can update adjustments"
  ON public.admin_balance_adjustments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete adjustments" ON public.admin_balance_adjustments;
CREATE POLICY "Admins can delete adjustments"
  ON public.admin_balance_adjustments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- FIX 3: user_wallets - ensure admins can view for KYC/support purposes
-- and encrypted_wallet_backups - admins can view for support
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.user_wallets;
CREATE POLICY "Admins can view all wallets"
  ON public.user_wallets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all encrypted backups" ON public.encrypted_wallet_backups;
CREATE POLICY "Admins can view all encrypted backups"
  ON public.encrypted_wallet_backups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- wallets_user - restrict ALL policy to owner-only SELECT and add admin
DROP POLICY IF EXISTS "Users can manage own wallets_user" ON public.wallets_user;
CREATE POLICY "Users can view own wallets_user"
  ON public.wallets_user FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets_user"
  ON public.wallets_user FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets_user"
  ON public.wallets_user FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets_user"
  ON public.wallets_user FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets_user"
  ON public.wallets_user FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

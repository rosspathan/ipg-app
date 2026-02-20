
-- ============================================================
-- FIX 1: escrow_withdrawals - Drop any permissive policies and re-apply strict RLS
-- ============================================================
ALTER TABLE public.escrow_withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.escrow_withdrawals;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.escrow_withdrawals;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.escrow_withdrawals;
DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.escrow_withdrawals;
DROP POLICY IF EXISTS "System can manage withdrawals" ON public.escrow_withdrawals;
DROP POLICY IF EXISTS "escrow_withdrawals_select_own" ON public.escrow_withdrawals;
DROP POLICY IF EXISTS "escrow_withdrawals_admin" ON public.escrow_withdrawals;

-- Owner-only SELECT
CREATE POLICY "escrow_withdrawals_select_own"
  ON public.escrow_withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin SELECT
CREATE POLICY "escrow_withdrawals_select_admin"
  ON public.escrow_withdrawals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Owner INSERT only
CREATE POLICY "escrow_withdrawals_insert_own"
  ON public.escrow_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin UPDATE only
CREATE POLICY "escrow_withdrawals_update_admin"
  ON public.escrow_withdrawals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- FIX 2: user_wallets - Remove permissive INSERT WITH CHECK(true)
-- Replace with WITH CHECK(false) so only service_role can insert
-- ============================================================
DROP POLICY IF EXISTS "System can create wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can create own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "user_wallets_insert_deny" ON public.user_wallets;

-- Deny all client-side inserts; only service_role (edge functions) can insert
CREATE POLICY "user_wallets_insert_deny"
  ON public.user_wallets FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ============================================================
-- FIX 3: user_daily_ad_views - Ensure strict owner-only RLS
-- ============================================================
ALTER TABLE public.user_daily_ad_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ad views" ON public.user_daily_ad_views;
DROP POLICY IF EXISTS "Users can insert own ad views" ON public.user_daily_ad_views;
DROP POLICY IF EXISTS "Users can update own ad views" ON public.user_daily_ad_views;
DROP POLICY IF EXISTS "Admins can view all ad views" ON public.user_daily_ad_views;
DROP POLICY IF EXISTS "System can manage ad views" ON public.user_daily_ad_views;

CREATE POLICY "user_daily_ad_views_select_own"
  ON public.user_daily_ad_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_daily_ad_views_insert_own"
  ON public.user_daily_ad_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_daily_ad_views_update_own"
  ON public.user_daily_ad_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_daily_ad_views_admin"
  ON public.user_daily_ad_views FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

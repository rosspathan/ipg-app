
-- ============================================================
-- SECURITY FIX: kyc_submissions, allowlist_addresses, user_inr_balances
-- ============================================================

-- ── 1. KYC SUBMISSIONS ───────────────────────────────────────
-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kyc_submissions_simple ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive existing policies
DROP POLICY IF EXISTS "Users can view own submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Public read" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Allow all" ON public.kyc_submissions;

DROP POLICY IF EXISTS "Users can view own submissions" ON public.kyc_submissions_simple;
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.kyc_submissions_simple;
DROP POLICY IF EXISTS "Users can update own submissions" ON public.kyc_submissions_simple;
DROP POLICY IF EXISTS "Admins can view all" ON public.kyc_submissions_simple;
DROP POLICY IF EXISTS "Public read" ON public.kyc_submissions_simple;
DROP POLICY IF EXISTS "Allow all" ON public.kyc_submissions_simple;

-- Owner-only access for kyc_submissions
CREATE POLICY "kyc_submissions_owner_select"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_submissions_owner_insert"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_submissions_owner_update"
  ON public.kyc_submissions FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_submissions_admin_delete"
  ON public.kyc_submissions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Owner-only access for kyc_submissions_simple
CREATE POLICY "kyc_submissions_simple_owner_select"
  ON public.kyc_submissions_simple FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_submissions_simple_owner_insert"
  ON public.kyc_submissions_simple FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_submissions_simple_owner_update"
  ON public.kyc_submissions_simple FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_submissions_simple_admin_delete"
  ON public.kyc_submissions_simple FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 2. ALLOWLIST ADDRESSES ───────────────────────────────────
ALTER TABLE public.allowlist_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own addresses" ON public.allowlist_addresses;
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.allowlist_addresses;
DROP POLICY IF EXISTS "Allow all" ON public.allowlist_addresses;
DROP POLICY IF EXISTS "Public read" ON public.allowlist_addresses;

CREATE POLICY "allowlist_owner_select"
  ON public.allowlist_addresses FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "allowlist_owner_insert"
  ON public.allowlist_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allowlist_owner_update"
  ON public.allowlist_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "allowlist_owner_delete"
  ON public.allowlist_addresses FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ── 3. USER INR BALANCES ─────────────────────────────────────
ALTER TABLE public.user_inr_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own balance" ON public.user_inr_balances;
DROP POLICY IF EXISTS "System can manage balances" ON public.user_inr_balances;
DROP POLICY IF EXISTS "Allow all" ON public.user_inr_balances;
DROP POLICY IF EXISTS "Public read" ON public.user_inr_balances;

CREATE POLICY "inr_balances_owner_select"
  ON public.user_inr_balances FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Edge functions (service role) bypass RLS; no permissive INSERT/UPDATE needed for users
CREATE POLICY "inr_balances_owner_insert"
  ON public.user_inr_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "inr_balances_system_update"
  ON public.user_inr_balances FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

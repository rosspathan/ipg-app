
-- =============================================
-- FIX 1: Remove legacy permissive ALL policy on allowlist_addresses
-- (owner+admin granular policies already exist)
-- =============================================
DROP POLICY IF EXISTS "Users can manage own allowlist_addresses" ON public.allowlist_addresses;

-- =============================================
-- FIX 2: Remove overly permissive escrow policies, keep user SELECT
-- Edge functions use service_role which bypasses RLS
-- =============================================
DROP POLICY IF EXISTS "System can manage escrow balances" ON public.escrow_balances;
DROP POLICY IF EXISTS "System can manage escrow deposits" ON public.escrow_deposits;

-- =============================================
-- FIX 3: Tighten admin_balance_adjustments INSERT to admin-only
-- (edge functions use service_role anyway)
-- =============================================
DROP POLICY IF EXISTS "System can create adjustments" ON public.admin_balance_adjustments;
CREATE POLICY "Admins can create adjustments"
  ON public.admin_balance_adjustments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- FIX 4: Add policies to admin_auth_nonces (RLS enabled but no policies)
-- Only service_role should manage nonces, no user access needed
-- =============================================
CREATE POLICY "Deny all user access to nonces"
  ON public.admin_auth_nonces
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

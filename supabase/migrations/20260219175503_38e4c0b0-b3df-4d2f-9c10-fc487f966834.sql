-- Fix overly permissive wallet creation policy
-- Replace WITH CHECK(true) with a restricted policy that only allows
-- the edge function (service role) to create wallets, while user-initiated
-- inserts must match their own auth.uid()
-- The existing complete-onboarding edge function uses service role which bypasses RLS,
-- so we can safely restrict the INSERT policy for client-side requests.

DROP POLICY IF EXISTS "System can create wallets" ON public.user_wallets;

-- Users cannot directly insert wallets (only edge function via service role can)
-- This is enforced by having no permissive INSERT policy for authenticated users
-- The service role bypasses RLS entirely, so the edge function still works

CREATE POLICY "Users cannot directly create wallets"
  ON public.user_wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
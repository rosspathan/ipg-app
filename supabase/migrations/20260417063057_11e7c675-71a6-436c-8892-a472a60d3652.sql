
-- ============================================================
-- FIX: bsk_purchase_settings — restrict to authenticated users
-- ============================================================
DROP POLICY IF EXISTS "Users can view active settings" ON public.bsk_purchase_settings;

CREATE POLICY "Authenticated users can view active settings"
  ON public.bsk_purchase_settings
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================
-- FIX: ad_user_subscriptions — replace permissive UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "System can update subscriptions" ON public.ad_user_subscriptions;

CREATE POLICY "Users can update own subscriptions"
  ON public.ad_user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Service role bypasses RLS automatically; admin policy already exists.

-- ============================================================
-- FIX: trade_settlements — restrict permissive ALL policy
-- ============================================================
DROP POLICY IF EXISTS "Service role can manage settlements" ON public.trade_settlements;

CREATE POLICY "Admins can manage settlements"
  ON public.trade_settlements
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
-- Service role bypasses RLS automatically; existing buyer/seller SELECT policy retained.

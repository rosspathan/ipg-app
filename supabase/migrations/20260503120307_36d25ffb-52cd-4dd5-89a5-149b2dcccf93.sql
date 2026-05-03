
-- 1. Lock down spin_history INSERT to service_role only
DROP POLICY IF EXISTS "System can create spin history" ON public.spin_history;
CREATE POLICY "Service role can insert spin history"
  ON public.spin_history FOR INSERT TO service_role
  WITH CHECK (true);

-- 2. Lock down user_daily_ad_views: remove permissive ALL public policy
DROP POLICY IF EXISTS "System can manage daily views" ON public.user_daily_ad_views;
CREATE POLICY "Service role can manage daily views"
  ON public.user_daily_ad_views FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Remove broad authenticated SELECT on fiat_settings_inr (keep admin-only)
DROP POLICY IF EXISTS "Authenticated users can view fiat_settings_inr" ON public.fiat_settings_inr;

-- 4. Restrict realtime.messages to scoped access
DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
-- No replacement policies: app uses postgres_changes (governed by source table RLS) and websockets, not realtime broadcast/presence channels. Deny-by-default is safe.


-- 1. Drop overly-permissive "System can manage" ALL/USING(true) policies on tables that should be service_role-only
DROP POLICY IF EXISTS "System can manage trackers" ON public.vip_milestone_tracker;
DROP POLICY IF EXISTS "System can manage VIP milestone progress" ON public.user_vip_milestones;
DROP POLICY IF EXISTS "System can manage bonus events" ON public.bsk_bonus_events;
DROP POLICY IF EXISTS "System can manage user claims" ON public.user_promotion_claims;
DROP POLICY IF EXISTS "System can manage spin limits" ON public.spin_user_limits;
DROP POLICY IF EXISTS "System can manage vesting schedules" ON public.bsk_bonus_vesting_schedules;
DROP POLICY IF EXISTS "System can manage clicks" ON public.ad_clicks;

-- All these tables already have "Users can view own ..." and "Admin can view all ..." policies.
-- Service role bypasses RLS automatically, so backend cron jobs / edge functions will keep working.

-- 2. Fix admin_actions_log: remove unauthenticated INSERT, restrict to admins
DROP POLICY IF EXISTS "admin_actions_log_insert" ON public.admin_actions_log;
CREATE POLICY "admin_actions_log_admin_insert"
  ON public.admin_actions_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. trading_engine_settings: restrict SELECT to authenticated only (was public/true)
DROP POLICY IF EXISTS "Users can view engine settings" ON public.trading_engine_settings;
CREATE POLICY "Authenticated users can view engine settings"
  ON public.trading_engine_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. bsk_purchase_settings: revoke column-level SELECT on sensitive bank/UPI columns from authenticated.
-- Frontend only needs admin_bep20_address + fee/min/max/instructions/payment_methods_enabled/is_active.
-- INR fiat is sunsetted (memory: crypto-only USD model) so these columns must not leak.
REVOKE SELECT (admin_account_number, admin_ifsc_code, admin_account_holder, admin_bank_name, admin_upi_id)
  ON public.bsk_purchase_settings FROM authenticated, anon;
-- Admins/service_role retain full access via has_role-gated ALL policy and service_role bypass.
GRANT SELECT (admin_account_number, admin_ifsc_code, admin_account_holder, admin_bank_name, admin_upi_id)
  ON public.bsk_purchase_settings TO service_role;

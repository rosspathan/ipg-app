-- 1. ad_user_subscriptions: remove user-facing UPDATE (financial fields). Admin + service role only.
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.ad_user_subscriptions;

-- 2. daily_rewards: remove user-facing INSERT. Service role / admin only.
DROP POLICY IF EXISTS "Users can claim own rewards" ON public.daily_rewards;

-- 3. kyc_admin_config: restrict SELECT to admins only.
DROP POLICY IF EXISTS "Authenticated users can view KYC config" ON public.kyc_admin_config;

-- 4. login_audit: replace permissive ALL policy with read + insert only (no UPDATE/DELETE).
DROP POLICY IF EXISTS "Users can manage own login_audit" ON public.login_audit;
CREATE POLICY "Users can view own login_audit"
  ON public.login_audit FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own login_audit"
  ON public.login_audit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. security_admin_config: restrict SELECT to admins only (was public USING true).
DROP POLICY IF EXISTS "Users can view security config" ON public.security_admin_config;

-- 6. user_crypto_stakes: remove user-facing UPDATE (status/rewards/lock manipulation). Service role / admin only.
DROP POLICY IF EXISTS "Users can update own stakes" ON public.user_crypto_stakes;

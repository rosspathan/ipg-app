
-- =========================================================
-- 1. PROFILES: block users from writing sensitive columns
-- =========================================================
CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role and admins full update
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Force protected columns back to OLD values for regular users
  NEW.kyc_status        := OLD.kyc_status;
  NEW.is_kyc_approved   := OLD.is_kyc_approved;
  NEW.withdrawal_locked := OLD.withdrawal_locked;
  NEW.account_status    := OLD.account_status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profiles_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profiles_sensitive_fields();

-- Tighten UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 2. SECURITY TABLE: protect lockout + whitelist fields
-- =========================================================
CREATE OR REPLACE FUNCTION public.protect_security_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Lock down brute-force counters and whitelist toggle
  NEW.failed_attempts          := OLD.failed_attempts;
  NEW.locked_until             := OLD.locked_until;
  NEW.withdraw_whitelist_only  := OLD.withdraw_whitelist_only;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_security_sensitive_fields ON public.security;
CREATE TRIGGER trg_protect_security_sensitive_fields
BEFORE UPDATE ON public.security
FOR EACH ROW
EXECUTE FUNCTION public.protect_security_sensitive_fields();

-- =========================================================
-- 3. USERS_APP: protect account_frozen
-- =========================================================
CREATE OR REPLACE FUNCTION public.protect_users_app_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.account_frozen := OLD.account_frozen;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_users_app_sensitive_fields ON public.users_app;
CREATE TRIGGER trg_protect_users_app_sensitive_fields
BEFORE UPDATE ON public.users_app
FOR EACH ROW
EXECUTE FUNCTION public.protect_users_app_sensitive_fields();

-- =========================================================
-- 4. USER_INSURANCE_SUBSCRIPTIONS: read-only for users
-- =========================================================
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.user_insurance_subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON public.user_insurance_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- =========================================================
-- 5. INSURANCE_CLAIMS: users SELECT/INSERT only
-- =========================================================
DROP POLICY IF EXISTS "Users can manage own claims" ON public.insurance_claims;
CREATE POLICY "Users can view own claims"
ON public.insurance_claims
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can submit own claims"
ON public.insurance_claims
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 6. USER_BSK_VESTING: remove user INSERT
-- =========================================================
DROP POLICY IF EXISTS "Users can create own vesting schedules" ON public.user_bsk_vesting;

-- =========================================================
-- 7. FIAT_WITHDRAWALS: harden INSERT
-- =========================================================
DROP POLICY IF EXISTS "Users can create own withdrawals" ON public.fiat_withdrawals;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.fiat_withdrawals;
CREATE POLICY "Users can submit own withdrawals"
ON public.fiat_withdrawals
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND amount > 0
);

-- =========================================================
-- 8. ORDERS: remove cross-user exposure
-- =========================================================
DROP POLICY IF EXISTS "Public can view pending orders for order book" ON public.orders;

-- =========================================================
-- 9. Harden reporting views with security_invoker
-- =========================================================
ALTER VIEW public.admin_manual_review_deposits   SET (security_invoker = true);
ALTER VIEW public.admin_monitor_health           SET (security_invoker = true);
ALTER VIEW public.admin_recon_balances_by_asset  SET (security_invoker = true);
ALTER VIEW public.admin_recon_deposits_by_asset  SET (security_invoker = true);
ALTER VIEW public.admin_recon_solvency_by_asset  SET (security_invoker = true);
ALTER VIEW public.admin_recon_user_asset_summary SET (security_invoker = true);
ALTER VIEW public.admin_recon_withdrawals_by_asset SET (security_invoker = true);

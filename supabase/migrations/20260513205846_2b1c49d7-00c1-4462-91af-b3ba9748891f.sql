-- Tighten permissive public INSERT policies. service_role bypasses RLS,
-- so backend-only inserts continue to work after these drops.

-- ad_impressions: require authenticated user inserting their own row
DROP POLICY IF EXISTS "System can create impressions" ON public.ad_impressions;
CREATE POLICY "Authenticated users can insert own impressions"
ON public.ad_impressions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- audit_logs: backend only
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;

-- badge_purchases: keep user-owned insert path; drop unconstrained one
DROP POLICY IF EXISTS "System can create purchases" ON public.badge_purchases;

-- bsk_admin_operations: backend only
DROP POLICY IF EXISTS "System can create operations" ON public.bsk_admin_operations;

-- bsk_vesting_releases: backend only
DROP POLICY IF EXISTS "System can create vesting releases" ON public.bsk_vesting_releases;

-- referral_events: backend only
DROP POLICY IF EXISTS "System can create referral_events" ON public.referral_events;

-- direct_referrer_rewards: backend only
DROP POLICY IF EXISTS "System can create referrer rewards" ON public.direct_referrer_rewards;

-- referral_commissions: backend only
DROP POLICY IF EXISTS "System can create commissions" ON public.referral_commissions;

-- kyc_audit_log: backend only
DROP POLICY IF EXISTS "System can insert audit log" ON public.kyc_audit_log;

-- security_audit_log: remove the permissive policy that overrode the deny
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;
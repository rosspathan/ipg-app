-- 1. Drop the active triggers that credit BSK on KYC approval
DROP TRIGGER IF EXISTS trigger_reward_kyc_approval ON public.kyc_profiles_new;
DROP TRIGGER IF EXISTS trigger_reward_kyc_approval_simple ON public.kyc_submissions_simple;

-- 2. Replace reward functions with no-op stubs (preserve signatures so any
--    stray references compile, but they MUST never credit again).
CREATE OR REPLACE FUNCTION public.reward_kyc_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- KYC bonus permanently removed (business rule: KYC is for compliance only,
  -- no token rewards are issued for KYC submission, approval, pillar approval,
  -- final approval, or KYC referrals). This stub is kept to preserve the
  -- function signature; it intentionally performs no work.
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reward_kyc_approval_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- KYC bonus permanently removed. No-op stub.
  RETURN NEW;
END;
$$;

-- 3. Add a comment recording the policy change for future auditors
COMMENT ON FUNCTION public.reward_kyc_approval() IS
  'DISABLED 2026-04-29: KYC rewards permanently removed. KYC is compliance-only.';
COMMENT ON FUNCTION public.reward_kyc_approval_simple() IS
  'DISABLED 2026-04-29: KYC rewards permanently removed. KYC is compliance-only.';
-- ============================================================
-- ACCOUNT HOLD / SUSPENSION ENFORCEMENT (backend-level)
-- ============================================================

-- 1) Add suspension columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- 2) Audit table for holds / releases
CREATE TABLE IF NOT EXISTS public.account_holds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  wallet_address text,
  action text NOT NULL CHECK (action IN ('hold','release')),
  reason text,
  previous_status text,
  new_status text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.account_holds TO authenticated;
GRANT ALL ON public.account_holds TO service_role;

ALTER TABLE public.account_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view account holds"
  ON public.account_holds FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert account holds"
  ON public.account_holds FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_account_holds_user ON public.account_holds(user_id, created_at DESC);

-- 3) Helper: is this account restricted?
CREATE OR REPLACE FUNCTION public.is_account_restricted(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (
        COALESCE(p.is_suspended, false) = true
        OR COALESCE(p.account_status, 'active') IN ('held','suspended','banned','frozen')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_account_restricted(uuid) TO authenticated, anon, service_role;

-- 4) Generic guard trigger: blocks new financial activity for restricted accounts.
--    The user-id column name is passed as the first trigger argument.
CREATE OR REPLACE FUNCTION public.guard_restricted_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
  IF uid IS NOT NULL AND public.is_account_restricted(uid) THEN
    RAISE EXCEPTION 'ACCOUNT_RESTRICTED: Your account is temporarily restricted. Please contact support.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- 5) Attach BEFORE INSERT guard triggers on every user-initiated financial table.
DO $$
DECLARE
  rec record;
  -- table_name : user-id column
  pairs text[][] := ARRAY[
    ['orders','user_id'],
    ['withdrawals','user_id'],
    ['custodial_withdrawals','user_id'],
    ['bsk_withdrawal_requests','user_id'],
    ['deposits','user_id'],
    ['custodial_deposits','user_id'],
    ['internal_balance_transfers','user_id'],
    ['trading_balance_transfers','user_id'],
    ['bsk_transfers','sender_id'],
    ['crypto_internal_transfers','sender_id'],
    ['badge_purchases','user_id'],
    ['bsk_manual_purchase_requests','user_id'],
    ['user_promotion_claims','user_id'],
    ['insurance_bsk_claims','user_id'],
    ['user_purchase_bonus_claims','user_id'],
    ['vip_milestone_claims','user_id'],
    ['user_vip_milestone_claims','user_id'],
    ['bsk_loans','user_id'],
    ['bsk_loan_applications','user_id'],
    ['user_crypto_stakes','user_id'],
    ['user_staking_accounts','user_id'],
    ['bsk_onchain_migrations','user_id'],
    ['swaps','user_id']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(pairs, 1) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_restricted ON public.%I', pairs[i][1]);
    EXECUTE format(
      'CREATE TRIGGER trg_guard_restricted BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_restricted_account(%L)',
      pairs[i][1], pairs[i][2]
    );
  END LOOP;
END $$;
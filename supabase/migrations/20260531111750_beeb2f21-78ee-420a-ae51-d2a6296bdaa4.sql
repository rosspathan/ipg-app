-- Extend allowed account statuses
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status = ANY (ARRAY['active','frozen','suspended','held','banned']));

-- Protect new suspension columns from self-modification by regular users
CREATE OR REPLACE FUNCTION public.protect_profiles_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.kyc_status        := OLD.kyc_status;
  NEW.is_kyc_approved   := OLD.is_kyc_approved;
  NEW.withdrawal_locked := OLD.withdrawal_locked;
  NEW.account_status    := OLD.account_status;
  NEW.is_suspended      := OLD.is_suspended;
  NEW.suspension_reason := OLD.suspension_reason;
  NEW.suspended_at      := OLD.suspended_at;
  NEW.suspended_by      := OLD.suspended_by;
  RETURN NEW;
END;
$function$;

-- Apply the held status (bypass protection trigger for this owner-role migration)
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profiles_sensitive_fields;

UPDATE public.profiles
SET account_status = 'held',
    withdrawal_locked = true,
    updated_at = now()
WHERE user_id = '7786866b-ec98-4911-b065-ae3d2ffe5c91';

ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profiles_sensitive_fields;

INSERT INTO public.account_holds
  (user_id, wallet_address, action, reason, previous_status, new_status, performed_by)
VALUES
  ('7786866b-ec98-4911-b065-ae3d2ffe5c91',
   '0xDBdf59C206972E3EDDc8D9eEE95ec0BC6B834534',
   'hold',
   'Status set to held + withdrawal lock (wallet under investigation)',
   'active', 'held',
   'd0687e3e-f309-4f2f-90a0-8d23e87da8ee');
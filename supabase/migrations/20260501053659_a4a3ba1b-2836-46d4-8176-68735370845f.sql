CREATE OR REPLACE FUNCTION public.check_kyc_phone_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  phone_value text;
  existing_user_id uuid;
  existing_status text;
  existing_email text;
BEGIN
  -- Skip on UPDATEs that do not touch mobile_number or mobile_status.
  -- Without this guard, approving Documents/Face on a profile whose phone
  -- collides with another pending profile re-fires the trigger and blocks
  -- the unrelated admin action.
  IF TG_OP = 'UPDATE'
     AND NEW.mobile_number IS NOT DISTINCT FROM OLD.mobile_number
     AND NEW.mobile_status IS NOT DISTINCT FROM OLD.mobile_status THEN
    RETURN NEW;
  END IF;

  -- Only active mobile claims (pending_review / approved) reserve a number.
  IF NEW.mobile_status NOT IN (
    'pending_review'::public.kyc_pillar_status,
    'approved'::public.kyc_pillar_status
  ) THEN
    RETURN NEW;
  END IF;

  phone_value := NULLIF(REPLACE(TRIM(COALESCE(NEW.mobile_number, '')), ' ', ''), '');
  IF phone_value IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT k.user_id, k.mobile_status::text, p.email
  INTO existing_user_id, existing_status, existing_email
  FROM public.kyc_profiles_new k
  LEFT JOIN public.profiles p ON p.user_id = k.user_id
  WHERE REPLACE(COALESCE(k.mobile_number, ''), ' ', '') = phone_value
    AND k.user_id <> NEW.user_id
    AND k.mobile_status IN (
      'pending_review'::public.kyc_pillar_status,
      'approved'::public.kyc_pillar_status
    )
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION
      'PHONE_ALREADY_USED: This mobile number is already used by another KYC profile (user: %, status: %). Please reject one of the profiles or contact support.',
      COALESCE(existing_email, existing_user_id::text), existing_status;
  END IF;

  RETURN NEW;
END;
$$;
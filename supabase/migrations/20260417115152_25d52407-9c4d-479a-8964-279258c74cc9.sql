-- Fix: use the correct kyc_pillar_status enum values
-- Valid values: not_submitted, pending_review, approved, rejected, needs_resubmission
-- "Active claim" = pending_review or approved

CREATE OR REPLACE FUNCTION public.check_kyc_phone_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  phone_value TEXT;
  existing_user_id UUID;
  existing_status TEXT;
BEGIN
  phone_value := NULLIF(REPLACE(TRIM(COALESCE(NEW.mobile_number, '')), ' ', ''), '');
  IF phone_value IS NULL THEN RETURN NEW; END IF;

  SELECT user_id, mobile_status::text INTO existing_user_id, existing_status
  FROM public.kyc_profiles_new
  WHERE REPLACE(COALESCE(mobile_number, ''), ' ', '') = phone_value
    AND user_id != NEW.user_id
    AND mobile_status IN ('pending_review', 'approved')
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'PHONE_ALREADY_USED: This mobile number is already used in the new KYC system. Status: %. Please use a different number or contact support.', existing_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_kyc_phone_available(
  p_phone_number TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_normalized_phone TEXT;
  v_existing_user_id UUID;
  v_existing_status TEXT;
BEGIN
  v_normalized_phone := REPLACE(TRIM(COALESCE(p_phone_number, '')), ' ', '');
  IF v_normalized_phone = '' THEN
    RETURN json_build_object('available', false, 'error', 'Phone number is required');
  END IF;

  SELECT user_id, mobile_status::text INTO v_existing_user_id, v_existing_status
  FROM public.kyc_profiles_new
  WHERE REPLACE(COALESCE(mobile_number, ''), ' ', '') = v_normalized_phone
    AND mobile_status IN ('pending_review', 'approved')
    AND (p_user_id IS NULL OR user_id != p_user_id)
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    RETURN json_build_object(
      'available', false,
      'error', 'This mobile number is already used in the new KYC system. Please use a different number or contact support.',
      'status', v_existing_status
    );
  END IF;

  RETURN json_build_object('available', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_kyc_phone_available TO authenticated;
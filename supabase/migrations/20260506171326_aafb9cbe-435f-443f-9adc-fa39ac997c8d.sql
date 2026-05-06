CREATE OR REPLACE FUNCTION public.resubmit_kyc_mobile_number(_mobile_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.kyc_profiles_new%ROWTYPE;
  v_normalized text;
  v_conflict_user uuid;
  v_conflict_status text;
  v_new_final public.kyc_status_v2;
  v_new_rejection text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED'
      USING HINT = 'You must be signed in to resubmit your mobile number';
  END IF;

  v_normalized := regexp_replace(COALESCE(_mobile_number, ''), '\s+', '', 'g');
  IF v_normalized !~ '^\+?[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'INVALID_NUMBER'
      USING HINT = 'Enter a valid phone number (digits only, 8-15, optional leading +)';
  END IF;

  SELECT * INTO v_profile
  FROM public.kyc_profiles_new
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Uniqueness check before insert
    SELECT k.user_id, k.mobile_status::text
    INTO v_conflict_user, v_conflict_status
    FROM public.kyc_profiles_new k
    WHERE k.user_id <> v_uid
      AND regexp_replace(COALESCE(k.mobile_number,''), '\s+', '', 'g') = v_normalized
      AND k.mobile_status IN (
        'pending_review'::public.kyc_pillar_status,
        'approved'::public.kyc_pillar_status
      )
    LIMIT 1;
    IF v_conflict_user IS NOT NULL THEN
      RAISE EXCEPTION 'PHONE_ALREADY_USED'
        USING HINT = 'This mobile number is already used by another account';
    END IF;

    -- FIX: use 'L1' (valid per kyc_profiles_new_level_check), not 'level_1'.
    INSERT INTO public.kyc_profiles_new (
      user_id, level, status, data_json,
      mobile_number, mobile_status, mobile_submitted_at, final_status
    )
    VALUES (
      v_uid, 'L1', 'submitted', '{}'::jsonb,
      v_normalized,
      'pending_review'::public.kyc_pillar_status,
      now(),
      'submitted'::public.kyc_status_v2
    )
    RETURNING * INTO v_profile;

    RETURN jsonb_build_object(
      'ok', true,
      'mobile_status', 'pending_review',
      'final_status', v_profile.final_status,
      'message', 'Your mobile number has been submitted for admin verification.'
    );
  END IF;

  IF v_profile.mobile_status = 'approved'::public.kyc_pillar_status
     AND v_profile.final_status = 'approved'::public.kyc_status_v2 THEN
    RAISE EXCEPTION 'ALREADY_APPROVED'
      USING HINT = 'Your mobile is already approved. Contact support to change it';
  END IF;

  IF v_profile.mobile_status = 'pending_review'::public.kyc_pillar_status
     AND COALESCE(v_profile.mobile_number,'') = v_normalized THEN
    RETURN jsonb_build_object(
      'ok', true,
      'mobile_status', 'pending_review',
      'final_status', v_profile.final_status,
      'message', 'Your mobile number is already under review.'
    );
  END IF;

  SELECT k.user_id, k.mobile_status::text
  INTO v_conflict_user, v_conflict_status
  FROM public.kyc_profiles_new k
  WHERE k.user_id <> v_uid
    AND regexp_replace(COALESCE(k.mobile_number,''), '\s+', '', 'g') = v_normalized
    AND k.mobile_status IN (
      'pending_review'::public.kyc_pillar_status,
      'approved'::public.kyc_pillar_status
    )
  LIMIT 1;
  IF v_conflict_user IS NOT NULL THEN
    RAISE EXCEPTION 'PHONE_ALREADY_USED'
      USING HINT = 'This mobile number is already used by another account';
  END IF;

  v_new_final := CASE
    WHEN v_profile.documents_status = 'rejected'::public.kyc_pillar_status
      OR v_profile.face_status      = 'rejected'::public.kyc_pillar_status
      THEN 'rejected'::public.kyc_status_v2
    WHEN v_profile.documents_status = 'needs_resubmission'::public.kyc_pillar_status
      OR v_profile.face_status      = 'needs_resubmission'::public.kyc_pillar_status
      THEN 'needs_resubmission'::public.kyc_status_v2
    WHEN v_profile.documents_status = 'approved'::public.kyc_pillar_status
     AND v_profile.face_status      = 'approved'::public.kyc_pillar_status
      THEN 'submitted'::public.kyc_status_v2
    ELSE 'submitted'::public.kyc_status_v2
  END;

  v_new_rejection := CASE
    WHEN v_profile.documents_status = 'rejected'::public.kyc_pillar_status
      OR v_profile.face_status      = 'rejected'::public.kyc_pillar_status
      THEN v_profile.rejection_reason
    ELSE NULL
  END;

  UPDATE public.kyc_profiles_new
  SET
    mobile_number      = v_normalized,
    mobile_status      = 'pending_review'::public.kyc_pillar_status,
    mobile_submitted_at= now(),
    mobile_notes       = NULL,
    mobile_verified_at = NULL,
    mobile_verified_by = NULL,
    final_status       = v_new_final,
    rejection_reason   = v_new_rejection,
    status             = 'submitted',
    updated_at         = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_profile;

  INSERT INTO public.kyc_decision_audit (user_id, pillar, action, status_before, status_after, notes)
  VALUES (v_uid, 'mobile', 'submit', 'rejected', 'pending_review', 'User resubmitted mobile number')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'mobile_status', 'pending_review',
    'final_status', v_profile.final_status,
    'message', 'Your mobile number has been resubmitted for admin verification.'
  );
END;
$function$;
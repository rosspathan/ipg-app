-- =====================================================================
-- KYC MOBILE RESUBMISSION — World-class state machine fix
-- =====================================================================
-- Root causes fixed:
--  (1) kyc_protect_submitted_data was reverting mobile_number / mobile_status
--      whenever final_status='rejected', silently throwing away user
--      resubmissions (the audit row got inserted but the UPDATE was a no-op).
--  (2) Admins could reject at the 'final' pillar with a free-text reason
--      ("Mobile number") without setting mobile_status='rejected', leaving
--      the user UI showing "Not started" on the pillar that was actually
--      the cause of the rejection.
--
-- This migration adds:
--  • resubmit_kyc_mobile_number(text)  — safe SECURITY DEFINER RPC the user
--                                        calls to resubmit a mobile number
--                                        after rejection. Preserves docs/face.
--  • Normalize phone uniqueness check against active claims only.
--  • Patch kyc_protect_submitted_data to allow mobile resubmission when the
--      mobile pillar is rejected / needs_resubmission / not_submitted, while
--      still locking everything else.
--  • Backfill: any existing kyc_profiles_new where final_status='rejected'
--      AND documents+face='approved' AND mobile_status='not_submitted' is
--      coerced to mobile_status='rejected' so the UI shows the right pillar
--      state and the user can resubmit cleanly.
--
-- Compliance:
--  • No KYC bonuses are credited anywhere here.
--  • Admins still drive every approval via admin_update_kyc_pillar.
--  • RLS unchanged. RPC enforces ownership via auth.uid().
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Patch kyc_protect_submitted_data to allow user mobile resubmission
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kyc_protect_submitted_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mobile_resubmit_allowed boolean;
BEGIN
  -- Service role and admins bypass entirely
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  -- The user is allowed to resubmit ONLY their mobile number/status
  -- when the mobile pillar is in a resubmittable state. This is the
  -- explicit hole carved for the user-facing resubmit_kyc_mobile_number RPC
  -- AND for the legacy direct UPDATE path (defence-in-depth).
  v_mobile_resubmit_allowed := OLD.mobile_status IN (
    'rejected'::public.kyc_pillar_status,
    'needs_resubmission'::public.kyc_pillar_status,
    'not_submitted'::public.kyc_pillar_status
  );

  IF OLD.documents_status IN ('pending_review','approved')
     OR OLD.face_status IN ('pending_review','approved')
     OR OLD.mobile_status IN ('pending_review','approved')
     OR OLD.final_status IN ('approved','submitted','documents_under_review',
                              'face_pending','face_verified',
                              'mobile_pending_admin_verification','mobile_verified',
                              'suspended') THEN

    -- data_json: never mutable through this path for locked profiles.
    IF NEW.data_json IS DISTINCT FROM OLD.data_json THEN
      NEW.data_json := OLD.data_json;
    END IF;

    -- mobile_number: allow change ONLY when mobile pillar is resubmittable
    IF NEW.mobile_number IS DISTINCT FROM OLD.mobile_number AND NOT v_mobile_resubmit_allowed THEN
      NEW.mobile_number := OLD.mobile_number;
    END IF;

    -- face selfie: never mutable through user UPDATE
    IF NEW.face_selfie_path IS DISTINCT FROM OLD.face_selfie_path THEN
      NEW.face_selfie_path := OLD.face_selfie_path;
    END IF;

    -- Pillar statuses: documents/face are admin-only.
    NEW.documents_status := OLD.documents_status;
    NEW.face_status      := OLD.face_status;

    -- mobile_status: user can only push it to pending_review during a resubmit.
    IF NOT v_mobile_resubmit_allowed
       OR NEW.mobile_status NOT IN (
            'pending_review'::public.kyc_pillar_status,
            OLD.mobile_status
          ) THEN
      NEW.mobile_status := OLD.mobile_status;
    END IF;

    -- final_status: user can only push it to needs_resubmission/in_review
    -- as a side-effect of a mobile resubmit; never to approved.
    IF NOT v_mobile_resubmit_allowed
       OR NEW.final_status NOT IN (
            'needs_resubmission'::public.kyc_status_v2,
            'documents_under_review'::public.kyc_status_v2,
            'submitted'::public.kyc_status_v2,
            OLD.final_status
          ) THEN
      NEW.final_status := OLD.final_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 2) Safe user-facing RPC to resubmit mobile number
-- ---------------------------------------------------------------------
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

  -- Normalize: strip whitespace; keep optional leading +.
  v_normalized := regexp_replace(COALESCE(_mobile_number, ''), '\s+', '', 'g');
  IF v_normalized !~ '^\+?[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'INVALID_NUMBER'
      USING HINT = 'Enter a valid phone number (digits only, 8–15, optional leading +)';
  END IF;

  SELECT * INTO v_profile
  FROM public.kyc_profiles_new
  WHERE user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create a new-KYC row so first-time submitters work
    INSERT INTO public.kyc_profiles_new (user_id, level, status, data_json, mobile_number, mobile_status, mobile_submitted_at)
    VALUES (v_uid, 'level_1', 'submitted', '{}'::jsonb, v_normalized,
            'pending_review'::public.kyc_pillar_status, now())
    RETURNING * INTO v_profile;
  ELSE
    -- Approved users cannot overwrite their own approved mobile silently.
    IF v_profile.mobile_status = 'approved'::public.kyc_pillar_status
       AND v_profile.final_status = 'approved'::public.kyc_status_v2 THEN
      RAISE EXCEPTION 'ALREADY_APPROVED'
        USING HINT = 'Your mobile is already approved. Contact support to change it';
    END IF;

    -- Block if mobile is currently pending_review (no double-submit churn)
    IF v_profile.mobile_status = 'pending_review'::public.kyc_pillar_status
       AND COALESCE(v_profile.mobile_number,'') = v_normalized THEN
      RETURN jsonb_build_object(
        'ok', true,
        'mobile_status', 'pending_review',
        'final_status', v_profile.final_status,
        'message', 'Your mobile number is already under review.'
      );
    END IF;

    -- Uniqueness: only block against ACTIVE claims on a DIFFERENT user.
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

    -- Compute the new final_status preserving documents/face approvals.
    v_new_final := CASE
      WHEN v_profile.documents_status = 'rejected'::public.kyc_pillar_status
        OR v_profile.face_status      = 'rejected'::public.kyc_pillar_status
        THEN 'rejected'::public.kyc_status_v2
      WHEN v_profile.documents_status = 'needs_resubmission'::public.kyc_pillar_status
        OR v_profile.face_status      = 'needs_resubmission'::public.kyc_pillar_status
        THEN 'needs_resubmission'::public.kyc_status_v2
      WHEN v_profile.documents_status = 'approved'::public.kyc_pillar_status
       AND v_profile.face_status      = 'approved'::public.kyc_pillar_status
        THEN 'submitted'::public.kyc_status_v2  -- under admin review
      ELSE 'submitted'::public.kyc_status_v2
    END;

    -- Clear the stale "Mobile number" / "mobile" rejection reason since the
    -- user has acted on it. Keep notes referencing other pillars intact.
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
      mobile_notes       = NULL,                      -- previous admin reject note no longer applies
      mobile_verified_at = NULL,
      mobile_verified_by = NULL,
      final_status       = v_new_final,
      rejection_reason   = v_new_rejection,
      final_approved_at  = NULL,
      final_approved_by  = NULL,
      updated_at         = now()
    WHERE user_id = v_uid
    RETURNING * INTO v_profile;
  END IF;

  -- Audit (canonical)
  BEGIN
    INSERT INTO public.kyc_decision_audit (user_id, submission_id, pillar, action, status_before, status_after, admin_id, notes)
    VALUES (v_uid, v_profile.id, 'mobile', 'resubmit',
            COALESCE(v_profile.mobile_status::text, 'unknown'), 'pending_review', NULL,
            'User resubmitted mobile number');
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'kyc_decision_audit insert (mobile resubmit) failed for %: %', v_uid, SQLERRM;
  END;

  -- Notify admins (best effort)
  BEGIN
    PERFORM public.create_kyc_admin_notification();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'mobile_status', v_profile.mobile_status,
    'final_status',  v_profile.final_status,
    'message',       'Your mobile number was submitted for admin review.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.resubmit_kyc_mobile_number(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resubmit_kyc_mobile_number(text) TO authenticated;

-- ---------------------------------------------------------------------
-- 3) One-shot backfill: profiles that were rejected at "final" with
--     intent of rejecting mobile (docs+face approved, mobile not_submitted)
--     get their mobile_status set to 'rejected' so the UI is truthful and
--     the user can use the resubmit path.
-- ---------------------------------------------------------------------
UPDATE public.kyc_profiles_new
SET mobile_status = 'rejected'::public.kyc_pillar_status,
    mobile_notes  = COALESCE(mobile_notes, rejection_reason, 'Mobile verification rejected by admin'),
    updated_at    = now()
WHERE final_status   = 'rejected'::public.kyc_status_v2
  AND documents_status = 'approved'::public.kyc_pillar_status
  AND face_status      = 'approved'::public.kyc_pillar_status
  AND mobile_status    = 'not_submitted'::public.kyc_pillar_status;
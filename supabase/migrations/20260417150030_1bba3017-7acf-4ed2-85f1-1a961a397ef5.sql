CREATE OR REPLACE FUNCTION public.admin_update_kyc_pillar(p_user_id uuid, p_pillar text, p_action text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_profile public.kyc_profiles_new%ROWTYPE;
  v_status_before text;
  v_status_after text;
  v_new_pillar_status public.kyc_pillar_status;
  v_new_documents public.kyc_pillar_status;
  v_new_face public.kyc_pillar_status;
  v_new_mobile public.kyc_pillar_status;
  v_new_final public.kyc_status_v2;
  v_new_rejection text;
  v_new_final_approved_at timestamptz;
  v_new_final_approved_by uuid;
BEGIN
  IF NOT public.has_role(v_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can update KYC pillars';
  END IF;

  IF p_pillar NOT IN ('documents', 'face', 'mobile', 'final') THEN
    RAISE EXCEPTION 'Invalid pillar: %', p_pillar;
  END IF;

  IF p_action NOT IN ('approve', 'reject', 'request_resubmission', 'suspend', 'unsuspend', 'reset') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  IF p_action IN ('reject', 'request_resubmission') AND COALESCE(btrim(p_notes), '') = '' THEN
    RAISE EXCEPTION 'Reason is required for %', p_action;
  END IF;

  SELECT *
  INTO v_profile
  FROM public.kyc_profiles_new
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC profile not found for user %', p_user_id;
  END IF;

  v_new_pillar_status := CASE p_action
    WHEN 'approve' THEN 'approved'::public.kyc_pillar_status
    WHEN 'reject' THEN 'rejected'::public.kyc_pillar_status
    WHEN 'request_resubmission' THEN 'needs_resubmission'::public.kyc_pillar_status
    WHEN 'reset' THEN 'pending_review'::public.kyc_pillar_status
    ELSE NULL
  END;

  -- Start from current pillar values; only the touched pillar will change.
  v_new_documents := v_profile.documents_status;
  v_new_face := v_profile.face_status;
  v_new_mobile := v_profile.mobile_status;
  v_new_final := v_profile.final_status;
  v_new_rejection := v_profile.rejection_reason;
  v_new_final_approved_at := v_profile.final_approved_at;
  v_new_final_approved_by := v_profile.final_approved_by;

  IF p_pillar = 'documents' THEN
    v_status_before := v_profile.documents_status::text;
    v_new_documents := COALESCE(v_new_pillar_status, v_profile.documents_status);
    v_status_after := v_new_documents::text;
  ELSIF p_pillar = 'face' THEN
    v_status_before := v_profile.face_status::text;
    v_new_face := COALESCE(v_new_pillar_status, v_profile.face_status);
    v_status_after := v_new_face::text;
  ELSIF p_pillar = 'mobile' THEN
    v_status_before := v_profile.mobile_status::text;
    v_new_mobile := COALESCE(v_new_pillar_status, v_profile.mobile_status);
    v_status_after := v_new_mobile::text;
  ELSE
    v_status_before := v_profile.final_status::text;

    IF p_action = 'approve' THEN
      IF v_profile.documents_status <> 'approved'::public.kyc_pillar_status
         OR v_profile.face_status <> 'approved'::public.kyc_pillar_status
         OR v_profile.mobile_status <> 'approved'::public.kyc_pillar_status THEN
        RAISE EXCEPTION 'Cannot final-approve: all 3 pillars must be approved (documents=%, face=%, mobile=%)',
          v_profile.documents_status, v_profile.face_status, v_profile.mobile_status;
      END IF;
      v_new_final := 'approved'::public.kyc_status_v2;
      v_new_final_approved_at := now();
      v_new_final_approved_by := v_admin_id;
      v_new_rejection := NULL;
    ELSIF p_action = 'reject' THEN
      v_new_final := 'rejected'::public.kyc_status_v2;
      v_new_rejection := p_notes;
      v_new_final_approved_at := NULL;
      v_new_final_approved_by := NULL;
    ELSIF p_action = 'request_resubmission' THEN
      v_new_final := 'needs_resubmission'::public.kyc_status_v2;
      v_new_rejection := p_notes;
      v_new_final_approved_at := NULL;
      v_new_final_approved_by := NULL;
    ELSIF p_action = 'suspend' THEN
      v_new_final := 'suspended'::public.kyc_status_v2;
    ELSIF p_action = 'unsuspend' THEN
      v_new_final := 'approved'::public.kyc_status_v2;
    END IF;

    v_status_after := v_new_final::text;
  END IF;

  -- For pillar-level actions, derive a coherent overall final_status that
  -- truthfully reflects the 3 pillars (no more "pending" while a pillar is
  -- rejected). Final-pillar actions keep the explicit final_status above.
  IF p_pillar <> 'final' THEN
    v_new_final := CASE
      WHEN v_new_documents = 'rejected'::public.kyc_pillar_status
        OR v_new_face = 'rejected'::public.kyc_pillar_status
        OR v_new_mobile = 'rejected'::public.kyc_pillar_status
        THEN 'rejected'::public.kyc_status_v2
      WHEN v_new_documents = 'needs_resubmission'::public.kyc_pillar_status
        OR v_new_face = 'needs_resubmission'::public.kyc_pillar_status
        OR v_new_mobile = 'needs_resubmission'::public.kyc_pillar_status
        THEN 'needs_resubmission'::public.kyc_status_v2
      WHEN v_new_documents = 'approved'::public.kyc_pillar_status
        AND v_new_face = 'approved'::public.kyc_pillar_status
        AND v_new_mobile = 'approved'::public.kyc_pillar_status
        THEN CASE
          WHEN v_profile.final_status = 'approved'::public.kyc_status_v2 THEN 'approved'::public.kyc_status_v2
          WHEN v_profile.final_status = 'suspended'::public.kyc_status_v2 THEN 'suspended'::public.kyc_status_v2
          ELSE 'mobile_verified'::public.kyc_status_v2
        END
      WHEN v_new_documents = 'approved'::public.kyc_pillar_status
        AND v_new_face = 'approved'::public.kyc_pillar_status
        THEN 'mobile_pending_admin_verification'::public.kyc_status_v2
      WHEN v_new_documents = 'approved'::public.kyc_pillar_status
        THEN 'face_pending'::public.kyc_status_v2
      WHEN v_new_documents = 'pending_review'::public.kyc_pillar_status
        THEN 'documents_under_review'::public.kyc_status_v2
      WHEN v_new_documents = 'not_submitted'::public.kyc_pillar_status
        AND v_new_face = 'not_submitted'::public.kyc_pillar_status
        AND v_new_mobile = 'not_submitted'::public.kyc_pillar_status
        THEN 'not_started'::public.kyc_status_v2
      ELSE 'submitted'::public.kyc_status_v2
    END;

    -- Sync rejection reason to the pillar reason for clarity
    IF v_new_final IN ('rejected'::public.kyc_status_v2, 'needs_resubmission'::public.kyc_status_v2) THEN
      v_new_rejection := COALESCE(NULLIF(btrim(p_notes), ''), v_new_rejection);
    ELSIF v_new_final = 'approved'::public.kyc_status_v2 THEN
      v_new_rejection := NULL;
    END IF;

    -- Final approval metadata only valid for explicit final approval
    IF v_new_final <> 'approved'::public.kyc_status_v2 THEN
      v_new_final_approved_at := NULL;
      v_new_final_approved_by := NULL;
    END IF;
  END IF;

  -- Single UPDATE keeps BEFORE triggers happy (no double-touch within stmt).
  UPDATE public.kyc_profiles_new
  SET documents_status = v_new_documents,
      face_status = v_new_face,
      mobile_status = v_new_mobile,
      final_status = v_new_final,
      rejection_reason = v_new_rejection,
      final_approved_at = v_new_final_approved_at,
      final_approved_by = v_new_final_approved_by,
      documents_reviewed_by = CASE WHEN p_pillar = 'documents' THEN v_admin_id ELSE documents_reviewed_by END,
      documents_reviewed_at = CASE WHEN p_pillar = 'documents' THEN now() ELSE documents_reviewed_at END,
      documents_notes = CASE WHEN p_pillar = 'documents' THEN COALESCE(p_notes, documents_notes) ELSE documents_notes END,
      face_reviewed_by = CASE WHEN p_pillar = 'face' THEN v_admin_id ELSE face_reviewed_by END,
      face_reviewed_at = CASE WHEN p_pillar = 'face' THEN now() ELSE face_reviewed_at END,
      face_notes = CASE WHEN p_pillar = 'face' THEN COALESCE(p_notes, face_notes) ELSE face_notes END,
      mobile_verified_by = CASE WHEN p_pillar = 'mobile' THEN v_admin_id ELSE mobile_verified_by END,
      mobile_verified_at = CASE WHEN p_pillar = 'mobile' THEN now() ELSE mobile_verified_at END,
      mobile_notes = CASE WHEN p_pillar = 'mobile' THEN COALESCE(p_notes, mobile_notes) ELSE mobile_notes END,
      reviewed_at = now(),
      reviewer_id = v_admin_id,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;

  -- Audit (sync_kyc_status_mirror trigger handles profiles + legacy `status`)
  INSERT INTO public.kyc_decision_audit (
    user_id, submission_id, pillar, action, status_before, status_after, admin_id, notes
  ) VALUES (
    p_user_id, v_profile.id, p_pillar, p_action, v_status_before, v_status_after, v_admin_id, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'pillar', p_pillar,
    'action', p_action,
    'status_before', v_status_before,
    'status_after', v_status_after,
    'final_status', v_profile.final_status,
    'documents_status', v_profile.documents_status,
    'face_status', v_profile.face_status,
    'mobile_status', v_profile.mobile_status
  );
END
$function$;

-- Backfill: repair any rows where pillar truth and final_status disagree.
UPDATE public.kyc_profiles_new k
SET final_status = CASE
      WHEN k.documents_status = 'rejected'::public.kyc_pillar_status
        OR k.face_status = 'rejected'::public.kyc_pillar_status
        OR k.mobile_status = 'rejected'::public.kyc_pillar_status
        THEN 'rejected'::public.kyc_status_v2
      WHEN k.documents_status = 'needs_resubmission'::public.kyc_pillar_status
        OR k.face_status = 'needs_resubmission'::public.kyc_pillar_status
        OR k.mobile_status = 'needs_resubmission'::public.kyc_pillar_status
        THEN 'needs_resubmission'::public.kyc_status_v2
      WHEN k.documents_status = 'approved'::public.kyc_pillar_status
        AND k.face_status = 'approved'::public.kyc_pillar_status
        AND k.mobile_status = 'approved'::public.kyc_pillar_status
        AND k.final_status NOT IN ('approved'::public.kyc_status_v2, 'suspended'::public.kyc_status_v2)
        THEN 'mobile_verified'::public.kyc_status_v2
      ELSE k.final_status
    END,
    rejection_reason = CASE
      WHEN k.documents_status = 'rejected'::public.kyc_pillar_status
        OR k.face_status = 'rejected'::public.kyc_pillar_status
        OR k.mobile_status = 'rejected'::public.kyc_pillar_status
        OR k.documents_status = 'needs_resubmission'::public.kyc_pillar_status
        OR k.face_status = 'needs_resubmission'::public.kyc_pillar_status
        OR k.mobile_status = 'needs_resubmission'::public.kyc_pillar_status
        THEN COALESCE(NULLIF(btrim(k.rejection_reason), ''), NULLIF(btrim(k.documents_notes), ''), NULLIF(btrim(k.face_notes), ''), NULLIF(btrim(k.mobile_notes), ''))
      ELSE k.rejection_reason
    END,
    updated_at = now()
WHERE
  (
    (k.documents_status = 'rejected'::public.kyc_pillar_status
      OR k.face_status = 'rejected'::public.kyc_pillar_status
      OR k.mobile_status = 'rejected'::public.kyc_pillar_status)
    AND k.final_status NOT IN ('rejected'::public.kyc_status_v2, 'suspended'::public.kyc_status_v2)
  )
  OR (
    (k.documents_status = 'needs_resubmission'::public.kyc_pillar_status
      OR k.face_status = 'needs_resubmission'::public.kyc_pillar_status
      OR k.mobile_status = 'needs_resubmission'::public.kyc_pillar_status)
    AND k.final_status NOT IN ('needs_resubmission'::public.kyc_status_v2, 'rejected'::public.kyc_status_v2, 'suspended'::public.kyc_status_v2)
  );
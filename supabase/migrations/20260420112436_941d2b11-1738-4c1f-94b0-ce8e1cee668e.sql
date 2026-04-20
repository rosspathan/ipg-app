-- ============================================================================
-- KYC TRADING GATE FIX + DIAGNOSTIC RPC
-- ----------------------------------------------------------------------------
-- ROOT CAUSE: admin_update_kyc_pillar approves the final pillar but never
-- clears is_legacy. Trading gate is_kyc_approved() requires is_legacy=false,
-- so 21 of 24 fully-approved users could not trade. We patch the RPC to
-- clear is_legacy + bump kyc_version on final approve, and backfill stuck rows.
-- ============================================================================

-- 1) Patch admin_update_kyc_pillar — clear is_legacy when finalizing approval.
CREATE OR REPLACE FUNCTION public.admin_update_kyc_pillar(
  p_user_id uuid,
  p_pillar text,
  p_action text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_new_is_legacy boolean;
  v_new_kyc_version smallint;
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

  SELECT * INTO v_profile
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

  v_new_documents := v_profile.documents_status;
  v_new_face := v_profile.face_status;
  v_new_mobile := v_profile.mobile_status;
  v_new_final := v_profile.final_status;
  v_new_rejection := v_profile.rejection_reason;
  v_new_final_approved_at := v_profile.final_approved_at;
  v_new_final_approved_by := v_profile.final_approved_by;
  v_new_is_legacy := v_profile.is_legacy;
  v_new_kyc_version := COALESCE(v_profile.kyc_version, 2);

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
      -- *** TRADING-GATE FIX: clear legacy flag, ensure version >= 2 ***
      v_new_is_legacy := false;
      v_new_kyc_version := GREATEST(v_new_kyc_version, 2);
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
      v_new_is_legacy := false;
      v_new_kyc_version := GREATEST(v_new_kyc_version, 2);
    END IF;
    v_status_after := v_new_final::text;
  END IF;

  -- For pillar-level actions, derive coherent overall final_status.
  IF p_pillar <> 'final' THEN
    v_new_final := CASE
      WHEN v_new_documents = 'rejected'::public.kyc_pillar_status
        OR v_new_face = 'rejected'::public.kyc_pillar_status
        OR v_new_mobile = 'rejected'::public.kyc_pillar_status
      THEN 'rejected'::public.kyc_status_v2
      WHEN v_new_documents = 'approved'::public.kyc_pillar_status
       AND v_new_face = 'approved'::public.kyc_pillar_status
       AND v_new_mobile = 'approved'::public.kyc_pillar_status
       AND v_profile.final_status = 'approved'::public.kyc_status_v2
      THEN 'approved'::public.kyc_status_v2
      ELSE COALESCE(v_profile.final_status, 'submitted'::public.kyc_status_v2)
    END;
    -- If a pillar gets demoted from approved, the user is no longer trade-eligible
    IF v_new_final <> 'approved'::public.kyc_status_v2 THEN
      v_new_final_approved_at := NULL;
      v_new_final_approved_by := NULL;
    END IF;
  END IF;

  UPDATE public.kyc_profiles_new
  SET
    documents_status = v_new_documents,
    face_status = v_new_face,
    mobile_status = v_new_mobile,
    final_status = v_new_final,
    rejection_reason = v_new_rejection,
    final_approved_at = v_new_final_approved_at,
    final_approved_by = v_new_final_approved_by,
    is_legacy = v_new_is_legacy,
    kyc_version = v_new_kyc_version,
    documents_reviewed_at = CASE WHEN p_pillar='documents' THEN now() ELSE documents_reviewed_at END,
    documents_reviewed_by = CASE WHEN p_pillar='documents' THEN v_admin_id ELSE documents_reviewed_by END,
    documents_notes      = CASE WHEN p_pillar='documents' THEN COALESCE(p_notes, documents_notes) ELSE documents_notes END,
    face_reviewed_at = CASE WHEN p_pillar='face' THEN now() ELSE face_reviewed_at END,
    face_reviewed_by = CASE WHEN p_pillar='face' THEN v_admin_id ELSE face_reviewed_by END,
    face_notes       = CASE WHEN p_pillar='face' THEN COALESCE(p_notes, face_notes) ELSE face_notes END,
    mobile_verified_at = CASE WHEN p_pillar='mobile' THEN now() ELSE mobile_verified_at END,
    mobile_verified_by = CASE WHEN p_pillar='mobile' THEN v_admin_id ELSE mobile_verified_by END,
    mobile_notes       = CASE WHEN p_pillar='mobile' THEN COALESCE(p_notes, mobile_notes) ELSE mobile_notes END,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Audit
  BEGIN
    INSERT INTO public.kyc_audit_log (submission_id, action, performed_by, notes, metadata)
    VALUES (
      v_profile.id,
      p_pillar || ':' || p_action,
      v_admin_id,
      p_notes,
      jsonb_build_object('before', v_status_before, 'after', v_status_after, 'pillar', p_pillar)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'pillar', p_pillar,
    'action', p_action,
    'before', v_status_before,
    'after', v_status_after,
    'final_status', v_new_final,
    'is_legacy', v_new_is_legacy,
    'kyc_version', v_new_kyc_version
  );
END;
$$;

-- 2) BACKFILL: Unstick the 21 users who are fully approved but is_legacy=true.
UPDATE public.kyc_profiles_new
SET is_legacy = false,
    kyc_version = GREATEST(COALESCE(kyc_version, 2), 2),
    updated_at = now()
WHERE final_status = 'approved'::public.kyc_status_v2
  AND documents_status = 'approved'::public.kyc_pillar_status
  AND face_status = 'approved'::public.kyc_pillar_status
  AND mobile_status = 'approved'::public.kyc_pillar_status
  AND is_legacy = true
  AND final_approved_at IS NOT NULL;

-- 3) DIAGNOSTIC RPC: explain exactly why a user is or isn't trade-eligible.
CREATE OR REPLACE FUNCTION public.kyc_access_diagnostic(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_kyc public.kyc_profiles_new%ROWTYPE;
  v_cutoff timestamptz;
  v_approved boolean;
  v_reasons text[] := ARRAY[]::text[];
BEGIN
  -- Only the user themselves or an admin may run the diagnostic
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;
  IF v_caller <> _user_id AND NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT value::timestamptz INTO v_cutoff
  FROM public.system_settings WHERE key = 'new_kyc_cutoff_at';
  v_cutoff := COALESCE(v_cutoff, '2026-04-18 00:00:00+00'::timestamptz);

  SELECT * INTO v_kyc FROM public.kyc_profiles_new WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_trade', false,
      'can_withdraw', false,
      'can_migrate', false,
      'can_transfer', false,
      'reason', 'No KYC submission found',
      'reasons', jsonb_build_array('No KYC submission found'),
      'cutoff_at', v_cutoff
    );
  END IF;

  IF v_kyc.documents_status::text <> 'approved' THEN
    v_reasons := array_append(v_reasons, 'Documents: ' || v_kyc.documents_status::text);
  END IF;
  IF v_kyc.face_status::text <> 'approved' THEN
    v_reasons := array_append(v_reasons, 'Face: ' || v_kyc.face_status::text);
  END IF;
  IF v_kyc.mobile_status::text <> 'approved' THEN
    v_reasons := array_append(v_reasons, 'Mobile: ' || v_kyc.mobile_status::text);
  END IF;
  IF v_kyc.final_status::text <> 'approved' THEN
    v_reasons := array_append(v_reasons, 'Final: ' || v_kyc.final_status::text);
  END IF;
  IF v_kyc.is_legacy THEN
    v_reasons := array_append(v_reasons, 'Legacy KYC — must be re-approved under new flow');
  END IF;
  IF COALESCE(v_kyc.kyc_version, 0) < 2 THEN
    v_reasons := array_append(v_reasons, 'KYC version ' || COALESCE(v_kyc.kyc_version, 0) || ' < 2');
  END IF;
  IF v_kyc.final_approved_at IS NULL THEN
    v_reasons := array_append(v_reasons, 'final_approved_at is NULL');
  ELSIF v_kyc.final_approved_at < v_cutoff THEN
    v_reasons := array_append(v_reasons,
      'Approved before cutoff (' || v_cutoff::text || ')');
  END IF;

  v_approved := public.is_kyc_approved(_user_id);

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'can_trade', v_approved,
    'can_withdraw', v_approved,
    'can_migrate', v_approved,
    'can_transfer', v_approved,
    'documents_status', v_kyc.documents_status,
    'face_status', v_kyc.face_status,
    'mobile_status', v_kyc.mobile_status,
    'final_status', v_kyc.final_status,
    'is_legacy', v_kyc.is_legacy,
    'kyc_version', v_kyc.kyc_version,
    'final_approved_at', v_kyc.final_approved_at,
    'final_approved_by', v_kyc.final_approved_by,
    'cutoff_at', v_cutoff,
    'reason', CASE WHEN v_approved THEN 'KYC fully approved — all features unlocked'
                   ELSE COALESCE(array_to_string(v_reasons, '; '), 'Unknown') END,
    'reasons', to_jsonb(v_reasons)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.kyc_access_diagnostic(uuid) TO authenticated;
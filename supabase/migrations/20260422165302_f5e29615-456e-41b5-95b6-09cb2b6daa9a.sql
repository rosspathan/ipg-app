
-- ============================================================================
-- KYC REJECT/RESUBMIT PIPELINE REPAIR
-- ============================================================================
-- ROOT CAUSE 1: enforce_kyc_state_machine raised
--   "Cannot change status of approved KYC submission" whenever the mirror
--   trigger demoted the legacy `status` column from 'approved' to 'rejected'
--   as a side effect of the admin rejecting a pillar of an already-approved
--   user. Whole RPC rolled back.
--
-- ROOT CAUSE 2: admin_update_kyc_pillar wrote to kyc_audit_log with a
--   non-existent `metadata` column, and never wrote to kyc_decision_audit
--   (which is the table the admin console reads via fetchAudit). So even
--   when the RPC succeeded, the admin saw NO history of approve/reject
--   actions, only "submit" rows from user submissions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Allow the canonical admin RPC to demote the legacy status field.
--    We tag the session with a GUC inside admin_update_kyc_pillar so the
--    state-machine trigger can recognise a legitimate admin demotion path.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_kyc_state_machine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_demote text;
BEGIN
  -- Allow the admin pillar RPC to override the legacy-status lock when it
  -- legitimately needs to demote `status` away from 'approved' (e.g. admin
  -- rejects the face pillar of an already-approved user).
  v_admin_demote := current_setting('app.kyc_admin_demote', true);

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM kyc_profiles_new
      WHERE user_id = NEW.user_id
        AND level = NEW.level
        AND status IN ('submitted', 'pending', 'in_review', 'approved')
    ) THEN
      RAISE EXCEPTION 'User already has a KYC submission in progress or approved for this level';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Only block out-of-band edits, NOT the canonical admin RPC demotion.
    IF OLD.status = 'approved'
       AND NEW.status != 'approved'
       AND COALESCE(v_admin_demote, '') <> 'on' THEN
      RAISE EXCEPTION 'Cannot change status of approved KYC submission';
    END IF;

    -- Prevent resubmission if already pending/in_review (legacy guard kept)
    IF OLD.status IN ('submitted', 'pending', 'in_review')
       AND NEW.status = 'submitted'
       AND OLD.id != NEW.id THEN
      RAISE EXCEPTION 'Cannot submit new KYC while another is pending review';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 2) Patch admin_update_kyc_pillar:
--    - set the demotion GUC for the duration of the statement
--    - write to kyc_decision_audit (canonical) AND a safe kyc_audit_log row
--    - clear is_kyc_approved on profiles when demoting an approved user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_kyc_pillar(
  p_user_id uuid,
  p_pillar  text,
  p_action  text,
  p_notes   text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_profile  public.kyc_profiles_new%ROWTYPE;
  v_status_before text;
  v_status_after  text;
  v_new_pillar_status public.kyc_pillar_status;
  v_new_documents public.kyc_pillar_status;
  v_new_face      public.kyc_pillar_status;
  v_new_mobile    public.kyc_pillar_status;
  v_new_final     public.kyc_status_v2;
  v_new_rejection text;
  v_new_final_approved_at timestamptz;
  v_new_final_approved_by uuid;
  v_new_is_legacy boolean;
  v_new_kyc_version smallint;
  v_was_approved boolean;
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

  -- *** CRITICAL: tell the state-machine trigger we are a legitimate admin
  --     demotion path so it does not block status: 'approved' -> 'rejected'.
  PERFORM set_config('app.kyc_admin_demote', 'on', true);

  SELECT * INTO v_profile
  FROM public.kyc_profiles_new
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC profile not found for user %', p_user_id;
  END IF;

  v_was_approved := (v_profile.final_status = 'approved'::public.kyc_status_v2);

  v_new_pillar_status := CASE p_action
    WHEN 'approve' THEN 'approved'::public.kyc_pillar_status
    WHEN 'reject'  THEN 'rejected'::public.kyc_pillar_status
    WHEN 'request_resubmission' THEN 'needs_resubmission'::public.kyc_pillar_status
    WHEN 'reset'   THEN 'pending_review'::public.kyc_pillar_status
    ELSE NULL
  END;

  v_new_documents := v_profile.documents_status;
  v_new_face      := v_profile.face_status;
  v_new_mobile    := v_profile.mobile_status;
  v_new_final     := v_profile.final_status;
  v_new_rejection := v_profile.rejection_reason;
  v_new_final_approved_at := v_profile.final_approved_at;
  v_new_final_approved_by := v_profile.final_approved_by;
  v_new_is_legacy := v_profile.is_legacy;
  v_new_kyc_version := COALESCE(v_profile.kyc_version, 2);

  IF p_pillar = 'documents' THEN
    v_status_before := v_profile.documents_status::text;
    v_new_documents := COALESCE(v_new_pillar_status, v_profile.documents_status);
    v_status_after  := v_new_documents::text;
  ELSIF p_pillar = 'face' THEN
    v_status_before := v_profile.face_status::text;
    v_new_face      := COALESCE(v_new_pillar_status, v_profile.face_status);
    v_status_after  := v_new_face::text;
  ELSIF p_pillar = 'mobile' THEN
    v_status_before := v_profile.mobile_status::text;
    v_new_mobile    := COALESCE(v_new_pillar_status, v_profile.mobile_status);
    v_status_after  := v_new_mobile::text;
  ELSE
    v_status_before := v_profile.final_status::text;
    IF p_action = 'approve' THEN
      IF v_profile.documents_status <> 'approved'::public.kyc_pillar_status
         OR v_profile.face_status   <> 'approved'::public.kyc_pillar_status
         OR v_profile.mobile_status <> 'approved'::public.kyc_pillar_status THEN
        RAISE EXCEPTION 'Cannot final-approve: all 3 pillars must be approved (documents=%, face=%, mobile=%)',
          v_profile.documents_status, v_profile.face_status, v_profile.mobile_status;
      END IF;
      v_new_final := 'approved'::public.kyc_status_v2;
      v_new_final_approved_at := now();
      v_new_final_approved_by := v_admin_id;
      v_new_rejection := NULL;
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
        OR v_new_face      = 'rejected'::public.kyc_pillar_status
        OR v_new_mobile    = 'rejected'::public.kyc_pillar_status
      THEN 'rejected'::public.kyc_status_v2
      WHEN v_new_documents = 'needs_resubmission'::public.kyc_pillar_status
        OR v_new_face      = 'needs_resubmission'::public.kyc_pillar_status
        OR v_new_mobile    = 'needs_resubmission'::public.kyc_pillar_status
      THEN 'needs_resubmission'::public.kyc_status_v2
      WHEN v_new_documents = 'approved'::public.kyc_pillar_status
       AND v_new_face      = 'approved'::public.kyc_pillar_status
       AND v_new_mobile    = 'approved'::public.kyc_pillar_status
       AND v_profile.final_status = 'approved'::public.kyc_status_v2
      THEN 'approved'::public.kyc_status_v2
      ELSE COALESCE(v_profile.final_status, 'submitted'::public.kyc_status_v2)
    END;

    -- If a pillar gets demoted from approved, user is no longer trade-eligible
    IF v_new_final <> 'approved'::public.kyc_status_v2 THEN
      v_new_final_approved_at := NULL;
      v_new_final_approved_by := NULL;
    END IF;

    -- Carry the rejection reason so user sees it on their KYC page.
    IF p_action IN ('reject', 'request_resubmission') THEN
      v_new_rejection := p_notes;
    END IF;
  END IF;

  UPDATE public.kyc_profiles_new
  SET
    documents_status = v_new_documents,
    face_status      = v_new_face,
    mobile_status    = v_new_mobile,
    final_status     = v_new_final,
    rejection_reason = v_new_rejection,
    final_approved_at = v_new_final_approved_at,
    final_approved_by = v_new_final_approved_by,
    is_legacy   = v_new_is_legacy,
    kyc_version = v_new_kyc_version,
    documents_reviewed_at = CASE WHEN p_pillar='documents' THEN now() ELSE documents_reviewed_at END,
    documents_reviewed_by = CASE WHEN p_pillar='documents' THEN v_admin_id ELSE documents_reviewed_by END,
    documents_notes       = CASE WHEN p_pillar='documents' THEN COALESCE(p_notes, documents_notes) ELSE documents_notes END,
    face_reviewed_at = CASE WHEN p_pillar='face' THEN now() ELSE face_reviewed_at END,
    face_reviewed_by = CASE WHEN p_pillar='face' THEN v_admin_id ELSE face_reviewed_by END,
    face_notes       = CASE WHEN p_pillar='face' THEN COALESCE(p_notes, face_notes) ELSE face_notes END,
    mobile_verified_at = CASE WHEN p_pillar='mobile' THEN now() ELSE mobile_verified_at END,
    mobile_verified_by = CASE WHEN p_pillar='mobile' THEN v_admin_id ELSE mobile_verified_by END,
    mobile_notes       = CASE WHEN p_pillar='mobile' THEN COALESCE(p_notes, mobile_notes) ELSE mobile_notes END,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- ---- AUDIT (canonical: kyc_decision_audit — what the admin console reads) ----
  BEGIN
    INSERT INTO public.kyc_decision_audit
      (user_id, submission_id, pillar, action, status_before, status_after, admin_id, notes)
    VALUES
      (p_user_id, v_profile.id, p_pillar, p_action, v_status_before, v_status_after, v_admin_id, p_notes);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'kyc_decision_audit insert failed for user % pillar % action %: %',
      p_user_id, p_pillar, p_action, SQLERRM;
  END;

  -- ---- AUDIT (legacy mirror: kyc_audit_log — for older dashboards) ----
  BEGIN
    INSERT INTO public.kyc_audit_log
      (submission_id, action, performed_by, old_status, new_status, notes)
    VALUES
      (v_profile.id, p_pillar || ':' || p_action, v_admin_id, v_status_before, v_status_after, p_notes);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'kyc_audit_log insert skipped for user % pillar % action %: %',
      p_user_id, p_pillar, p_action, SQLERRM;
  END;

  -- ---- Mirror the demotion onto profiles so feature gates re-lock instantly.
  IF v_was_approved
     AND v_new_final <> 'approved'::public.kyc_status_v2 THEN
    BEGIN
      UPDATE public.profiles
      SET is_kyc_approved = false,
          kyc_status = CASE
            WHEN v_new_final = 'rejected' THEN 'rejected'
            WHEN v_new_final = 'needs_resubmission' THEN 'pending'
            WHEN v_new_final = 'suspended' THEN 'suspended'
            ELSE 'pending'
          END
      WHERE user_id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'profiles demotion mirror failed for user %: %', p_user_id, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'pillar', p_pillar,
    'action', p_action,
    'before', v_status_before,
    'after',  v_status_after,
    'final_status', v_new_final,
    'is_legacy', v_new_is_legacy,
    'kyc_version', v_new_kyc_version
  );
END;
$function$;

-- Allow callers (admin UI via supabase-js) to invoke the RPC.
GRANT EXECUTE ON FUNCTION public.admin_update_kyc_pillar(uuid, text, text, text)
  TO authenticated;

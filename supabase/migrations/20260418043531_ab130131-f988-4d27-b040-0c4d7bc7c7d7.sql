-- ============================================================
-- KYC E2E PROOF TEST - records every transition in audit table
-- ============================================================
DROP TABLE IF EXISTS public._kyc_e2e_proof;
CREATE TABLE public._kyc_e2e_proof (
  step_no int,
  test_case text,
  pillar text,
  action text,
  notes_in text,
  rpc_success bool,
  error_msg text,
  documents_before text, documents_after text,
  face_before text, face_after text,
  mobile_before text, mobile_after text,
  final_before text, final_after text,
  rejection_reason_after text,
  audit_row_id uuid,
  ran_at timestamptz default now()
);

CREATE OR REPLACE FUNCTION public._record_kyc_step(
  p_step int, p_case text, p_pillar text, p_action text, p_notes text,
  p_user uuid, p_admin uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_b record; v_a record; v_audit uuid; v_ok bool := true; v_err text := NULL;
BEGIN
  SELECT documents_status::text d, face_status::text f, mobile_status::text m, final_status::text fn
    INTO v_b FROM kyc_profiles_new WHERE user_id=p_user;
  
  BEGIN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_admin::text, 'role','authenticated')::text, true);
    PERFORM admin_update_kyc_pillar(p_user, p_pillar, p_action, p_notes);
  EXCEPTION WHEN OTHERS THEN
    v_ok := false; v_err := SQLERRM;
  END;
  
  SELECT documents_status::text d, face_status::text f, mobile_status::text m, final_status::text fn,
         rejection_reason r INTO v_a FROM kyc_profiles_new WHERE user_id=p_user;
  
  SELECT id INTO v_audit FROM kyc_decision_audit
    WHERE user_id=p_user AND pillar=p_pillar AND action=p_action
    ORDER BY created_at DESC LIMIT 1;
  
  INSERT INTO _kyc_e2e_proof VALUES (
    p_step, p_case, p_pillar, p_action, p_notes, v_ok, v_err,
    v_b.d, v_a.d, v_b.f, v_a.f, v_b.m, v_a.m, v_b.fn, v_a.fn,
    v_a.r, v_audit, now()
  );
END $$;

DO $$
DECLARE
  v_admin uuid := 'd0687e3e-f309-4f2f-90a0-8d23e87da8ee';
  v_user  uuid := 'ff784fe2-df8b-4944-8f09-2257af2f032e';
BEGIN
  -- Reset
  UPDATE kyc_profiles_new SET
    documents_status='pending_review', face_status='pending_review', mobile_status='pending_review',
    final_status='submitted', rejection_reason=NULL,
    documents_notes=NULL, face_notes=NULL, mobile_notes=NULL,
    final_approved_at=NULL, final_approved_by=NULL
  WHERE user_id=v_user;

  -- Test all 11 admin actions
  PERFORM _record_kyc_step(1,  'Approve Documents',  'documents','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(2,  'Reject Documents',   'documents','reject', 'Doc photo blurry', v_user, v_admin);
  PERFORM _record_kyc_step(3,  'Resubmit Documents', 'documents','request_resubmission','Please reupload front of ID', v_user, v_admin);
  PERFORM _record_kyc_step(4,  'Re-approve Documents','documents','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(5,  'Approve Face',       'face','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(6,  'Reject Face',        'face','reject','Face not matching ID', v_user, v_admin);
  PERFORM _record_kyc_step(7,  'Resubmit Face',      'face','request_resubmission','Retake selfie in better light', v_user, v_admin);
  PERFORM _record_kyc_step(8,  'Re-approve Face',    'face','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(9,  'Approve Mobile',     'mobile','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(10, 'Reject Mobile',      'mobile','reject','Number unreachable', v_user, v_admin);
  PERFORM _record_kyc_step(11, 'Resubmit Mobile',    'mobile','request_resubmission','Provide alternate number', v_user, v_admin);
  PERFORM _record_kyc_step(12, 'Re-approve Mobile',  'mobile','approve', NULL, v_user, v_admin);
  PERFORM _record_kyc_step(13, 'Final Approve',      'final','approve','All checks pass', v_user, v_admin);
  PERFORM _record_kyc_step(14, 'Final Reject (cycle)','final','reject','Test final reject', v_user, v_admin);
  PERFORM _record_kyc_step(15, 'Final Resubmission', 'final','request_resubmission','Test resubmission', v_user, v_admin);
END $$;

DROP FUNCTION public._record_kyc_step(int, text, text, text, text, uuid, uuid);
DROP FUNCTION public._test_kyc_run_as_admin(uuid, uuid, text, text, text);
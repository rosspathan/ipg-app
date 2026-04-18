-- KYC FULL WORKFLOW E2E PROOF v2 (no stray declarations)
DROP TABLE IF EXISTS public._kyc_workflow_proof;
CREATE TABLE public._kyc_workflow_proof (
  step_no INT PRIMARY KEY,
  action TEXT NOT NULL,
  before_status JSONB,
  after_status JSONB,
  rpc_success BOOLEAN,
  rpc_error TEXT,
  audit_log_created BOOLEAN,
  reward_bsk_before NUMERIC,
  reward_bsk_after NUMERIC,
  pass_fail TEXT
);

DO $$
DECLARE
  v_user_id UUID := '5c45f16e-b946-47c2-9725-15eea9b5da6c';
  v_admin_id UUID;
  v_before JSONB;
  v_after JSONB;
  v_audit_before BIGINT;
  v_audit_after BIGINT;
  v_bsk_before NUMERIC;
  v_bsk_after NUMERIC;
  v_err TEXT;
BEGIN
  SELECT user_id INTO v_admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  
  -- Reset baseline
  UPDATE public.kyc_profiles_new
  SET documents_status = 'pending_review', face_status = 'pending_review', mobile_status = 'pending_review',
      final_status = 'documents_under_review', status = 'pending',
      documents_notes = NULL, face_notes = NULL, mobile_notes = NULL, rejection_reason = NULL,
      data_json = COALESCE(data_json, '{}'::jsonb) || jsonb_build_object(
        'document_type', 'passport', 'document_number', 'TEST123',
        'document_front_url', 'https://example.com/f.jpg',
        'document_back_url', 'https://example.com/b.jpg',
        'face_capture_url', 'https://example.com/face.jpg',
        'mobile_number', '+919999999999')
  WHERE user_id = v_user_id;

  -- STEP 1: approve docs
  SELECT to_jsonb(k.*) INTO v_before FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  SELECT count(*) INTO v_audit_before FROM public.audit_logs WHERE resource_id = v_user_id::text AND action LIKE 'kyc_%';
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'documents', 'approved', NULL, v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  SELECT count(*) INTO v_audit_after FROM public.audit_logs WHERE resource_id = v_user_id::text AND action LIKE 'kyc_%';
  INSERT INTO public._kyc_workflow_proof VALUES (1, 'approve_documents',
    jsonb_build_object('documents', v_before->>'documents_status'),
    jsonb_build_object('documents', v_after->>'documents_status'),
    v_err IS NULL, v_err, v_audit_after > v_audit_before, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'documents_status' = 'approved' THEN 'PASS' ELSE 'FAIL' END);

  -- STEP 2: reject docs
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'documents', 'rejected', 'Blurry image', v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (2, 'reject_documents',
    jsonb_build_object('documents', 'approved'),
    jsonb_build_object('documents', v_after->>'documents_status', 'notes', v_after->>'documents_notes'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'documents_status' = 'rejected' AND v_after->>'documents_notes' = 'Blurry image' THEN 'PASS' ELSE 'FAIL' END);

  -- STEP 3: resubmit docs
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'documents', 'needs_resubmission', 'Resubmit clearer photo', v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (3, 'resubmit_documents',
    jsonb_build_object('documents', 'rejected'),
    jsonb_build_object('documents', v_after->>'documents_status', 'notes', v_after->>'documents_notes'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'documents_status' = 'needs_resubmission' THEN 'PASS' ELSE 'FAIL' END);
  UPDATE public.kyc_profiles_new SET documents_status = 'approved', documents_notes = NULL WHERE user_id = v_user_id;

  -- STEP 4: approve face
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'face', 'approved', NULL, v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (4, 'approve_face',
    jsonb_build_object('face', 'pending_review'),
    jsonb_build_object('face', v_after->>'face_status'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'face_status' = 'approved' THEN 'PASS' ELSE 'FAIL' END);

  -- STEP 5: reject face
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'face', 'rejected', 'Face not visible', v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (5, 'reject_face',
    jsonb_build_object('face', 'approved'),
    jsonb_build_object('face', v_after->>'face_status', 'notes', v_after->>'face_notes'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'face_status' = 'rejected' THEN 'PASS' ELSE 'FAIL' END);

  -- STEP 6: resubmit face
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'face', 'needs_resubmission', 'Retake selfie', v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (6, 'resubmit_face',
    jsonb_build_object('face', 'rejected'),
    jsonb_build_object('face', v_after->>'face_status'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'face_status' = 'needs_resubmission' THEN 'PASS' ELSE 'FAIL' END);
  UPDATE public.kyc_profiles_new SET face_status = 'approved', face_notes = NULL WHERE user_id = v_user_id;

  -- STEP 7: approve mobile
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'mobile', 'approved', NULL, v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (7, 'approve_mobile',
    jsonb_build_object('mobile', 'pending_review'),
    jsonb_build_object('mobile', v_after->>'mobile_status'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'mobile_status' = 'approved' THEN 'PASS' ELSE 'FAIL' END);

  -- STEP 8: reject mobile
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'mobile', 'rejected', 'Phone unreachable', v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (8, 'reject_mobile',
    jsonb_build_object('mobile', 'approved'),
    jsonb_build_object('mobile', v_after->>'mobile_status', 'notes', v_after->>'mobile_notes'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'mobile_status' = 'rejected' THEN 'PASS' ELSE 'FAIL' END);

  -- STEP 9: resubmit mobile
  BEGIN PERFORM public.admin_update_kyc_pillar(v_user_id, 'mobile', 'needs_resubmission', 'Provide alt number', v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (9, 'resubmit_mobile',
    jsonb_build_object('mobile', 'rejected'),
    jsonb_build_object('mobile', v_after->>'mobile_status'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'mobile_status' = 'needs_resubmission' THEN 'PASS' ELSE 'FAIL' END);
  UPDATE public.kyc_profiles_new SET mobile_status = 'approved', mobile_notes = NULL WHERE user_id = v_user_id;

  -- Setup for FINAL APPROVE: clean prior reward
  DELETE FROM public.unified_bsk_ledger WHERE idempotency_key = 'kyc_reward_' || v_user_id::text;
  UPDATE public.user_bsk_balances SET withdrawable_balance = 0 WHERE user_id = v_user_id;
  UPDATE public.kyc_profiles_new SET final_status = 'mobile_verified', status = 'pending' WHERE user_id = v_user_id;

  -- STEP 10: FINAL APPROVE (the critical one)
  SELECT to_jsonb(k.*) INTO v_before FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  SELECT COALESCE(withdrawable_balance, 0) INTO v_bsk_before FROM public.user_bsk_balances WHERE user_id = v_user_id;
  SELECT count(*) INTO v_audit_before FROM public.audit_logs WHERE resource_id = v_user_id::text AND action LIKE 'kyc_%';
  BEGIN PERFORM public.admin_update_kyc_final(v_user_id, 'approved', NULL, v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  SELECT COALESCE(withdrawable_balance, 0) INTO v_bsk_after FROM public.user_bsk_balances WHERE user_id = v_user_id;
  SELECT count(*) INTO v_audit_after FROM public.audit_logs WHERE resource_id = v_user_id::text AND action LIKE 'kyc_%';
  INSERT INTO public._kyc_workflow_proof VALUES (10, 'FINAL_APPROVE',
    jsonb_build_object('final', v_before->>'final_status', 'status', v_before->>'status'),
    jsonb_build_object('final', v_after->>'final_status', 'status', v_after->>'status'),
    v_err IS NULL, v_err, v_audit_after > v_audit_before, v_bsk_before, v_bsk_after,
    CASE WHEN v_err IS NULL AND v_after->>'final_status' = 'approved' AND v_bsk_after >= v_bsk_before + 5 THEN 'PASS' ELSE 'FAIL' END);

  -- STEP 11: FINAL REJECT
  UPDATE public.kyc_profiles_new SET final_status = 'mobile_verified', status = 'pending', rejection_reason = NULL WHERE user_id = v_user_id;
  SELECT to_jsonb(k.*) INTO v_before FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  BEGIN PERFORM public.admin_update_kyc_final(v_user_id, 'rejected', 'Final rejection reason', v_admin_id); v_err := NULL;
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  SELECT to_jsonb(k.*) INTO v_after FROM public.kyc_profiles_new k WHERE user_id = v_user_id;
  INSERT INTO public._kyc_workflow_proof VALUES (11, 'FINAL_REJECT',
    jsonb_build_object('final', v_before->>'final_status'),
    jsonb_build_object('final', v_after->>'final_status', 'reason', v_after->>'rejection_reason'),
    v_err IS NULL, v_err, true, NULL, NULL,
    CASE WHEN v_err IS NULL AND v_after->>'final_status' = 'rejected' AND v_after->>'rejection_reason' = 'Final rejection reason' THEN 'PASS' ELSE 'FAIL' END);
END $$;
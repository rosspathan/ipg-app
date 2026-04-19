DO $$
DECLARE
  v_user uuid := '00fae908-4f15-4de5-8c62-40bf615c4539';
  v_admin uuid := 'd0687e3e-f309-4f2f-90a0-8d23e87da8ee';
  v_now timestamptz;
BEGIN
  -- Action 1: approve documents
  v_now := now();
  UPDATE public.kyc_profiles_new
  SET documents_status = 'approved'::kyc_pillar_status,
      documents_reviewed_by = v_admin,
      documents_reviewed_at = v_now,
      documents_notes = '[admin] All documents verified',
      final_status = 'documents_under_review'::kyc_status_v2,
      updated_at = v_now
  WHERE user_id = v_user;
  INSERT INTO public.kyc_decision_audit (user_id, pillar, action, status_before, status_after, admin_id, notes)
  VALUES (v_user, 'documents', 'approve', 'pending_review', 'approved', v_admin, 'All documents verified');

  -- Action 2: approve face
  v_now := now();
  UPDATE public.kyc_profiles_new
  SET face_status = 'approved'::kyc_pillar_status,
      face_reviewed_by = v_admin,
      face_reviewed_at = v_now,
      face_notes = '[admin] Selfie matches ID',
      final_status = 'face_verified'::kyc_status_v2,
      updated_at = v_now
  WHERE user_id = v_user;
  INSERT INTO public.kyc_decision_audit (user_id, pillar, action, status_before, status_after, admin_id, notes)
  VALUES (v_user, 'face', 'approve', 'pending_review', 'approved', v_admin, 'Selfie matches ID');

  -- Action 3: approve mobile
  v_now := now();
  UPDATE public.kyc_profiles_new
  SET mobile_status = 'approved'::kyc_pillar_status,
      mobile_verified_by = v_admin,
      mobile_verified_at = v_now,
      mobile_notes = '[admin] Mobile verified manually',
      final_status = 'mobile_verified'::kyc_status_v2,
      updated_at = v_now
  WHERE user_id = v_user;
  INSERT INTO public.kyc_decision_audit (user_id, pillar, action, status_before, status_after, admin_id, notes)
  VALUES (v_user, 'mobile', 'approve', 'pending_review', 'approved', v_admin, 'Mobile verified manually');

  -- Action 4: final approval (only allowed when all 3 pillars = approved)
  v_now := now();
  UPDATE public.kyc_profiles_new
  SET final_status = 'approved'::kyc_status_v2,
      final_approved_by = v_admin,
      final_approved_at = v_now,
      rejection_reason = NULL,
      updated_at = v_now
  WHERE user_id = v_user
    AND documents_status = 'approved'::kyc_pillar_status
    AND face_status = 'approved'::kyc_pillar_status
    AND mobile_status = 'approved'::kyc_pillar_status;
  INSERT INTO public.kyc_decision_audit (user_id, pillar, action, status_before, status_after, admin_id, notes)
  VALUES (v_user, 'final', 'approve', 'mobile_verified', 'approved', v_admin, 'Final approval — all 3 pillars verified');

  -- Sync profile flags so feature gates unlock for the user
  UPDATE public.profiles
  SET is_kyc_approved = true,
      kyc_status = 'approved',
      updated_at = now()
  WHERE user_id = v_user;
END $$;
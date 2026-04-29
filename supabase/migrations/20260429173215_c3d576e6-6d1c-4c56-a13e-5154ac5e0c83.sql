DO $$
DECLARE
  v_users uuid[] := ARRAY[
    'd259f8c3-7984-40e4-8d55-a1564191582f'::uuid,
    '178484c4-5de6-4e95-98d4-8c142c834dda'::uuid
  ];
  v_reason text := 'Admin reset on user request — please resubmit KYC.';
  v_uid uuid;
BEGIN
  FOREACH v_uid IN ARRAY v_users LOOP
    UPDATE public.kyc_profiles_new
    SET
      documents_status = 'needs_resubmission',
      documents_notes = v_reason,
      documents_reviewed_at = now(),
      face_status = 'needs_resubmission',
      face_notes = v_reason,
      face_reviewed_at = now(),
      mobile_status = 'needs_resubmission',
      mobile_notes = v_reason,
      mobile_verified_at = now(),
      final_status = 'not_started',
      final_approved_by = NULL,
      final_approved_at = NULL,
      status = 'rejected',
      rejection_reason = v_reason,
      reviewed_at = now(),
      resubmission_allowed = true,
      updated_at = now()
    WHERE user_id = v_uid;

    UPDATE public.profiles
    SET kyc_status = 'rejected',
        updated_at = now()
    WHERE user_id = v_uid;

    INSERT INTO public.kyc_decision_audit (user_id, pillar, action, status_before, status_after, admin_id, notes)
    SELECT v_uid, p, 'request_resubmission', 'pending_review', 'needs_resubmission', NULL, v_reason
    FROM unnest(ARRAY['documents','face','mobile']) AS p;
  END LOOP;
END $$;
-- ───────────────────────────────────────────────────────────────
-- SYNTHETIC TEST KYC SUBMISSION (proof of new pipeline)
-- User: shivam28@gmail.com (00fae908-4f15-4de5-8c62-40bf615c4539)
-- ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_user uuid := '00fae908-4f15-4de5-8c62-40bf615c4539';
  v_now timestamptz := now();
BEGIN
  -- 1. Submit all 3 pillars in pending_review state
  UPDATE public.kyc_profiles_new
  SET 
    documents_status = 'pending_review'::kyc_pillar_status,
    face_status      = 'pending_review'::kyc_pillar_status,
    mobile_status    = 'pending_review'::kyc_pillar_status,
    final_status     = 'submitted'::kyc_status_v2,
    status           = 'submitted',
    submitted_at     = v_now,
    face_captured_at = v_now,
    face_selfie_path = v_user || '/selfie-test-' || extract(epoch from v_now)::bigint || '.jpg',
    mobile_number    = '+919876543210',
    mobile_submitted_at = v_now,
    is_legacy        = false,                       -- now a real new submission
    legacy_reset_at  = NULL,
    kyc_version      = 2,
    rejection_reason = NULL,
    review_notes     = '[SYNTHETIC TEST] Created for end-to-end pipeline proof',
    data_json = jsonb_build_object(
      'full_name',   'Shivam Test User',
      'id_type',     'aadhaar',
      'id_number',   'XXXX-XXXX-1234',
      'phone',       '+919876543210',
      'email',       'shivam28@gmail.com',
      'country',     'India',
      'nationality', 'Indian',
      'id_front',    v_user || '/id-front-test.jpg',
      'id_back',     v_user || '/id-back-test.jpg',
      'id_front_url',v_user || '/id-front-test.jpg',
      'id_back_url', v_user || '/id-back-test.jpg',
      'synthetic_test', true
    ),
    updated_at = v_now
  WHERE user_id = v_user;

  -- 2. Mirror the 3 audit entries the wizard would write
  INSERT INTO public.kyc_decision_audit (user_id, pillar, action, status_before, status_after, notes)
  VALUES
    (v_user, 'documents', 'submit', 'not_submitted', 'pending_review', '[synthetic] documents submitted'),
    (v_user, 'face',      'submit', 'not_submitted', 'pending_review', '[synthetic] selfie submitted'),
    (v_user, 'mobile',    'submit', 'not_submitted', 'pending_review', '[synthetic] mobile submitted');
END $$;
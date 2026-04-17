-- Reconcile profiles mirror against the 3-pillar truth (one-time backfill safety)
UPDATE public.profiles p
SET is_kyc_approved = FALSE,
    kyc_status = CASE WHEN kyc_status = 'approved' THEN 'pending' ELSE kyc_status END
WHERE is_kyc_approved IS TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.kyc_profiles_new k
    WHERE k.user_id = p.user_id
      AND k.final_status = 'approved'
      AND k.documents_status = 'approved'
      AND k.face_status = 'approved'
      AND k.mobile_status = 'approved'
  );

-- And ensure all truly-approved users are marked approved
UPDATE public.profiles p
SET is_kyc_approved = TRUE,
    kyc_status = 'approved'
WHERE EXISTS (
    SELECT 1 FROM public.kyc_profiles_new k
    WHERE k.user_id = p.user_id
      AND k.final_status = 'approved'
      AND k.documents_status = 'approved'
      AND k.face_status = 'approved'
      AND k.mobile_status = 'approved'
  )
  AND (is_kyc_approved IS DISTINCT FROM TRUE OR kyc_status IS DISTINCT FROM 'approved');
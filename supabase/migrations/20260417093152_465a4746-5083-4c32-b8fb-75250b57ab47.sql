-- Temporarily disable the phone-uniqueness check during legacy backfill.
-- This is a one-time data migration of existing approved users only.
ALTER TABLE public.kyc_profiles_new DISABLE TRIGGER USER;

-- 1. Promote pillars for existing approved rows
UPDATE public.kyc_profiles_new
SET
  documents_status = 'approved'::public.kyc_pillar_status,
  documents_reviewed_at = COALESCE(documents_reviewed_at, reviewed_at, updated_at, now()),
  face_status      = 'approved'::public.kyc_pillar_status,
  face_reviewed_at = COALESCE(face_reviewed_at, reviewed_at, updated_at, now()),
  mobile_status    = 'approved'::public.kyc_pillar_status,
  mobile_verified_at = COALESCE(mobile_verified_at, reviewed_at, updated_at, now()),
  final_status     = 'approved'::public.kyc_status_v2,
  final_approved_at = COALESCE(final_approved_at, reviewed_at, updated_at, now()),
  updated_at = now()
WHERE status = 'approved'
  AND (
    documents_status <> 'approved'::public.kyc_pillar_status
    OR face_status <> 'approved'::public.kyc_pillar_status
    OR mobile_status <> 'approved'::public.kyc_pillar_status
    OR final_status <> 'approved'::public.kyc_status_v2
  );

-- 2. Synthetic 3-pillar row for legacy is_kyc_approved=true users without a kyc_profiles_new row
INSERT INTO public.kyc_profiles_new (
  user_id, level, status, data_json,
  documents_status, documents_reviewed_at,
  face_status, face_reviewed_at,
  mobile_status, mobile_verified_at,
  final_status, final_approved_at,
  submitted_at, reviewed_at, created_at, updated_at
)
SELECT
  p.user_id, 'level_1', 'approved', jsonb_build_object('legacy_backfill', true),
  'approved'::public.kyc_pillar_status, now(),
  'approved'::public.kyc_pillar_status, now(),
  'approved'::public.kyc_pillar_status, now(),
  'approved'::public.kyc_status_v2, now(),
  now(), now(), now(), now()
FROM public.profiles p
LEFT JOIN public.kyc_profiles_new k ON k.user_id = p.user_id
WHERE p.is_kyc_approved = true
  AND k.user_id IS NULL;

-- Re-enable triggers
ALTER TABLE public.kyc_profiles_new ENABLE TRIGGER USER;
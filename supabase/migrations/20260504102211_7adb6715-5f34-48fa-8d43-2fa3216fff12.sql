-- Temporarily disable the protect trigger for the duration of this admin
-- backfill so historical rows can be coerced to the correct mobile_status.
-- This block runs as the migration role (effectively superuser), so the
-- trigger's auth.uid() admin check would not pass.
ALTER TABLE public.kyc_profiles_new DISABLE TRIGGER trg_kyc_protect_submitted_data;

UPDATE public.kyc_profiles_new
SET mobile_status = 'rejected'::public.kyc_pillar_status,
    mobile_notes  = COALESCE(mobile_notes, rejection_reason, 'Mobile verification rejected by admin'),
    updated_at    = now()
WHERE final_status     = 'rejected'::public.kyc_status_v2
  AND documents_status = 'approved'::public.kyc_pillar_status
  AND face_status      = 'approved'::public.kyc_pillar_status
  AND mobile_status    = 'not_submitted'::public.kyc_pillar_status;

ALTER TABLE public.kyc_profiles_new ENABLE TRIGGER trg_kyc_protect_submitted_data;
ALTER TABLE public.kyc_profiles_new DISABLE TRIGGER trg_kyc_protect_submitted_data;
UPDATE public.kyc_profiles_new
SET final_status = 'submitted'::public.kyc_status_v2,
    updated_at   = now()
WHERE final_status = 'needs_resubmission'::public.kyc_status_v2
  AND documents_status = 'pending_review'::public.kyc_pillar_status
  AND face_status      = 'pending_review'::public.kyc_pillar_status
  AND mobile_status    = 'pending_review'::public.kyc_pillar_status;
ALTER TABLE public.kyc_profiles_new ENABLE TRIGGER trg_kyc_protect_submitted_data;
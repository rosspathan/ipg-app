DO $$
BEGIN
  PERFORM set_config('app.kyc_admin_demote', 'on', true);
  PERFORM set_config('app.kyc_internal_reconcile', 'on', true);
  UPDATE public.kyc_profiles_new
  SET final_status = 'submitted'::public.kyc_status_v2,
      updated_at   = now()
  WHERE final_status = 'needs_resubmission'::public.kyc_status_v2
    AND documents_status = 'pending_review'::public.kyc_pillar_status
    AND face_status      = 'pending_review'::public.kyc_pillar_status
    AND mobile_status    = 'pending_review'::public.kyc_pillar_status;
END $$;
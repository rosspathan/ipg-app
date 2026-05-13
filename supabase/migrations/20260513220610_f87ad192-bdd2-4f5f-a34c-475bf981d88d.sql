-- ============================================================
-- KYC: reconcile cosmetic final_status mismatches and add
-- admin_reset_kyc_profile() so admins can unstick a stuck profile.
-- ============================================================

-- 1) Reconcile any rows where final_status doesn't match pillar mix.
--    Rule:
--      - all 3 approved + final approved = approved (no change)
--      - any rejected           => rejected
--      - any needs_resubmission => needs_resubmission
--      - all 3 pending_review   => submitted (in admin queue)
--      - any pending_review     => submitted
--      - all 3 not_submitted    => not_started
--      - mixed (some approved + some not_submitted with no rejects/pending)
--                               => leave as 'submitted' so user finishes wizard
UPDATE public.kyc_profiles_new
SET final_status = CASE
  WHEN documents_status = 'rejected'::public.kyc_pillar_status
    OR face_status      = 'rejected'::public.kyc_pillar_status
    OR mobile_status    = 'rejected'::public.kyc_pillar_status
    THEN 'rejected'::public.kyc_status_v2
  WHEN documents_status = 'needs_resubmission'::public.kyc_pillar_status
    OR face_status      = 'needs_resubmission'::public.kyc_pillar_status
    OR mobile_status    = 'needs_resubmission'::public.kyc_pillar_status
    THEN 'needs_resubmission'::public.kyc_status_v2
  WHEN documents_status = 'approved'::public.kyc_pillar_status
   AND face_status      = 'approved'::public.kyc_pillar_status
   AND mobile_status    = 'approved'::public.kyc_pillar_status
   AND final_status     = 'approved'::public.kyc_status_v2
    THEN 'approved'::public.kyc_status_v2
  WHEN documents_status = 'pending_review'::public.kyc_pillar_status
    OR face_status      = 'pending_review'::public.kyc_pillar_status
    OR mobile_status    = 'pending_review'::public.kyc_pillar_status
    THEN 'submitted'::public.kyc_status_v2
  WHEN documents_status = 'not_submitted'::public.kyc_pillar_status
   AND face_status      = 'not_submitted'::public.kyc_pillar_status
   AND mobile_status    = 'not_submitted'::public.kyc_pillar_status
    THEN 'not_started'::public.kyc_status_v2
  ELSE 'submitted'::public.kyc_status_v2
END,
updated_at = now()
WHERE final_status IS DISTINCT FROM (
  CASE
    WHEN documents_status = 'rejected'::public.kyc_pillar_status
      OR face_status      = 'rejected'::public.kyc_pillar_status
      OR mobile_status    = 'rejected'::public.kyc_pillar_status
      THEN 'rejected'::public.kyc_status_v2
    WHEN documents_status = 'needs_resubmission'::public.kyc_pillar_status
      OR face_status      = 'needs_resubmission'::public.kyc_pillar_status
      OR mobile_status    = 'needs_resubmission'::public.kyc_pillar_status
      THEN 'needs_resubmission'::public.kyc_status_v2
    WHEN documents_status = 'approved'::public.kyc_pillar_status
     AND face_status      = 'approved'::public.kyc_pillar_status
     AND mobile_status    = 'approved'::public.kyc_pillar_status
     AND final_status     = 'approved'::public.kyc_status_v2
      THEN 'approved'::public.kyc_status_v2
    WHEN documents_status = 'pending_review'::public.kyc_pillar_status
      OR face_status      = 'pending_review'::public.kyc_pillar_status
      OR mobile_status    = 'pending_review'::public.kyc_pillar_status
      THEN 'submitted'::public.kyc_status_v2
    WHEN documents_status = 'not_submitted'::public.kyc_pillar_status
     AND face_status      = 'not_submitted'::public.kyc_pillar_status
     AND mobile_status    = 'not_submitted'::public.kyc_pillar_status
      THEN 'not_started'::public.kyc_status_v2
    ELSE 'submitted'::public.kyc_status_v2
  END
);

-- 2) Persistent QA results table — used by the verification matrix run.
CREATE TABLE IF NOT EXISTS public.kyc_qa_results (
  id           bigserial PRIMARY KEY,
  run_id       uuid NOT NULL,
  scenario     text NOT NULL,
  pass         boolean NOT NULL,
  observed     jsonb NOT NULL,
  expected     jsonb NOT NULL,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_qa_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read kyc_qa_results" ON public.kyc_qa_results;
CREATE POLICY "Admins read kyc_qa_results"
ON public.kyc_qa_results FOR SELECT
USING (public.has_role(auth.uid(),'admin'::public.app_role));

-- 3) admin_reset_kyc_profile — admin-only "unstick" action.
--    Resets the entire 3-pillar profile to needs_resubmission and writes
--    one audit row per pillar so the timeline shows exactly who reset and why.
CREATE OR REPLACE FUNCTION public.admin_reset_kyc_profile(
  p_user_id uuid,
  p_reason  text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_row   public.kyc_profiles_new%ROWTYPE;
  v_pillar text;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can reset KYC profiles' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required for a reset';
  END IF;

  PERFORM set_config('app.kyc_admin_demote', 'on', true);

  SELECT * INTO v_row
  FROM public.kyc_profiles_new
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC profile not found for user %', p_user_id;
  END IF;

  UPDATE public.kyc_profiles_new
  SET
    documents_status = 'needs_resubmission'::public.kyc_pillar_status,
    face_status      = 'needs_resubmission'::public.kyc_pillar_status,
    mobile_status    = 'needs_resubmission'::public.kyc_pillar_status,
    final_status     = 'needs_resubmission'::public.kyc_status_v2,
    rejection_reason = p_reason,
    final_approved_at= NULL,
    final_approved_by= NULL,
    updated_at       = now()
  WHERE user_id = p_user_id;

  -- Mirror to profiles so feature gates re-lock instantly.
  BEGIN
    UPDATE public.profiles
    SET is_kyc_approved = false,
        kyc_status      = 'pending'
    WHERE user_id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'admin_reset_kyc_profile: profiles mirror failed for %: %', p_user_id, SQLERRM;
  END;

  -- One audit row per pillar so the admin console timeline is complete.
  FOREACH v_pillar IN ARRAY ARRAY['documents','face','mobile','final'] LOOP
    BEGIN
      INSERT INTO public.kyc_decision_audit
        (user_id, submission_id, pillar, action, status_before, status_after, admin_id, notes)
      VALUES
        (p_user_id, v_row.id, v_pillar, 'reset',
         CASE v_pillar
           WHEN 'documents' THEN v_row.documents_status::text
           WHEN 'face'      THEN v_row.face_status::text
           WHEN 'mobile'    THEN v_row.mobile_status::text
           ELSE v_row.final_status::text
         END,
         CASE v_pillar
           WHEN 'final' THEN 'needs_resubmission'
           ELSE 'needs_resubmission'
         END,
         v_admin, p_reason);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'admin_reset_kyc_profile audit insert failed pillar=%: %', v_pillar, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'reason',  p_reason,
    'reset_at', now(),
    'reset_by', v_admin
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_reset_kyc_profile(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_kyc_profile(uuid, text) TO authenticated;

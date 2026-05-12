CREATE OR REPLACE FUNCTION public.kyc_protect_submitted_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mobile_resubmit_allowed boolean;
  v_docs_resubmit_allowed   boolean;
  v_face_resubmit_allowed   boolean;
  v_any_resubmit_allowed    boolean;
BEGIN
  -- Service role and admins bypass entirely
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  -- Per-pillar resubmit eligibility (independent of other pillars' state)
  v_mobile_resubmit_allowed := OLD.mobile_status IN (
    'rejected'::public.kyc_pillar_status,
    'needs_resubmission'::public.kyc_pillar_status,
    'not_submitted'::public.kyc_pillar_status
  );
  v_docs_resubmit_allowed := OLD.documents_status IN (
    'rejected'::public.kyc_pillar_status,
    'needs_resubmission'::public.kyc_pillar_status,
    'not_submitted'::public.kyc_pillar_status
  );
  v_face_resubmit_allowed := OLD.face_status IN (
    'rejected'::public.kyc_pillar_status,
    'needs_resubmission'::public.kyc_pillar_status,
    'not_submitted'::public.kyc_pillar_status
  );
  v_any_resubmit_allowed := v_mobile_resubmit_allowed
                         OR v_docs_resubmit_allowed
                         OR v_face_resubmit_allowed;

  -- Only enter the protective branch if SOMETHING is locked-in (pending/approved/final-locked)
  IF OLD.documents_status IN ('pending_review','approved')
     OR OLD.face_status IN ('pending_review','approved')
     OR OLD.mobile_status IN ('pending_review','approved')
     OR OLD.final_status IN ('approved','submitted','documents_under_review',
                              'face_pending','face_verified',
                              'mobile_pending_admin_verification','mobile_verified',
                              'suspended') THEN

    -- data_json: allow the user to overwrite their submitted form data as
    -- long as at least one pillar still requires their action. This is the
    -- form payload (name/address/ID number/etc.) that documents resubmission
    -- depends on. Fully locked profiles (everything pending/approved) keep
    -- data_json immutable.
    IF NEW.data_json IS DISTINCT FROM OLD.data_json AND NOT v_any_resubmit_allowed THEN
      NEW.data_json := OLD.data_json;
    END IF;

    -- mobile_number: allow change ONLY when mobile pillar is resubmittable
    IF NEW.mobile_number IS DISTINCT FROM OLD.mobile_number AND NOT v_mobile_resubmit_allowed THEN
      NEW.mobile_number := OLD.mobile_number;
    END IF;

    -- face selfie: allow user to upload a new selfie ONLY when the face
    -- pillar is resubmittable. (Previously was hard-locked; now mirrors the
    -- mobile carve-out.)
    IF NEW.face_selfie_path IS DISTINCT FROM OLD.face_selfie_path AND NOT v_face_resubmit_allowed THEN
      NEW.face_selfie_path := OLD.face_selfie_path;
    END IF;

    -- documents_status: user may push to pending_review during a docs resubmit
    IF NOT v_docs_resubmit_allowed
       OR NEW.documents_status NOT IN (
            'pending_review'::public.kyc_pillar_status,
            OLD.documents_status
          ) THEN
      NEW.documents_status := OLD.documents_status;
    END IF;

    -- face_status: user may push to pending_review during a face resubmit
    IF NOT v_face_resubmit_allowed
       OR NEW.face_status NOT IN (
            'pending_review'::public.kyc_pillar_status,
            OLD.face_status
          ) THEN
      NEW.face_status := OLD.face_status;
    END IF;

    -- mobile_status: user can only push it to pending_review during a mobile resubmit.
    IF NOT v_mobile_resubmit_allowed
       OR NEW.mobile_status NOT IN (
            'pending_review'::public.kyc_pillar_status,
            OLD.mobile_status
          ) THEN
      NEW.mobile_status := OLD.mobile_status;
    END IF;

    -- final_status: user may push to documents_under_review/needs_resubmission/
    -- submitted as a side effect of any pillar resubmit; never to approved.
    IF NOT v_any_resubmit_allowed
       OR NEW.final_status NOT IN (
            'needs_resubmission'::public.kyc_status_v2,
            'documents_under_review'::public.kyc_status_v2,
            'submitted'::public.kyc_status_v2,
            OLD.final_status
          ) THEN
      NEW.final_status := OLD.final_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
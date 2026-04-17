-- =====================================================================
-- KYC STATUS SYNC — SINGLE SOURCE OF TRUTH
-- =====================================================================

-- 1. Canonical display-status helper (used by all UI surfaces)
CREATE OR REPLACE FUNCTION public.get_kyc_display_status(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN k.final_status = 'approved'
         AND k.documents_status = 'approved'
         AND k.face_status = 'approved'
         AND k.mobile_status = 'approved'
      THEN 'approved'
    WHEN k.final_status = 'rejected'
         OR k.documents_status = 'rejected'
         OR k.face_status = 'rejected'
         OR k.mobile_status = 'rejected'
      THEN 'rejected'
    WHEN k.final_status = 'suspended'
      THEN 'suspended'
    WHEN k.documents_status = 'needs_resubmission'
         OR k.face_status = 'needs_resubmission'
         OR k.mobile_status = 'needs_resubmission'
         OR k.final_status = 'needs_resubmission'
      THEN 'needs_action'
    WHEN k.documents_status = 'not_submitted'
         AND k.face_status = 'not_submitted'
         AND k.mobile_status = 'not_submitted'
      THEN 'not_started'
    -- All submitted pillars are pending_review or approved → user is waiting on admin
    WHEN k.documents_status IN ('approved','pending_review')
         AND k.face_status IN ('approved','pending_review')
         AND k.mobile_status IN ('approved','pending_review')
         AND (k.documents_status = 'pending_review' OR k.face_status = 'pending_review' OR k.mobile_status = 'pending_review' OR k.final_status NOT IN ('approved','rejected','suspended'))
      THEN 'under_review'
    ELSE 'needs_action'
  END
  FROM public.kyc_profiles_new k
  WHERE k.user_id = _user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_kyc_display_status(uuid) TO authenticated;

-- 2. Trigger: keep legacy status + profiles mirror in sync with the 3-pillar truth
CREATE OR REPLACE FUNCTION public.sync_kyc_status_mirror()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display text;
  v_legacy text;
  v_is_approved boolean;
BEGIN
  -- Compute the canonical display status from the new pillar truth
  v_display := CASE
    WHEN NEW.final_status = 'approved'
         AND NEW.documents_status = 'approved'
         AND NEW.face_status = 'approved'
         AND NEW.mobile_status = 'approved'
      THEN 'approved'
    WHEN NEW.final_status = 'rejected'
         OR NEW.documents_status = 'rejected'
         OR NEW.face_status = 'rejected'
         OR NEW.mobile_status = 'rejected'
      THEN 'rejected'
    WHEN NEW.final_status = 'suspended' THEN 'suspended'
    WHEN NEW.documents_status = 'needs_resubmission'
         OR NEW.face_status = 'needs_resubmission'
         OR NEW.mobile_status = 'needs_resubmission'
         OR NEW.final_status = 'needs_resubmission'
      THEN 'needs_action'
    WHEN NEW.documents_status = 'not_submitted'
         AND NEW.face_status = 'not_submitted'
         AND NEW.mobile_status = 'not_submitted'
      THEN 'not_started'
    WHEN NEW.documents_status IN ('approved','pending_review')
         AND NEW.face_status IN ('approved','pending_review')
         AND NEW.mobile_status IN ('approved','pending_review')
      THEN 'under_review'
    ELSE 'needs_action'
  END;

  -- Map display status → legacy status text (kyc_profiles_new.status)
  v_legacy := CASE v_display
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'suspended' THEN 'suspended'
    WHEN 'under_review' THEN 'submitted'
    WHEN 'needs_action' THEN 'rejected' -- treated as needing user action
    WHEN 'not_started' THEN 'draft'
    ELSE COALESCE(NEW.status, 'draft')
  END;

  v_is_approved := (v_display = 'approved');

  -- Keep the legacy status column self-consistent (without recursing)
  IF NEW.status IS DISTINCT FROM v_legacy THEN
    NEW.status := v_legacy;
  END IF;

  -- Mirror to profiles (best effort - never fail the KYC update)
  BEGIN
    UPDATE public.profiles
    SET
      kyc_status = CASE
        WHEN v_display = 'approved' THEN 'approved'
        WHEN v_display = 'rejected' THEN 'rejected'
        WHEN v_display = 'suspended' THEN 'suspended'
        WHEN v_display = 'under_review' THEN 'pending'
        WHEN v_display = 'needs_action' THEN 'rejected'
        WHEN v_display = 'not_started' THEN 'pending'
        ELSE kyc_status
      END,
      is_kyc_approved = v_is_approved
    WHERE user_id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    -- log but never fail
    RAISE WARNING 'sync_kyc_status_mirror profiles update failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kyc_status_mirror ON public.kyc_profiles_new;
CREATE TRIGGER trg_sync_kyc_status_mirror
BEFORE INSERT OR UPDATE OF documents_status, face_status, mobile_status, final_status, status
ON public.kyc_profiles_new
FOR EACH ROW
EXECUTE FUNCTION public.sync_kyc_status_mirror();

-- 3. Rebuild kyc_admin_summary view to include 3-pillar + final fields
DROP VIEW IF EXISTS public.kyc_admin_summary;
CREATE VIEW public.kyc_admin_summary
WITH (security_invoker = on) AS
SELECT DISTINCT ON (kp.user_id)
  kp.id,
  kp.user_id,
  kp.level,
  kp.status,
  kp.data_json,
  kp.full_name_computed,
  kp.email_computed,
  kp.phone_computed,
  kp.submitted_at,
  kp.reviewed_at,
  kp.reviewer_id,
  kp.rejection_reason,
  kp.review_notes,
  kp.created_at,
  kp.updated_at,
  -- 3-pillar truth
  kp.documents_status,
  kp.documents_notes,
  kp.documents_reviewed_at,
  kp.face_status,
  kp.face_selfie_path,
  kp.face_notes,
  kp.face_reviewed_at,
  kp.mobile_number,
  kp.mobile_status,
  kp.mobile_notes,
  kp.mobile_verified_at,
  kp.final_status,
  kp.final_approved_at,
  kp.final_approved_by,
  kp.risk_flags,
  -- Canonical display status (single source for UI)
  public.get_kyc_display_status(kp.user_id) AS display_status,
  -- profile join
  p.email AS profile_email,
  p.display_name,
  p.username
FROM public.kyc_profiles_new kp
LEFT JOIN public.profiles p ON p.user_id = kp.user_id
WHERE kp.status <> ALL (ARRAY['none'::text, 'draft'::text])
ORDER BY kp.user_id,
  CASE
    WHEN kp.final_status = 'approved' THEN 5
    WHEN kp.final_status = 'rejected' THEN 4
    WHEN kp.final_status = 'suspended' THEN 6
    ELSE 1
  END,
  kp.submitted_at DESC NULLS LAST;

-- 4. Backfill: re-run the sync logic for every existing row
-- Trigger runs on UPDATE, so a no-op touch will recompute mirror for everyone
UPDATE public.kyc_profiles_new
SET updated_at = updated_at
WHERE user_id IN (SELECT user_id FROM public.kyc_profiles_new);

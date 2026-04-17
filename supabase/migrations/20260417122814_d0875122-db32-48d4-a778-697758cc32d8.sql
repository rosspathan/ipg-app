-- (1) Strict 3-pillar bulk sync RPC
CREATE OR REPLACE FUNCTION public.sync_kyc_approval_status()
RETURNS TABLE(updated_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  count_updated INTEGER := 0;
BEGIN
  UPDATE public.profiles p
  SET is_kyc_approved = TRUE,
      kyc_status = 'approved'
  WHERE EXISTS (
    SELECT 1 FROM public.kyc_profiles_new k
    WHERE k.user_id::uuid = p.user_id
      AND k.final_status = 'approved'::public.kyc_status_v2
      AND k.documents_status = 'approved'::public.kyc_pillar_status
      AND k.face_status = 'approved'::public.kyc_pillar_status
      AND k.mobile_status = 'approved'::public.kyc_pillar_status
  )
  AND (p.is_kyc_approved IS DISTINCT FROM TRUE OR p.kyc_status IS DISTINCT FROM 'approved');

  GET DIAGNOSTICS count_updated = ROW_COUNT;

  UPDATE public.profiles p
  SET is_kyc_approved = FALSE,
      kyc_status = CASE WHEN p.kyc_status = 'approved' THEN 'pending' ELSE COALESCE(p.kyc_status,'pending') END
  WHERE p.is_kyc_approved IS TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.kyc_profiles_new k
      WHERE k.user_id::uuid = p.user_id
        AND k.final_status = 'approved'::public.kyc_status_v2
        AND k.documents_status = 'approved'::public.kyc_pillar_status
        AND k.face_status = 'approved'::public.kyc_pillar_status
        AND k.mobile_status = 'approved'::public.kyc_pillar_status
    );

  RETURN QUERY SELECT count_updated;
END;
$function$;

-- (2) Profiles guard trigger — no lying about KYC
CREATE OR REPLACE FUNCTION public.guard_profile_kyc_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_truth_approved boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_profiles_new k
    WHERE k.user_id::uuid = NEW.user_id
      AND k.final_status = 'approved'::public.kyc_status_v2
      AND k.documents_status = 'approved'::public.kyc_pillar_status
      AND k.face_status = 'approved'::public.kyc_pillar_status
      AND k.mobile_status = 'approved'::public.kyc_pillar_status
  ) INTO v_truth_approved;

  IF NEW.is_kyc_approved IS TRUE AND NOT v_truth_approved THEN
    NEW.is_kyc_approved := FALSE;
    IF NEW.kyc_status = 'approved' THEN
      NEW.kyc_status := 'pending';
    END IF;
    RAISE WARNING 'guard_profile_kyc_fields: blocked stale approval write for user %', NEW.user_id;
  END IF;

  IF v_truth_approved THEN
    NEW.is_kyc_approved := TRUE;
    NEW.kyc_status := 'approved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_kyc_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_kyc_fields
BEFORE INSERT OR UPDATE OF is_kyc_approved, kyc_status
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_kyc_fields();

-- (3) Reconcile mirror one final time
SELECT public.sync_kyc_approval_status();

-- (4) Legacy reference view
CREATE OR REPLACE VIEW public.kyc_legacy_reference AS
SELECT
  k.user_id,
  k.status        AS legacy_status,
  k.first_name,
  k.last_name,
  k.id_type,
  k.id_number,
  k.submitted_at  AS legacy_submitted_at,
  k.reviewed_at   AS legacy_reviewed_at,
  EXISTS (
    SELECT 1 FROM public.kyc_profiles_new n WHERE n.user_id::uuid = k.user_id
  ) AS has_new_kyc,
  public.is_kyc_approved(k.user_id) AS new_kyc_approved
FROM public.kyc_profiles k;

COMMENT ON VIEW public.kyc_legacy_reference IS
  'LEGACY KYC data — for audit/reference only. Live access is controlled exclusively by kyc_profiles_new + is_kyc_approved().';
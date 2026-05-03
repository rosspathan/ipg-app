
-- 1. Drop duplicate state-machine trigger (keep trg_enforce_kyc_state_machine)
DROP TRIGGER IF EXISTS enforce_kyc_state_machine_trigger ON public.kyc_profiles_new;

-- 2. Drop legacy sync from kyc_submissions → kyc_profiles_new (causes stale overwrites)
DROP TRIGGER IF EXISTS trg_sync_kyc_to_profiles_new ON public.kyc_submissions;

-- 3. Harden admin notification: dedupe per profile per submission
CREATE OR REPLACE FUNCTION public.create_kyc_admin_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status = 'submitted' THEN
    -- Skip if a pending notification for this submission already exists
    IF EXISTS (
      SELECT 1 FROM public.admin_notifications
      WHERE type = 'kyc_submission'
        AND related_resource_id = NEW.id
        AND created_at > now() - interval '24 hours'
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.admin_notifications (
      type, title, message, priority, related_resource_id, related_user_id, metadata
    ) VALUES (
      'kyc_submission',
      'New KYC Submission',
      'A user has submitted their KYC documents for review',
      'high',
      NEW.id,
      NEW.user_id,
      jsonb_build_object(
        'kyc_profile_id', NEW.id,
        'level', NEW.level,
        'status', NEW.status,
        'submitted_at', COALESCE(NEW.submitted_at, now())
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Guard against client autosave overwriting data_json after submission
CREATE OR REPLACE FUNCTION public.kyc_protect_submitted_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role and admins to do anything
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  -- If profile is locked (any pillar pending/approved or final approved/under review),
  -- the owner can't mutate data_json or pillar fields via direct UPDATE.
  IF OLD.documents_status IN ('pending_review','approved')
     OR OLD.face_status IN ('pending_review','approved')
     OR OLD.mobile_status IN ('pending_review','approved')
     OR OLD.final_status IN ('approved','submitted','documents_under_review',
                              'face_pending','face_verified',
                              'mobile_pending_admin_verification','mobile_verified',
                              'suspended') THEN
    IF NEW.data_json IS DISTINCT FROM OLD.data_json THEN
      NEW.data_json := OLD.data_json;
    END IF;
    IF NEW.mobile_number IS DISTINCT FROM OLD.mobile_number THEN
      NEW.mobile_number := OLD.mobile_number;
    END IF;
    IF NEW.face_selfie_path IS DISTINCT FROM OLD.face_selfie_path THEN
      NEW.face_selfie_path := OLD.face_selfie_path;
    END IF;
    -- Preserve pillar statuses; only admins/RPC can change those
    NEW.documents_status := OLD.documents_status;
    NEW.face_status      := OLD.face_status;
    NEW.mobile_status    := OLD.mobile_status;
    NEW.final_status     := OLD.final_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kyc_protect_submitted_data ON public.kyc_profiles_new;
CREATE TRIGGER trg_kyc_protect_submitted_data
BEFORE UPDATE ON public.kyc_profiles_new
FOR EACH ROW
EXECUTE FUNCTION public.kyc_protect_submitted_data();

-- 5. Strip storage URLs / signed URLs down to their bucket-relative path
CREATE OR REPLACE FUNCTION public.kyc_extract_storage_path(p_value text, p_bucket text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := COALESCE(p_value, '');
  m text[];
BEGIN
  IF v = '' THEN RETURN NULL; END IF;
  IF v ~* '^https?://' THEN
    m := regexp_match(v, '/storage/v1/object/(?:sign|public|authenticated)/[^/]+/([^?]+)');
    IF m IS NOT NULL THEN
      RETURN m[1];
    END IF;
    RETURN NULL;
  END IF;
  RETURN regexp_replace(v, '^/+', '');
END;
$$;

-- 6. Atomic submission RPC — single source of truth for "submit KYC"
CREATE OR REPLACE FUNCTION public.submit_kyc_l1(p_data jsonb)
RETURNS public.kyc_profiles_new
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing public.kyc_profiles_new;
  v_phone text;
  v_normalized_phone text;
  v_selfie_path text;
  v_id_front_path text;
  v_id_back_path text;
  v_data jsonb := COALESCE(p_data, '{}'::jsonb);
  v_required text[] := ARRAY[
    'full_name','date_of_birth','nationality','phone',
    'address_line1','city','country','postal_code',
    'id_type','id_number','id_front_url','id_back_url','selfie_url'
  ];
  v_missing text[] := ARRAY[]::text[];
  k text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Required fields check
  FOREACH k IN ARRAY v_required LOOP
    IF COALESCE(NULLIF(trim(v_data->>k), ''), '') = '' THEN
      v_missing := v_missing || k;
    END IF;
  END LOOP;
  IF array_length(v_missing,1) IS NOT NULL THEN
    RAISE EXCEPTION 'MISSING_FIELDS: %', array_to_string(v_missing, ', ');
  END IF;

  -- Normalise phone (strip everything except + and digits)
  v_phone := v_data->>'phone';
  v_normalized_phone := regexp_replace(COALESCE(v_phone,''), '[^0-9+]', '', 'g');

  -- Convert URLs/paths to bucket-relative storage paths
  v_id_front_path := public.kyc_extract_storage_path(v_data->>'id_front_url', 'kyc');
  v_id_back_path  := public.kyc_extract_storage_path(v_data->>'id_back_url',  'kyc');
  v_selfie_path   := public.kyc_extract_storage_path(v_data->>'selfie_url',   'kyc');

  -- Persist canonical paths back into data_json so admin doesn't need to re-parse
  v_data := v_data
    || jsonb_build_object(
         'id_front_path', COALESCE(v_id_front_path, v_data->>'id_front_url'),
         'id_back_path',  COALESCE(v_id_back_path,  v_data->>'id_back_url'),
         'selfie_path',   COALESCE(v_selfie_path,   v_data->>'selfie_url'),
         'phone',         v_normalized_phone
       );

  -- Lookup existing profile (idempotent submit)
  SELECT * INTO v_existing
  FROM public.kyc_profiles_new
  WHERE user_id = v_user AND level = 'L1'
  FOR UPDATE;

  IF FOUND THEN
    -- If already in a terminal/active state, return as-is (idempotent)
    IF v_existing.final_status = 'approved'
       OR v_existing.documents_status IN ('pending_review','approved')
       OR v_existing.face_status      IN ('pending_review','approved')
       OR v_existing.mobile_status    IN ('pending_review','approved') THEN
      RETURN v_existing;
    END IF;

    UPDATE public.kyc_profiles_new
    SET data_json         = v_data,
        mobile_number     = v_normalized_phone,
        face_selfie_path  = COALESCE(v_selfie_path, face_selfie_path),
        face_captured_at  = COALESCE(face_captured_at, now()),
        documents_status  = 'pending_review'::public.kyc_pillar_status,
        face_status       = 'pending_review'::public.kyc_pillar_status,
        mobile_status     = 'pending_review'::public.kyc_pillar_status,
        mobile_submitted_at = now(),
        final_status      = 'submitted'::public.kyc_status_v2,
        status            = 'submitted',
        submitted_at      = now(),
        rejection_reason  = NULL,
        updated_at        = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;
  ELSE
    INSERT INTO public.kyc_profiles_new (
      user_id, level, data_json, status,
      documents_status, face_status, mobile_status, final_status,
      mobile_number, face_selfie_path, face_captured_at,
      submitted_at, mobile_submitted_at, kyc_version, is_legacy
    ) VALUES (
      v_user, 'L1', v_data, 'submitted',
      'pending_review','pending_review','pending_review','submitted',
      v_normalized_phone, v_selfie_path, now(),
      now(), now(), 2, false
    )
    RETURNING * INTO v_existing;
  END IF;

  RETURN v_existing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_kyc_l1(jsonb) TO authenticated;

-- 7. Backfill — repair rows where legacy status='submitted' but pillars never moved
UPDATE public.kyc_profiles_new k
SET documents_status = 'pending_review'::public.kyc_pillar_status,
    face_status      = 'pending_review'::public.kyc_pillar_status,
    mobile_status    = 'pending_review'::public.kyc_pillar_status,
    final_status     = CASE WHEN final_status = 'not_started' THEN 'submitted'::public.kyc_status_v2 ELSE final_status END,
    mobile_number    = COALESCE(mobile_number, regexp_replace(COALESCE(data_json->>'phone',''), '[^0-9+]', '', 'g')),
    face_selfie_path = COALESCE(face_selfie_path, public.kyc_extract_storage_path(data_json->>'selfie_url','kyc')),
    mobile_submitted_at = COALESCE(mobile_submitted_at, submitted_at, now()),
    face_captured_at = COALESCE(face_captured_at, submitted_at, now()),
    updated_at = now()
WHERE k.status IN ('submitted','in_review','pending')
  AND k.documents_status = 'not_submitted'
  AND k.face_status = 'not_submitted'
  AND k.mobile_status = 'not_submitted'
  AND COALESCE(k.data_json->>'id_front_url','') <> '';

-- Backfill face_selfie_path for already-submitted users that stored only signed URLs
UPDATE public.kyc_profiles_new
SET face_selfie_path = public.kyc_extract_storage_path(data_json->>'selfie_url','kyc'),
    updated_at = now()
WHERE face_selfie_path IS NULL
  AND COALESCE(data_json->>'selfie_url','') <> '';

-- Backfill final_approved_at for approved users so they pass the cutoff
UPDATE public.kyc_profiles_new
SET final_approved_at = COALESCE(final_approved_at, reviewed_at, updated_at)
WHERE final_status = 'approved'
  AND final_approved_at IS NULL;

-- 8. Lock down kyc_admin_config — sensitive thresholds shouldn't be world-readable
DROP POLICY IF EXISTS "Users can view KYC config" ON public.kyc_admin_config;
-- Replace with a minimal policy that exposes ONLY non-sensitive flags via a view
CREATE OR REPLACE VIEW public.kyc_admin_config_public AS
SELECT required_levels,
       liveness_required,
       manual_review_required,
       storage_bucket
FROM public.kyc_admin_config;
GRANT SELECT ON public.kyc_admin_config_public TO anon, authenticated;

-- 9. Storage bucket constraints (MIME + size) for KYC files
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
WHERE id IN ('kyc','kyc-selfies');

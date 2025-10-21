-- 1. Relax constraints for draft-friendly inserts
ALTER TABLE public.kyc_submissions
  ALTER COLUMN full_name DROP NOT NULL,
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN nationality DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN address_line1 DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN postal_code DROP NOT NULL,
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN id_type DROP NOT NULL,
  ALTER COLUMN id_number DROP NOT NULL;

-- 2. Ensure sensible defaults
ALTER TABLE public.kyc_submissions
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.kyc_submissions
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- 3. Trigger to enforce required fields on submit/approve
CREATE OR REPLACE FUNCTION public.enforce_kyc_required_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  -- Only enforce when moving to 'submitted' or 'approved'
  IF NEW.status IN ('submitted','approved') THEN
    IF COALESCE(NEW.full_name, '') = '' THEN missing := missing || 'full_name'; END IF;
    IF NEW.date_of_birth IS NULL THEN missing := missing || 'date_of_birth'; END IF;
    IF COALESCE(NEW.nationality, '') = '' THEN missing := missing || 'nationality'; END IF;
    IF COALESCE(NEW.phone, '') = '' THEN missing := missing || 'phone'; END IF;
    IF COALESCE(NEW.address_line1, '') = '' THEN missing := missing || 'address_line1'; END IF;
    IF COALESCE(NEW.city, '') = '' THEN missing := missing || 'city'; END IF;
    IF COALESCE(NEW.postal_code, '') = '' THEN missing := missing || 'postal_code'; END IF;
    IF COALESCE(NEW.country, '') = '' THEN missing := missing || 'country'; END IF;
    IF COALESCE(NEW.id_type, '') = '' THEN missing := missing || 'id_type'; END IF;
    IF COALESCE(NEW.id_number, '') = '' THEN missing := missing || 'id_number'; END IF;
    IF COALESCE(NEW.id_front_url, '') = '' THEN missing := missing || 'id_front_url'; END IF;
    IF COALESCE(NEW.id_back_url, '') = '' THEN missing := missing || 'id_back_url'; END IF;
    IF COALESCE(NEW.selfie_url, '') = '' THEN missing := missing || 'selfie_url'; END IF;

    IF array_length(missing, 1) IS NOT NULL THEN
      RAISE EXCEPTION 'KYC submission missing required fields: %', array_to_string(missing, ', ');
    END IF;
  END IF;

  -- Maintain updated_at
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_kyc_required_fields ON public.kyc_submissions;
CREATE TRIGGER trg_enforce_kyc_required_fields
BEFORE INSERT OR UPDATE ON public.kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_kyc_required_fields();

-- 4. Automatic sync to admin table (kyc_profiles_new)
CREATE OR REPLACE FUNCTION public.sync_kyc_to_profiles_new()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_level text := 'L1';
  v_status text;
BEGIN
  -- Map statuses
  IF NEW.status = 'submitted' THEN
    v_status := 'submitted';
  ELSIF NEW.status = 'approved' THEN
    v_status := 'approved';
  ELSIF NEW.status = 'rejected' THEN
    v_status := 'rejected';
  ELSE
    v_status := 'draft';
  END IF;

  INSERT INTO public.kyc_profiles_new (user_id, level, data_json, status, submitted_at, reviewed_at, updated_at, created_at)
  VALUES (
    NEW.user_id::text,
    v_level,
    jsonb_build_object(
      'personal_details', jsonb_build_object(
        'full_name', NEW.full_name,
        'date_of_birth', NEW.date_of_birth,
        'nationality', NEW.nationality,
        'phone', NEW.phone
      ),
      'address', jsonb_build_object(
        'address_line1', NEW.address_line1,
        'address_line2', NEW.address_line2,
        'city', NEW.city,
        'state', NEW.state,
        'postal_code', NEW.postal_code,
        'country', NEW.country
      ),
      'id_info', jsonb_build_object(
        'id_type', NEW.id_type,
        'id_number', NEW.id_number,
        'id_front_url', NEW.id_front_url,
        'id_back_url', NEW.id_back_url,
        'selfie_url', NEW.selfie_url
      )
    ),
    v_status,
    NEW.submitted_at,
    NEW.reviewed_at,
    now(),
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (user_id, level)
  DO UPDATE SET
    data_json = EXCLUDED.data_json,
    status = EXCLUDED.status,
    submitted_at = EXCLUDED.submitted_at,
    reviewed_at = EXCLUDED.reviewed_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kyc_to_profiles_new ON public.kyc_submissions;
CREATE TRIGGER trg_sync_kyc_to_profiles_new
AFTER INSERT OR UPDATE ON public.kyc_submissions
FOR EACH ROW
EXECUTE FUNCTION public.sync_kyc_to_profiles_new();
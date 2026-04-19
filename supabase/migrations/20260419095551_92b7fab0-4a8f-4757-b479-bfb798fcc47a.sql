
-- 1. Persistent cutoff
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'new_kyc_cutoff_at',
  '2026-04-18T00:00:00Z',
  'Approvals strictly before this UTC instant are treated as legacy and do NOT grant feature access.'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();

-- 2. Archive table (snapshot for rollback)
CREATE TABLE IF NOT EXISTS public.kyc_legacy_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_profile_id uuid NOT NULL,
  user_id uuid NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  reset_batch_id uuid NOT NULL,
  original_documents_status text NOT NULL,
  original_face_status text NOT NULL,
  original_mobile_status text NOT NULL,
  original_final_status text NOT NULL,
  original_final_approved_at timestamptz,
  original_final_approved_by uuid,
  original_documents_reviewed_at timestamptz,
  original_face_reviewed_at timestamptz,
  original_mobile_verified_at timestamptz,
  original_data_json jsonb,
  restored_at timestamptz,
  restored_by uuid
);

ALTER TABLE public.kyc_legacy_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read archive" ON public.kyc_legacy_archive;
CREATE POLICY "Admins read archive"
  ON public.kyc_legacy_archive FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins write archive" ON public.kyc_legacy_archive;
CREATE POLICY "Admins write archive"
  ON public.kyc_legacy_archive FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_kyc_legacy_archive_user ON public.kyc_legacy_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_legacy_archive_batch ON public.kyc_legacy_archive(reset_batch_id);

-- 3. Legacy / version markers on kyc_profiles_new
ALTER TABLE public.kyc_profiles_new
  ADD COLUMN IF NOT EXISTS is_legacy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_reset_batch_id uuid,
  ADD COLUMN IF NOT EXISTS kyc_version smallint NOT NULL DEFAULT 2;

COMMENT ON COLUMN public.kyc_profiles_new.is_legacy IS
  'TRUE => approved under pre-2026-04-18 system. User MUST re-enroll; gate functions ignore approvals on legacy rows.';

-- 4. Snapshot + reset
DO $reset$
DECLARE
  v_batch uuid := gen_random_uuid();
  v_cutoff timestamptz := '2026-04-18 00:00:00+00';
  v_count int;
BEGIN
  INSERT INTO public.kyc_legacy_archive (
    kyc_profile_id, user_id, reset_batch_id,
    original_documents_status, original_face_status,
    original_mobile_status, original_final_status,
    original_final_approved_at, original_final_approved_by,
    original_documents_reviewed_at, original_face_reviewed_at,
    original_mobile_verified_at, original_data_json
  )
  SELECT
    id, user_id, v_batch,
    documents_status::text, face_status::text,
    mobile_status::text, final_status::text,
    final_approved_at, final_approved_by,
    documents_reviewed_at, face_reviewed_at,
    mobile_verified_at, data_json
  FROM public.kyc_profiles_new
  WHERE final_status = 'approved'::public.kyc_status_v2
    AND (final_approved_at IS NULL OR final_approved_at < v_cutoff);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'KYC LEGACY RESET: archived % rows, batch=%', v_count, v_batch;

  UPDATE public.kyc_profiles_new
  SET
    documents_status = 'not_submitted'::public.kyc_pillar_status,
    face_status      = 'not_submitted'::public.kyc_pillar_status,
    mobile_status    = 'not_submitted'::public.kyc_pillar_status,
    final_status     = 'not_started'::public.kyc_status_v2,
    final_approved_at = NULL,
    final_approved_by = NULL,
    documents_reviewed_at = NULL,
    face_reviewed_at = NULL,
    mobile_verified_at = NULL,
    is_legacy = true,
    legacy_reset_at = now(),
    legacy_reset_batch_id = v_batch,
    kyc_version = 2,
    updated_at = now()
  WHERE final_status = 'approved'::public.kyc_status_v2
    AND (final_approved_at IS NULL OR final_approved_at < v_cutoff);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'KYC LEGACY RESET: reset % rows', v_count;
END;
$reset$;

-- 5. Hardened gate
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kyc_profiles_new k
    WHERE k.user_id = _user_id
      AND k.final_status = 'approved'::public.kyc_status_v2
      AND k.documents_status = 'approved'::public.kyc_pillar_status
      AND k.face_status = 'approved'::public.kyc_pillar_status
      AND k.mobile_status = 'approved'::public.kyc_pillar_status
      AND k.is_legacy = false
      AND k.kyc_version >= 2
      AND k.final_approved_at >= COALESCE(
        (SELECT value::timestamptz FROM public.system_settings WHERE key = 'new_kyc_cutoff_at'),
        '2026-04-18 00:00:00+00'::timestamptz
      )
  );
$$;

-- 6. Mirror in profiles
UPDATE public.profiles p
SET is_kyc_approved = false,
    kyc_status = 'pending'
WHERE EXISTS (
  SELECT 1 FROM public.kyc_profiles_new k
  WHERE k.user_id = p.user_id AND k.is_legacy = true
);

-- 7. Rollback function
CREATE OR REPLACE FUNCTION public.rollback_kyc_legacy_reset(_batch_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_batch uuid;
  v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'rollback_kyc_legacy_reset: admin only';
  END IF;

  v_target_batch := COALESCE(
    _batch_id,
    (SELECT reset_batch_id FROM public.kyc_legacy_archive
      WHERE restored_at IS NULL ORDER BY archived_at DESC LIMIT 1)
  );

  IF v_target_batch IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_batch_to_restore');
  END IF;

  UPDATE public.kyc_profiles_new k
  SET
    documents_status = a.original_documents_status::public.kyc_pillar_status,
    face_status      = a.original_face_status::public.kyc_pillar_status,
    mobile_status    = a.original_mobile_status::public.kyc_pillar_status,
    final_status     = a.original_final_status::public.kyc_status_v2,
    final_approved_at = a.original_final_approved_at,
    final_approved_by = a.original_final_approved_by,
    documents_reviewed_at = a.original_documents_reviewed_at,
    face_reviewed_at = a.original_face_reviewed_at,
    mobile_verified_at = a.original_mobile_verified_at,
    is_legacy = false,
    legacy_reset_at = NULL,
    legacy_reset_batch_id = NULL,
    updated_at = now()
  FROM public.kyc_legacy_archive a
  WHERE a.kyc_profile_id = k.id
    AND a.reset_batch_id = v_target_batch
    AND a.restored_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.kyc_legacy_archive
  SET restored_at = now(), restored_by = auth.uid()
  WHERE reset_batch_id = v_target_batch AND restored_at IS NULL;

  UPDATE public.profiles p
  SET is_kyc_approved = public.is_kyc_approved(p.user_id),
      kyc_status = CASE WHEN public.is_kyc_approved(p.user_id) THEN 'verified' ELSE kyc_status END
  WHERE EXISTS (
    SELECT 1 FROM public.kyc_legacy_archive a
    WHERE a.user_id = p.user_id AND a.reset_batch_id = v_target_batch
  );

  RETURN jsonb_build_object('ok', true, 'batch_id', v_target_batch, 'restored_rows', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_kyc_legacy_reset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_kyc_legacy_reset(uuid) TO authenticated;

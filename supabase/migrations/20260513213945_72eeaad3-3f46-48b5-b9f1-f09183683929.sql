-- =====================================================================
-- KYC resubmission repair
-- =====================================================================

-- A. Fix submit_kyc_l1 so a user can resubmit after partial admin rejection
--    without losing already-approved pillars and without silently no-op'ing.
CREATE OR REPLACE FUNCTION public.submit_kyc_l1(p_data jsonb)
RETURNS public.kyc_profiles_new
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_new_documents public.kyc_pillar_status;
  v_new_face      public.kyc_pillar_status;
  v_new_mobile    public.kyc_pillar_status;
  v_resubmittable_documents boolean;
  v_resubmittable_face      boolean;
  v_resubmittable_mobile    boolean;
  v_any_resubmittable boolean;
  v_phone_changed boolean;
  v_selfie_changed boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Required fields check (only applies to fields the resubmit actually carries)
  FOREACH k IN ARRAY v_required LOOP
    IF COALESCE(NULLIF(trim(v_data->>k), ''), '') = '' THEN
      v_missing := v_missing || k;
    END IF;
  END LOOP;
  IF array_length(v_missing,1) IS NOT NULL THEN
    RAISE EXCEPTION 'MISSING_FIELDS: %', array_to_string(v_missing, ', ');
  END IF;

  v_phone := v_data->>'phone';
  v_normalized_phone := regexp_replace(COALESCE(v_phone,''), '[^0-9+]', '', 'g');

  v_id_front_path := public.kyc_extract_storage_path(v_data->>'id_front_url', 'kyc');
  v_id_back_path  := public.kyc_extract_storage_path(v_data->>'id_back_url',  'kyc');
  v_selfie_path   := public.kyc_extract_storage_path(v_data->>'selfie_url',   'kyc');

  v_data := v_data
    || jsonb_build_object(
         'id_front_path', COALESCE(v_id_front_path, v_data->>'id_front_url'),
         'id_back_path',  COALESCE(v_id_back_path,  v_data->>'id_back_url'),
         'selfie_path',   COALESCE(v_selfie_path,   v_data->>'selfie_url'),
         'phone',         v_normalized_phone
       );

  SELECT * INTO v_existing
  FROM public.kyc_profiles_new
  WHERE user_id = v_user AND level = 'L1'
  FOR UPDATE;

  IF FOUND THEN
    -- Idempotent: if every pillar is approved, just return.
    IF v_existing.documents_status = 'approved'::public.kyc_pillar_status
       AND v_existing.face_status   = 'approved'::public.kyc_pillar_status
       AND v_existing.mobile_status = 'approved'::public.kyc_pillar_status THEN
      RETURN v_existing;
    END IF;

    -- A pillar is "resubmittable" if it is NOT currently locked-in
    -- (locked = pending_review or approved). That is exactly the carve-out
    -- enforced by kyc_protect_submitted_data, so we mirror it here so the
    -- SECURITY DEFINER UPDATE below cannot accidentally demote an approved
    -- pillar nor a still-pending one.
    v_resubmittable_documents := v_existing.documents_status NOT IN (
      'pending_review'::public.kyc_pillar_status,
      'approved'::public.kyc_pillar_status
    );
    v_resubmittable_face := v_existing.face_status NOT IN (
      'pending_review'::public.kyc_pillar_status,
      'approved'::public.kyc_pillar_status
    );
    v_resubmittable_mobile := v_existing.mobile_status NOT IN (
      'pending_review'::public.kyc_pillar_status,
      'approved'::public.kyc_pillar_status
    );
    v_any_resubmittable := v_resubmittable_documents
                         OR v_resubmittable_face
                         OR v_resubmittable_mobile;

    -- If nothing is in a resubmittable state (everything is pending/approved),
    -- this is a duplicate submission — just return the row, do not error.
    IF NOT v_any_resubmittable THEN
      RETURN v_existing;
    END IF;

    v_new_documents := CASE WHEN v_resubmittable_documents
                         THEN 'pending_review'::public.kyc_pillar_status
                         ELSE v_existing.documents_status END;
    v_new_face      := CASE WHEN v_resubmittable_face
                         THEN 'pending_review'::public.kyc_pillar_status
                         ELSE v_existing.face_status END;
    v_new_mobile    := CASE WHEN v_resubmittable_mobile
                         THEN 'pending_review'::public.kyc_pillar_status
                         ELSE v_existing.mobile_status END;

    v_phone_changed  := v_resubmittable_mobile;
    v_selfie_changed := v_resubmittable_face;

    UPDATE public.kyc_profiles_new
    SET
      data_json         = v_data,
      mobile_number     = CASE WHEN v_phone_changed
                                 THEN v_normalized_phone
                                 ELSE mobile_number END,
      face_selfie_path  = CASE WHEN v_selfie_changed
                                 THEN COALESCE(v_selfie_path, face_selfie_path)
                                 ELSE face_selfie_path END,
      face_captured_at  = CASE WHEN v_selfie_changed
                                 THEN now()
                                 ELSE face_captured_at END,
      documents_status  = v_new_documents,
      face_status       = v_new_face,
      mobile_status     = v_new_mobile,
      mobile_submitted_at = CASE WHEN v_phone_changed
                                 THEN now()
                                 ELSE mobile_submitted_at END,
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
      'pending_review'::public.kyc_pillar_status,
      'pending_review'::public.kyc_pillar_status,
      'pending_review'::public.kyc_pillar_status,
      'submitted'::public.kyc_status_v2,
      v_normalized_phone, v_selfie_path, now(),
      now(), now(), 2, false
    )
    RETURNING * INTO v_existing;
  END IF;

  -- Make sure an admin notification exists for the latest submission
  BEGIN
    INSERT INTO public.kyc_admin_notifications (kyc_profile_id, user_id, level, status, submitted_at)
    VALUES (v_existing.id, v_user, 'L1', 'pending', now())
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'kyc_admin_notifications insert skipped for user %: %', v_user, SQLERRM;
  END;

  RETURN v_existing;
END;
$function$;

-- B. Admin signed URL helper — never depends on bucket publicity.
CREATE OR REPLACE FUNCTION public.admin_kyc_signed_url(p_path text, p_expires_in integer DEFAULT 3600)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_url text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can mint KYC signed URLs' USING ERRCODE = '42501';
  END IF;
  IF p_path IS NULL OR length(trim(p_path)) = 0 THEN
    RETURN NULL;
  END IF;
  -- We don't sign here directly; admins will call storage.from('kyc').createSignedUrl
  -- with their JWT (the storage RLS already grants admins SELECT on bucket 'kyc').
  -- This RPC is reserved as a hook so we can centralise audit later if needed.
  RETURN p_path;
END;
$function$;

-- C. Pending-pillar queue for the admin console — newest submitted_at first,
--    one row per (user, pillar) pillar that is currently pending_review.
CREATE OR REPLACE FUNCTION public.admin_kyc_pending_queue()
RETURNS TABLE (
  user_id uuid,
  email text,
  pillar text,
  status public.kyc_pillar_status,
  notes text,
  submitted_at timestamptz,
  data_json jsonb,
  mobile_number text,
  face_selfie_path text,
  documents_status public.kyc_pillar_status,
  face_status public.kyc_pillar_status,
  mobile_status public.kyc_pillar_status,
  final_status public.kyc_status_v2
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    k.user_id,
    p.email,
    x.pillar,
    x.status,
    x.notes,
    COALESCE(k.submitted_at, k.updated_at) AS submitted_at,
    k.data_json,
    k.mobile_number,
    k.face_selfie_path,
    k.documents_status, k.face_status, k.mobile_status, k.final_status
  FROM public.kyc_profiles_new k
  LEFT JOIN public.profiles p ON p.user_id = k.user_id
  CROSS JOIN LATERAL (
    VALUES
      ('documents'::text, k.documents_status, k.documents_notes),
      ('face'::text,      k.face_status,      k.face_notes),
      ('mobile'::text,    k.mobile_status,    k.mobile_notes)
  ) AS x(pillar, status, notes)
  WHERE x.status = 'pending_review'::public.kyc_pillar_status
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY COALESCE(k.submitted_at, k.updated_at) DESC NULLS LAST;
$function$;

-- D. Reconcile the 3 currently-stuck rows
--    (pillars=pending_review but final_status=needs_resubmission)
--    by snapping final_status back to 'submitted' so the admin queue picks them up.
UPDATE public.kyc_profiles_new
SET final_status = 'submitted'::public.kyc_status_v2,
    updated_at = now()
WHERE final_status = 'needs_resubmission'::public.kyc_status_v2
  AND documents_status = 'pending_review'::public.kyc_pillar_status
  AND face_status      = 'pending_review'::public.kyc_pillar_status
  AND mobile_status    = 'pending_review'::public.kyc_pillar_status;

GRANT EXECUTE ON FUNCTION public.submit_kyc_l1(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kyc_signed_url(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kyc_pending_queue() TO authenticated;
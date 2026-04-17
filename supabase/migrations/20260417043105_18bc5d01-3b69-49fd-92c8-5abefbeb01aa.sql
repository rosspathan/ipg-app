-- =====================================================
-- MANDATORY KYC APPROVAL SYSTEM — 3 PILLARS
-- =====================================================

-- 1. KYC status enum (drop & recreate safely)
DO $$ BEGIN
  CREATE TYPE public.kyc_status_v2 AS ENUM (
    'not_started',
    'submitted',
    'documents_under_review',
    'face_pending',
    'face_verified',
    'mobile_pending_admin_verification',
    'mobile_verified',
    'approved',
    'rejected',
    'needs_resubmission',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.kyc_pillar_status AS ENUM (
    'not_submitted',
    'pending_review',
    'approved',
    'rejected',
    'needs_resubmission'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend kyc_profiles_new with 3-pillar fields
ALTER TABLE public.kyc_profiles_new
  ADD COLUMN IF NOT EXISTS documents_status public.kyc_pillar_status NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS documents_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS documents_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS documents_notes text,
  ADD COLUMN IF NOT EXISTS face_status public.kyc_pillar_status NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS face_selfie_path text,
  ADD COLUMN IF NOT EXISTS face_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS face_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS face_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS face_notes text,
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS mobile_status public.kyc_pillar_status NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS mobile_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS mobile_verified_by uuid,
  ADD COLUMN IF NOT EXISTS mobile_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS mobile_notes text,
  ADD COLUMN IF NOT EXISTS final_status public.kyc_status_v2 NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS final_approved_by uuid,
  ADD COLUMN IF NOT EXISTS final_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS resubmission_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_kyc_profiles_final_status ON public.kyc_profiles_new(final_status);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_user_id_final ON public.kyc_profiles_new(user_id, final_status);

-- 3. Audit log (append-only)
CREATE TABLE IF NOT EXISTS public.kyc_decision_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_id uuid,
  pillar text NOT NULL CHECK (pillar IN ('documents', 'face', 'mobile', 'final')),
  action text NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'request_resubmission', 'suspend', 'unsuspend', 'reset')),
  status_before text,
  status_after text,
  admin_id uuid,
  notes text,
  evidence_json jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_user ON public.kyc_decision_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_admin ON public.kyc_decision_audit(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_pillar ON public.kyc_decision_audit(pillar, created_at DESC);

ALTER TABLE public.kyc_decision_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_audit_user_select_own" ON public.kyc_decision_audit;
CREATE POLICY "kyc_audit_user_select_own"
  ON public.kyc_decision_audit FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kyc_audit_admin_select_all" ON public.kyc_decision_audit;
CREATE POLICY "kyc_audit_admin_select_all"
  ON public.kyc_decision_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "kyc_audit_admin_insert" ON public.kyc_decision_audit;
CREATE POLICY "kyc_audit_admin_insert"
  ON public.kyc_decision_audit FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR auth.uid() = user_id);

-- Hard append-only: forbid updates and deletes
CREATE OR REPLACE FUNCTION public.kyc_audit_forbid_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'kyc_decision_audit is append-only — % not allowed', TG_OP;
END $$;

DROP TRIGGER IF EXISTS kyc_audit_forbid_update ON public.kyc_decision_audit;
CREATE TRIGGER kyc_audit_forbid_update
  BEFORE UPDATE ON public.kyc_decision_audit
  FOR EACH ROW EXECUTE FUNCTION public.kyc_audit_forbid_mutation();

DROP TRIGGER IF EXISTS kyc_audit_forbid_delete ON public.kyc_decision_audit;
CREATE TRIGGER kyc_audit_forbid_delete
  BEFORE DELETE ON public.kyc_decision_audit
  FOR EACH ROW EXECUTE FUNCTION public.kyc_audit_forbid_mutation();

-- 4. Single source of truth: is the user fully KYC approved?
CREATE OR REPLACE FUNCTION public.is_kyc_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kyc_profiles_new
    WHERE user_id = _user_id
      AND final_status = 'approved'::public.kyc_status_v2
      AND documents_status = 'approved'::public.kyc_pillar_status
      AND face_status = 'approved'::public.kyc_pillar_status
      AND mobile_status = 'approved'::public.kyc_pillar_status
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_kyc_approved(uuid) TO authenticated, anon, service_role;

-- 5. Enforcement triggers — backend = source of truth
CREATE OR REPLACE FUNCTION public.enforce_kyc_for_sensitive_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_role(NEW.user_id, 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_kyc_approved(NEW.user_id) THEN
    RAISE EXCEPTION 'KYC_REQUIRED: KYC approval is required before %. Complete document verification, face verification, and admin mobile verification to continue.',
      TG_TABLE_NAME
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;

-- Attach to orders (trading)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    DROP TRIGGER IF EXISTS enforce_kyc_orders ON public.orders;
    CREATE TRIGGER enforce_kyc_orders
      BEFORE INSERT ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();
  END IF;
END $$;

-- Attach to custodial_withdrawals
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='custodial_withdrawals') THEN
    DROP TRIGGER IF EXISTS enforce_kyc_custodial_withdrawals ON public.custodial_withdrawals;
    CREATE TRIGGER enforce_kyc_custodial_withdrawals
      BEFORE INSERT ON public.custodial_withdrawals
      FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();
  END IF;
END $$;

-- Attach to bsk_withdrawal_requests
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bsk_withdrawal_requests') THEN
    DROP TRIGGER IF EXISTS enforce_kyc_bsk_withdrawals ON public.bsk_withdrawal_requests;
    CREATE TRIGGER enforce_kyc_bsk_withdrawals
      BEFORE INSERT ON public.bsk_withdrawal_requests
      FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();
  END IF;
END $$;

-- Attach to BSK migration requests (bsk_migration_requests OR migration_requests)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bsk_migration_requests') THEN
    DROP TRIGGER IF EXISTS enforce_kyc_bsk_migration ON public.bsk_migration_requests;
    CREATE TRIGGER enforce_kyc_bsk_migration
      BEFORE INSERT ON public.bsk_migration_requests
      FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='migration_requests') THEN
    DROP TRIGGER IF EXISTS enforce_kyc_migration ON public.migration_requests;
    CREATE TRIGGER enforce_kyc_migration
      BEFORE INSERT ON public.migration_requests
      FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();
  END IF;
END $$;

-- 6. Storage bucket for selfies (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-selfies', 'kyc-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: user can read/write own folder
DROP POLICY IF EXISTS "kyc_selfies_user_read_own" ON storage.objects;
CREATE POLICY "kyc_selfies_user_read_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "kyc_selfies_user_write_own" ON storage.objects;
CREATE POLICY "kyc_selfies_user_write_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "kyc_selfies_user_update_own" ON storage.objects;
CREATE POLICY "kyc_selfies_user_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'kyc-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "kyc_selfies_admin_read_all" ON storage.objects;
CREATE POLICY "kyc_selfies_admin_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-selfies' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7. Helper RPC: admin updates a pillar (with audit)
CREATE OR REPLACE FUNCTION public.admin_update_kyc_pillar(
  p_user_id uuid,
  p_pillar text,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_profile public.kyc_profiles_new%ROWTYPE;
  v_status_before text;
  v_status_after text;
  v_new_pillar_status public.kyc_pillar_status;
  v_new_final public.kyc_status_v2;
BEGIN
  IF NOT public.has_role(v_admin_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can update KYC pillars';
  END IF;

  IF p_pillar NOT IN ('documents', 'face', 'mobile', 'final') THEN
    RAISE EXCEPTION 'Invalid pillar: %', p_pillar;
  END IF;
  IF p_action NOT IN ('approve', 'reject', 'request_resubmission', 'suspend', 'unsuspend', 'reset') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  SELECT * INTO v_profile FROM public.kyc_profiles_new WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC profile not found for user %', p_user_id;
  END IF;

  -- Map action -> pillar status
  v_new_pillar_status := CASE p_action
    WHEN 'approve' THEN 'approved'::public.kyc_pillar_status
    WHEN 'reject' THEN 'rejected'::public.kyc_pillar_status
    WHEN 'request_resubmission' THEN 'needs_resubmission'::public.kyc_pillar_status
    WHEN 'reset' THEN 'pending_review'::public.kyc_pillar_status
    ELSE NULL
  END;

  IF p_pillar = 'documents' THEN
    v_status_before := v_profile.documents_status::text;
    UPDATE public.kyc_profiles_new SET
      documents_status = COALESCE(v_new_pillar_status, documents_status),
      documents_reviewed_by = v_admin_id,
      documents_reviewed_at = now(),
      documents_notes = COALESCE(p_notes, documents_notes),
      updated_at = now()
    WHERE user_id = p_user_id;
    v_status_after := COALESCE(v_new_pillar_status::text, v_status_before);

  ELSIF p_pillar = 'face' THEN
    v_status_before := v_profile.face_status::text;
    UPDATE public.kyc_profiles_new SET
      face_status = COALESCE(v_new_pillar_status, face_status),
      face_reviewed_by = v_admin_id,
      face_reviewed_at = now(),
      face_notes = COALESCE(p_notes, face_notes),
      updated_at = now()
    WHERE user_id = p_user_id;
    v_status_after := COALESCE(v_new_pillar_status::text, v_status_before);

  ELSIF p_pillar = 'mobile' THEN
    v_status_before := v_profile.mobile_status::text;
    UPDATE public.kyc_profiles_new SET
      mobile_status = COALESCE(v_new_pillar_status, mobile_status),
      mobile_verified_by = v_admin_id,
      mobile_verified_at = now(),
      mobile_notes = COALESCE(p_notes, mobile_notes),
      updated_at = now()
    WHERE user_id = p_user_id;
    v_status_after := COALESCE(v_new_pillar_status::text, v_status_before);

  ELSIF p_pillar = 'final' THEN
    v_status_before := v_profile.final_status::text;
    v_new_final := CASE p_action
      WHEN 'approve' THEN 'approved'::public.kyc_status_v2
      WHEN 'reject' THEN 'rejected'::public.kyc_status_v2
      WHEN 'request_resubmission' THEN 'needs_resubmission'::public.kyc_status_v2
      WHEN 'suspend' THEN 'suspended'::public.kyc_status_v2
      WHEN 'unsuspend' THEN 'approved'::public.kyc_status_v2
      ELSE v_profile.final_status
    END;

    -- Final approval requires all 3 pillars green
    IF p_action = 'approve' THEN
      IF v_profile.documents_status <> 'approved'::public.kyc_pillar_status
         OR v_profile.face_status <> 'approved'::public.kyc_pillar_status
         OR v_profile.mobile_status <> 'approved'::public.kyc_pillar_status THEN
        RAISE EXCEPTION 'Cannot final-approve: all 3 pillars must be approved (documents=%, face=%, mobile=%)',
          v_profile.documents_status, v_profile.face_status, v_profile.mobile_status;
      END IF;
    END IF;

    UPDATE public.kyc_profiles_new SET
      final_status = v_new_final,
      final_approved_by = CASE WHEN p_action = 'approve' THEN v_admin_id ELSE final_approved_by END,
      final_approved_at = CASE WHEN p_action = 'approve' THEN now() ELSE final_approved_at END,
      rejection_reason = CASE WHEN p_action = 'reject' THEN p_notes ELSE rejection_reason END,
      status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE status END,
      reviewed_at = now(),
      reviewer_id = v_admin_id,
      updated_at = now()
    WHERE user_id = p_user_id;
    v_status_after := v_new_final::text;

    -- Mirror to profiles
    UPDATE public.profiles SET
      kyc_status = CASE
        WHEN p_action = 'approve' THEN 'approved'
        WHEN p_action = 'reject' THEN 'rejected'
        WHEN p_action = 'suspend' THEN 'suspended'
        ELSE kyc_status
      END,
      is_kyc_approved = (p_action = 'approve' OR p_action = 'unsuspend')
    WHERE user_id = p_user_id;
  END IF;

  -- Audit
  INSERT INTO public.kyc_decision_audit (
    user_id, submission_id, pillar, action, status_before, status_after, admin_id, notes
  ) VALUES (
    p_user_id, v_profile.id, p_pillar, p_action, v_status_before, v_status_after, v_admin_id, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'pillar', p_pillar,
    'action', p_action,
    'status_before', v_status_before,
    'status_after', v_status_after
  );
END $$;

GRANT EXECUTE ON FUNCTION public.admin_update_kyc_pillar(uuid, text, text, text) TO authenticated;
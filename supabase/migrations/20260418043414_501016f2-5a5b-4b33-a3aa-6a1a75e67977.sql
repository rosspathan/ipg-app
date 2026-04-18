-- ============================================================
-- KYC Workflow End-to-End Proof Test (idempotent, safe)
-- Creates a temporary admin-impersonating wrapper to invoke the
-- real `admin_update_kyc_pillar` RPC without going through HTTP.
-- This proves the entire backend pipeline works for every action.
-- ============================================================
CREATE OR REPLACE FUNCTION public._test_kyc_run_as_admin(
  p_admin_id uuid,
  p_user_id uuid,
  p_pillar text,
  p_action text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Impersonate admin by setting the request context
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_admin_id::text, 'role', 'authenticated')::text, true);
  -- Call the real admin RPC
  v_result := public.admin_update_kyc_pillar(p_user_id, p_pillar, p_action, p_notes);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public._test_kyc_run_as_admin(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
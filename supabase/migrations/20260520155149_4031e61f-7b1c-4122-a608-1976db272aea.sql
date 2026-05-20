
-- 1. Trigger that blocks client-side writes to PIN columns
CREATE OR REPLACE FUNCTION public.protect_security_pin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean := false;
BEGIN
  -- service_role bypasses (edge functions using SERVICE_ROLE_KEY)
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    is_privileged := true;
  ELSIF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    is_privileged := true;
  END IF;

  IF NOT is_privileged THEN
    -- Revert any attempt to change PIN-critical columns
    IF TG_OP = 'INSERT' THEN
      NEW.pin_set := COALESCE(false, NEW.pin_set);
      NEW.pin_hash := NULL;
      NEW.pin_salt := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      NEW.pin_set := OLD.pin_set;
      NEW.pin_hash := OLD.pin_hash;
      NEW.pin_salt := OLD.pin_salt;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_security_pin_fields ON public.security;
CREATE TRIGGER trg_protect_security_pin_fields
BEFORE INSERT OR UPDATE ON public.security
FOR EACH ROW
EXECUTE FUNCTION public.protect_security_pin_fields();

-- 2. Admin PIN-reset audit log
CREATE TABLE IF NOT EXISTS public.admin_pin_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  admin_user_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_pin_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view pin resets" ON public.admin_pin_resets;
CREATE POLICY "Admins can view pin resets"
ON public.admin_pin_resets FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- inserts only via the SECURITY DEFINER function below
DROP POLICY IF EXISTS "No direct inserts" ON public.admin_pin_resets;
CREATE POLICY "No direct inserts"
ON public.admin_pin_resets FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_admin_pin_resets_target ON public.admin_pin_resets(target_user_id, created_at DESC);

-- 3. Admin-safe PIN reset RPC. Never reveals or accepts a PIN value.
CREATE OR REPLACE FUNCTION public.admin_reset_user_pin(
  p_target_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF v_admin IS NULL OR NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reset user PINs' USING ERRCODE = '42501';
  END IF;

  UPDATE public.security
     SET pin_set = false,
         pin_hash = NULL,
         pin_salt = NULL,
         failed_attempts = 0,
         locked_until = NULL
   WHERE user_id = p_target_user_id;

  INSERT INTO public.admin_pin_resets(target_user_id, admin_user_id, reason)
  VALUES (p_target_user_id, v_admin, p_reason);

  -- Best-effort audit to existing login_audit stream
  BEGIN
    INSERT INTO public.login_audit(user_id, event, device_info)
    VALUES (p_target_user_id, 'pin_reset_by_admin',
            jsonb_build_object('admin_id', v_admin, 'reason', p_reason));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'target_user_id', p_target_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_pin(uuid, text) TO authenticated;

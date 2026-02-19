
-- ============================================================
-- PHASE 1: HOT WALLET FORTRESS
-- Immutable protection for platform_hot_wallet table
-- Even service_role cannot modify rows without disabling triggers
-- ============================================================

-- 1. BLOCK ALL INSERTS on platform_hot_wallet
CREATE OR REPLACE FUNCTION public.prevent_hot_wallet_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the blocked attempt
  INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_table, details)
  VALUES (
    COALESCE(auth.uid()::text, 'system'),
    'BLOCKED_HOT_WALLET_INSERT',
    'platform_hot_wallet',
    jsonb_build_object(
      'blocked_address', NEW.address,
      'blocked_label', NEW.label,
      'blocked_chain', NEW.chain,
      'attempted_at', now(),
      'severity', 'CRITICAL'
    )
  );
  RAISE EXCEPTION '[SECURITY] Hot wallet creation is permanently disabled. All wallet changes require a database migration with audit approval.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_block_hot_wallet_insert
  BEFORE INSERT ON public.platform_hot_wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hot_wallet_insert();

-- 2. BLOCK ALL UPDATES on platform_hot_wallet
CREATE OR REPLACE FUNCTION public.prevent_hot_wallet_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the blocked attempt
  INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_table, details)
  VALUES (
    COALESCE(auth.uid()::text, 'system'),
    'BLOCKED_HOT_WALLET_UPDATE',
    'platform_hot_wallet',
    jsonb_build_object(
      'wallet_id', OLD.id,
      'old_address', OLD.address,
      'attempted_new_address', NEW.address,
      'old_label', OLD.label,
      'attempted_new_label', NEW.label,
      'old_is_active', OLD.is_active,
      'attempted_new_is_active', NEW.is_active,
      'attempted_at', now(),
      'severity', 'CRITICAL'
    )
  );
  RAISE EXCEPTION '[SECURITY] Hot wallet modification is permanently disabled. All wallet changes require a database migration with audit approval.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_block_hot_wallet_update
  BEFORE UPDATE ON public.platform_hot_wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hot_wallet_update();

-- 3. BLOCK ALL DELETES on platform_hot_wallet
CREATE OR REPLACE FUNCTION public.prevent_hot_wallet_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the blocked attempt
  INSERT INTO public.admin_actions_log (admin_user_id, action_type, target_table, details)
  VALUES (
    COALESCE(auth.uid()::text, 'system'),
    'BLOCKED_HOT_WALLET_DELETE',
    'platform_hot_wallet',
    jsonb_build_object(
      'wallet_id', OLD.id,
      'deleted_address', OLD.address,
      'deleted_label', OLD.label,
      'attempted_at', now(),
      'severity', 'CRITICAL'
    )
  );
  RAISE EXCEPTION '[SECURITY] Hot wallet deletion is permanently disabled. All wallet changes require a database migration with audit approval.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_block_hot_wallet_delete
  BEFORE DELETE ON public.platform_hot_wallet
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_hot_wallet_delete();

-- 4. Create immutable security audit log table for critical operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'HIGH',
  actor_id text,
  ip_address text,
  target_table text,
  target_id text,
  details jsonb,
  blocked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Security audit log: NO ONE can update or delete — append-only
CREATE POLICY "Security audit log is append-only for service"
  ON public.security_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Only admins can read security audit log"
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (for triggers)
-- No update/delete policies = immutable

-- 5. BLOCK modifications to security-critical system_settings fields
CREATE OR REPLACE FUNCTION public.protect_critical_system_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block changes to withdrawal-related settings from non-migration contexts
  IF OLD.key IN ('withdrawal_enabled', 'max_withdrawal_amount', 'withdrawal_cooldown_hours', 'global_withdrawal_daily_cap') 
     AND OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO public.security_audit_log (event_type, severity, actor_id, target_table, target_id, details, blocked)
    VALUES (
      'CRITICAL_SETTING_CHANGE_ATTEMPT',
      'CRITICAL',
      COALESCE(auth.uid()::text, 'system'),
      'system_settings',
      OLD.key,
      jsonb_build_object(
        'setting_key', OLD.key,
        'old_value', OLD.value,
        'attempted_new_value', NEW.value,
        'attempted_at', now()
      ),
      false
    );
  END IF;
  -- Allow the change but audit it (settings need to be togglable for operations)
  RETURN NEW;
END;
$$;

-- Only create trigger if system_settings table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') THEN
    CREATE TRIGGER trg_audit_critical_settings
      BEFORE UPDATE ON public.system_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_critical_system_settings();
  END IF;
END;
$$;

-- 6. Make security_audit_log truly immutable — block updates and deletes
CREATE OR REPLACE FUNCTION public.prevent_security_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION '[SECURITY] Security audit log is immutable. Records cannot be modified or deleted.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_block_security_log_update
  BEFORE UPDATE ON public.security_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_security_log_mutation();

CREATE TRIGGER trg_block_security_log_delete
  BEFORE DELETE ON public.security_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_security_log_mutation();

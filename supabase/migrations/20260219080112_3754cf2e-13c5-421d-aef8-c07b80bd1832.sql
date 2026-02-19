
-- ============================================================
-- PHASE 2: WITHDRAWAL CIRCUIT BREAKERS
-- Rate limits, cooldowns, and anomaly detection at DB level
-- ============================================================

-- 1. Withdrawal rate-limiting configuration table
CREATE TABLE IF NOT EXISTS public.withdrawal_security_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  per_user_daily_cap_usd numeric NOT NULL DEFAULT 5000,
  per_user_hourly_cap_usd numeric NOT NULL DEFAULT 2000,
  global_daily_cap_usd numeric NOT NULL DEFAULT 50000,
  cooldown_minutes integer NOT NULL DEFAULT 15,
  max_withdrawals_per_hour integer NOT NULL DEFAULT 3,
  max_withdrawals_per_day integer NOT NULL DEFAULT 10,
  anomaly_threshold_multiplier numeric NOT NULL DEFAULT 3.0,
  auto_freeze_on_anomaly boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_security_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read withdrawal security config"
  ON public.withdrawal_security_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies for authenticated users — admin-only via migration
-- Block non-migration updates to this config
CREATE OR REPLACE FUNCTION public.audit_withdrawal_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (event_type, severity, actor_id, target_table, target_id, details, blocked)
  VALUES (
    'WITHDRAWAL_CONFIG_CHANGE',
    'CRITICAL',
    COALESCE(auth.uid()::text, 'system'),
    'withdrawal_security_config',
    OLD.id::text,
    jsonb_build_object(
      'old_per_user_daily_cap', OLD.per_user_daily_cap_usd,
      'new_per_user_daily_cap', NEW.per_user_daily_cap_usd,
      'old_global_daily_cap', OLD.global_daily_cap_usd,
      'new_global_daily_cap', NEW.global_daily_cap_usd,
      'old_cooldown_minutes', OLD.cooldown_minutes,
      'new_cooldown_minutes', NEW.cooldown_minutes,
      'attempted_at', now()
    ),
    false
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_withdrawal_config
  BEFORE UPDATE ON public.withdrawal_security_config
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_withdrawal_config_change();

-- Insert default config
INSERT INTO public.withdrawal_security_config (
  per_user_daily_cap_usd, per_user_hourly_cap_usd, global_daily_cap_usd,
  cooldown_minutes, max_withdrawals_per_hour, max_withdrawals_per_day,
  anomaly_threshold_multiplier, auto_freeze_on_anomaly
) VALUES (5000, 2000, 50000, 15, 3, 10, 3.0, true);

-- 2. Withdrawal attempt log (tracks ALL attempts including blocked ones)
CREATE TABLE IF NOT EXISTS public.withdrawal_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  asset_symbol text NOT NULL,
  destination_address text,
  chain text DEFAULT 'BSC',
  status text NOT NULL DEFAULT 'pending',
  blocked_reason text,
  ip_address text,
  user_agent text,
  rate_check_passed boolean DEFAULT true,
  cooldown_check_passed boolean DEFAULT true,
  anomaly_check_passed boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal attempts"
  ON public.withdrawal_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal attempts"
  ON public.withdrawal_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Make withdrawal_attempts append-only (no updates/deletes)
CREATE OR REPLACE FUNCTION public.prevent_withdrawal_attempt_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION '[SECURITY] Withdrawal attempt records are immutable.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_block_withdrawal_attempt_update
  BEFORE UPDATE ON public.withdrawal_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_withdrawal_attempt_mutation();

CREATE TRIGGER trg_block_withdrawal_attempt_delete
  BEFORE DELETE ON public.withdrawal_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_withdrawal_attempt_mutation();

-- 3. User security freeze table
CREATE TABLE IF NOT EXISTS public.user_security_freeze (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  frozen_by text NOT NULL,
  reason text NOT NULL,
  auto_unfreeze_at timestamptz,
  unfrozen_at timestamptz,
  unfrozen_by text
);

ALTER TABLE public.user_security_freeze ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own freeze status"
  ON public.user_security_freeze FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage freezes"
  ON public.user_security_freeze FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Withdrawal validation function (called before any withdrawal)
CREATE OR REPLACE FUNCTION public.validate_withdrawal_request(
  _user_id uuid,
  _amount numeric,
  _asset_symbol text,
  _destination_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config withdrawal_security_config;
  _is_frozen boolean;
  _hourly_count integer;
  _daily_count integer;
  _hourly_volume numeric;
  _daily_volume numeric;
  _last_withdrawal timestamptz;
  _cooldown_remaining interval;
  _user_avg_withdrawal numeric;
  _result jsonb;
BEGIN
  -- 1. Check if user is frozen
  SELECT EXISTS(
    SELECT 1 FROM user_security_freeze
    WHERE user_id = _user_id AND unfrozen_at IS NULL
      AND (auto_unfreeze_at IS NULL OR auto_unfreeze_at > now())
  ) INTO _is_frozen;

  IF _is_frozen THEN
    INSERT INTO withdrawal_attempts (user_id, amount, asset_symbol, destination_address, status, blocked_reason, rate_check_passed, cooldown_check_passed, anomaly_check_passed)
    VALUES (_user_id, _amount, _asset_symbol, _destination_address, 'blocked', 'Account frozen', false, false, false);
    RETURN jsonb_build_object('allowed', false, 'reason', 'Account is frozen due to security concerns. Contact support.');
  END IF;

  -- 2. Get config
  SELECT * INTO _config FROM withdrawal_security_config LIMIT 1;

  -- 3. Cooldown check
  SELECT MAX(created_at) INTO _last_withdrawal
  FROM withdrawal_attempts
  WHERE user_id = _user_id AND status != 'blocked'
    AND created_at > now() - interval '24 hours';

  IF _last_withdrawal IS NOT NULL AND (now() - _last_withdrawal) < (_config.cooldown_minutes * interval '1 minute') THEN
    _cooldown_remaining := (_last_withdrawal + (_config.cooldown_minutes * interval '1 minute')) - now();
    INSERT INTO withdrawal_attempts (user_id, amount, asset_symbol, destination_address, status, blocked_reason, cooldown_check_passed)
    VALUES (_user_id, _amount, _asset_symbol, _destination_address, 'blocked', 'Cooldown period active', false);
    RETURN jsonb_build_object('allowed', false, 'reason', format('Please wait %s minutes before next withdrawal.', EXTRACT(MINUTE FROM _cooldown_remaining)::integer + 1));
  END IF;

  -- 4. Hourly rate check
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO _hourly_count, _hourly_volume
  FROM withdrawal_attempts
  WHERE user_id = _user_id AND status != 'blocked'
    AND created_at > now() - interval '1 hour';

  IF _hourly_count >= _config.max_withdrawals_per_hour THEN
    INSERT INTO withdrawal_attempts (user_id, amount, asset_symbol, destination_address, status, blocked_reason, rate_check_passed)
    VALUES (_user_id, _amount, _asset_symbol, _destination_address, 'blocked', 'Hourly withdrawal limit reached', false);
    RETURN jsonb_build_object('allowed', false, 'reason', format('Maximum %s withdrawals per hour exceeded.', _config.max_withdrawals_per_hour));
  END IF;

  -- 5. Daily rate check
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO _daily_count, _daily_volume
  FROM withdrawal_attempts
  WHERE user_id = _user_id AND status != 'blocked'
    AND created_at > now() - interval '24 hours';

  IF _daily_count >= _config.max_withdrawals_per_day THEN
    INSERT INTO withdrawal_attempts (user_id, amount, asset_symbol, destination_address, status, blocked_reason, rate_check_passed)
    VALUES (_user_id, _amount, _asset_symbol, _destination_address, 'blocked', 'Daily withdrawal limit reached', false);
    RETURN jsonb_build_object('allowed', false, 'reason', format('Maximum %s withdrawals per day exceeded.', _config.max_withdrawals_per_day));
  END IF;

  -- 6. Anomaly detection (if user has history)
  SELECT AVG(amount) INTO _user_avg_withdrawal
  FROM withdrawal_attempts
  WHERE user_id = _user_id AND status != 'blocked'
    AND created_at > now() - interval '30 days';

  IF _user_avg_withdrawal IS NOT NULL AND _user_avg_withdrawal > 0
     AND _amount > (_user_avg_withdrawal * _config.anomaly_threshold_multiplier) THEN
    -- Auto-freeze if configured
    IF _config.auto_freeze_on_anomaly THEN
      INSERT INTO user_security_freeze (user_id, frozen_by, reason, auto_unfreeze_at)
      VALUES (_user_id, 'system_anomaly_detector', format('Anomalous withdrawal: %s vs avg %s', _amount, _user_avg_withdrawal), now() + interval '24 hours')
      ON CONFLICT (user_id) DO UPDATE SET
        frozen_at = now(),
        frozen_by = 'system_anomaly_detector',
        reason = format('Anomalous withdrawal: %s vs avg %s', _amount, _user_avg_withdrawal),
        auto_unfreeze_at = now() + interval '24 hours',
        unfrozen_at = NULL;
    END IF;

    INSERT INTO withdrawal_attempts (user_id, amount, asset_symbol, destination_address, status, blocked_reason, anomaly_check_passed)
    VALUES (_user_id, _amount, _asset_symbol, _destination_address, 'blocked', 'Anomalous amount detected', false);

    INSERT INTO security_audit_log (event_type, severity, actor_id, target_table, details, blocked)
    VALUES ('ANOMALOUS_WITHDRAWAL_BLOCKED', 'CRITICAL', _user_id::text, 'withdrawal_attempts',
      jsonb_build_object('amount', _amount, 'avg_amount', _user_avg_withdrawal, 'multiplier', _config.anomaly_threshold_multiplier, 'auto_frozen', _config.auto_freeze_on_anomaly), true);

    RETURN jsonb_build_object('allowed', false, 'reason', 'This withdrawal was flagged for review. Your account has been temporarily frozen for security. Contact support.');
  END IF;

  -- All checks passed
  INSERT INTO withdrawal_attempts (user_id, amount, asset_symbol, destination_address, status)
  VALUES (_user_id, _amount, _asset_symbol, _destination_address, 'approved');

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ============================================================
-- PHASE 3: ADMIN ACTION GATING
-- Re-authentication, time-delays, and alerts for sensitive ops
-- ============================================================

-- 1. Sensitive admin operations requiring re-auth / time-delay
CREATE TABLE IF NOT EXISTS public.admin_sensitive_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  operation_type text NOT NULL,
  target_table text,
  target_id text,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending_confirmation',
  requires_delay boolean NOT NULL DEFAULT true,
  delay_hours integer NOT NULL DEFAULT 24,
  executable_after timestamptz,
  confirmed_at timestamptz,
  executed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_sensitive_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sensitive operations"
  ON public.admin_sensitive_operations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutable once executed
CREATE OR REPLACE FUNCTION public.protect_executed_admin_ops()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('executed', 'cancelled') THEN
    INSERT INTO security_audit_log (event_type, severity, actor_id, target_table, target_id, details, blocked)
    VALUES ('TAMPER_ATTEMPT_ADMIN_OP', 'CRITICAL', COALESCE(auth.uid()::text, 'system'), 'admin_sensitive_operations', OLD.id::text,
      jsonb_build_object('old_status', OLD.status, 'attempted_new_status', NEW.status), true);
    RAISE EXCEPTION '[SECURITY] Cannot modify executed or cancelled admin operations.';
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_executed_admin_ops
  BEFORE UPDATE ON public.admin_sensitive_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_executed_admin_ops();

-- Block deletes on admin sensitive operations
CREATE TRIGGER trg_block_admin_ops_delete
  BEFORE DELETE ON public.admin_sensitive_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_security_log_mutation();

-- 2. Admin session validation table (tracks re-auth events)
CREATE TABLE IF NOT EXISTS public.admin_session_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  validation_method text NOT NULL DEFAULT 'password',
  validated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  ip_address text,
  user_agent text,
  is_valid boolean NOT NULL DEFAULT true
);

ALTER TABLE public.admin_session_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own session validations"
  ON public.admin_session_validations FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_user_id AND public.has_role(auth.uid(), 'admin'));

-- Check if admin has valid recent re-auth
CREATE OR REPLACE FUNCTION public.admin_has_valid_session(_admin_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_session_validations
    WHERE admin_user_id = _admin_id
      AND is_valid = true
      AND expires_at > now()
  );
$$;

-- 3. Function to request a sensitive admin operation with time-delay
CREATE OR REPLACE FUNCTION public.request_sensitive_admin_operation(
  _operation_type text,
  _target_table text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _payload jsonb DEFAULT NULL,
  _delay_hours integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
  _op_id uuid;
BEGIN
  _admin_id := auth.uid();

  -- Verify admin role
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION '[SECURITY] Only administrators can request sensitive operations.';
  END IF;

  -- Verify fresh session
  IF NOT public.admin_has_valid_session(_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Re-authentication required. Please verify your identity before performing sensitive operations.');
  END IF;

  -- Create the delayed operation
  INSERT INTO admin_sensitive_operations (admin_user_id, operation_type, target_table, target_id, payload, delay_hours, executable_after)
  VALUES (_admin_id, _operation_type, _target_table, _target_id, _payload, _delay_hours, now() + (_delay_hours * interval '1 hour'))
  RETURNING id INTO _op_id;

  -- Log to security audit
  INSERT INTO security_audit_log (event_type, severity, actor_id, target_table, target_id, details)
  VALUES ('SENSITIVE_OP_REQUESTED', 'HIGH', _admin_id::text, _target_table, _target_id,
    jsonb_build_object('operation_type', _operation_type, 'delay_hours', _delay_hours, 'executable_after', now() + (_delay_hours * interval '1 hour'), 'operation_id', _op_id));

  RETURN jsonb_build_object('success', true, 'operation_id', _op_id, 'executable_after', now() + (_delay_hours * interval '1 hour'),
    'message', format('Operation queued. It can be executed after %s hours.', _delay_hours));
END;
$$;

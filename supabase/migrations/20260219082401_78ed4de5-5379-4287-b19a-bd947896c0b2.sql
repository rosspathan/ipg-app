
-- Circuit breaker: withdrawal rate limiting table
CREATE TABLE IF NOT EXISTS public.withdrawal_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  amount_usd numeric NOT NULL DEFAULT 0,
  withdrawal_type text NOT NULL DEFAULT 'crypto',
  blocked boolean NOT NULL DEFAULT false,
  block_reason text
);

ALTER TABLE public.withdrawal_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own rate limits" ON public.withdrawal_rate_limits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System inserts rate limits" ON public.withdrawal_rate_limits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_withdrawal_rate_limits_user_time 
  ON public.withdrawal_rate_limits(user_id, requested_at DESC);

-- Circuit breaker RPC function
CREATE OR REPLACE FUNCTION public.validate_withdrawal_request(
  p_user_id uuid,
  p_amount_usd numeric,
  p_withdrawal_type text DEFAULT 'crypto'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_withdrawal timestamptz;
  v_hourly_count integer;
  v_daily_count integer;
  v_daily_total_usd numeric;
  v_global_daily_usd numeric;
  v_user_avg_usd numeric;
  v_cooldown_minutes integer := 15;
  v_max_hourly integer := 3;
  v_max_daily integer := 10;
  v_user_daily_cap numeric := 5000;
  v_global_daily_cap numeric := 50000;
  v_anomaly_multiplier numeric := 3;
BEGIN
  -- 1. Cooldown check: last withdrawal must be > 15 min ago
  SELECT MAX(requested_at) INTO v_last_withdrawal
  FROM withdrawal_rate_limits
  WHERE user_id = p_user_id AND NOT blocked;

  IF v_last_withdrawal IS NOT NULL AND 
     v_last_withdrawal > now() - (v_cooldown_minutes || ' minutes')::interval THEN
    INSERT INTO withdrawal_rate_limits(user_id, amount_usd, withdrawal_type, blocked, block_reason)
    VALUES (p_user_id, p_amount_usd, p_withdrawal_type, true, 'cooldown');
    RETURN jsonb_build_object('allowed', false, 'reason', 
      format('Please wait %s minutes between withdrawals', v_cooldown_minutes));
  END IF;

  -- 2. Hourly rate limit
  SELECT COUNT(*) INTO v_hourly_count
  FROM withdrawal_rate_limits
  WHERE user_id = p_user_id AND NOT blocked
    AND requested_at > now() - interval '1 hour';

  IF v_hourly_count >= v_max_hourly THEN
    INSERT INTO withdrawal_rate_limits(user_id, amount_usd, withdrawal_type, blocked, block_reason)
    VALUES (p_user_id, p_amount_usd, p_withdrawal_type, true, 'hourly_limit');
    RETURN jsonb_build_object('allowed', false, 'reason', 
      format('Maximum %s withdrawals per hour exceeded', v_max_hourly));
  END IF;

  -- 3. Daily rate limit
  SELECT COUNT(*), COALESCE(SUM(amount_usd), 0) 
  INTO v_daily_count, v_daily_total_usd
  FROM withdrawal_rate_limits
  WHERE user_id = p_user_id AND NOT blocked
    AND requested_at > now() - interval '24 hours';

  IF v_daily_count >= v_max_daily THEN
    INSERT INTO withdrawal_rate_limits(user_id, amount_usd, withdrawal_type, blocked, block_reason)
    VALUES (p_user_id, p_amount_usd, p_withdrawal_type, true, 'daily_count_limit');
    RETURN jsonb_build_object('allowed', false, 'reason', 
      format('Maximum %s withdrawals per day exceeded', v_max_daily));
  END IF;

  -- 4. User daily USD cap
  IF (v_daily_total_usd + p_amount_usd) > v_user_daily_cap THEN
    INSERT INTO withdrawal_rate_limits(user_id, amount_usd, withdrawal_type, blocked, block_reason)
    VALUES (p_user_id, p_amount_usd, p_withdrawal_type, true, 'user_daily_cap');
    RETURN jsonb_build_object('allowed', false, 'reason', 
      format('Daily withdrawal limit of $%s exceeded', v_user_daily_cap));
  END IF;

  -- 5. Global daily cap
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_global_daily_usd
  FROM withdrawal_rate_limits
  WHERE NOT blocked AND requested_at > now() - interval '24 hours';

  IF (v_global_daily_usd + p_amount_usd) > v_global_daily_cap THEN
    INSERT INTO withdrawal_rate_limits(user_id, amount_usd, withdrawal_type, blocked, block_reason)
    VALUES (p_user_id, p_amount_usd, p_withdrawal_type, true, 'global_daily_cap');
    RETURN jsonb_build_object('allowed', false, 'reason', 
      'Platform daily withdrawal limit reached. Please try again tomorrow.');
  END IF;

  -- 6. Anomaly detection: flag if > 3x user average
  SELECT COALESCE(AVG(amount_usd), 0) INTO v_user_avg_usd
  FROM withdrawal_rate_limits
  WHERE user_id = p_user_id AND NOT blocked
    AND requested_at > now() - interval '30 days';

  IF v_user_avg_usd > 0 AND p_amount_usd > (v_user_avg_usd * v_anomaly_multiplier) THEN
    -- Flag but still allow - log the anomaly
    INSERT INTO withdrawal_rate_limits(user_id, amount_usd, withdrawal_type, blocked, block_reason)
    VALUES (p_user_id, p_amount_usd, p_withdrawal_type, true, 'anomaly_detected');
    
    -- Also freeze the account for 24h
    UPDATE profiles SET withdrawal_locked = true WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object('allowed', false, 'reason', 
      'Unusual withdrawal amount detected. Account frozen for 24 hours for security. Contact support if this was intentional.');
  END IF;

  -- All checks passed - record the valid request
  INSERT INTO withdrawal_rate_limits(user_id, amount_usd, withdrawal_type, blocked, block_reason)
  VALUES (p_user_id, p_amount_usd, p_withdrawal_type, false, null);

  RETURN jsonb_build_object('allowed', true);
END;
$$;

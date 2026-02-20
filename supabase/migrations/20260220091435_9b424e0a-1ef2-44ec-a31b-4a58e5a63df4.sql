
-- ============================================================
-- Enhancement 1: Auto-withdrawal settings on trading_engine_settings
-- ============================================================
ALTER TABLE public.trading_engine_settings
  ADD COLUMN IF NOT EXISTS auto_withdrawal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_withdrawal_threshold numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS auto_withdrawal_batch_size integer NOT NULL DEFAULT 5;

-- ============================================================
-- Enhancement 2: Per-pair circuit breaker config table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trading_pair_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL UNIQUE,
  min_order_size numeric NOT NULL DEFAULT 1,
  max_order_size numeric,
  max_orders_per_level integer NOT NULL DEFAULT 500,
  circuit_breaker_percent numeric NOT NULL DEFAULT 5,
  circuit_breaker_window_minutes integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed default pairs
INSERT INTO public.trading_pair_settings (symbol, min_order_size, circuit_breaker_percent, circuit_breaker_window_minutes)
VALUES 
  ('BSK/USDT', 1, 5, 5),
  ('BSK/USDI', 1, 5, 5),
  ('IPG/USDT', 1, 5, 5),
  ('IPG/USDI', 1, 5, 5),
  ('USDT/USDI', 0.01, 2, 5)
ON CONFLICT (symbol) DO NOTHING;

-- Enable RLS
ALTER TABLE public.trading_pair_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trading_pair_settings_public_read"
  ON public.trading_pair_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "trading_pair_settings_admin_write"
  ON public.trading_pair_settings FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Enhancement 3: Rate limit tracking table (fast lookups)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_rate_limits (
  user_id uuid NOT NULL,
  window_start timestamp with time zone NOT NULL,
  order_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.order_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_rate_limits_service_only"
  ON public.order_rate_limits FOR ALL
  TO service_role USING (true);

-- Clean up old rate limit windows (called by pg_cron or cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_order_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.order_rate_limits
  WHERE window_start < now() - INTERVAL '10 minutes';
END;
$$;

-- ============================================================
-- Enhancement 4: Per-pair circuit breaker check function
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_pair_circuit_breaker(
  p_symbol text,
  p_trade_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_window_start timestamp with time zone;
  v_window_open numeric;
  v_change_pct numeric;
BEGIN
  -- Get per-pair settings
  SELECT * INTO v_settings
  FROM public.trading_pair_settings
  WHERE symbol = p_symbol;
  
  -- If no settings, allow trade
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  
  v_window_start := now() - (v_settings.circuit_breaker_window_minutes || ' minutes')::interval;
  
  -- Get opening price in the window
  SELECT price INTO v_window_open
  FROM public.trades
  WHERE symbol = p_symbol
    AND created_at >= v_window_start
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Not enough data to check
  IF v_window_open IS NULL OR v_window_open = 0 THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  
  v_change_pct := ABS((p_trade_price - v_window_open) / v_window_open * 100);
  
  IF v_change_pct > v_settings.circuit_breaker_percent THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Circuit breaker: Price moved %.2f%% in %s minutes (max: %.2f%%)',
        v_change_pct, v_settings.circuit_breaker_window_minutes, v_settings.circuit_breaker_percent),
      'change_pct', v_change_pct,
      'window_open', v_window_open,
      'current_price', p_trade_price
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'change_pct', v_change_pct);
END;
$$;

-- Update timestamp trigger for trading_pair_settings
CREATE OR REPLACE FUNCTION public.update_trading_pair_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_trading_pair_settings_updated_at ON public.trading_pair_settings;
CREATE TRIGGER trg_trading_pair_settings_updated_at
  BEFORE UPDATE ON public.trading_pair_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_trading_pair_settings_updated_at();

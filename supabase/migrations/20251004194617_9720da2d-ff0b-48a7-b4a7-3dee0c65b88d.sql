-- Create spin_config table for admin-controlled settings
CREATE TABLE IF NOT EXISTS public.spin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_bet_bsk NUMERIC NOT NULL DEFAULT 100,
  max_bet_bsk NUMERIC NOT NULL DEFAULT 1000,
  post_free_spin_fee_bsk NUMERIC NOT NULL DEFAULT 10,
  winner_profit_fee_percent NUMERIC NOT NULL DEFAULT 10,
  free_spins_per_user INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spin_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can manage spin config"
  ON public.spin_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active spin config"
  ON public.spin_config
  FOR SELECT
  USING (is_active = true);

-- Create spin_segments table
CREATE TABLE IF NOT EXISTS public.spin_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  color_hex TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spin_segments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can manage spin segments"
  ON public.spin_segments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active spin segments"
  ON public.spin_segments
  FOR SELECT
  USING (is_active = true);

-- Create spin_user_limits table
CREATE TABLE IF NOT EXISTS public.spin_user_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  free_spins_remaining INTEGER NOT NULL DEFAULT 5,
  total_spins INTEGER NOT NULL DEFAULT 0,
  total_bet_bsk NUMERIC NOT NULL DEFAULT 0,
  total_won_bsk NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.spin_user_limits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can view all spin limits"
  ON public.spin_user_limits
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own spin limits"
  ON public.spin_user_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage spin limits"
  ON public.spin_user_limits
  FOR ALL
  USING (true);

-- Create spin_history table
CREATE TABLE IF NOT EXISTS public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  segment_id UUID NOT NULL REFERENCES public.spin_segments(id),
  bet_bsk NUMERIC NOT NULL,
  spin_fee_bsk NUMERIC NOT NULL DEFAULT 0,
  multiplier NUMERIC NOT NULL,
  payout_bsk NUMERIC NOT NULL DEFAULT 0,
  profit_fee_bsk NUMERIC NOT NULL DEFAULT 0,
  net_payout_bsk NUMERIC NOT NULL DEFAULT 0,
  net_change_bsk NUMERIC NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  result_value INTEGER NOT NULL,
  was_free_spin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can view all spin history"
  ON public.spin_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own spin history"
  ON public.spin_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create spin history"
  ON public.spin_history
  FOR INSERT
  WITH CHECK (true);

-- Insert default config
INSERT INTO public.spin_config (
  min_bet_bsk,
  max_bet_bsk,
  post_free_spin_fee_bsk,
  winner_profit_fee_percent,
  free_spins_per_user,
  is_active
) VALUES (
  100,
  1000,
  10,
  10,
  5,
  true
) ON CONFLICT DO NOTHING;

-- Insert default 4 segments (2 WIN, 2 LOSE)
INSERT INTO public.spin_segments (label, multiplier, weight, color_hex, is_active) VALUES
  ('WIN x2', 2, 30, '#22c55e', true),
  ('LOSE', 0, 35, '#ef4444', true),
  ('WIN x3', 3, 20, '#10b981', true),
  ('LOSE', 0, 35, '#dc2626', true)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_spin_history_user_id ON public.spin_history(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_history_created_at ON public.spin_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spin_user_limits_user_id ON public.spin_user_limits(user_id);
-- Create comprehensive spin system tables (fixed version)

-- Create spin settings table
CREATE TABLE IF NOT EXISTS public.spin_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  free_spins_default integer NOT NULL DEFAULT 5,
  fee_bp_after_free numeric NOT NULL DEFAULT 5.0,
  min_bet_usdt numeric NOT NULL DEFAULT 1.0,
  max_bet_usdt numeric NOT NULL DEFAULT 100.0,
  segments jsonb NOT NULL DEFAULT '[
    {"label": "WIN 1×", "weight": 25, "reward_value": 5, "reward_token": "BSK", "color": "#00ff88"},
    {"label": "LOSE 0", "weight": 25, "reward_value": -5, "reward_token": "BSK", "color": "#ff0066"},
    {"label": "WIN 1×", "weight": 25, "reward_value": 5, "reward_token": "BSK", "color": "#00ff88"},
    {"label": "LOSE 0", "weight": 25, "reward_value": -5, "reward_token": "BSK", "color": "#ff0066"}
  ]'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  cooldown_seconds integer NOT NULL DEFAULT 300,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create spin results table
CREATE TABLE IF NOT EXISTS public.spin_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  bet_amount numeric NOT NULL DEFAULT 0,
  outcome jsonb NOT NULL,
  bsk_delta numeric NOT NULL DEFAULT 0,
  fee_bsk numeric NOT NULL DEFAULT 0,
  segment_label text NOT NULL,
  is_free_spin boolean NOT NULL DEFAULT false,
  auth_method text NOT NULL DEFAULT 'supabase',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user bonus balances table
CREATE TABLE IF NOT EXISTS public.user_bonus_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  bsk_available numeric NOT NULL DEFAULT 0,
  bsk_pending numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.spin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bonus_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage spin_settings" ON public.spin_settings;
DROP POLICY IF EXISTS "Users can view active spin_settings" ON public.spin_settings;
DROP POLICY IF EXISTS "Admin can view all spin_results" ON public.spin_results;
DROP POLICY IF EXISTS "Users can view own spin_results" ON public.spin_results;
DROP POLICY IF EXISTS "Service can create spin_results" ON public.spin_results;
DROP POLICY IF EXISTS "Admin can manage all user_bonus_balances" ON public.user_bonus_balances;
DROP POLICY IF EXISTS "Users can view own user_bonus_balances" ON public.user_bonus_balances;
DROP POLICY IF EXISTS "Service can manage user_bonus_balances" ON public.user_bonus_balances;

-- Create policies for spin_settings
CREATE POLICY "Admin can manage spin_settings" ON public.spin_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active spin_settings" ON public.spin_settings
  FOR SELECT USING (is_enabled = true);

-- Create policies for spin_results  
CREATE POLICY "Admin can view all spin_results" ON public.spin_results
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own spin_results" ON public.spin_results
  FOR SELECT USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id
      ELSE user_id LIKE 'wallet_%' OR user_id LIKE 'local_%'
    END
  );

CREATE POLICY "Service can create spin_results" ON public.spin_results
  FOR INSERT WITH CHECK (true);

-- Create policies for user_bonus_balances
CREATE POLICY "Admin can manage all user_bonus_balances" ON public.user_bonus_balances
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own user_bonus_balances" ON public.user_bonus_balances
  FOR SELECT USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id
      ELSE false
    END
  );

CREATE POLICY "Service can manage user_bonus_balances" ON public.user_bonus_balances
  FOR ALL USING (true);

-- Insert default settings
INSERT INTO public.spin_settings (
  free_spins_default,
  fee_bp_after_free,
  min_bet_usdt,
  max_bet_usdt,
  segments,
  is_enabled,
  cooldown_seconds
) VALUES (
  5,
  5.0,
  1.0,
  100.0,
  '[
    {"label": "WIN 1×", "weight": 25, "reward_value": 5, "reward_token": "BSK", "color": "#00ff88"},
    {"label": "LOSE 0", "weight": 25, "reward_value": -5, "reward_token": "BSK", "color": "#ff0066"},
    {"label": "WIN 1×", "weight": 25, "reward_value": 5, "reward_token": "BSK", "color": "#00ff88"},
    {"label": "LOSE 0", "weight": 25, "reward_value": -5, "reward_token": "BSK", "color": "#ff0066"}
  ]'::jsonb,
  true,
  300
) ON CONFLICT DO NOTHING;
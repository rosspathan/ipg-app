-- Create spin wheel tables
CREATE TABLE public.spin_wheels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  ticket_price NUMERIC DEFAULT 0,
  ticket_currency TEXT DEFAULT 'USDT',
  free_spins_daily INTEGER DEFAULT 0,
  vip_multiplier NUMERIC DEFAULT 1,
  cooldown_seconds INTEGER DEFAULT 86400,
  max_spins_per_user INTEGER DEFAULT 0,
  seed TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create spin segments table
CREATE TABLE public.spin_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.spin_wheels(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  weight INTEGER NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('token', 'coupon', 'percent_bonus', 'nothing')),
  reward_value NUMERIC,
  reward_token TEXT,
  max_per_day INTEGER DEFAULT 0,
  max_total INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  color TEXT
);

-- Create spin runs table
CREATE TABLE public.spin_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.spin_wheels(id),
  user_id UUID NOT NULL,
  segment_id UUID REFERENCES public.spin_segments(id),
  ticket_cost NUMERIC DEFAULT 0,
  ticket_currency TEXT,
  outcome JSONB,
  status TEXT CHECK (status IN ('pending', 'won', 'granted', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create spin grants table
CREATE TABLE public.spin_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.spin_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC,
  token TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create spin user limits table
CREATE TABLE public.spin_user_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID REFERENCES public.spin_wheels(id),
  user_id UUID NOT NULL,
  day DATE DEFAULT CURRENT_DATE,
  spins_today INTEGER DEFAULT 0,
  UNIQUE(wheel_id, user_id, day)
);

-- Enable Row Level Security
ALTER TABLE public.spin_wheels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_user_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spin_wheels
CREATE POLICY "Public can view active wheels" ON public.spin_wheels
  FOR SELECT USING (is_active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));

CREATE POLICY "Admin can manage wheels" ON public.spin_wheels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for spin_segments  
CREATE POLICY "Public can view enabled segments" ON public.spin_segments
  FOR SELECT USING (is_enabled = true);

CREATE POLICY "Admin can manage segments" ON public.spin_segments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for spin_runs
CREATE POLICY "Users can view own runs" ON public.spin_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own runs" ON public.spin_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all runs" ON public.spin_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can update runs" ON public.spin_runs
  FOR UPDATE USING (true);

-- RLS Policies for spin_grants
CREATE POLICY "Users can view own grants" ON public.spin_grants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all grants" ON public.spin_grants
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can create grants" ON public.spin_grants
  FOR INSERT WITH CHECK (true);

-- RLS Policies for spin_user_limits
CREATE POLICY "Users can view own limits" ON public.spin_user_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own limits" ON public.spin_user_limits  
  FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for spin_runs
ALTER PUBLICATION supabase_realtime ADD TABLE public.spin_runs;
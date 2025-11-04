-- Create program_flags table for enable/disable toggles
CREATE TABLE IF NOT EXISTS public.program_flags (
  program_code TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster enabled lookups
CREATE INDEX IF NOT EXISTS idx_program_flags_enabled ON public.program_flags(enabled);

-- Enable RLS
ALTER TABLE public.program_flags ENABLE ROW LEVEL SECURITY;

-- Public read access (users need to know if programs are enabled)
CREATE POLICY "Anyone can view program flags" ON public.program_flags
  FOR SELECT USING (true);

-- Admin write access (using user_roles table)
CREATE POLICY "Admins can manage program flags" ON public.program_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

-- Helper RPC functions
CREATE OR REPLACE FUNCTION public.get_program_flag(p_program_code TEXT)
RETURNS TABLE(program_code TEXT, enabled BOOLEAN, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pf.program_code, pf.enabled, pf.updated_at
  FROM public.program_flags pf
  WHERE pf.program_code = p_program_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_program_flags()
RETURNS TABLE(program_code TEXT, enabled BOOLEAN, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pf.program_code, pf.enabled, pf.updated_at
  FROM public.program_flags pf
  ORDER BY pf.program_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_program_flag(
  p_program_code TEXT,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  INSERT INTO public.program_flags (program_code, enabled, updated_at)
  VALUES (p_program_code, p_enabled, now())
  ON CONFLICT (program_code) 
  DO UPDATE SET 
    enabled = EXCLUDED.enabled,
    updated_at = now();
END;
$$;

-- Insert default program flags (all enabled)
INSERT INTO public.program_flags (program_code, enabled) VALUES
  ('spin_wheel', true),
  ('lucky_draw', true),
  ('ad_mining', true),
  ('one_time_purchase', true),
  ('team_referrals', true),
  ('insurance', true),
  ('loans', true),
  ('staking', true),
  ('trading', true)
ON CONFLICT (program_code) DO NOTHING;
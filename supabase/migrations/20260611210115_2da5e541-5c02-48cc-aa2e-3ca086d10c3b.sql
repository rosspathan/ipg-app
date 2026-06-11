-- Drop the definer view from the previous attempt
DROP VIEW IF EXISTS public.bsk_vesting_config_public;

-- Admin-only table for sensitive anti-sybil parameters
CREATE TABLE public.bsk_vesting_security_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES public.bsk_vesting_config(id) ON DELETE CASCADE,
  anti_sybil_max_per_ip integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bsk_vesting_security_config TO authenticated;
GRANT ALL ON public.bsk_vesting_security_config TO service_role;

ALTER TABLE public.bsk_vesting_security_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vesting security config"
  ON public.bsk_vesting_security_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill the sensitive value out of the publicly-readable table
INSERT INTO public.bsk_vesting_security_config (config_id, anti_sybil_max_per_ip)
SELECT id, anti_sybil_max_per_ip FROM public.bsk_vesting_config;

-- Remove the sensitive column from the publicly-readable table
ALTER TABLE public.bsk_vesting_config DROP COLUMN anti_sybil_max_per_ip;

-- Restore public read of the now-safe config
DROP POLICY IF EXISTS "Users can view active vesting config" ON public.bsk_vesting_config;
CREATE POLICY "Users can view active vesting config"
  ON public.bsk_vesting_config
  FOR SELECT
  USING (is_enabled = true);

-- Create new provably fair spin wheel system (handling existing tables)

-- First check and remove old tables that we need to replace
DROP TABLE IF EXISTS spin_results CASCADE;
DROP TABLE IF EXISTS spin_settings CASCADE;
DROP TABLE IF EXISTS spin_segments CASCADE;
DROP TABLE IF EXISTS spin_wheels CASCADE;
DROP TABLE IF EXISTS spin_user_limits CASCADE;
DROP TABLE IF EXISTS spin_seed_commits CASCADE;
DROP TABLE IF EXISTS user_free_spins CASCADE;
DROP TABLE IF EXISTS spin_wheel_segments CASCADE;
DROP TABLE IF EXISTS spin_wheel_config CASCADE;
DROP TABLE IF EXISTS spin_wheel_audit_logs CASCADE;
DROP TABLE IF EXISTS provably_fair_spins CASCADE;

-- RNG Seeds management (new table)
CREATE TABLE IF NOT EXISTS public.rng_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_to timestamp with time zone,
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Spin wheel configuration (new table)
CREATE TABLE IF NOT EXISTS public.ismart_spin_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT true,
  min_bet_inr numeric NOT NULL DEFAULT 100,
  max_bet_inr numeric NOT NULL DEFAULT 1000,
  free_spins_count integer NOT NULL DEFAULT 5,
  post_free_fee_inr numeric NOT NULL DEFAULT 10,
  risk_free_free_spins boolean NOT NULL DEFAULT false,
  allow_holding_balance boolean NOT NULL DEFAULT false,
  daily_spin_cap_per_user integer,
  lifetime_spin_cap_per_user integer,
  max_daily_liability_bsk numeric,
  cooloff_minutes integer NOT NULL DEFAULT 0,
  region_restrictions jsonb DEFAULT '[]'::jsonb,
  bsk_inr_rate numeric NOT NULL DEFAULT 1.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Spin wheel segments (new table)
CREATE TABLE IF NOT EXISTS public.ismart_spin_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES public.ismart_spin_config(id) ON DELETE CASCADE,
  label text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 0,
  weight integer NOT NULL DEFAULT 25,
  color_hex text NOT NULL DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  position_order integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User spin limits tracking (new table)
CREATE TABLE IF NOT EXISTS public.ismart_user_limits (
  user_id uuid NOT NULL,
  free_spins_used integer NOT NULL DEFAULT 0,
  free_spins_remaining integer NOT NULL DEFAULT 5,
  daily_spins_count integer NOT NULL DEFAULT 0,
  lifetime_spins_count integer NOT NULL DEFAULT 0,
  last_spin_date date,
  first_spin_at timestamp with time zone,
  last_spin_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Main spins transaction table (new table)
CREATE TABLE IF NOT EXISTS public.ismart_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  config_snapshot jsonb NOT NULL,
  client_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  revealed_server_seed text,
  nonce integer NOT NULL,
  segment_id uuid NOT NULL,
  segment_label text NOT NULL,
  multiplier numeric NOT NULL,
  bet_bsk numeric NOT NULL,
  bet_inr_snapshot numeric NOT NULL,
  fee_bsk numeric NOT NULL DEFAULT 0,
  fee_inr_snapshot numeric NOT NULL DEFAULT 0,
  payout_bsk numeric NOT NULL DEFAULT 0,
  payout_inr_snapshot numeric NOT NULL DEFAULT 0,
  bsk_inr_rate_snapshot numeric NOT NULL,
  status text NOT NULL DEFAULT 'settled' CHECK (status IN ('settled', 'void')),
  was_free_spin boolean NOT NULL DEFAULT false,
  was_risk_free boolean NOT NULL DEFAULT false,
  verify_payload jsonb,
  idempotency_key text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  settled_at timestamp with time zone
);

-- Enable RLS on new tables
ALTER TABLE public.rng_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ismart_spin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ismart_spin_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ismart_user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ismart_spins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin can manage RNG seeds" ON public.rng_seeds 
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view published seeds" ON public.rng_seeds 
  FOR SELECT TO authenticated USING (published = true);

CREATE POLICY "Admin can manage spin config" ON public.ismart_spin_config 
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active config" ON public.ismart_spin_config 
  FOR SELECT TO authenticated USING (is_enabled = true);

CREATE POLICY "Admin can manage segments" ON public.ismart_spin_segments 
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active segments" ON public.ismart_spin_segments 
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users can manage own limits" ON public.ismart_user_limits 
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own spins" ON public.ismart_spins 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all spins" ON public.ismart_spins 
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create spins" ON public.ismart_spins 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default configuration
INSERT INTO public.ismart_spin_config (
  is_enabled, min_bet_inr, max_bet_inr, free_spins_count, post_free_fee_inr, bsk_inr_rate
) VALUES (true, 100, 1000, 5, 10, 1.0)
ON CONFLICT DO NOTHING;

-- Insert default segments for the configuration
DO $$
DECLARE
  config_id uuid;
BEGIN
  SELECT id INTO config_id FROM public.ismart_spin_config ORDER BY created_at DESC LIMIT 1;
  
  IF config_id IS NOT NULL THEN
    INSERT INTO public.ismart_spin_segments (config_id, label, multiplier, weight, color_hex, position_order) VALUES
    (config_id, 'WIN ×2', 2.0, 25, '#10b981', 1),
    (config_id, 'LOSE', 0.0, 25, '#ef4444', 2),
    (config_id, 'WIN ×2', 2.0, 25, '#10b981', 3),
    (config_id, 'LOSE', 0.0, 25, '#ef4444', 4)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Create initial RNG seed
INSERT INTO public.rng_seeds (server_seed, server_seed_hash) 
SELECT 
  encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'),
  encode(digest(encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex'), 'sha256'), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM public.rng_seeds);

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_current_spin_seed()
RETURNS TABLE(id uuid, server_seed_hash text, valid_from timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rng_seeds.id, rng_seeds.server_seed_hash, rng_seeds.valid_from
  FROM public.rng_seeds
  WHERE valid_to IS NULL OR valid_to > now()
  ORDER BY valid_from DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.calculate_provable_spin_result(
  p_server_seed text,
  p_client_seed text,
  p_nonce integer,
  p_segments jsonb
)
RETURNS TABLE(segment_index integer, segment_data jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  hash_input text;
  hash_result text;
  hash_int bigint;
  total_weight integer := 0;
  running_weight integer := 0;
  segment jsonb;
  segment_idx integer := 0;
  target_value integer;
BEGIN
  hash_input := p_server_seed || ':' || p_client_seed || ':' || p_nonce::text;
  hash_result := encode(digest(hash_input, 'sha256'), 'hex');
  hash_int := ('x' || substring(hash_result, 1, 8))::bit(32)::bigint;
  
  FOR segment IN SELECT jsonb_array_elements(p_segments)
  LOOP
    total_weight := total_weight + (segment->>'weight')::integer;
  END LOOP;
  
  target_value := (hash_int % total_weight);
  
  FOR segment IN SELECT jsonb_array_elements(p_segments)
  LOOP
    running_weight := running_weight + (segment->>'weight')::integer;
    IF target_value < running_weight THEN
      RETURN QUERY SELECT segment_idx, segment;
      RETURN;
    END IF;
    segment_idx := segment_idx + 1;
  END LOOP;
  
  RETURN QUERY SELECT 0, (SELECT jsonb_array_elements(p_segments) LIMIT 1);
END;
$$;
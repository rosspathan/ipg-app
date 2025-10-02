-- Drop table if exists to start fresh
DROP TABLE IF EXISTS public.staking_pools CASCADE;

-- Create staking_pools table
CREATE TABLE public.staking_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_id UUID REFERENCES public.assets(id),
  staking_type TEXT NOT NULL DEFAULT 'crypto',
  apy NUMERIC NOT NULL DEFAULT 0,
  lock_period_days INTEGER NOT NULL DEFAULT 0,
  has_lock_period BOOLEAN NOT NULL DEFAULT true,
  min_stake_amount NUMERIC NOT NULL DEFAULT 0,
  max_stake_amount NUMERIC,
  capacity NUMERIC,
  current_staked NUMERIC NOT NULL DEFAULT 0,
  early_exit_penalty NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  reward_distribution TEXT NOT NULL DEFAULT 'daily',
  compound_rewards BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  terms_conditions TEXT,
  region_restrictions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_staking_pools_active ON public.staking_pools(active);
CREATE INDEX idx_staking_pools_asset ON public.staking_pools(asset_id);
CREATE INDEX idx_staking_pools_type ON public.staking_pools(staking_type);

-- Enable RLS
ALTER TABLE public.staking_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage staking pools"
  ON public.staking_pools
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active staking pools"
  ON public.staking_pools
  FOR SELECT
  USING (active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_staking_pools_updated_at
  BEFORE UPDATE ON public.staking_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default staking pools
INSERT INTO public.staking_pools (name, staking_type, apy, lock_period_days, has_lock_period, min_stake_amount, early_exit_penalty, platform_fee, description) VALUES
  ('Flexible Savings', 'crypto', 3.5, 0, false, 0.001, 0, 1, 'Flexible staking with no lock period. Withdraw anytime.'),
  ('30-Day Fixed Staking', 'crypto', 8.0, 30, true, 0.01, 5, 2, 'Fixed 30-day staking with 8% APY'),
  ('90-Day High Yield', 'crypto', 12.0, 90, true, 0.1, 10, 2, 'High yield 90-day staking pool'),
  ('180-Day Premium', 'crypto', 15.0, 180, true, 1, 15, 2.5, 'Premium long-term staking with maximum returns'),
  ('BSK Flexible Pool', 'bsk', 5.0, 0, false, 100, 0, 1.5, 'Flexible BSK staking with daily rewards'),
  ('BSK 60-Day Lock', 'bsk', 10.0, 60, true, 1000, 8, 2, 'BSK fixed staking with enhanced APY');

COMMENT ON TABLE public.staking_pools IS 'Admin-managed staking pool configurations';
COMMENT ON COLUMN public.staking_pools.staking_type IS 'Type: crypto (real crypto), fiat (stable), or bsk (bonus token)';
COMMENT ON COLUMN public.staking_pools.has_lock_period IS 'Whether this pool has a lock period or flexible withdrawal';
COMMENT ON COLUMN public.staking_pools.reward_distribution IS 'How rewards are distributed: daily, weekly, monthly, or at maturity';
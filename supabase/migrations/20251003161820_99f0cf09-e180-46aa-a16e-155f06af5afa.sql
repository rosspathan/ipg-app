-- Add reward distribution period fields to staking_pools
ALTER TABLE public.staking_pools
ADD COLUMN IF NOT EXISTS reward_period_value INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reward_period_unit TEXT CHECK (reward_period_unit IN ('months', 'years')) DEFAULT NULL;

COMMENT ON COLUMN public.staking_pools.reward_period_value IS 'Duration value for reward distribution period';
COMMENT ON COLUMN public.staking_pools.reward_period_unit IS 'Unit for reward distribution period: months or years';
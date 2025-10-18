-- Create staking_rewards table to track pending rewards
CREATE TABLE IF NOT EXISTS public.staking_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pool_id UUID NOT NULL REFERENCES public.staking_pools(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.user_staking_submissions(id) ON DELETE SET NULL,
  stake_amount NUMERIC NOT NULL,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  apy_used NUMERIC NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'distributed', 'cancelled')),
  distributed_at TIMESTAMP WITH TIME ZONE,
  distributed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staking_reward_distributions table for batch tracking
CREATE TABLE IF NOT EXISTS public.staking_reward_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  pool_id UUID REFERENCES public.staking_pools(id) ON DELETE SET NULL,
  total_users INTEGER NOT NULL DEFAULT 0,
  total_bsk_distributed NUMERIC NOT NULL DEFAULT 0,
  distribution_type TEXT NOT NULL DEFAULT 'manual' CHECK (distribution_type IN ('manual', 'scheduled', 'automated')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  reward_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staking_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_reward_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staking_rewards
CREATE POLICY "Users can view own staking rewards"
  ON public.staking_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all staking rewards"
  ON public.staking_rewards FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage staking rewards"
  ON public.staking_rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for staking_reward_distributions
CREATE POLICY "Admin can view all distributions"
  ON public.staking_reward_distributions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage distributions"
  ON public.staking_reward_distributions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_staking_rewards_user_id ON public.staking_rewards(user_id);
CREATE INDEX idx_staking_rewards_pool_id ON public.staking_rewards(pool_id);
CREATE INDEX idx_staking_rewards_status ON public.staking_rewards(status);
CREATE INDEX idx_staking_reward_distributions_admin_id ON public.staking_reward_distributions(admin_id);
CREATE INDEX idx_staking_reward_distributions_pool_id ON public.staking_reward_distributions(pool_id);

-- Create updated_at trigger for staking_rewards
CREATE TRIGGER update_staking_rewards_updated_at
  BEFORE UPDATE ON public.staking_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
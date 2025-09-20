-- Create insurance subscription tiers table
CREATE TABLE public.insurance_subscription_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  coverage_ratio NUMERIC NOT NULL DEFAULT 0.5, -- 0.5 = 50% coverage
  max_claim_per_trade NUMERIC NOT NULL DEFAULT 500,
  max_claims_per_month INTEGER DEFAULT NULL, -- NULL = unlimited
  min_loss_threshold NUMERIC NOT NULL DEFAULT 10,
  bonus_rewards NUMERIC DEFAULT 0, -- BSK coins earned monthly
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user insurance subscriptions table
CREATE TABLE public.user_insurance_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier_id UUID NOT NULL REFERENCES public.insurance_subscription_tiers(id),
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  claims_used_this_month INTEGER DEFAULT 0,
  last_claim_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trigger for updated_at on tiers
CREATE TRIGGER update_insurance_subscription_tiers_updated_at
  BEFORE UPDATE ON public.insurance_subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on subscriptions
CREATE TRIGGER update_user_insurance_subscriptions_updated_at
  BEFORE UPDATE ON public.user_insurance_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on both tables
ALTER TABLE public.insurance_subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_insurance_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for insurance_subscription_tiers
CREATE POLICY "Admin can manage insurance_subscription_tiers"
  ON public.insurance_subscription_tiers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active insurance_subscription_tiers"
  ON public.insurance_subscription_tiers
  FOR SELECT
  USING (is_active = true);

-- RLS policies for user_insurance_subscriptions
CREATE POLICY "Admin can manage user_insurance_subscriptions"
  ON public.user_insurance_subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own subscriptions"
  ON public.user_insurance_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

-- Add tier_id to insurance_claims to track which tier was used
ALTER TABLE public.insurance_claims 
ADD COLUMN tier_id UUID REFERENCES public.insurance_subscription_tiers(id);

-- Insert default tiers
INSERT INTO public.insurance_subscription_tiers (tier_name, monthly_fee, coverage_ratio, max_claim_per_trade, max_claims_per_month, min_loss_threshold, bonus_rewards) VALUES
('Basic', 9.99, 0.30, 200, 5, 10, 5),
('Premium', 29.99, 0.50, 500, 10, 10, 15),
('VIP', 59.99, 0.80, 2000, NULL, 5, 30),
('Elite', 99.99, 0.90, 5000, NULL, 5, 50);

-- Create function to reset monthly claim counts
CREATE OR REPLACE FUNCTION public.reset_monthly_claim_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_insurance_subscriptions 
  SET 
    claims_used_this_month = 0,
    last_claim_reset_date = CURRENT_DATE
  WHERE last_claim_reset_date < date_trunc('month', CURRENT_DATE);
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_user_insurance_subscriptions_user_id ON public.user_insurance_subscriptions(user_id);
CREATE INDEX idx_user_insurance_subscriptions_tier_id ON public.user_insurance_subscriptions(tier_id);
CREATE INDEX idx_user_insurance_subscriptions_active ON public.user_insurance_subscriptions(is_active, expires_at);
CREATE INDEX idx_insurance_claims_tier_id ON public.insurance_claims(tier_id);
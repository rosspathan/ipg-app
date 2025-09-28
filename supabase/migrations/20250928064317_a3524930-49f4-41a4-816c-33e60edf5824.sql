-- Create BSK balance types and advertising mining system (fixed order)

-- Create enum for BSK balance types
CREATE TYPE bsk_balance_type AS ENUM ('withdrawable', 'holding');

-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');

-- Create enum for missed day policy
CREATE TYPE missed_day_policy AS ENUM ('forfeit', 'carry_forward');

-- Create advertising mining settings table
CREATE TABLE public.ad_mining_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  free_daily_enabled BOOLEAN NOT NULL DEFAULT true,
  free_daily_reward_bsk NUMERIC NOT NULL DEFAULT 1,
  bsk_inr_rate NUMERIC NOT NULL DEFAULT 1.0,
  allow_multiple_subscriptions BOOLEAN NOT NULL DEFAULT true,
  missed_day_policy missed_day_policy NOT NULL DEFAULT 'forfeit',
  carry_forward_days INTEGER NOT NULL DEFAULT 7,
  auto_credit_no_inventory BOOLEAN NOT NULL DEFAULT false,
  daily_reset_timezone TEXT NOT NULL DEFAULT 'UTC',
  max_free_per_day INTEGER NOT NULL DEFAULT 1,
  max_subscription_payout_per_day_per_tier NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_mining_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage ad mining settings" ON public.ad_mining_settings 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view ad mining settings" ON public.ad_mining_settings 
  FOR SELECT USING (true);

-- Create subscription tiers table
CREATE TABLE public.ad_subscription_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_inr NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 100,
  daily_bsk NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tier_inr)
);

-- Enable RLS
ALTER TABLE public.ad_subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage subscription tiers" ON public.ad_subscription_tiers 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active tiers" ON public.ad_subscription_tiers 
  FOR SELECT USING (is_active = true);

-- Create user subscriptions table first (no dependencies)
CREATE TABLE public.ad_user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier_id UUID NOT NULL REFERENCES public.ad_subscription_tiers(id),
  tier_inr NUMERIC NOT NULL,
  purchased_bsk NUMERIC NOT NULL,
  daily_bsk NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_total INTEGER NOT NULL DEFAULT 100,
  policy missed_day_policy NOT NULL DEFAULT 'forfeit',
  total_earned_bsk NUMERIC NOT NULL DEFAULT 0,
  total_missed_days INTEGER NOT NULL DEFAULT 0,
  status subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own subscriptions" ON public.ad_user_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON public.ad_user_subscriptions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all subscriptions" ON public.ad_user_subscriptions 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can update subscriptions" ON public.ad_user_subscriptions 
  FOR UPDATE USING (true);

-- Now create BSK ledgers
CREATE TABLE public.bsk_holding_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ad_id UUID REFERENCES public.ads(id),
  date_key DATE NOT NULL,
  bsk_amount NUMERIC NOT NULL DEFAULT 0,
  inr_snapshot NUMERIC NOT NULL DEFAULT 0,
  rate_snapshot NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'settled',
  type TEXT NOT NULL DEFAULT 'ad_free_view',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bsk_holding_ledger ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own holding ledger" ON public.bsk_holding_ledger 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all holding ledger" ON public.bsk_holding_ledger 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create holding ledger entries" ON public.bsk_holding_ledger 
  FOR INSERT WITH CHECK (true);

-- Create BSK withdrawable ledger (now with valid reference)
CREATE TABLE public.bsk_withdrawable_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.ad_user_subscriptions(id),
  ad_id UUID REFERENCES public.ads(id),
  day_index INTEGER NOT NULL,
  bsk_amount NUMERIC NOT NULL DEFAULT 0,
  inr_snapshot NUMERIC NOT NULL DEFAULT 0,
  rate_snapshot NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT NOT NULL DEFAULT 'ad_subscription_daily',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bsk_withdrawable_ledger ENABLE ROW LEVEL SECURITY;

-- Create policies  
CREATE POLICY "Users can view own withdrawable ledger" ON public.bsk_withdrawable_ledger 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all withdrawable ledger" ON public.bsk_withdrawable_ledger 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create withdrawable ledger entries" ON public.bsk_withdrawable_ledger 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update withdrawable ledger entries" ON public.bsk_withdrawable_ledger 
  FOR UPDATE USING (true);

-- Create BSK balances table
CREATE TABLE public.user_bsk_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  withdrawable_balance NUMERIC NOT NULL DEFAULT 0,
  holding_balance NUMERIC NOT NULL DEFAULT 0,
  total_earned_withdrawable NUMERIC NOT NULL DEFAULT 0,
  total_earned_holding NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bsk_balances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own BSK balances" ON public.user_bsk_balances 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own BSK balances" ON public.user_bsk_balances 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all BSK balances" ON public.user_bsk_balances 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage BSK balances" ON public.user_bsk_balances 
  FOR ALL USING (true);

-- Create daily ad views tracking table
CREATE TABLE public.user_daily_ad_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date_key DATE NOT NULL,
  free_views_used INTEGER NOT NULL DEFAULT 0,
  subscription_views_used INTEGER NOT NULL DEFAULT 0,
  total_bsk_earned NUMERIC NOT NULL DEFAULT 0,
  last_view_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date_key)
);

-- Enable RLS
ALTER TABLE public.user_daily_ad_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own daily views" ON public.user_daily_ad_views 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage daily views" ON public.user_daily_ad_views 
  FOR ALL USING (true);

-- Update ads table with additional fields for the new system
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS required_view_time_seconds INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS region_targeting JSONB DEFAULT '{"allowed": ["global"]}',
ADD COLUMN IF NOT EXISTS content_category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS daily_impression_limit INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS verification_required BOOLEAN NOT NULL DEFAULT true;

-- Create ad rate snapshots table
CREATE TABLE public.bsk_rate_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate NUMERIC NOT NULL,
  previous_rate NUMERIC,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bsk_rate_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage rate snapshots" ON public.bsk_rate_snapshots 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view rate snapshots" ON public.bsk_rate_snapshots 
  FOR SELECT USING (true);

-- Insert default settings
INSERT INTO public.ad_mining_settings (id) 
VALUES (gen_random_uuid());

-- Insert default subscription tiers
INSERT INTO public.ad_subscription_tiers (tier_inr, daily_bsk) VALUES
(100, 1), (200, 2), (300, 3), (400, 4), (500, 5),
(600, 6), (700, 7), (800, 8), (900, 9), (1000, 10);

-- Insert initial BSK rate snapshot
INSERT INTO public.bsk_rate_snapshots (rate, reason) 
VALUES (1.0, 'Initial system setup');

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION public.update_ad_mining_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ad_mining_settings_updated_at
  BEFORE UPDATE ON public.ad_mining_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_mining_updated_at();

CREATE TRIGGER update_ad_subscription_tiers_updated_at
  BEFORE UPDATE ON public.ad_subscription_tiers  
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_mining_updated_at();

CREATE TRIGGER update_ad_user_subscriptions_updated_at
  BEFORE UPDATE ON public.ad_user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_mining_updated_at();

CREATE TRIGGER update_user_bsk_balances_updated_at
  BEFORE UPDATE ON public.user_bsk_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_mining_updated_at();

CREATE TRIGGER update_user_daily_ad_views_updated_at
  BEFORE UPDATE ON public.user_daily_ad_views
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_mining_updated_at();

-- Create indexes for performance
CREATE INDEX idx_bsk_holding_ledger_user_date ON public.bsk_holding_ledger(user_id, date_key);
CREATE INDEX idx_bsk_withdrawable_ledger_user_subscription ON public.bsk_withdrawable_ledger(user_id, subscription_id);
CREATE INDEX idx_ad_user_subscriptions_user_status ON public.ad_user_subscriptions(user_id, status);
CREATE INDEX idx_user_daily_ad_views_user_date ON public.user_daily_ad_views(user_id, date_key);
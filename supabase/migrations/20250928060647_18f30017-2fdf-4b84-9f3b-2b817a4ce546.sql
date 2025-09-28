-- Create comprehensive Team & Referral program schema

-- Team referral settings table
CREATE TABLE IF NOT EXISTS public.team_referral_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_event TEXT NOT NULL DEFAULT 'badge_purchase_or_upgrade' CHECK (trigger_event IN ('signup_verified', 'first_deposit', 'badge_purchase_or_upgrade')),
  spillover_to_next_eligible_upline BOOLEAN NOT NULL DEFAULT false,
  direct_referral_percent NUMERIC NOT NULL DEFAULT 10.0,
  cooloff_hours INTEGER NOT NULL DEFAULT 24,
  bsk_inr_rate NUMERIC NOT NULL DEFAULT 1.0,
  region_enabled JSONB NOT NULL DEFAULT '{"IN": true}',
  daily_cap_per_earner NUMERIC DEFAULT NULL,
  weekly_cap_per_earner NUMERIC DEFAULT NULL,
  per_downline_event_cap NUMERIC DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team income level rewards configuration
CREATE TABLE IF NOT EXISTS public.team_income_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL,
  bsk_reward NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(level)
);

-- Badge thresholds and unlock levels
CREATE TABLE IF NOT EXISTS public.badge_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_name TEXT NOT NULL,
  inr_threshold NUMERIC NOT NULL,
  unlock_levels INTEGER NOT NULL,
  vip_bonus_inr NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(badge_name)
);

-- VIP milestone configuration
CREATE TABLE IF NOT EXISTS public.vip_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_count_threshold INTEGER NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bsk', 'physical')),
  reward_inr_value NUMERIC NOT NULL,
  reward_description TEXT,
  physical_reward_sku TEXT,
  requires_kyc BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vip_count_threshold)
);

-- User VIP milestone progress tracking
CREATE TABLE IF NOT EXISTS public.user_vip_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  direct_vip_count INTEGER NOT NULL DEFAULT 0,
  last_vip_referral_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- VIP milestone claims
CREATE TABLE IF NOT EXISTS public.vip_milestone_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  milestone_id UUID NOT NULL REFERENCES public.vip_milestones(id),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'completed', 'rejected')),
  fulfillment_notes TEXT,
  kyc_verified BOOLEAN DEFAULT false,
  shipping_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_id)
);

-- Enhanced referral ledger with all subtypes
CREATE TABLE IF NOT EXISTS public.referral_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- earner
  source_user_id UUID, -- downline who triggered the event
  referrer_id UUID, -- direct referrer (for direct_badge_bonus)
  ledger_type TEXT NOT NULL CHECK (ledger_type IN ('team_income', 'direct_badge_bonus', 'vip_milestone_bonus', 'vip_self_bonus')),
  depth INTEGER, -- level depth (1-50)
  badge_at_event TEXT, -- badge of source user at time of event
  trigger_type TEXT, -- signup_verified, first_deposit, badge_purchase_or_upgrade
  inr_amount_snapshot NUMERIC NOT NULL,
  bsk_rate_snapshot NUMERIC NOT NULL,
  bsk_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'void', 'clawed_back')),
  tx_refs JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ
);

-- Badge purchase tracking
CREATE TABLE IF NOT EXISTS public.badge_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_name TEXT NOT NULL,
  previous_badge TEXT,
  inr_amount NUMERIC NOT NULL,
  bsk_amount NUMERIC NOT NULL,
  bsk_rate_at_purchase NUMERIC NOT NULL,
  is_upgrade BOOLEAN NOT NULL DEFAULT false,
  payment_method TEXT DEFAULT 'bsk_purchase',
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default team income levels (1-50)
INSERT INTO public.team_income_levels (level, bsk_reward) VALUES
  (1, 5.0),   -- Level 1 (direct): 5 BSK
  (2, 0.5), (3, 0.5), (4, 0.5), (5, 0.5), (6, 0.5), (7, 0.5), (8, 0.5), (9, 0.5), (10, 0.5),  -- Levels 2-10: 0.5 BSK each
  (11, 0.4), (12, 0.4), (13, 0.4), (14, 0.4), (15, 0.4), (16, 0.4), (17, 0.4), (18, 0.4), (19, 0.4), (20, 0.4),  -- Levels 11-20: 0.4 BSK each
  (21, 0.33), (22, 0.33), (23, 0.33), (24, 0.33), (25, 0.33), (26, 0.33), (27, 0.33), (28, 0.33), (29, 0.33), (30, 0.33),  -- Levels 21-30: 0.33 BSK each
  (31, 0.2), (32, 0.2), (33, 0.2), (34, 0.2), (35, 0.2), (36, 0.2), (37, 0.2), (38, 0.2), (39, 0.2), (40, 0.2),  -- Levels 31-40: 0.2 BSK each
  (41, 0.1), (42, 0.1), (43, 0.1), (44, 0.1), (45, 0.1), (46, 0.1), (47, 0.1), (48, 0.1), (49, 0.1), (50, 0.1)   -- Levels 41-50: 0.1 BSK each
ON CONFLICT (level) DO NOTHING;

-- Insert default badge thresholds
INSERT INTO public.badge_thresholds (badge_name, inr_threshold, unlock_levels, vip_bonus_inr) VALUES
  ('Silver', 1000, 10, 0),
  ('Gold', 2000, 20, 0),
  ('Platinum', 3000, 30, 0),
  ('Diamond', 4000, 40, 0),
  ('VIP i-SMART', 5000, 50, 10000)
ON CONFLICT (badge_name) DO NOTHING;

-- Insert default VIP milestones
INSERT INTO public.vip_milestones (vip_count_threshold, reward_type, reward_inr_value, reward_description) VALUES
  (10, 'bsk', 10000, '₹10,000 worth of BSK'),
  (50, 'bsk', 50000, '₹50,000 worth of BSK'),
  (100, 'physical', 100000, '₹100,000 worth of BSK OR equivalent Gold value'),
  (250, 'physical', 200000, '₹200,000 worth of BSK OR a Bike'),
  (500, 'physical', 500000, '₹500,000 worth of BSK OR a Car')
ON CONFLICT (vip_count_threshold) DO NOTHING;

-- Insert default team referral settings
INSERT INTO public.team_referral_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.team_referral_settings);

-- Enable RLS on all new tables
ALTER TABLE public.team_referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_income_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vip_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_milestone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_referral_settings
CREATE POLICY "Admin can manage team referral settings" ON public.team_referral_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view team referral settings" ON public.team_referral_settings
  FOR SELECT USING (true);

-- RLS Policies for team_income_levels
CREATE POLICY "Admin can manage team income levels" ON public.team_income_levels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active team income levels" ON public.team_income_levels
  FOR SELECT USING (is_active = true);

-- RLS Policies for badge_thresholds
CREATE POLICY "Admin can manage badge thresholds" ON public.badge_thresholds
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active badge thresholds" ON public.badge_thresholds
  FOR SELECT USING (is_active = true);

-- RLS Policies for vip_milestones
CREATE POLICY "Admin can manage VIP milestones" ON public.vip_milestones
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active VIP milestones" ON public.vip_milestones
  FOR SELECT USING (is_active = true);

-- RLS Policies for user_vip_milestones
CREATE POLICY "Users can view own VIP milestone progress" ON public.user_vip_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage VIP milestone progress" ON public.user_vip_milestones
  FOR ALL USING (true);

-- RLS Policies for vip_milestone_claims
CREATE POLICY "Users can view own VIP milestone claims" ON public.vip_milestone_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own VIP milestone claims" ON public.vip_milestone_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all VIP milestone claims" ON public.vip_milestone_claims
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_ledger
CREATE POLICY "Users can view own referral ledger entries" ON public.referral_ledger
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = source_user_id);

CREATE POLICY "System can create referral ledger entries" ON public.referral_ledger
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage all referral ledger entries" ON public.referral_ledger
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for badge_purchases
CREATE POLICY "Users can view own badge purchases" ON public.badge_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own badge purchases" ON public.badge_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all badge purchases" ON public.badge_purchases
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_ledger_user_id ON public.referral_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_source_user_id ON public.referral_ledger(source_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_type_status ON public.referral_ledger(ledger_type, status);
CREATE INDEX IF NOT EXISTS idx_referral_ledger_created_at ON public.referral_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_badge_purchases_user_id ON public.badge_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_purchases_created_at ON public.badge_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_user_vip_milestones_user_id ON public.user_vip_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_milestone_claims_user_id ON public.vip_milestone_claims(user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_team_referral_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_referral_settings_updated_at
  BEFORE UPDATE ON public.team_referral_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_team_referral_settings_updated_at();

CREATE TRIGGER update_team_income_levels_updated_at
  BEFORE UPDATE ON public.team_income_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_badge_thresholds_updated_at
  BEFORE UPDATE ON public.badge_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vip_milestones_updated_at
  BEFORE UPDATE ON public.vip_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_vip_milestones_updated_at
  BEFORE UPDATE ON public.user_vip_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vip_milestone_claims_updated_at
  BEFORE UPDATE ON public.vip_milestone_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_badge_purchases_updated_at
  BEFORE UPDATE ON public.badge_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
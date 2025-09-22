-- Create foundational tables for IPG iSmart Exchange

-- User profiles with tier system
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  wallet_address TEXT,
  tier_id UUID,
  kyc_status TEXT DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT false,
  pin_hash TEXT,
  biometric_enabled BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Badge tiers system
CREATE TABLE IF NOT EXISTS public.tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  deposit_ipg NUMERIC NOT NULL,
  max_ref_depth INTEGER NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'star',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Referral relationships
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Referral rewards configuration (50 levels)
CREATE TABLE IF NOT EXISTS public.referral_rewards_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE CHECK (level >= 1 AND level <= 50),
  reward_bsk NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Token bucket types
CREATE TYPE public.token_bucket AS ENUM ('holding', 'tradable');

-- Unified bonus ledger
CREATE TABLE IF NOT EXISTS public.bonus_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT 'BSK',
  amount NUMERIC NOT NULL,
  bucket public.token_bucket NOT NULL DEFAULT 'holding',
  source TEXT NOT NULL, -- 'referral', 'ad_mining', 'spin_wheel', 'lucky_draw', etc.
  tx_ref TEXT,
  meta JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ads system
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  free_daily_bsk NUMERIC DEFAULT 1,
  paid_plan_id UUID,
  dwell_time_seconds INTEGER DEFAULT 5,
  cooldown_seconds INTEGER DEFAULT 86400, -- 24 hours
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ad views tracking
CREATE TABLE IF NOT EXISTS public.ad_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  reward_bsk NUMERIC DEFAULT 0,
  view_duration_seconds INTEGER,
  ip_address INET,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Paid ad plans
CREATE TABLE IF NOT EXISTS public.paid_ad_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  daily_bsk_reward NUMERIC NOT NULL,
  max_daily_views INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User subscriptions to paid plans
CREATE TABLE IF NOT EXISTS public.user_ad_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.paid_ad_plans(id) ON DELETE CASCADE,
  daily_views_used INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Spin wheel configuration
CREATE TABLE IF NOT EXISTS public.spin_wheel_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_min_usd NUMERIC DEFAULT 1,
  bet_max_usd NUMERIC DEFAULT 100,
  win_reward_bsk NUMERIC DEFAULT 5,
  lose_penalty_bsk NUMERIC DEFAULT 5,
  admin_fee_percent NUMERIC DEFAULT 5,
  cooldown_seconds INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Spin plays tracking
CREATE TYPE public.spin_outcome AS ENUM ('WIN', 'LOSE');

CREATE TABLE IF NOT EXISTS public.spin_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_usd NUMERIC NOT NULL,
  outcome public.spin_outcome NOT NULL,
  delta_bsk NUMERIC NOT NULL, -- positive for win, negative for lose
  admin_fee_usd NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User spin limits (track free spins)
CREATE TABLE IF NOT EXISTS public.user_spin_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  free_spins_used INTEGER DEFAULT 0,
  lifetime_free_spins INTEGER DEFAULT 5,
  last_spin_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lucky draw status
CREATE TYPE public.draw_status AS ENUM ('OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- Lucky draws
CREATE TABLE IF NOT EXISTS public.lucky_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ticket_price_ipg NUMERIC NOT NULL,
  max_participants INTEGER NOT NULL,
  prize_1st_bsk NUMERIC NOT NULL,
  prize_2nd_bsk NUMERIC DEFAULT 0,
  prize_3rd_bsk NUMERIC DEFAULT 0,
  admin_fee_percent NUMERIC DEFAULT 10,
  status public.draw_status DEFAULT 'OPEN',
  draw_date TIMESTAMP WITH TIME ZONE,
  winners JSONB DEFAULT '{}', -- {first: user_id, second: user_id, third: user_id}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lucky draw tickets
CREATE TABLE IF NOT EXISTS public.lucky_draw_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_id UUID NOT NULL REFERENCES public.lucky_draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ipg_spent NUMERIC NOT NULL,
  ticket_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insurance types
CREATE TYPE public.insurance_type AS ENUM ('ACCIDENT', 'TRADING');
CREATE TYPE public.policy_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE public.claim_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Insurance policies
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type public.insurance_type NOT NULL,
  premium_usd NUMERIC NOT NULL,
  coverage_amount NUMERIC NOT NULL,
  coverage_rules JSONB DEFAULT '{}',
  status public.policy_status DEFAULT 'ACTIVE',
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_type public.insurance_type NOT NULL,
  claim_amount_usd NUMERIC NOT NULL,
  evidence_url TEXT,
  admin_notes TEXT,
  status public.claim_status DEFAULT 'PENDING',
  payout_bsk NUMERIC DEFAULT 0,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vesting offers (BSK purchase campaigns)
CREATE TABLE IF NOT EXISTS public.vesting_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  vesting_days INTEGER DEFAULT 100,
  daily_unlock_percent NUMERIC DEFAULT 1.0, -- 1% daily
  referrer_daily_percent NUMERIC DEFAULT 0.5, -- 0.5% to referrer
  start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual vesting schedules
CREATE TABLE IF NOT EXISTS public.vesting_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.vesting_offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES auth.users(id),
  total_bsk NUMERIC NOT NULL,
  unlocked_bsk NUMERIC DEFAULT 0,
  remaining_bsk NUMERIC NOT NULL,
  last_unlock_date DATE,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Promotion types
CREATE TYPE public.promotion_type AS ENUM ('INR_BONUS', 'DEPOSIT_BONUS', 'TRADING_BONUS');

-- Promotional offers
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  promo_type public.promotion_type NOT NULL,
  min_amount NUMERIC DEFAULT 0,
  bonus_bsk NUMERIC NOT NULL,
  max_uses_per_user INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Promotion usage tracking
CREATE TABLE IF NOT EXISTS public.promotion_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_spent NUMERIC,
  bonus_awarded NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fee collection ledger (admin revenue tracking)
CREATE TABLE IF NOT EXISTS public.admin_fee_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_type TEXT NOT NULL, -- 'spin_wheel', 'lucky_draw', 'insurance_premium', 'trading_fee', etc.
  amount_usd NUMERIC NOT NULL,
  token TEXT DEFAULT 'USD',
  from_user_id UUID REFERENCES auth.users(id),
  admin_wallet TEXT,
  tx_reference TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Announcement types
CREATE TYPE public.announcement_type AS ENUM ('carousel', 'ticker');

-- Announcements system
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_type public.announcement_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  cta_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 1,
  start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default tiers
INSERT INTO public.tiers (name, deposit_ipg, max_ref_depth, color, icon) VALUES
('Silver', 10, 10, '#C0C0C0', 'award'),
('Gold', 20, 20, '#FFD700', 'medal'),
('Platinum', 30, 30, '#E5E4E2', 'crown'),
('Diamond', 40, 40, '#B9F2FF', 'gem'),
('i-Smart VIP', 50, 50, '#9D4EDD', 'star')
ON CONFLICT DO NOTHING;

-- Insert default referral rewards config (50 levels with diminishing rewards)
INSERT INTO public.referral_rewards_config (level, reward_bsk, is_active)
SELECT 
  level,
  CASE 
    WHEN level = 1 THEN 5.0
    WHEN level <= 5 THEN 2.0
    WHEN level <= 10 THEN 1.0
    WHEN level <= 20 THEN 0.5
    WHEN level <= 30 THEN 0.25
    WHEN level <= 40 THEN 0.1
    ELSE 0.05
  END as reward_bsk,
  true as is_active
FROM generate_series(1, 50) as level
ON CONFLICT (level) DO NOTHING;

-- Insert default spin wheel config
INSERT INTO public.spin_wheel_config (bet_min_usd, bet_max_usd, win_reward_bsk, lose_penalty_bsk, admin_fee_percent)
VALUES (1, 100, 5, 5, 5)
ON CONFLICT DO NOTHING;

-- Insert default vesting offer
INSERT INTO public.vesting_offers (name, is_active, vesting_days, daily_unlock_percent, referrer_daily_percent)
VALUES ('BSK 100-Day Vesting', true, 100, 1.0, 0.5)
ON CONFLICT DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_ad_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ad_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_wheel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_spin_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_draw_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vesting_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vesting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_fee_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all profiles" ON public.user_profiles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tiers
CREATE POLICY "Everyone can view active tiers" ON public.tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage tiers" ON public.tiers
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Referrals
CREATE POLICY "Users can view own referral tree" ON public.referrals
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = parent_id);

CREATE POLICY "System can create referrals" ON public.referrals
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage referrals" ON public.referrals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Referral rewards config
CREATE POLICY "Everyone can view referral config" ON public.referral_rewards_config
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage referral config" ON public.referral_rewards_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Bonus ledger
CREATE POLICY "Users can view own bonus ledger" ON public.bonus_ledger
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create bonus entries" ON public.bonus_ledger
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view all bonus ledger" ON public.bonus_ledger
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Continue with other RLS policies...
CREATE POLICY "Everyone can view active ads" ON public.ads
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage ads" ON public.ads
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON public.referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_parent_id ON public.referrals(parent_id);
CREATE INDEX IF NOT EXISTS idx_bonus_ledger_user_id ON public.bonus_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_ledger_created_at ON public.bonus_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_views_user_id ON public.ad_views(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_plays_user_id ON public.spin_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_vesting_schedules_user_id ON public.vesting_schedules(user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tiers_updated_at BEFORE UPDATE ON public.tiers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER referral_rewards_config_updated_at BEFORE UPDATE ON public.referral_rewards_config
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
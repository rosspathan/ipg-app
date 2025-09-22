-- Create foundational types and tables for IPG iSmart Exchange (Phase 1)

-- Create custom types
CREATE TYPE public.token_bucket AS ENUM ('holding', 'tradable');
CREATE TYPE public.spin_outcome AS ENUM ('WIN', 'LOSE');
CREATE TYPE public.draw_status AS ENUM ('OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.insurance_type AS ENUM ('ACCIDENT', 'TRADING');
CREATE TYPE public.policy_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE public.claim_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.promotion_type AS ENUM ('INR_BONUS', 'DEPOSIT_BONUS', 'TRADING_BONUS');
CREATE TYPE public.announcement_type AS ENUM ('carousel', 'ticker');

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

-- Unified bonus ledger
CREATE TABLE IF NOT EXISTS public.bonus_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT 'BSK',
  amount NUMERIC NOT NULL,
  bucket public.token_bucket NOT NULL DEFAULT 'holding',
  source TEXT NOT NULL,
  tx_ref TEXT,
  meta JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_ledger ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all profiles" ON public.user_profiles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active tiers" ON public.tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage tiers" ON public.tiers
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own referral tree" ON public.referrals
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = parent_id);

CREATE POLICY "System can create referrals" ON public.referrals
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage referrals" ON public.referrals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view referral config" ON public.referral_rewards_config
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage referral config" ON public.referral_rewards_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own bonus ledger" ON public.bonus_ledger
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create bonus entries" ON public.bonus_ledger
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view all bonus ledger" ON public.bonus_ledger
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default tiers
INSERT INTO public.tiers (name, deposit_ipg, max_ref_depth, color, icon) VALUES
('Silver', 10, 10, '#C0C0C0', 'award'),
('Gold', 20, 20, '#FFD700', 'medal'),
('Platinum', 30, 30, '#E5E4E2', 'crown'),
('Diamond', 40, 40, '#B9F2FF', 'gem'),
('i-Smart VIP', 50, 50, '#9D4EDD', 'star')
ON CONFLICT DO NOTHING;

-- Insert default referral rewards config (50 levels)
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
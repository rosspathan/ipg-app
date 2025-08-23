-- A) USER MANAGEMENT TABLES
-- Update existing profiles table to match requirements
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS account_frozen boolean DEFAULT false;

-- Create KYC profiles table
CREATE TABLE IF NOT EXISTS public.kyc_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text CHECK (status IN ('unverified','pending','verified','rejected')) DEFAULT 'unverified',
  notes text,
  updated_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- Create security table
CREATE TABLE IF NOT EXISTS public.security (
  user_id uuid NOT NULL PRIMARY KEY,
  has_2fa boolean DEFAULT false,
  withdrawal_locked boolean DEFAULT false,
  role text CHECK (role IN ('user','admin')) DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- Create admin audit table
CREATE TABLE IF NOT EXISTS public.admin_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- C) SUBSCRIPTIONS TABLES
CREATE TABLE IF NOT EXISTS public.subscriptions_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL,
  currency text DEFAULT 'USDT',
  duration_days integer NOT NULL,
  perks jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions_user (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  status text CHECK (status IN ('active','expired','canceled')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES public.subscriptions_plans(id) ON DELETE CASCADE,
  UNIQUE(user_id, plan_id, started_at)
);

-- D) REFERRALS TABLES
CREATE TABLE IF NOT EXISTS public.referrals_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  levels integer CHECK (levels BETWEEN 1 AND 5) DEFAULT 3,
  l1_percent numeric DEFAULT 0,
  l2_percent numeric DEFAULT 0,
  l3_percent numeric DEFAULT 0,
  l4_percent numeric DEFAULT 0,
  l5_percent numeric DEFAULT 0,
  cap_usd numeric DEFAULT 0,
  vip_multiplier numeric DEFAULT 1,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- E) STAKING TABLES (extend existing)
ALTER TABLE public.staking_pools 
ADD COLUMN IF NOT EXISTS fee_percent numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.staking_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pool_id uuid NOT NULL,
  amount numeric NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  unlock_at timestamp with time zone NOT NULL,
  status text CHECK (status IN ('active','unstaked','penalized')) DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (pool_id) REFERENCES public.staking_pools(id) ON DELETE CASCADE
);

-- F) LUCKY DRAW TABLES
CREATE TABLE IF NOT EXISTS public.lucky_draw_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  ticket_price numeric NOT NULL,
  prize_pool numeric NOT NULL,
  winners integer DEFAULT 1,
  schedule text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lucky_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text CHECK (status IN ('pending','won','lost')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES public.lucky_draw_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.lucky_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL,
  draw_at timestamp with time zone DEFAULT now(),
  winners jsonb DEFAULT '[]',
  FOREIGN KEY (plan_id) REFERENCES public.lucky_draw_plans(id) ON DELETE CASCADE
);

-- H) ADS TABLE
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement text CHECK (placement IN ('home_top','home_tile','markets_top')) NOT NULL,
  title text NOT NULL,
  image_url text,
  link_url text,
  starts_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- I) FEES CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.fees_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trading_maker numeric DEFAULT 0.001,
  trading_taker numeric DEFAULT 0.001,
  deposit_percent numeric DEFAULT 0,
  withdraw_percent numeric DEFAULT 0,
  transfer_percent numeric DEFAULT 0,
  staking_fee numeric DEFAULT 0,
  admin_revenue_wallet text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_draw_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees_config ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- KYC Profiles
CREATE POLICY "Admin can manage kyc_profiles" ON public.kyc_profiles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own kyc_profiles" ON public.kyc_profiles FOR SELECT USING (user_id = auth.uid());

-- Security
CREATE POLICY "Admin can manage security" ON public.security FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own security" ON public.security FOR SELECT USING (user_id = auth.uid());

-- Admin Audit
CREATE POLICY "Admin can view admin_audit" ON public.admin_audit FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert admin_audit" ON public.admin_audit FOR INSERT WITH CHECK (true);

-- Subscriptions Plans
CREATE POLICY "Admin can manage subscriptions_plans" ON public.subscriptions_plans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active subscriptions_plans" ON public.subscriptions_plans FOR SELECT USING (is_active = true);

-- Subscriptions User
CREATE POLICY "Admin can manage subscriptions_user" ON public.subscriptions_user FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage own subscriptions_user" ON public.subscriptions_user FOR ALL USING (user_id = auth.uid());

-- Referrals Config
CREATE POLICY "Admin can manage referrals_config" ON public.referrals_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view referrals_config" ON public.referrals_config FOR SELECT USING (true);

-- Referrals Links
CREATE POLICY "Admin can manage referrals_links" ON public.referrals_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage own referrals_links" ON public.referrals_links FOR ALL USING (user_id = auth.uid());

-- Staking Positions
CREATE POLICY "Admin can manage staking_positions" ON public.staking_positions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage own staking_positions" ON public.staking_positions FOR ALL USING (user_id = auth.uid());

-- Lucky Draw Plans
CREATE POLICY "Admin can manage lucky_draw_plans" ON public.lucky_draw_plans FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active lucky_draw_plans" ON public.lucky_draw_plans FOR SELECT USING (is_active = true);

-- Lucky Tickets
CREATE POLICY "Admin can manage lucky_tickets" ON public.lucky_tickets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can manage own lucky_tickets" ON public.lucky_tickets FOR ALL USING (user_id = auth.uid());

-- Lucky Results
CREATE POLICY "Admin can manage lucky_results" ON public.lucky_results FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view lucky_results" ON public.lucky_results FOR SELECT USING (true);

-- Ads
CREATE POLICY "Admin can manage ads" ON public.ads FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active ads" ON public.ads FOR SELECT USING (is_active = true AND now() BETWEEN starts_at AND COALESCE(ends_at, 'infinity'));

-- Fees Config
CREATE POLICY "Admin can manage fees_config" ON public.fees_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view fees_config" ON public.fees_config FOR SELECT USING (true);

-- Insert default referrals config
INSERT INTO public.referrals_config (levels, l1_percent, l2_percent, l3_percent) 
VALUES (3, 0.05, 0.03, 0.01) 
ON CONFLICT DO NOTHING;

-- Insert default fees config
INSERT INTO public.fees_config (trading_maker, trading_taker, deposit_percent, withdraw_percent, transfer_percent, staking_fee)
VALUES (0.001, 0.001, 0, 0.002, 0.001, 0.05)
ON CONFLICT DO NOTHING;

-- Enable realtime for all relevant tables
ALTER TABLE public.markets REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions_plans REPLICA IDENTITY FULL;
ALTER TABLE public.referrals_config REPLICA IDENTITY FULL;
ALTER TABLE public.staking_pools REPLICA IDENTITY FULL;
ALTER TABLE public.lucky_draw_plans REPLICA IDENTITY FULL;
ALTER TABLE public.insurance_plans REPLICA IDENTITY FULL;
ALTER TABLE public.ads REPLICA IDENTITY FULL;
ALTER TABLE public.fees_config REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.markets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staking_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lucky_draw_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fees_config;
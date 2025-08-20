-- Create user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'support', 'compliance', 'finance', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Audit log for all admin actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'frozen', 'suspended')),
  two_fa_enabled BOOLEAN DEFAULT false,
  withdrawal_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Assets management
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contract_address TEXT,
  decimals INTEGER DEFAULT 18,
  logo_url TEXT,
  network TEXT DEFAULT 'BEP20',
  deposit_enabled BOOLEAN DEFAULT true,
  withdraw_enabled BOOLEAN DEFAULT true,
  trading_enabled BOOLEAN DEFAULT true,
  min_trade_amount DECIMAL(20,8) DEFAULT 0,
  min_withdraw_amount DECIMAL(20,8) DEFAULT 0,
  max_withdraw_amount DECIMAL(20,8) DEFAULT 999999999,
  withdraw_fee DECIMAL(20,8) DEFAULT 0,
  risk_label TEXT DEFAULT 'low' CHECK (risk_label IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trading pairs
CREATE TABLE public.trading_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_asset_id UUID REFERENCES public.assets(id),
  quote_asset_id UUID REFERENCES public.assets(id),
  symbol TEXT NOT NULL UNIQUE,
  tick_size DECIMAL(20,8) DEFAULT 0.01,
  lot_size DECIMAL(20,8) DEFAULT 0.001,
  min_price DECIMAL(20,8) DEFAULT 0,
  max_price DECIMAL(20,8) DEFAULT 999999999,
  maker_fee DECIMAL(5,4) DEFAULT 0.001,
  taker_fee DECIMAL(5,4) DEFAULT 0.001,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fee configurations
CREATE TABLE public.fee_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('trading', 'deposit', 'withdrawal', 'transfer', 'staking', 'insurance')),
  asset_id UUID REFERENCES public.assets(id),
  pair_id UUID REFERENCES public.trading_pairs(id),
  user_tier TEXT DEFAULT 'standard' CHECK (user_tier IN ('standard', 'vip')),
  fee_percentage DECIMAL(5,4),
  fixed_fee DECIMAL(20,8),
  active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insurance plans
CREATE TABLE public.insurance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wallet_protection', 'trade_insurance', 'staking_protection')),
  premium DECIMAL(20,8) NOT NULL,
  coverage_amount DECIMAL(20,8) NOT NULL,
  coverage_scope TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  exclusions TEXT[],
  max_claims INTEGER DEFAULT 1,
  waiting_period_hours INTEGER DEFAULT 24,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insurance policies (user purchases)
CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.insurance_plans(id),
  premium_paid DECIMAL(20,8) NOT NULL,
  coverage_amount DECIMAL(20,8) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insurance claims
CREATE TABLE public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.insurance_policies(id),
  user_id UUID NOT NULL,
  claim_amount DECIMAL(20,8) NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  attachments TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payout_amount DECIMAL(20,8),
  payout_asset TEXT,
  reference_id TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staking pools
CREATE TABLE public.staking_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id),
  name TEXT NOT NULL,
  apy DECIMAL(5,2) NOT NULL,
  lock_period_days INTEGER NOT NULL,
  capacity DECIMAL(20,8),
  current_staked DECIMAL(20,8) DEFAULT 0,
  early_exit_penalty DECIMAL(5,2) DEFAULT 0,
  platform_fee DECIMAL(5,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lucky draw configurations
CREATE TABLE public.lucky_draw_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_price DECIMAL(20,8) NOT NULL,
  prize_pool DECIMAL(20,8) NOT NULL,
  draw_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_winners INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Advertisement banners
CREATE TABLE public.ads_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  placement TEXT NOT NULL CHECK (placement IN ('home_carousel', 'sidebar', 'popup')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'vip', 'new_users')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fiat withdrawal requests
CREATE TABLE public.fiat_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  currency TEXT NOT NULL,
  bank_details JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  reference_id TEXT,
  proof_url TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staking_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lucky_draw_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiat_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
CREATE POLICY "Admin can view all user_roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage user_roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view audit_logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage assets" ON public.assets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view assets" ON public.assets FOR SELECT USING (true);

CREATE POLICY "Admin can manage trading_pairs" ON public.trading_pairs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view trading_pairs" ON public.trading_pairs FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage fee_configs" ON public.fee_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view fee_configs" ON public.fee_configs FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage insurance_plans" ON public.insurance_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view active insurance_plans" ON public.insurance_plans FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage insurance_policies" ON public.insurance_policies FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own policies" ON public.insurance_policies FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage insurance_claims" ON public.insurance_claims FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage own claims" ON public.insurance_claims FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage staking_pools" ON public.staking_pools FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view active staking_pools" ON public.staking_pools FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage lucky_draw_configs" ON public.lucky_draw_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view lucky_draw_configs" ON public.lucky_draw_configs FOR SELECT USING (true);

CREATE POLICY "Admin can manage ads_banners" ON public.ads_banners FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view active ads" ON public.ads_banners FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage fiat_withdrawals" ON public.fiat_withdrawals FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own withdrawals" ON public.fiat_withdrawals FOR SELECT USING (auth.uid() = user_id);

-- Insert default assets
INSERT INTO public.assets (symbol, name, contract_address, decimals, logo_url, network) VALUES
('BTC', 'Bitcoin', NULL, 8, '/assets/btc.png', 'Bitcoin'),
('ETH', 'Ethereum', NULL, 18, '/assets/eth.png', 'Ethereum'),
('USDT', 'Tether USD', '0x55d398326f99059fF775485246999027B3197955', 18, '/assets/usdt.png', 'BEP20'),
('BNB', 'Binance Coin', NULL, 18, '/assets/bnb.png', 'BEP20');

-- Insert default trading pairs
INSERT INTO public.trading_pairs (base_asset_id, quote_asset_id, symbol, tick_size, lot_size)
SELECT b.id, q.id, b.symbol || '/' || q.symbol, 0.01, 0.001
FROM public.assets b, public.assets q
WHERE (b.symbol = 'BTC' AND q.symbol = 'USDT')
   OR (b.symbol = 'ETH' AND q.symbol = 'USDT')
   OR (b.symbol = 'BNB' AND q.symbol = 'USDT');

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_old_values, p_new_values);
END;
$$;
-- Check if tables exist and create only missing ones
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      role app_role NOT NULL DEFAULT 'user',
      assigned_by UUID,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(user_id, role)
    );
  END IF;
END $$;

-- Create or replace the security definer function
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

-- Create missing tables
CREATE TABLE IF NOT EXISTS public.audit_logs (
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

CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE TABLE IF NOT EXISTS public.assets (
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

CREATE TABLE IF NOT EXISTS public.trading_pairs (
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

CREATE TABLE IF NOT EXISTS public.fee_configs (
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

CREATE TABLE IF NOT EXISTS public.fiat_withdrawals (
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

-- Enable RLS on new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiat_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Admin can view all user_roles') THEN
    CREATE POLICY "Admin can view all user_roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Admin can manage user_roles') THEN
    CREATE POLICY "Admin can manage user_roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Admin can view audit_logs') THEN
    CREATE POLICY "Admin can view audit_logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'System can insert audit_logs') THEN
    CREATE POLICY "System can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Admin can manage profiles') THEN
    CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Admin can manage assets') THEN
    CREATE POLICY "Admin can manage assets" ON public.assets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Users can view assets') THEN
    CREATE POLICY "Users can view assets" ON public.assets FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Admin can manage fiat_withdrawals') THEN
    CREATE POLICY "Admin can manage fiat_withdrawals" ON public.fiat_withdrawals FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Insert sample data if not exists
INSERT INTO public.assets (symbol, name, contract_address, decimals, logo_url, network) 
SELECT 'BTC', 'Bitcoin', NULL, 8, '/assets/btc.png', 'Bitcoin'
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'BTC');

INSERT INTO public.assets (symbol, name, contract_address, decimals, logo_url, network) 
SELECT 'USDT', 'Tether USD', '0x55d398326f99059fF775485246999027B3197955', 18, '/assets/usdt.png', 'BEP20'
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'USDT');

-- Create audit logging function
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
-- Create bonus assets table for off-chain tokens like BSK
CREATE TABLE public.bonus_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contract_address TEXT NULL,
  network TEXT NOT NULL DEFAULT 'OFFCHAIN',
  decimals INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bonus prices table for admin-set pricing
CREATE TABLE public.bonus_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.bonus_assets(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  base_symbol TEXT NOT NULL DEFAULT 'USDT',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id)
);

-- Create wallet bonus balances for off-chain tokens
CREATE TABLE public.wallet_bonus_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.bonus_assets(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

-- Create referral events table for tracking all referral activities
CREATE TABLE public.referral_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referrer_id UUID NOT NULL,
  action TEXT NOT NULL,
  level INTEGER NOT NULL,
  amount_bonus NUMERIC NOT NULL DEFAULT 0,
  bonus_asset_id UUID REFERENCES public.bonus_assets(id),
  usd_value NUMERIC NOT NULL DEFAULT 0,
  tx_status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral settings table for program configuration
CREATE TABLE public.referral_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_asset_id UUID REFERENCES public.bonus_assets(id),
  levels JSONB NOT NULL DEFAULT '[]',
  qualifying_actions JSONB NOT NULL DEFAULT '[]',
  caps JSONB NOT NULL DEFAULT '{}',
  schedule TEXT NOT NULL DEFAULT 'instant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral relationships table
CREATE TABLE public.referral_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referee_id)
);

-- Enable RLS on all tables
ALTER TABLE public.bonus_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_bonus_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_assets
CREATE POLICY "Admin can manage bonus_assets" ON public.bonus_assets
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active bonus_assets" ON public.bonus_assets
FOR SELECT USING (status = 'active');

-- RLS Policies for bonus_prices
CREATE POLICY "Admin can manage bonus_prices" ON public.bonus_prices
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view bonus_prices" ON public.bonus_prices
FOR SELECT USING (true);

-- RLS Policies for wallet_bonus_balances
CREATE POLICY "Admin can manage all bonus_balances" ON public.wallet_bonus_balances
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own bonus_balances" ON public.wallet_bonus_balances
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update bonus_balances" ON public.wallet_bonus_balances
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update bonus_balances_update" ON public.wallet_bonus_balances
FOR UPDATE USING (true);

-- RLS Policies for referral_events
CREATE POLICY "Admin can manage all referral_events" ON public.referral_events
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own referral_events" ON public.referral_events
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = referrer_id);

CREATE POLICY "System can create referral_events" ON public.referral_events
FOR INSERT WITH CHECK (true);

-- RLS Policies for referral_settings
CREATE POLICY "Admin can manage referral_settings" ON public.referral_settings
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view referral_settings" ON public.referral_settings
FOR SELECT USING (enabled = true);

-- RLS Policies for referral_relationships
CREATE POLICY "Admin can manage referral_relationships" ON public.referral_relationships
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own referral_relationships" ON public.referral_relationships
FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can create referral_relationships" ON public.referral_relationships
FOR INSERT WITH CHECK (auth.uid() = referee_id);

-- Create function to update bonus balance timestamps
CREATE OR REPLACE FUNCTION public.update_bonus_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bonus balance timestamp updates
CREATE TRIGGER update_wallet_bonus_balances_timestamp
BEFORE UPDATE ON public.wallet_bonus_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_bonus_balance_timestamp();

-- Create trigger for referral settings timestamp updates
CREATE TRIGGER update_referral_settings_timestamp
BEFORE UPDATE ON public.referral_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default BSK asset
INSERT INTO public.bonus_assets (symbol, name, network, description, status)
VALUES ('BSK', 'BSK Bonus', 'OFFCHAIN', 'Platform bonus token for referral rewards', 'active')
ON CONFLICT (symbol) DO NOTHING;

-- Insert default BSK price
INSERT INTO public.bonus_prices (asset_id, price, base_symbol)
SELECT id, 1.0, 'USDT' FROM public.bonus_assets WHERE symbol = 'BSK'
ON CONFLICT DO NOTHING;

-- Insert default referral settings
INSERT INTO public.referral_settings (
  enabled, 
  default_asset_id, 
  levels, 
  qualifying_actions, 
  caps,
  schedule
)
SELECT 
  false,
  ba.id,
  '[{"level": 1, "percentage": 10}, {"level": 2, "percentage": 5}]'::jsonb,
  '["signup", "kyc", "first_trade"]'::jsonb,
  '{"daily_per_user": 100, "global_daily": 10000}'::jsonb,
  'instant'
FROM public.bonus_assets ba 
WHERE ba.symbol = 'BSK'
ON CONFLICT DO NOTHING;
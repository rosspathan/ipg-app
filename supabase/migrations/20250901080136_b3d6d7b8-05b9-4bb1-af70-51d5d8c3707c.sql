-- Create fx_rates table for fiat currency exchange rates
CREATE TABLE public.fx_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base, quote)
);

-- Enable RLS
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage fx_rates" ON public.fx_rates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view fx_rates" ON public.fx_rates
  FOR SELECT USING (true);

-- Create user settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Create fiat_settings_inr table
CREATE TABLE public.fiat_settings_inr (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  bank_account_name TEXT,
  bank_account_number TEXT,
  ifsc TEXT,
  bank_name TEXT,
  upi_id TEXT,
  upi_name TEXT,
  notes TEXT,
  min_deposit NUMERIC DEFAULT 0,
  fee_percent NUMERIC DEFAULT 0,
  fee_fixed NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fiat_settings_inr ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage fiat_settings_inr" ON public.fiat_settings_inr
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view fiat_settings_inr" ON public.fiat_settings_inr
  FOR SELECT USING (true);

-- Create fiat_deposits table
CREATE TABLE public.fiat_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('BANK', 'UPI')),
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  net_credit NUMERIC,
  reference TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canceled')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by UUID
);

-- Enable RLS
ALTER TABLE public.fiat_deposits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage fiat_deposits" ON public.fiat_deposits
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own deposits" ON public.fiat_deposits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposits" ON public.fiat_deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create swaps table to track swap transactions
CREATE TABLE public.swaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_asset TEXT NOT NULL,
  to_asset TEXT NOT NULL,
  from_amount NUMERIC NOT NULL,
  to_amount NUMERIC NOT NULL,
  estimated_rate NUMERIC NOT NULL,
  actual_rate NUMERIC,
  route_type TEXT NOT NULL CHECK (route_type IN ('direct', '2hop')),
  intermediate_asset TEXT,
  slippage_percent NUMERIC DEFAULT 0.5,
  min_receive NUMERIC NOT NULL,
  platform_fee NUMERIC DEFAULT 0,
  trading_fees NUMERIC DEFAULT 0,
  total_fees NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'canceled')),
  order_ids TEXT[], -- Array of order IDs for tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage swaps" ON public.swaps
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage own swaps" ON public.swaps
  FOR ALL USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fx_rates_updated_at
  BEFORE UPDATE ON public.fx_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fiat_settings_inr_updated_at
  BEFORE UPDATE ON public.fiat_settings_inr
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial fx rates
INSERT INTO public.fx_rates (base, quote, rate) VALUES
  ('USD', 'INR', 83.50),
  ('INR', 'USD', 0.012);

-- Insert initial fiat settings (disabled by default)
INSERT INTO public.fiat_settings_inr (enabled) VALUES (false);

-- Add INR as an asset if it doesn't exist
INSERT INTO public.assets (symbol, name, network, is_active, trading_enabled, deposit_enabled, withdraw_enabled, decimals)
VALUES ('INR', 'Indian Rupee', 'fiat', true, false, true, true, 2)
ON CONFLICT (symbol) DO NOTHING;
-- Create wallet_balances table for real balance tracking
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  available NUMERIC NOT NULL DEFAULT 0 CHECK (available >= 0),
  locked NUMERIC NOT NULL DEFAULT 0 CHECK (locked >= 0),
  total NUMERIC GENERATED ALWAYS AS (available + locked) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

-- Enable RLS
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own balances"
  ON public.wallet_balances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all balances"
  ON public.wallet_balances
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage balances"
  ON public.wallet_balances
  FOR ALL
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_wallet_balances_user_asset ON public.wallet_balances(user_id, asset_id);

-- Create function to lock balance for orders
CREATE OR REPLACE FUNCTION public.lock_balance_for_order(
  p_user_id UUID,
  p_asset_symbol TEXT,
  p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_asset_id UUID;
BEGIN
  -- Get asset ID
  SELECT id INTO v_asset_id FROM public.assets WHERE symbol = p_asset_symbol;
  
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: %', p_asset_symbol;
  END IF;
  
  -- Update balance atomically
  UPDATE public.wallet_balances
  SET 
    available = available - p_amount,
    locked = locked + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND asset_id = v_asset_id
    AND available >= p_amount;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to unlock balance (for cancelled orders)
CREATE OR REPLACE FUNCTION public.unlock_balance_for_order(
  p_user_id UUID,
  p_asset_symbol TEXT,
  p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_asset_id UUID;
BEGIN
  SELECT id INTO v_asset_id FROM public.assets WHERE symbol = p_asset_symbol;
  
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: %', p_asset_symbol;
  END IF;
  
  UPDATE public.wallet_balances
  SET 
    available = available + p_amount,
    locked = locked - p_amount,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND asset_id = v_asset_id
    AND locked >= p_amount;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to settle trade (atomic balance updates)
CREATE OR REPLACE FUNCTION public.settle_trade(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_base_symbol TEXT,
  p_quote_symbol TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC,
  p_buyer_fee NUMERIC,
  p_seller_fee NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_base_asset_id UUID;
  v_quote_asset_id UUID;
  v_total_value NUMERIC;
BEGIN
  -- Get asset IDs
  SELECT id INTO v_base_asset_id FROM public.assets WHERE symbol = p_base_symbol;
  SELECT id INTO v_quote_asset_id FROM public.assets WHERE symbol = p_quote_symbol;
  
  v_total_value := p_quantity * p_price;
  
  -- Buyer: locked quote -> available base (minus fee)
  UPDATE public.wallet_balances
  SET locked = locked - (v_total_value + p_buyer_fee), updated_at = now()
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;
  
  INSERT INTO public.wallet_balances (user_id, asset_id, available)
  VALUES (p_buyer_id, v_base_asset_id, p_quantity)
  ON CONFLICT (user_id, asset_id) 
  DO UPDATE SET available = wallet_balances.available + p_quantity, updated_at = now();
  
  -- Seller: locked base -> available quote (minus fee)
  UPDATE public.wallet_balances
  SET locked = locked - p_quantity, updated_at = now()
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id;
  
  INSERT INTO public.wallet_balances (user_id, asset_id, available)
  VALUES (p_seller_id, v_quote_asset_id, v_total_value - p_seller_fee)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET available = wallet_balances.available + (v_total_value - p_seller_fee), updated_at = now();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trading engine settings table
CREATE TABLE IF NOT EXISTS public.trading_engine_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_matching_enabled BOOLEAN NOT NULL DEFAULT true,
  matching_interval_seconds INTEGER NOT NULL DEFAULT 5,
  circuit_breaker_active BOOLEAN NOT NULL DEFAULT false,
  max_orders_per_user_per_minute INTEGER NOT NULL DEFAULT 10,
  maker_fee_percent NUMERIC NOT NULL DEFAULT 0.1,
  taker_fee_percent NUMERIC NOT NULL DEFAULT 0.2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.trading_engine_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.trading_engine_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage engine settings"
  ON public.trading_engine_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view engine settings"
  ON public.trading_engine_settings
  FOR SELECT
  USING (true);
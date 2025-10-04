-- Add BSK and IPG trading pairs with all other cryptocurrencies

-- BSK Trading Pairs (BSK as quote currency - base/BSK)
INSERT INTO markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT 
  a.id as base_asset_id,
  (SELECT id FROM assets WHERE symbol = 'BSK') as quote_asset_id,
  CASE 
    WHEN a.symbol = 'BTC' THEN 0.001
    WHEN a.symbol = 'ETH' THEN 0.01
    WHEN a.symbol = 'BNB' THEN 0.01
    ELSE 0.001
  END as tick_size,
  0.001 as lot_size,
  10 as min_notional,
  true as is_active
FROM assets a
WHERE a.symbol IN ('BTC', 'ETH', 'BNB', 'INR')
  AND NOT EXISTS (
    SELECT 1 FROM markets m 
    WHERE m.base_asset_id = a.id 
    AND m.quote_asset_id = (SELECT id FROM assets WHERE symbol = 'BSK')
  );

-- IPG Trading Pairs (IPG as base currency - IPG/quote)
INSERT INTO markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT 
  (SELECT id FROM assets WHERE symbol = 'IPG') as base_asset_id,
  a.id as quote_asset_id,
  CASE 
    WHEN a.symbol = 'USDT' THEN 0.001
    WHEN a.symbol = 'BSK' THEN 0.01
    WHEN a.symbol = 'BTC' THEN 0.00000001
    WHEN a.symbol = 'ETH' THEN 0.0000001
    WHEN a.symbol = 'BNB' THEN 0.0001
    ELSE 0.001
  END as tick_size,
  0.001 as lot_size,
  CASE 
    WHEN a.symbol IN ('BTC', 'ETH') THEN 0.001
    ELSE 10
  END as min_notional,
  true as is_active
FROM assets a
WHERE a.symbol IN ('BTC', 'ETH', 'BNB', 'USDT', 'BSK')
  AND NOT EXISTS (
    SELECT 1 FROM markets m 
    WHERE m.base_asset_id = (SELECT id FROM assets WHERE symbol = 'IPG')
    AND m.quote_asset_id = a.id
  );

-- Update BSK asset to be admin-controlled fiat currency
UPDATE assets 
SET 
  asset_type = 'fiat',
  withdraw_enabled = true,
  trading_enabled = true,
  name = 'BSK (Admin Controlled)',
  updated_at = now()
WHERE symbol = 'BSK';

-- Ensure IPG has contract address field ready for admin management
UPDATE assets 
SET 
  asset_type = 'crypto',
  withdraw_enabled = true,
  trading_enabled = true,
  updated_at = now()
WHERE symbol = 'IPG';

-- Create admin settings table for BSK management
CREATE TABLE IF NOT EXISTS public.bsk_admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_mint_limit numeric NOT NULL DEFAULT 1000000,
  daily_burn_limit numeric NOT NULL DEFAULT 1000000,
  withdrawal_enabled boolean NOT NULL DEFAULT true,
  withdrawal_fee_percent numeric NOT NULL DEFAULT 0,
  min_withdrawal_amount numeric NOT NULL DEFAULT 10,
  max_withdrawal_amount numeric NOT NULL DEFAULT 1000000,
  require_kyc_for_withdrawal boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on BSK admin settings
ALTER TABLE public.bsk_admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage BSK settings"
  ON public.bsk_admin_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view BSK settings"
  ON public.bsk_admin_settings
  FOR SELECT
  USING (true);

-- Insert default BSK admin settings if none exist
INSERT INTO public.bsk_admin_settings (
  daily_mint_limit,
  daily_burn_limit,
  withdrawal_enabled,
  withdrawal_fee_percent,
  min_withdrawal_amount,
  max_withdrawal_amount,
  require_kyc_for_withdrawal
)
SELECT 1000000, 1000000, true, 0, 10, 1000000, false
WHERE NOT EXISTS (SELECT 1 FROM public.bsk_admin_settings);

-- Create IPG admin settings table for contract address management
CREATE TABLE IF NOT EXISTS public.ipg_admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address text NOT NULL,
  network text NOT NULL DEFAULT 'BEP20',
  decimals integer NOT NULL DEFAULT 18,
  is_verified boolean NOT NULL DEFAULT false,
  trading_enabled boolean NOT NULL DEFAULT true,
  withdrawal_enabled boolean NOT NULL DEFAULT true,
  min_trade_amount numeric NOT NULL DEFAULT 0.001,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on IPG admin settings
ALTER TABLE public.ipg_admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage IPG settings"
  ON public.ipg_admin_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view IPG settings"
  ON public.ipg_admin_settings
  FOR SELECT
  USING (true);

-- Insert default IPG settings with current contract address
INSERT INTO public.ipg_admin_settings (
  contract_address,
  network,
  decimals,
  is_verified,
  trading_enabled,
  withdrawal_enabled
)
SELECT 
  COALESCE(contract_address, '0xDbcA5db00f2ADAEc2C47bBba9fFbFE21BF75864a'),
  'BEP20',
  18,
  true,
  true,
  true
FROM assets WHERE symbol = 'IPG'
ON CONFLICT DO NOTHING;

-- Create trigger to sync IPG contract address with assets table
CREATE OR REPLACE FUNCTION sync_ipg_contract_address()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assets 
  SET 
    contract_address = NEW.contract_address,
    network = NEW.network,
    decimals = NEW.decimals,
    trading_enabled = NEW.trading_enabled,
    withdraw_enabled = NEW.withdrawal_enabled,
    updated_at = now()
  WHERE symbol = 'IPG';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ipg_settings_updated
  AFTER INSERT OR UPDATE ON public.ipg_admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_ipg_contract_address();
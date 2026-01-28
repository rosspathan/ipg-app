-- Update BSK with the new contract address (Banala)
UPDATE public.assets 
SET 
  contract_address = '0x742575866C0eb1B6b6350159D536447477085ceF',
  name = 'Banala',
  network = 'BEP20',
  decimals = 18,
  trading_enabled = true,
  is_active = true,
  updated_at = now()
WHERE symbol = 'BSK';

-- Insert USDI (BSK-Dollar) as a new asset
INSERT INTO public.assets (
  symbol,
  name,
  contract_address,
  network,
  decimals,
  is_active,
  trading_enabled,
  deposit_enabled,
  withdraw_enabled,
  asset_type,
  created_at,
  updated_at
) VALUES (
  'USDI',
  'BSK-Dollar',
  '0x7437d96D2dca13525B4A6021865d41997deE1F09',
  'BEP20',
  18,
  true,
  true,
  true,
  true,
  'crypto',
  now(),
  now()
);

-- Create BSK/USDT trading pair
INSERT INTO public.trading_pairs (
  symbol,
  base_asset_id,
  quote_asset_id,
  active,
  tick_size,
  lot_size,
  min_price,
  max_price,
  maker_fee,
  taker_fee,
  created_at,
  updated_at
) VALUES (
  'BSK/USDT',
  '3a57be42-ab49-4813-9922-517cb0b5a011',
  'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0',
  true,
  0.00001,
  0.001,
  0,
  999999999,
  0.001,
  0.001,
  now(),
  now()
);

-- Create BSK/USDI trading pair
INSERT INTO public.trading_pairs (
  symbol,
  base_asset_id,
  quote_asset_id,
  active,
  tick_size,
  lot_size,
  min_price,
  max_price,
  maker_fee,
  taker_fee,
  created_at,
  updated_at
) 
SELECT 
  'BSK/USDI',
  '3a57be42-ab49-4813-9922-517cb0b5a011',
  a.id,
  true,
  0.00001,
  0.001,
  0,
  999999999,
  0.001,
  0.001,
  now(),
  now()
FROM public.assets a
WHERE a.symbol = 'USDI';
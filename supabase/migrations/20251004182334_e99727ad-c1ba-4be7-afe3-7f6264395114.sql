-- Insert popular cryptocurrency assets if they don't exist
INSERT INTO public.assets (symbol, name, network, decimals, asset_type, is_active, trading_enabled, deposit_enabled, withdraw_enabled)
VALUES
  ('SOL', 'Solana', 'SOL', 9, 'crypto', true, true, true, true),
  ('ADA', 'Cardano', 'ADA', 6, 'crypto', true, true, true, true),
  ('DOT', 'Polkadot', 'DOT', 10, 'crypto', true, true, true, true),
  ('MATIC', 'Polygon', 'MATIC', 18, 'crypto', true, true, true, true),
  ('AVAX', 'Avalanche', 'AVAX', 18, 'crypto', true, true, true, true),
  ('LINK', 'Chainlink', 'LINK', 18, 'crypto', true, true, true, true),
  ('UNI', 'Uniswap', 'UNI', 18, 'crypto', true, true, true, true),
  ('ATOM', 'Cosmos', 'ATOM', 6, 'crypto', true, true, true, true),
  ('XRP', 'Ripple', 'XRP', 6, 'crypto', true, true, true, true),
  ('DOGE', 'Dogecoin', 'DOGE', 8, 'crypto', true, true, true, true),
  ('LTC', 'Litecoin', 'LTC', 8, 'crypto', true, true, true, true),
  ('TRX', 'TRON', 'TRX', 6, 'crypto', true, true, true, true),
  ('SHIB', 'Shiba Inu', 'SHIB', 18, 'crypto', true, true, true, true),
  ('APT', 'Aptos', 'APT', 8, 'crypto', true, true, true, true),
  ('ARB', 'Arbitrum', 'ARB', 18, 'crypto', true, true, true, true),
  ('OP', 'Optimism', 'OP', 18, 'crypto', true, true, true, true),
  ('INJ', 'Injective', 'INJ', 18, 'crypto', true, true, true, true),
  ('FIL', 'Filecoin', 'FIL', 18, 'crypto', true, true, true, true),
  ('NEAR', 'NEAR Protocol', 'NEAR', 24, 'crypto', true, true, true, true),
  ('VET', 'VeChain', 'VET', 18, 'crypto', true, true, true, true),
  ('AAVE', 'Aave', 'AAVE', 18, 'crypto', true, true, true, true),
  ('GRT', 'The Graph', 'GRT', 18, 'crypto', true, true, true, true),
  ('ALGO', 'Algorand', 'ALGO', 6, 'crypto', true, true, true, true),
  ('XLM', 'Stellar', 'XLM', 7, 'crypto', true, true, true, true),
  ('SAND', 'The Sandbox', 'SAND', 18, 'crypto', true, true, true, true)
ON CONFLICT (symbol) DO NOTHING;

-- Create comprehensive trading pairs with USDT as quote
INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT 
  base.id,
  quote.id,
  CASE 
    WHEN base.symbol IN ('BTC') THEN 0.01
    WHEN base.symbol IN ('ETH', 'BNB ORIGINAL') THEN 0.01
    WHEN base.symbol IN ('SOL', 'AVAX', 'LINK', 'ATOM', 'UNI', 'AAVE', 'FIL', 'INJ') THEN 0.001
    ELSE 0.0001
  END,
  CASE 
    WHEN base.symbol IN ('BTC', 'ETH') THEN 0.00001
    WHEN base.symbol IN ('BNB ORIGINAL', 'SOL', 'AVAX') THEN 0.0001
    ELSE 0.001
  END,
  10.0,
  true
FROM public.assets base
CROSS JOIN public.assets quote
WHERE quote.symbol = 'USDT'
  AND base.symbol IN ('BTC', 'ETH', 'BNB ORIGINAL', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 
                      'ATOM', 'XRP', 'DOGE', 'LTC', 'TRX', 'SHIB', 'APT', 'ARB', 'OP', 'INJ', 
                      'FIL', 'NEAR', 'VET', 'AAVE', 'GRT', 'ALGO', 'XLM', 'SAND')
  AND NOT EXISTS (
    SELECT 1 FROM public.markets m 
    WHERE m.base_asset_id = base.id AND m.quote_asset_id = quote.id
  );

-- Create trading pairs with BSK as quote
INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT 
  base.id,
  quote.id,
  CASE 
    WHEN base.symbol IN ('BTC') THEN 0.01
    WHEN base.symbol IN ('ETH', 'BNB ORIGINAL') THEN 0.01
    ELSE 0.001
  END,
  CASE 
    WHEN base.symbol IN ('BTC', 'ETH') THEN 0.00001
    ELSE 0.0001
  END,
  10.0,
  true
FROM public.assets base
CROSS JOIN public.assets quote
WHERE quote.symbol = 'BSK'
  AND base.symbol IN ('BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'LINK', 'DOT', 'ATOM', 'UNI', 'AAVE', 'IPG')
  AND NOT EXISTS (
    SELECT 1 FROM public.markets m 
    WHERE m.base_asset_id = base.id AND m.quote_asset_id = quote.id
  );

-- Create trading pairs with BTC as quote
INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT 
  base.id,
  quote.id,
  0.00000001,
  CASE 
    WHEN base.symbol IN ('ETH', 'BNB ORIGINAL') THEN 0.00001
    ELSE 0.0001
  END,
  0.0001,
  true
FROM public.assets base
CROSS JOIN public.assets quote
WHERE quote.symbol = 'BTC'
  AND base.symbol IN ('ETH', 'BNB ORIGINAL', 'SOL', 'AVAX', 'LINK', 'DOT', 'UNI', 'ATOM', 'XRP', 'LTC', 'BSK', 'IPG')
  AND NOT EXISTS (
    SELECT 1 FROM public.markets m 
    WHERE m.base_asset_id = base.id AND m.quote_asset_id = quote.id
  );

-- Create trading pairs with ETH as quote
INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT 
  base.id,
  quote.id,
  0.000001,
  0.0001,
  0.001,
  true
FROM public.assets base
CROSS JOIN public.assets quote
WHERE quote.symbol = 'ETH'
  AND base.symbol IN ('BNB ORIGINAL', 'SOL', 'AVAX', 'MATIC', 'LINK', 'UNI', 'AAVE', 'BSK', 'IPG')
  AND NOT EXISTS (
    SELECT 1 FROM public.markets m 
    WHERE m.base_asset_id = base.id AND m.quote_asset_id = quote.id
  );
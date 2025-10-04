-- Create comprehensive trading pairs with BNB ORIGINAL as quote
INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT 
  base.id,
  quote.id,
  CASE 
    WHEN base.symbol IN ('BTC') THEN 0.00001
    WHEN base.symbol IN ('ETH') THEN 0.0001
    WHEN base.symbol IN ('SOL', 'AVAX', 'LINK', 'ATOM', 'UNI', 'AAVE', 'DOT') THEN 0.00001
    ELSE 0.000001
  END,
  CASE 
    WHEN base.symbol IN ('BTC', 'ETH') THEN 0.000001
    WHEN base.symbol IN ('SOL', 'AVAX') THEN 0.00001
    ELSE 0.0001
  END,
  0.01,
  true
FROM public.assets base
CROSS JOIN public.assets quote
WHERE quote.symbol = 'BNB ORIGINAL'
  AND base.symbol IN ('BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK', 'UNI', 
                      'ATOM', 'XRP', 'DOGE', 'LTC', 'TRX', 'SHIB', 'APT', 'ARB', 'OP', 'INJ', 
                      'FIL', 'NEAR', 'VET', 'AAVE', 'GRT', 'ALGO', 'XLM', 'SAND', 'USDT', 'BSK', 'IPG')
  AND NOT EXISTS (
    SELECT 1 FROM public.markets m 
    WHERE m.base_asset_id = base.id AND m.quote_asset_id = quote.id
  );
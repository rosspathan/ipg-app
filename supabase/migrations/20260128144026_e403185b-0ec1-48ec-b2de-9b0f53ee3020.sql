-- Add USDI/USDT market
INSERT INTO public.markets (
  base_asset_id,
  quote_asset_id,
  is_active,
  tick_size,
  lot_size,
  min_notional
) VALUES (
  '62e5491b-abcb-4d3d-9ba5-42f1104fd457',  -- USDI
  'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0',  -- USDT
  true,
  0.0001,
  0.01,
  1
);

-- Add market_prices entry for USDI/USDT (1:1 since both are stablecoins)
INSERT INTO public.market_prices (
  market_id,
  symbol,
  current_price,
  high_24h,
  low_24h,
  price_change_24h,
  price_change_percentage_24h,
  volume_24h
) 
SELECT 
  m.id,
  'USDI/USDT',
  1,
  1,
  1,
  0,
  0,
  0
FROM public.markets m
JOIN public.assets a1 ON m.base_asset_id = a1.id
JOIN public.assets a2 ON m.quote_asset_id = a2.id
WHERE a1.symbol = 'USDI' AND a2.symbol = 'USDT';
-- Update BSK initial price to $0.012
UPDATE public.assets 
SET initial_price = 0.012, updated_at = now()
WHERE symbol = 'BSK';

-- Update USDI initial price to $1
UPDATE public.assets 
SET initial_price = 1, updated_at = now()
WHERE symbol = 'USDI';

-- Update BSK/USDT market price to $0.012
UPDATE public.market_prices 
SET current_price = 0.012, high_24h = 0.012, low_24h = 0.012, last_updated = now(), updated_at = now()
WHERE symbol = 'BSK/USDT';

-- Add market_prices entry for BSK/USDI (price is 0.012 BSK per USDI since USDI = $1 and BSK = $0.012)
INSERT INTO public.market_prices (
  market_id,
  symbol,
  current_price,
  high_24h,
  low_24h,
  price_change_24h,
  price_change_percentage_24h,
  volume_24h
) VALUES (
  '554a720f-5685-4110-b043-0811cb0700db',
  'BSK/USDI',
  0.012,
  0.012,
  0.012,
  0,
  0,
  0
);
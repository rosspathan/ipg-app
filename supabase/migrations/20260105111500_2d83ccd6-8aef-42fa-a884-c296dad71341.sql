-- Phase 1: Create trigger to update market_prices on trade insert
-- This ensures all users see the same price (from public market_prices table)

-- Create or replace function to update market_prices after a trade
CREATE OR REPLACE FUNCTION public.update_market_price_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_market_id uuid;
BEGIN
  -- Find the market_id for this symbol
  SELECT m.id INTO v_market_id
  FROM markets m
  JOIN assets base ON m.base_asset_id = base.id
  JOIN assets quote ON m.quote_asset_id = quote.id
  WHERE base.symbol || '/' || quote.symbol = NEW.symbol
  LIMIT 1;

  -- Upsert into market_prices with the new trade price
  IF v_market_id IS NOT NULL THEN
    INSERT INTO market_prices (market_id, symbol, current_price, last_updated, volume_24h, price_change_24h, price_change_percentage_24h, high_24h, low_24h)
    VALUES (v_market_id, NEW.symbol, NEW.price, now(), COALESCE(NEW.amount, 0), 0, 0, NEW.price, NEW.price)
    ON CONFLICT (market_id) 
    DO UPDATE SET 
      current_price = NEW.price,
      last_updated = now(),
      volume_24h = COALESCE(market_prices.volume_24h, 0) + COALESCE(NEW.amount, 0),
      high_24h = GREATEST(COALESCE(market_prices.high_24h, 0), NEW.price),
      low_24h = LEAST(COALESCE(NULLIF(market_prices.low_24h, 0), NEW.price), NEW.price);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_market_price_on_trade ON trades;

CREATE TRIGGER trigger_update_market_price_on_trade
AFTER INSERT ON trades
FOR EACH ROW
EXECUTE FUNCTION public.update_market_price_on_trade();

-- Seed initial market_prices for active markets (include symbol column)
INSERT INTO market_prices (market_id, symbol, current_price, last_updated, price_change_24h, price_change_percentage_24h, high_24h, low_24h, volume_24h)
SELECT 
  m.id, 
  base.symbol || '/' || quote.symbol,
  COALESCE(base.initial_price, 1), 
  now(),
  0, 0, 
  COALESCE(base.initial_price, 1), 
  COALESCE(base.initial_price, 1),
  0
FROM markets m
JOIN assets base ON m.base_asset_id = base.id
JOIN assets quote ON m.quote_asset_id = quote.id
WHERE m.is_active = true
ON CONFLICT (market_id) DO NOTHING;
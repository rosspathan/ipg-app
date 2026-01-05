-- Fix trigger function to use correct column name (quantity instead of amount)
CREATE OR REPLACE FUNCTION update_market_price_on_trade()
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
    VALUES (v_market_id, NEW.symbol, NEW.price, now(), COALESCE(NEW.quantity, 0), 0, 0, NEW.price, NEW.price)
    ON CONFLICT (market_id) 
    DO UPDATE SET 
      current_price = NEW.price,
      last_updated = now(),
      volume_24h = COALESCE(market_prices.volume_24h, 0) + COALESCE(NEW.quantity, 0),
      high_24h = GREATEST(COALESCE(market_prices.high_24h, 0), NEW.price),
      low_24h = LEAST(COALESCE(NULLIF(market_prices.low_24h, 0), NEW.price), NEW.price);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
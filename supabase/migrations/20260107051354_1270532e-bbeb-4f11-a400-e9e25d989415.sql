-- Update the trigger function to calculate real 24h price change
CREATE OR REPLACE FUNCTION update_market_price_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_market_id uuid;
  v_price_24h_ago numeric;
  v_price_change numeric;
  v_price_change_pct numeric;
BEGIN
  -- Find the market_id for this symbol
  SELECT m.id INTO v_market_id
  FROM markets m
  JOIN assets base ON m.base_asset_id = base.id
  JOIN assets quote ON m.quote_asset_id = quote.id
  WHERE base.symbol || '/' || quote.symbol = NEW.symbol
  LIMIT 1;

  -- Get the price from ~24 hours ago (oldest trade within the 24h window)
  SELECT price INTO v_price_24h_ago
  FROM trades
  WHERE symbol = NEW.symbol
    AND created_at <= NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate price change
  IF v_price_24h_ago IS NOT NULL AND v_price_24h_ago > 0 THEN
    v_price_change := NEW.price - v_price_24h_ago;
    v_price_change_pct := ROUND((v_price_change / v_price_24h_ago * 100)::numeric, 4);
  ELSE
    v_price_change := 0;
    v_price_change_pct := 0;
  END IF;

  -- Upsert into market_prices with calculated values
  IF v_market_id IS NOT NULL THEN
    INSERT INTO market_prices (market_id, symbol, current_price, last_updated, 
                               volume_24h, price_change_24h, price_change_percentage_24h, 
                               high_24h, low_24h)
    VALUES (v_market_id, NEW.symbol, NEW.price, now(), 
            COALESCE(NEW.quantity, 0), v_price_change, v_price_change_pct, 
            NEW.price, NEW.price)
    ON CONFLICT (market_id) 
    DO UPDATE SET 
      current_price = NEW.price,
      last_updated = now(),
      volume_24h = COALESCE(market_prices.volume_24h, 0) + COALESCE(NEW.quantity, 0),
      price_change_24h = v_price_change,
      price_change_percentage_24h = v_price_change_pct,
      high_24h = GREATEST(COALESCE(market_prices.high_24h, 0), NEW.price),
      low_24h = LEAST(COALESCE(NULLIF(market_prices.low_24h, 0), NEW.price), NEW.price);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- One-time fix: Update existing IPG/USDT based on trades from 24h ago
WITH price_24h AS (
  SELECT price
  FROM trades
  WHERE symbol = 'IPG/USDT'
    AND created_at <= NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE market_prices mp
SET 
  price_change_24h = mp.current_price - COALESCE(p.price, mp.current_price),
  price_change_percentage_24h = CASE 
    WHEN p.price IS NOT NULL AND p.price > 0 
    THEN ROUND(((mp.current_price - p.price) / p.price * 100)::numeric, 4)
    ELSE 0 
  END
FROM price_24h p
WHERE mp.symbol = 'IPGUSDT';
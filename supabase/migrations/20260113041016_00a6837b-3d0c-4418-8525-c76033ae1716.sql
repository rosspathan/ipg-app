-- Fix the update_market_price_on_trade() function to calculate REAL 24h stats from trades table
CREATE OR REPLACE FUNCTION update_market_price_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_market_id uuid;
  v_high_24h numeric;
  v_low_24h numeric;
  v_volume_24h numeric;
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

  -- Calculate REAL 24h stats from trades table (rolling 24h window)
  SELECT 
    MAX(price),
    MIN(price),
    COALESCE(SUM(quantity), 0)
  INTO v_high_24h, v_low_24h, v_volume_24h
  FROM trades
  WHERE symbol = NEW.symbol
    AND created_at >= NOW() - INTERVAL '24 hours';

  -- If no trades in 24h, use current trade values
  IF v_high_24h IS NULL THEN
    v_high_24h := NEW.price;
    v_low_24h := NEW.price;
    v_volume_24h := NEW.quantity;
  END IF;

  -- Get reference price for percentage calculation
  -- Use the earliest trade within 24h window as the "opening" price
  SELECT price INTO v_price_24h_ago
  FROM trades
  WHERE symbol = NEW.symbol
    AND created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Fallback: if no trades in 24h window, get the most recent trade before 24h ago
  IF v_price_24h_ago IS NULL THEN
    SELECT price INTO v_price_24h_ago
    FROM trades
    WHERE symbol = NEW.symbol
      AND created_at < NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Calculate price change and percentage
  IF v_price_24h_ago IS NOT NULL AND v_price_24h_ago > 0 THEN
    v_price_change := NEW.price - v_price_24h_ago;
    v_price_change_pct := ROUND((v_price_change / v_price_24h_ago * 100)::numeric, 4);
  ELSE
    v_price_change := 0;
    v_price_change_pct := 0;
  END IF;

  -- Upsert market_prices with calculated values
  IF v_market_id IS NOT NULL THEN
    INSERT INTO market_prices (
      market_id, symbol, current_price, last_updated,
      volume_24h, price_change_24h, price_change_percentage_24h,
      high_24h, low_24h
    )
    VALUES (
      v_market_id, NEW.symbol, NEW.price, now(),
      v_volume_24h, v_price_change, v_price_change_pct,
      v_high_24h, v_low_24h
    )
    ON CONFLICT (market_id) 
    DO UPDATE SET 
      current_price = NEW.price,
      last_updated = now(),
      volume_24h = EXCLUDED.volume_24h,
      price_change_24h = EXCLUDED.price_change_24h,
      price_change_percentage_24h = EXCLUDED.price_change_percentage_24h,
      high_24h = EXCLUDED.high_24h,
      low_24h = EXCLUDED.low_24h;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- One-time fix: Recalculate all existing market_prices with actual 24h stats from trades
UPDATE market_prices mp
SET 
  high_24h = stats.high_24h,
  low_24h = stats.low_24h,
  volume_24h = stats.volume_24h,
  price_change_24h = mp.current_price - COALESCE(stats.open_price_24h, mp.current_price),
  price_change_percentage_24h = CASE 
    WHEN stats.open_price_24h IS NOT NULL AND stats.open_price_24h > 0 
    THEN ROUND(((mp.current_price - stats.open_price_24h) / stats.open_price_24h * 100)::numeric, 4)
    ELSE 0 
  END
FROM (
  SELECT 
    t.symbol,
    MAX(t.price) as high_24h,
    MIN(t.price) as low_24h,
    COALESCE(SUM(t.quantity), 0) as volume_24h,
    (SELECT t2.price FROM trades t2 
     WHERE t2.symbol = t.symbol 
     AND t2.created_at >= NOW() - INTERVAL '24 hours' 
     ORDER BY t2.created_at ASC LIMIT 1) as open_price_24h
  FROM trades t
  WHERE t.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY t.symbol
) stats
WHERE mp.symbol = stats.symbol;
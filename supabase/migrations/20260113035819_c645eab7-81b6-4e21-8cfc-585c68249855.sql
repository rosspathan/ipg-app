-- Reset market_prices.current_price for IPG/USDT to current order book midpoint
-- This allows trades to execute without triggering the circuit breaker

UPDATE market_prices
SET current_price = (
  SELECT (COALESCE(
    (SELECT MAX(price) FROM orders WHERE symbol = 'IPG/USDT' AND side = 'buy' AND status IN ('pending', 'partially_filled') AND order_type = 'limit'),
    305
  ) + COALESCE(
    (SELECT MIN(price) FROM orders WHERE symbol = 'IPG/USDT' AND side = 'sell' AND status IN ('pending', 'partially_filled') AND order_type = 'limit'),
    305
  )) / 2
),
last_updated = NOW()
WHERE symbol = 'IPG/USDT';

-- If no row exists, insert one
INSERT INTO market_prices (symbol, current_price, last_updated)
SELECT 'IPG/USDT', 
  (COALESCE(
    (SELECT MAX(price) FROM orders WHERE symbol = 'IPG/USDT' AND side = 'buy' AND status IN ('pending', 'partially_filled') AND order_type = 'limit'),
    305
  ) + COALESCE(
    (SELECT MIN(price) FROM orders WHERE symbol = 'IPG/USDT' AND side = 'sell' AND status IN ('pending', 'partially_filled') AND order_type = 'limit'),
    305
  )) / 2,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM market_prices WHERE symbol = 'IPG/USDT');
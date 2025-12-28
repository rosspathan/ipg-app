-- Create order_book view that aggregates pending limit orders by price level
CREATE OR REPLACE VIEW order_book AS
SELECT 
  symbol,
  side,
  price,
  SUM(remaining_amount) as total_quantity,
  COUNT(*) as order_count
FROM orders
WHERE status IN ('pending', 'partially_filled')
  AND order_type = 'limit'
  AND price IS NOT NULL
GROUP BY symbol, side, price;

-- Grant read access to anon and authenticated roles
GRANT SELECT ON order_book TO anon;
GRANT SELECT ON order_book TO authenticated;
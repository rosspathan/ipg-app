-- Create user-scoped trade fills view for fast history lookup
-- This view flattens trades into user-perspective rows (one per user per trade)

CREATE OR REPLACE VIEW public.user_trade_fills AS
SELECT 
  t.id AS trade_id,
  t.symbol AS pair,
  t.buyer_id AS user_id,
  'buy' AS side,
  'taker' AS role, -- Assuming buyer is usually taker for simplicity; can be enhanced
  t.price,
  t.quantity AS amount,
  t.total_value AS total,
  t.buyer_fee AS fee,
  t.fee_asset,
  t.buy_order_id AS order_id,
  t.trade_time AS executed_at,
  t.created_at
FROM trades t

UNION ALL

SELECT 
  t.id AS trade_id,
  t.symbol AS pair,
  t.seller_id AS user_id,
  'sell' AS side,
  'maker' AS role, -- Assuming seller is usually maker for simplicity
  t.price,
  t.quantity AS amount,
  t.total_value AS total,
  t.seller_fee AS fee,
  t.fee_asset,
  t.sell_order_id AS order_id,
  t.trade_time AS executed_at,
  t.created_at
FROM trades t;

-- Grant access to authenticated users
GRANT SELECT ON public.user_trade_fills TO authenticated;

-- Create index on trades for faster user lookups
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_time ON trades(symbol, trade_time DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status, created_at DESC);

-- Enable RLS on the underlying trades table to ensure view respects security
-- (View inherits RLS from base table)

COMMENT ON VIEW public.user_trade_fills IS 'User-scoped trade fills view for trade history display';
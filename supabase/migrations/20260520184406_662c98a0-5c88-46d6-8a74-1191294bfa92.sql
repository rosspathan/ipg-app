-- Public order book RPC: returns aggregated price levels for a symbol
-- WITHOUT exposing user_id or any PII. Safe to call from any authenticated client.
CREATE OR REPLACE FUNCTION public.get_public_order_book(p_symbol text, p_depth int DEFAULT 50)
RETURNS TABLE(side text, price numeric, quantity numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (
    SELECT 'buy'::text AS side, price, SUM(remaining_amount) AS quantity
    FROM public.orders
    WHERE symbol = p_symbol
      AND side = 'buy'
      AND order_type = 'limit'
      AND status IN ('pending','partially_filled')
      AND price IS NOT NULL
      AND remaining_amount > 0
    GROUP BY price
    ORDER BY price DESC
    LIMIT p_depth
  )
  UNION ALL
  (
    SELECT 'sell'::text AS side, price, SUM(remaining_amount) AS quantity
    FROM public.orders
    WHERE symbol = p_symbol
      AND side = 'sell'
      AND order_type = 'limit'
      AND status IN ('pending','partially_filled')
      AND price IS NOT NULL
      AND remaining_amount > 0
    GROUP BY price
    ORDER BY price ASC
    LIMIT p_depth
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_order_book(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_order_book(text, int) TO authenticated, anon;

-- Public recent trades RPC (aggregated, no user_id)
CREATE OR REPLACE FUNCTION public.get_public_recent_trades(p_symbol text, p_limit int DEFAULT 50)
RETURNS TABLE(price numeric, quantity numeric, side text, traded_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT price, filled_amount AS quantity, side, updated_at AS traded_at
  FROM public.orders
  WHERE symbol = p_symbol
    AND status IN ('filled','partially_filled')
    AND filled_amount > 0
  ORDER BY updated_at DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_public_recent_trades(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_recent_trades(text, int) TO authenticated, anon;
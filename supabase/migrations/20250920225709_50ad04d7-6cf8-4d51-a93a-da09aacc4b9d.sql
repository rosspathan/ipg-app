-- Create orders table for trading system
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL, -- e.g., 'BTC/USDT'
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('market', 'limit', 'stop_limit')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC, -- NULL for market orders
  stop_price NUMERIC, -- For stop orders
  filled_quantity NUMERIC NOT NULL DEFAULT 0,
  remaining_quantity NUMERIC NOT NULL DEFAULT 0,
  average_price NUMERIC DEFAULT 0,
  total_fee NUMERIC DEFAULT 0,
  fee_asset TEXT DEFAULT 'USDT',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'filled', 'partially_filled', 'cancelled', 'expired')),
  time_in_force TEXT DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
  trading_type TEXT DEFAULT 'spot' CHECK (trading_type IN ('spot', 'futures')),
  client_order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  filled_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Admin can manage all orders" 
ON public.orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update orders" 
ON public.orders 
FOR UPDATE 
USING (true); -- Allows system updates via service role

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_symbol ON public.orders(symbol);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_symbol_status ON public.orders(symbol, status) WHERE status IN ('open', 'partially_filled');

-- Create order book view for real-time updates
CREATE OR REPLACE VIEW public.order_book AS
SELECT 
  symbol,
  side,
  price,
  SUM(remaining_quantity) as total_quantity,
  COUNT(*) as order_count
FROM public.orders
WHERE status IN ('open', 'partially_filled')
  AND remaining_quantity > 0
GROUP BY symbol, side, price
ORDER BY symbol, side, 
  CASE WHEN side = 'buy' THEN price END DESC,
  CASE WHEN side = 'sell' THEN price END ASC;

-- Create function to update remaining quantity
CREATE OR REPLACE FUNCTION public.update_order_remaining_quantity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_quantity = NEW.quantity - NEW.filled_quantity;
  NEW.updated_at = now();
  
  -- Update status based on filled quantity
  IF NEW.filled_quantity = 0 THEN
    NEW.status = 'open';
  ELSIF NEW.filled_quantity = NEW.quantity THEN
    NEW.status = 'filled';
    NEW.filled_at = now();
  ELSE
    NEW.status = 'partially_filled';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order updates
CREATE TRIGGER update_order_remaining_quantity_trigger
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_order_remaining_quantity();

-- Enable realtime for orders, trades, and order_book
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.trades REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Create function to get market ticker data
CREATE OR REPLACE FUNCTION public.get_market_ticker(market_symbol TEXT)
RETURNS TABLE(
  symbol TEXT,
  last_price NUMERIC,
  price_change_24h NUMERIC,
  price_change_percent_24h NUMERIC,
  high_24h NUMERIC,
  low_24h NUMERIC,
  volume_24h NUMERIC,
  count_24h BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH trade_stats AS (
    SELECT 
      t.symbol,
      t.price as last_price,
      MAX(t.price) as high_24h,
      MIN(t.price) as low_24h,
      SUM(t.quantity) as volume_24h,
      COUNT(*) as count_24h,
      FIRST_VALUE(t.price) OVER (ORDER BY t.trade_time ASC) as first_price_24h
    FROM public.trades t
    WHERE t.symbol = market_symbol
      AND t.trade_time >= now() - INTERVAL '24 hours'
    GROUP BY t.symbol, t.price
    ORDER BY MAX(t.trade_time) DESC
    LIMIT 1
  )
  SELECT 
    ts.symbol,
    ts.last_price,
    (ts.last_price - ts.first_price_24h) as price_change_24h,
    CASE 
      WHEN ts.first_price_24h > 0 
      THEN ((ts.last_price - ts.first_price_24h) / ts.first_price_24h) * 100 
      ELSE 0 
    END as price_change_percent_24h,
    ts.high_24h,
    ts.low_24h,
    ts.volume_24h,
    ts.count_24h
  FROM trade_stats ts;
END;
$$ LANGUAGE plpgsql STABLE;
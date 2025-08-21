-- Create orders table for trading history
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trading_pair_id UUID REFERENCES public.trading_pairs(id),
  symbol TEXT NOT NULL, -- e.g., 'BTC/USDT'
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  trading_type TEXT NOT NULL DEFAULT 'spot' CHECK (trading_type IN ('spot', 'futures')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  price NUMERIC, -- NULL for market orders
  filled_amount NUMERIC NOT NULL DEFAULT 0 CHECK (filled_amount >= 0),
  remaining_amount NUMERIC GENERATED ALWAYS AS (amount - filled_amount) STORED,
  average_price NUMERIC, -- Average execution price
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'partially_filled', 'rejected')),
  leverage INTEGER DEFAULT 1 CHECK (leverage >= 1 AND leverage <= 100), -- For futures trading
  stop_price NUMERIC, -- For stop orders
  total_value NUMERIC, -- Total order value
  fees_paid NUMERIC DEFAULT 0,
  fee_asset TEXT DEFAULT 'USDT',
  order_source TEXT DEFAULT 'web' CHECK (order_source IN ('web', 'mobile', 'api')),
  client_order_id TEXT, -- Optional client-provided order ID
  execution_reports JSONB DEFAULT '[]'::jsonb, -- Array of execution details
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional order metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  filled_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE -- For orders with expiration
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_symbol ON public.orders(symbol);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX idx_orders_user_symbol ON public.orders(user_id, symbol);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all orders" 
ON public.orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set filled_at when order becomes filled
  IF OLD.status != 'filled' AND NEW.status = 'filled' THEN
    NEW.filled_at = now();
  END IF;
  
  -- Set cancelled_at when order is cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();

-- Create trades table for executed trades
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buy_order_id UUID NOT NULL REFERENCES public.orders(id),
  sell_order_id UUID NOT NULL REFERENCES public.orders(id),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  trading_type TEXT NOT NULL DEFAULT 'spot' CHECK (trading_type IN ('spot', 'futures')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price > 0),
  total_value NUMERIC NOT NULL CHECK (total_value > 0),
  buyer_fee NUMERIC NOT NULL DEFAULT 0,
  seller_fee NUMERIC NOT NULL DEFAULT 0,
  fee_asset TEXT DEFAULT 'USDT',
  trade_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for trades table
CREATE INDEX idx_trades_buy_order_id ON public.trades(buy_order_id);
CREATE INDEX idx_trades_sell_order_id ON public.trades(sell_order_id);
CREATE INDEX idx_trades_buyer_id ON public.trades(buyer_id);
CREATE INDEX idx_trades_seller_id ON public.trades(seller_id);
CREATE INDEX idx_trades_symbol ON public.trades(symbol);
CREATE INDEX idx_trades_trade_time ON public.trades(trade_time DESC);

-- Enable RLS for trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS policies for trades
CREATE POLICY "Users can view own trades" 
ON public.trades 
FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admin can view all trades" 
ON public.trades 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to log admin actions for order management
CREATE OR REPLACE FUNCTION public.log_order_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM log_admin_action(
      'order_status_change',
      'orders',
      NEW.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create trading_fees table for configurable maker/taker fees
CREATE TABLE IF NOT EXISTS public.trading_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  market_id UUID REFERENCES public.markets(id),
  maker_fee NUMERIC(10,6) DEFAULT 0.001,  -- 0.1% default maker fee
  taker_fee NUMERIC(10,6) DEFAULT 0.001,  -- 0.1% default taker fee
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_fees ENABLE ROW LEVEL SECURITY;

-- Everyone can read trading fees
CREATE POLICY "Anyone can read trading fees"
ON public.trading_fees
FOR SELECT
USING (true);

-- Only admins can modify trading fees
CREATE POLICY "Admins can manage trading fees"
ON public.trading_fees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Insert default fees for existing markets
INSERT INTO public.trading_fees (symbol, maker_fee, taker_fee)
SELECT DISTINCT symbol, 0.001, 0.001
FROM public.orders
WHERE symbol IS NOT NULL
ON CONFLICT (symbol) DO NOTHING;

-- Add common trading pairs
INSERT INTO public.trading_fees (symbol, maker_fee, taker_fee)
VALUES 
  ('BTC/USDT', 0.001, 0.001),
  ('ETH/USDT', 0.001, 0.001),
  ('BNB/USDT', 0.001, 0.001),
  ('IPG/USDT', 0.001, 0.001),
  ('BSK/USDT', 0.001, 0.001)
ON CONFLICT (symbol) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_trading_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_trading_fees_timestamp
BEFORE UPDATE ON public.trading_fees
FOR EACH ROW
EXECUTE FUNCTION update_trading_fees_updated_at();

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_trading_fees_symbol ON public.trading_fees(symbol);

-- Grant appropriate permissions
GRANT SELECT ON public.trading_fees TO authenticated;
GRANT SELECT ON public.trading_fees TO anon;
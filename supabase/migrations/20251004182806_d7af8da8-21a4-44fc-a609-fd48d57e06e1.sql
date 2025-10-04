-- Create table to store real-time market prices
CREATE TABLE IF NOT EXISTS public.market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  current_price NUMERIC NOT NULL DEFAULT 0,
  price_change_24h NUMERIC NOT NULL DEFAULT 0,
  price_change_percentage_24h NUMERIC NOT NULL DEFAULT 0,
  high_24h NUMERIC NOT NULL DEFAULT 0,
  low_24h NUMERIC NOT NULL DEFAULT 0,
  volume_24h NUMERIC NOT NULL DEFAULT 0,
  market_cap NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access to market prices"
  ON public.market_prices
  FOR SELECT
  USING (true);

-- Create policy for system to update prices
CREATE POLICY "System can manage market prices"
  ON public.market_prices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_market_prices_market_id ON public.market_prices(market_id);
CREATE INDEX idx_market_prices_symbol ON public.market_prices(symbol);
CREATE INDEX idx_market_prices_last_updated ON public.market_prices(last_updated DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_market_prices_updated_at
  BEFORE UPDATE ON public.market_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
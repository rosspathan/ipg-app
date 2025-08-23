-- Create markets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  quote_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  tick_size NUMERIC NOT NULL DEFAULT 0.01,
  lot_size NUMERIC NOT NULL DEFAULT 0.001,
  min_notional NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_asset_id, quote_asset_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_markets_base_asset ON public.markets(base_asset_id);
CREATE INDEX IF NOT EXISTS idx_markets_quote_asset ON public.markets(quote_asset_id);
CREATE INDEX IF NOT EXISTS idx_markets_active ON public.markets(is_active);

-- Enable RLS
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for markets
CREATE OR REPLACE FUNCTION update_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_markets_updated_at_trigger ON public.markets;
CREATE TRIGGER update_markets_updated_at_trigger
  BEFORE UPDATE ON public.markets
  FOR EACH ROW
  EXECUTE FUNCTION update_markets_updated_at();

-- Update assets table to ensure is_active column exists
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
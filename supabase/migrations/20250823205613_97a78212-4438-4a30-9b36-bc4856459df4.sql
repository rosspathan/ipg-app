-- Fix RLS policies for markets table
DROP POLICY IF EXISTS "Public read access to active markets" ON public.markets;
DROP POLICY IF EXISTS "Admin full access to markets" ON public.markets;

CREATE POLICY "Public read access to active markets"
  ON public.markets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin full access to markets"
  ON public.markets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for assets to show only active ones to regular users
DROP POLICY IF EXISTS "Users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Public read access to active assets" ON public.assets;

CREATE POLICY "Public read access to active assets"
  ON public.assets FOR SELECT
  USING (is_active = true);

-- Fix function search path
CREATE OR REPLACE FUNCTION update_markets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.markets;
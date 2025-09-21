-- Create bonus_assets table for BSK tokens and other bonus assets
CREATE TABLE IF NOT EXISTS public.bonus_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 18,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bonus_assets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view active bonus assets" 
ON public.bonus_assets 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin can manage bonus assets" 
ON public.bonus_assets 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert BSK asset
INSERT INTO public.bonus_assets (symbol, name, decimals, is_active)
VALUES ('BSK', 'BSK Token', 18, true)
ON CONFLICT (symbol) DO NOTHING;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bonus_assets_updated_at
BEFORE UPDATE ON public.bonus_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
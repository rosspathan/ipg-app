-- Add fiat support to assets table
ALTER TABLE public.assets 
ADD COLUMN asset_type text DEFAULT 'crypto'::text,
ADD COLUMN initial_price numeric DEFAULT NULL,
ADD COLUMN price_currency text DEFAULT 'USD'::text;

-- Add constraint to ensure asset_type is valid
ALTER TABLE public.assets 
ADD CONSTRAINT valid_asset_type 
CHECK (asset_type IN ('crypto', 'fiat'));

-- Update network options to include fiat networks
-- For fiat assets, we can set network to the country/region
UPDATE public.assets SET asset_type = 'crypto' WHERE asset_type IS NULL;
-- Fix RLS policy for assets table to allow public read access
DROP POLICY IF EXISTS "Public read access to active assets" ON public.assets;

CREATE POLICY "Public read access to active assets"
ON public.assets
FOR SELECT
USING (is_active = true);

-- Also ensure RLS is enabled
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
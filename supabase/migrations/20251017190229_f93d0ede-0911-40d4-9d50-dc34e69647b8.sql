-- Create image_carousels table for dynamic home banners
CREATE TABLE IF NOT EXISTS public.image_carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  link_url TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_carousels ENABLE ROW LEVEL SECURITY;

-- Admin can manage carousels
CREATE POLICY "Admin can manage image carousels"
ON public.image_carousels
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view active carousels
CREATE POLICY "Users can view active carousels"
ON public.image_carousels
FOR SELECT
TO authenticated
USING (status = 'active');

-- Create updated_at trigger
CREATE TRIGGER update_image_carousels_updated_at
  BEFORE UPDATE ON public.image_carousels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.image_carousels;
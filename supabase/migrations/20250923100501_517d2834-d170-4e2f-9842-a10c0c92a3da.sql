-- Create assets bucket for public images like logos
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create policy for public read access to assets
CREATE POLICY "Public assets are viewable by everyone" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'assets');
-- Create storage bucket for program assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('program-assets', 'program-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for program assets
CREATE POLICY "Admin can manage program assets"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'program-assets' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can view program assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'program-assets');
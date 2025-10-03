-- Create storage bucket for ad media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-media',
  'ad-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

-- RLS policies for ad-media bucket
CREATE POLICY "Admins can upload ad media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ad-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update ad media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ad-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete ad media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ad-media' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view ad media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-media');

-- Add media_type column to ads table to track if it's image or video
ALTER TABLE ads 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video'));

-- Add comment to clarify new fields
COMMENT ON COLUMN ads.image_url IS 'Storage path for banner media (16:9) - can be image or video';
COMMENT ON COLUMN ads.square_image_url IS 'Storage path for square media (1:1) - can be image or video';
COMMENT ON COLUMN ads.media_type IS 'Type of media uploaded: image or video';
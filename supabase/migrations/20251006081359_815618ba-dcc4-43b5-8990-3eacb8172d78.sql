-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create user_avatars_new table
CREATE TABLE IF NOT EXISTS public.user_avatars_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  original_path TEXT NOT NULL,
  thumb_1x_path TEXT NOT NULL,
  thumb_2x_path TEXT,
  thumb_3x_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_avatars_new
ALTER TABLE public.user_avatars_new ENABLE ROW LEVEL SECURITY;

-- Users can view their own avatar records
CREATE POLICY "Users can view own avatar records"
ON public.user_avatars_new
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own avatar records
CREATE POLICY "Users can insert own avatar records"
ON public.user_avatars_new
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own avatar records
CREATE POLICY "Users can update own avatar records"
ON public.user_avatars_new
FOR UPDATE
USING (auth.uid() = user_id);

-- Storage policies for avatars bucket
-- Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars (since bucket is public)
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_avatars_new_user_id ON public.user_avatars_new(user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_avatar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_avatars_new_updated_at
  BEFORE UPDATE ON public.user_avatars_new
  FOR EACH ROW
  EXECUTE FUNCTION public.update_avatar_updated_at();
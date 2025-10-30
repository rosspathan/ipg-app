-- Create ad-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ad-images', 'ad-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Create RLS policies for ad-images bucket
CREATE POLICY "Public can view ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-images');

CREATE POLICY "Authenticated users can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can update ad images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ad-images' 
  AND (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    OR auth.uid() = owner
  )
);

CREATE POLICY "Admins can delete ad images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad-images' 
  AND (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    OR auth.uid() = owner
  )
);

-- Insert sample ads for testing
INSERT INTO ads (
  title, 
  image_url, 
  square_image_url,
  target_url, 
  reward_bsk, 
  required_view_time_seconds,
  status,
  placement,
  daily_impression_limit,
  max_impressions_per_user_per_day
) VALUES 
(
  'BSK Token Launch - Special Offer',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400',
  'https://bsk.exchange',
  5.0,
  30,
  'active',
  'home_top',
  10000,
  5
),
(
  'Trade Crypto - Win Rewards',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400',
  'https://bsk.exchange/trade',
  3.0,
  30,
  'active',
  'programs_banner',
  8000,
  5
),
(
  'Refer Friends - Earn BSK',
  'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800',
  'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400',
  'https://bsk.exchange/referrals',
  4.0,
  30,
  'active',
  'wallet_sidebar',
  5000,
  3
);

-- Insert sample spin segments for testing
INSERT INTO ismart_spin_segments (
  label,
  multiplier,
  weight,
  color_hex,
  position_order,
  is_active
) VALUES 
('Jackpot!', 10.0, 5, '#FFD700', 0, true),
('Big Win', 5.0, 10, '#FF6B6B', 1, true),
('Great!', 3.0, 15, '#4ECDC4', 2, true),
('Nice', 2.0, 25, '#95E1D3', 3, true),
('Win', 1.5, 30, '#A8E6CF', 4, true),
('Try Again', 0.5, 15, '#C7CEEA', 5, true)
ON CONFLICT DO NOTHING;
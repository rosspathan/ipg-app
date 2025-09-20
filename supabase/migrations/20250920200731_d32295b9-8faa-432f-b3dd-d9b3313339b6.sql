-- Insert a test ad banner for BSK rewards
INSERT INTO public.ads (
  title,
  image_url,
  square_image_url,
  target_url,
  reward_bsk,
  required_view_time,
  placement,
  status,
  max_impressions_per_user_per_day,
  created_by
) VALUES (
  'Earn Free BSK Tokens - Click to Win!',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=450&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop&crop=center',
  'https://lovable.dev',
  1.0,
  5,
  'home_top',
  'active',
  1,
  (SELECT id FROM auth.users WHERE email = 'rosspathan@gmail.com' LIMIT 1)
);

-- Insert another test ad for home_mid placement
INSERT INTO public.ads (
  title,
  image_url,
  square_image_url,
  target_url,
  reward_bsk,
  required_view_time,
  placement,
  status,
  max_impressions_per_user_per_day,
  created_by
) VALUES (
  'Double Your BSK Rewards Today!',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&h=450&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=400&fit=crop&crop=center',
  'https://docs.lovable.dev',
  1.0,
  8,
  'home_mid',
  'active',
  1,
  (SELECT id FROM auth.users WHERE email = 'rosspathan@gmail.com' LIMIT 1)
);

-- Ensure BSK asset exists in bonus_assets table
INSERT INTO public.bonus_assets (
  symbol,
  name,
  decimals,
  network,
  status,
  description
) VALUES (
  'BSK',
  'Bonus Reward Token',
  8,
  'OFFCHAIN',
  'active',
  'Platform reward token earned through activities'
) ON CONFLICT (symbol) DO NOTHING;

-- Insert BSK price for conversions
INSERT INTO public.bonus_prices (
  asset_id,
  price,
  base_symbol,
  recorded_by
) VALUES (
  (SELECT id FROM public.bonus_assets WHERE symbol = 'BSK' LIMIT 1),
  0.10,
  'USDT',
  (SELECT id FROM auth.users WHERE email = 'rosspathan@gmail.com' LIMIT 1)
) ON CONFLICT DO NOTHING;
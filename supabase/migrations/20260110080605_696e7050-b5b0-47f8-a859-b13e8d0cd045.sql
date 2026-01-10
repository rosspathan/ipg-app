-- Create profile for platform account (auth.users entry already exists)
INSERT INTO profiles (
  id,
  user_id,
  display_name,
  full_name,
  email,
  account_status,
  referral_code,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'Platform Fee Account',
  'Platform Fee Account',
  'platform-fees@internal.system',
  'active',
  'PLATFORM001',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;
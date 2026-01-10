-- Create platform fee account in auth.users (required for wallet_balances FK)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'platform-fees@internal.system',
  '',
  NOW(),
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Platform Fee Account"}',
  false,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;
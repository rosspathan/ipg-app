-- Fix missing referral relationship for fadohan843@hh7f.com

INSERT INTO referral_links_new (
  id,
  user_id,
  sponsor_id,
  sponsor_code_used,
  locked_at,
  created_at,
  updated_at,
  source
) VALUES (
  gen_random_uuid(),
  'f431b395-c33c-4b41-a386-ab9f307be793', -- fadohan843
  '8e203aff-a3c3-471a-90cc-e53bb18f95eb', -- banalasathish143
  '364415F7', -- banalasathish143's referral code
  NOW(),
  NOW(),
  NOW(),
  'manual_admin_fix'
);
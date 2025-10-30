-- Fix: Use correct user_id values from profiles.user_id, not profiles.id

-- Delete incorrect record
DELETE FROM referral_links_new 
WHERE user_id = 'f431b395-c33c-4b41-a386-ab9f307be793' 
AND sponsor_id = '8e203aff-a3c3-471a-90cc-e53bb18f95eb';

-- Insert correct record with proper user_id values
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
  '7ebd06dc-ae90-4e04-8d03-e0774d85192c', -- fadohan843's profiles.user_id
  '364415f7-fa4b-42ff-b416-8eab8e4402c4', -- banalasathish143's profiles.user_id
  '364415F7', -- banalasathish143's referral code
  NOW(),
  NOW(),
  NOW(),
  'manual_admin_fix'
);
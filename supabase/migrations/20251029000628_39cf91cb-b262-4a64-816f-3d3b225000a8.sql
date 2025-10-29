
-- Fix missing VIP badge record for user banalasathish143@gmail.com
-- Correct user_id: 364415f7-fa4b-42ff-b416-8eab8e4402c4

INSERT INTO user_badge_holdings (
  user_id, 
  current_badge, 
  price_bsk,
  unlock_levels,
  purchased_at
)
VALUES (
  '364415f7-fa4b-42ff-b416-8eab8e4402c4',
  'VIP',
  50,
  99,
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  current_badge = 'VIP',
  price_bsk = 50,
  updated_at = NOW();

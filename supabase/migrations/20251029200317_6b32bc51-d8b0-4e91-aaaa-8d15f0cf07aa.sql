-- Add Badge Subscription program module
INSERT INTO program_modules (
  key, 
  name, 
  category, 
  icon, 
  route, 
  status, 
  order_index,
  description
) VALUES (
  'badge-subscription',
  'Badge System',
  'rewards',
  'Shield',
  '/app/programs/badge-subscription',
  'live',
  10,
  'Unlock levels & earn more'
)
ON CONFLICT (key) DO NOTHING;
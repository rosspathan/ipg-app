-- Ensure we have the correct setup for the spin wheel feature with BSK bonus integration

-- First, let's make sure we have a default spin wheel with exactly 4 segments
INSERT INTO public.spin_wheels (
  id,
  name,
  is_active,
  ticket_price,
  ticket_currency,
  free_spins_daily,
  cooldown_seconds,
  max_spins_per_user,
  created_at
) VALUES (
  gen_random_uuid(),
  'BSK Fortune Wheel',
  true,
  0,
  'BSK',
  5,
  300, -- 5 minute cooldown
  0, -- unlimited spins
  now()
) ON CONFLICT DO NOTHING;

-- Get the wheel ID for segments setup
DO $$
DECLARE
  wheel_uuid uuid;
BEGIN
  SELECT id INTO wheel_uuid FROM public.spin_wheels WHERE name = 'BSK Fortune Wheel' LIMIT 1;
  
  -- Clear existing segments for this wheel
  DELETE FROM public.spin_segments WHERE wheel_id = wheel_uuid;
  
  -- Insert exactly 4 segments as specified
  INSERT INTO public.spin_segments (
    id,
    wheel_id,
    label,
    weight,
    reward_type,
    reward_value,
    reward_token,
    max_per_day,
    max_total,
    is_enabled,
    color
  ) VALUES 
  -- Segment 1: WIN 1×
  (
    gen_random_uuid(),
    wheel_uuid,
    'WIN 1×',
    25,
    'token',
    5,
    'BSK',
    0,
    0,
    true,
    '#00ff88'
  ),
  -- Segment 2: LOSE 0
  (
    gen_random_uuid(),
    wheel_uuid,
    'LOSE 0',
    25,
    'token',
    -5,
    'BSK',
    0,
    0,
    true,
    '#ff0066'
  ),
  -- Segment 3: WIN 1×
  (
    gen_random_uuid(),
    wheel_uuid,
    'WIN 1×',
    25,
    'token',
    5,
    'BSK',
    0,
    0,
    true,
    '#00ff88'
  ),
  -- Segment 4: LOSE 0
  (
    gen_random_uuid(),
    wheel_uuid,
    'LOSE 0',
    25,
    'token',
    -5,
    'BSK',
    0,
    0,
    true,
    '#ff0066'
  );
END $$;
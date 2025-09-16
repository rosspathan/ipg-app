-- Seed demo wheel and segments if none exist
DO $$
DECLARE
  wheel_id uuid;
BEGIN
  -- Only insert if no active wheels exist
  IF NOT EXISTS (SELECT 1 FROM spin_wheels WHERE is_active = true) THEN
    
    -- Insert demo wheel
    INSERT INTO spin_wheels (name, is_active, ticket_price, ticket_currency, free_spins_daily, cooldown_seconds, max_spins_per_user)
    VALUES ('Demo Wheel', true, 10, 'USDT', 3, 30, 0)
    RETURNING id INTO wheel_id;
    
    -- Insert demo segments
    INSERT INTO spin_segments (wheel_id, label, weight, reward_type, reward_value, reward_token, is_enabled) VALUES
    (wheel_id, '5 USDT', 10, 'token', 5, 'USDT', true),
    (wheel_id, '1 USDT', 25, 'token', 1, 'USDT', true),  
    (wheel_id, '10% Bonus', 10, 'percent_bonus', 10, null, true),
    (wheel_id, 'Try Again', 55, 'nothing', 0, null, true);
    
    RAISE NOTICE 'Demo wheel and segments created successfully';
  ELSE
    RAISE NOTICE 'Active wheels already exist, skipping seed';
  END IF;
END
$$;
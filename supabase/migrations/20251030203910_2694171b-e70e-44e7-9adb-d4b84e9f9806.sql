-- Insert sample draw templates for testing
INSERT INTO draw_templates (
  name,
  title,
  description,
  pool_size,
  ticket_price_bsk,
  prizes,
  fee_percent,
  is_active
) VALUES 
(
  'weekly-mega-jackpot',
  'Weekly Mega Jackpot',
  'Win up to 10,000 BSK! Draw happens every Sunday at 8 PM',
  100,
  50,
  '{"1st": 10000, "2nd": 5000, "3rd": 2000}'::jsonb,
  10.0,
  true
),
(
  'daily-mini-draw',
  'Daily Mini Draw',
  'Quick daily draw with guaranteed winners!',
  50,
  20,
  '{"1st": 500, "2nd": 200, "3rd": 100}'::jsonb,
  10.0,
  true
)
ON CONFLICT DO NOTHING;
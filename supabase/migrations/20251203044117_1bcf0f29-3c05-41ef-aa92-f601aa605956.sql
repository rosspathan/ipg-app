-- Update spin segments to 4 segments: 2x WIN 2x (green shades), 2x LOSE (red shades)
-- With 50% house edge via weights (WIN probability = 25%, EV = 0.50)

-- First, deactivate all existing segments
UPDATE spin_segments SET is_active = false;

-- Insert 4 new segments with correct weights for 50% house edge
-- WIN 2x probability = 25% total (12+13=25), LOSE probability = 75% total (37+38=75)
INSERT INTO spin_segments (label, multiplier, weight, color_hex, is_active)
VALUES 
  -- WIN 2x - Light Green
  ('WIN 2x', 2, 13, '#10b981', true),
  -- LOSE - Light Red  
  ('LOSE', 0, 38, '#ef4444', true),
  -- WIN 2x - Dark Green
  ('WIN 2x', 2, 12, '#059669', true),
  -- LOSE - Dark Red
  ('LOSE', 0, 37, '#dc2626', true);
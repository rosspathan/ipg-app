-- Update spin wheel segments for 50% house edge
-- RTP = 50%, House Edge = 50%

-- First, deactivate all existing segments
UPDATE spin_segments 
SET is_active = false, updated_at = now();

-- Insert new segments with 50% house edge configuration
INSERT INTO spin_segments (label, multiplier, weight, color_hex, is_active)
VALUES
  ('WIN x1.5', 1.5, 1, '#10b981', true),  -- Green - 20% probability
  ('WIN x1.0', 1.0, 1, '#3b82f6', true),  -- Blue - 20% probability
  ('LOSE', 0, 3, '#ef4444', true);        -- Red - 60% probability

-- Verification:
-- Total weight = 1 + 1 + 3 = 5
-- Expected RTP = (1/5 × 1.5) + (1/5 × 1.0) + (3/5 × 0) = 0.3 + 0.2 + 0 = 0.5 = 50%
-- House Edge = 100% - 50% = 50%
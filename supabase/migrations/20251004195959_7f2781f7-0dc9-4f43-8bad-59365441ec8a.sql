-- Set up 4-segment spin wheel config as requested
-- Ensures: min bet 100 BSK, max bet 1000 BSK, 5 free spins, 10 BSK post-free fee, 10% winner profit fee
-- Also ensures exactly four active segments: two WIN and two LOSE with equal weights

BEGIN;

-- 1) Ensure there is an active config with desired values
-- If there is no active config, insert one; otherwise update the active one
INSERT INTO public.spin_config (
  min_bet_bsk,
  max_bet_bsk,
  post_free_spin_fee_bsk,
  winner_profit_fee_percent,
  free_spins_per_user,
  is_active
)
SELECT 100, 1000, 10, 10, 5, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.spin_config WHERE is_active = true
);

-- Update active config to match requested values
UPDATE public.spin_config
SET 
  min_bet_bsk = 100,
  max_bet_bsk = 1000,
  post_free_spin_fee_bsk = 10,
  winner_profit_fee_percent = 10,
  free_spins_per_user = 5
WHERE is_active = true;

-- 2) Set segments to exactly 4 active entries: 2 WIN, 2 LOSE with equal weights
-- Deactivate existing active segments so only the following 4 remain active
UPDATE public.spin_segments SET is_active = false WHERE is_active = true;

-- Insert 4 fresh active segments (equal weights => 25% each)
-- Colors use existing hex-style column values for visual theming in the current renderer
INSERT INTO public.spin_segments (label, multiplier, weight, color_hex, is_active)
VALUES 
  ('WIN x2', 2, 1, '#22c55e', true),
  ('WIN x3', 3, 1, '#f59e0b', true),
  ('LOSE',   0, 1, '#ef4444', true),
  ('LOSE',   0, 1, '#ef4444', true);

COMMIT;
-- Add NONE badge to ensure Level 1 is always unlocked for everyone
-- This allows non-badge holders to earn team income on Level 1

INSERT INTO public.badge_thresholds (
  badge_name,
  bsk_threshold,
  unlock_levels,
  bonus_bsk_holding,
  description,
  is_active
) VALUES (
  'NONE',
  0,
  1,
  0,
  'Default badge - everyone gets Level 1 unlocked for direct referrals',
  true
)
ON CONFLICT (badge_name) 
DO UPDATE SET 
  unlock_levels = GREATEST(public.badge_thresholds.unlock_levels, 1),
  is_active = true;
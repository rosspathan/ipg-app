-- Set the default BSK bonus campaign to live status with appropriate dates
UPDATE public.bsk_bonus_campaigns 
SET 
  status = 'live',
  start_at = NOW(),
  end_at = NOW() + INTERVAL '30 days'
WHERE name = 'BSK One-Time Purchase — 50% Bonus' AND status = 'draft';
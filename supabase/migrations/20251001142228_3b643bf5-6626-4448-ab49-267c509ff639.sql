-- Fix BSK One-Time Purchase bonus destination
-- Spec: Bonus +50% to Holding (not Withdrawable)

UPDATE bsk_bonus_campaigns 
SET destination = 'holding',
    updated_at = now()
WHERE name = 'BSK One-Time Purchase — 50% Bonus'
  AND status = 'live';
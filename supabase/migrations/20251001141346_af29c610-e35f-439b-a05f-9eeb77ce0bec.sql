-- Fix Team Income Levels to match spec exactly
-- L21-30 should be 0.3 BSK (not 0.33)
-- L31-40 should be 0.2 BSK (not 0.25)  
-- L41-50 should be 0.1 BSK (not 0.2)

UPDATE team_income_levels 
SET bsk_reward = 0.3, updated_at = now()
WHERE level >= 21 AND level <= 30;

UPDATE team_income_levels
SET bsk_reward = 0.2, updated_at = now()
WHERE level >= 31 AND level <= 40;

UPDATE team_income_levels
SET bsk_reward = 0.1, updated_at = now()
WHERE level >= 41 AND level <= 50;
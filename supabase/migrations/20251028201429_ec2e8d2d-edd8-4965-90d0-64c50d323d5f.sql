-- Update team_referral_settings to only pay 10% commission to Level 1
-- Remove all multi-level commissions for badge purchases

UPDATE team_referral_settings
SET 
  level_percentages = '{"1": 10}'::jsonb,
  updated_at = now()
WHERE id IN (
  SELECT id FROM team_referral_settings 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Add a comment to clarify the purpose
COMMENT ON COLUMN team_referral_settings.level_percentages IS 'Badge purchase commissions: Only Level 1 (direct sponsor) receives 10%. Levels 2-50 are for team tracking only.';
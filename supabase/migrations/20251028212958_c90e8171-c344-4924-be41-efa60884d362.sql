-- Skip data migration, just add constraints
-- The frontend normalization will handle display properly

-- Add database constraints to prevent future invalid badge names
ALTER TABLE user_badge_holdings
DROP CONSTRAINT IF EXISTS valid_badge_name;

-- Don't add the constraint yet since we have "i-Smart VIP" in the database
-- ALTER TABLE user_badge_holdings
-- ADD CONSTRAINT valid_badge_name 
-- CHECK (current_badge IN ('Silver', 'Gold', 'Platinum', 'Diamond', 'VIP') OR current_badge IS NULL);

-- Update badge_thresholds table (this should work fine)
UPDATE badge_thresholds
SET badge_name = 'VIP',
    updated_at = now()
WHERE badge_name = 'i-Smart VIP';

-- Add constraint to badge_thresholds
ALTER TABLE badge_thresholds
DROP CONSTRAINT IF EXISTS valid_badge_name_threshold;

ALTER TABLE badge_thresholds
ADD CONSTRAINT valid_badge_name_threshold
CHECK (badge_name IN ('Silver', 'Gold', 'Platinum', 'Diamond', 'VIP', '') OR badge_name IS NULL);
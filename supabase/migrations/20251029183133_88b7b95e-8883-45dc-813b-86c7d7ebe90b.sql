-- ==========================================
-- BADGE PURCHASE INTEGRITY MIGRATION (FIXED)
-- Ensures only purchased badges are displayed
-- ==========================================

-- Add constraint: current_badge must be non-null if row exists
ALTER TABLE user_badge_holdings 
DROP CONSTRAINT IF EXISTS current_badge_must_exist;

ALTER TABLE user_badge_holdings 
ADD CONSTRAINT current_badge_must_exist 
CHECK (current_badge IS NOT NULL AND current_badge != '');

-- Add constraint: purchased_at must exist for all badge holdings
ALTER TABLE user_badge_holdings 
DROP CONSTRAINT IF EXISTS purchased_at_required;

ALTER TABLE user_badge_holdings 
ADD CONSTRAINT purchased_at_required 
CHECK (purchased_at IS NOT NULL);

-- Add index for faster badge lookups
CREATE INDEX IF NOT EXISTS idx_user_badge_holdings_user_current 
ON user_badge_holdings(user_id, current_badge);

-- Add index for purchased_at queries
CREATE INDEX IF NOT EXISTS idx_user_badge_holdings_purchased_at 
ON user_badge_holdings(purchased_at DESC);

-- Add comment explaining the table's purpose
COMMENT ON TABLE user_badge_holdings IS 
'Stores ONLY purchased badges. Users without entries have NO badge. This is the single source of truth for badge ownership.';

-- Add comment on current_badge column
COMMENT ON COLUMN user_badge_holdings.current_badge IS 
'The badge tier owned by the user. Must match a valid badge_name in badge_thresholds. NULL not allowed.';

-- Add comment on purchased_at column
COMMENT ON COLUMN user_badge_holdings.purchased_at IS 
'Timestamp when the badge was purchased. Required for all badge holdings to prevent phantom badges.';
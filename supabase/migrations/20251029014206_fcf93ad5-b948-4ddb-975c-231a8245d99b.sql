-- Drop the existing check constraint that prevents 0 BSK threshold
ALTER TABLE badge_thresholds DROP CONSTRAINT IF EXISTS valid_badge_name_threshold;

-- Fix "None" badge configuration to 0 BSK, 0 unlock levels
UPDATE badge_thresholds 
SET 
  badge_name = 'None',
  bsk_threshold = 0,
  unlock_levels = 0,
  is_active = true,
  bonus_bsk_holding = 0
WHERE badge_name = '' OR badge_name IS NULL OR LOWER(badge_name) = 'none';

-- Add new check constraint that allows 0 for None badge
ALTER TABLE badge_thresholds 
ADD CONSTRAINT valid_badge_name_threshold 
CHECK (
  (badge_name = 'None' AND bsk_threshold >= 0) OR
  (badge_name != 'None' AND bsk_threshold > 0)
);

-- Add is_kyc_approved column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_kyc_approved BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_approved 
ON profiles(is_kyc_approved) 
WHERE is_kyc_approved = TRUE;

-- Backfill existing approved users (cast user_id properly)
UPDATE profiles
SET is_kyc_approved = TRUE
WHERE user_id::text IN (
  SELECT user_id 
  FROM kyc_profiles_new 
  WHERE status = 'approved'
);

-- Function to validate badge purchases require KYC
CREATE OR REPLACE FUNCTION validate_badge_purchase_kyc()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = NEW.user_id 
    AND is_kyc_approved = TRUE
  ) THEN
    RAISE EXCEPTION 'KYC_REQUIRED: Cannot purchase badge without KYC approval'
      USING HINT = 'Complete KYC verification before purchasing badges';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to badge_purchases table
DROP TRIGGER IF EXISTS enforce_kyc_before_badge_purchase ON badge_purchases;
CREATE TRIGGER enforce_kyc_before_badge_purchase
  BEFORE INSERT ON badge_purchases
  FOR EACH ROW
  EXECUTE FUNCTION validate_badge_purchase_kyc();

-- Apply trigger to user_badge_holdings table
DROP TRIGGER IF EXISTS enforce_kyc_before_badge_holding ON user_badge_holdings;
CREATE TRIGGER enforce_kyc_before_badge_holding
  BEFORE INSERT OR UPDATE OF current_badge ON user_badge_holdings
  FOR EACH ROW
  WHEN (NEW.current_badge IS NOT NULL AND NEW.current_badge != 'None')
  EXECUTE FUNCTION validate_badge_purchase_kyc();

-- Admin utility to sync KYC approval status
CREATE OR REPLACE FUNCTION sync_kyc_approval_status()
RETURNS TABLE(updated_count INTEGER) AS $$
DECLARE
  count_updated INTEGER;
BEGIN
  UPDATE profiles
  SET is_kyc_approved = TRUE
  WHERE user_id::text IN (
    SELECT user_id 
    FROM kyc_profiles_new 
    WHERE status = 'approved'
  ) AND is_kyc_approved = FALSE;
  
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RETURN QUERY SELECT count_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN profiles.is_kyc_approved IS 'TRUE when user KYC is approved. Unlocks L1 team income and badge purchasing.';
COMMENT ON FUNCTION sync_kyc_approval_status() IS 'Admin utility: Sync is_kyc_approved flag with kyc_profiles_new.status';
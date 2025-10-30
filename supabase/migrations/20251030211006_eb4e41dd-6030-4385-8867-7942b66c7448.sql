-- Add foreign key constraint to ensure sponsor_id references valid profile
ALTER TABLE referral_links_new
DROP CONSTRAINT IF EXISTS fk_sponsor_profile;

ALTER TABLE referral_links_new
ADD CONSTRAINT fk_sponsor_profile
FOREIGN KEY (sponsor_id)
REFERENCES profiles(user_id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_referral_links_sponsor 
ON referral_links_new(sponsor_id) 
WHERE sponsor_id IS NOT NULL;

-- Add index for monitoring unlocked referrals
CREATE INDEX IF NOT EXISTS idx_referral_links_unlocked
ON referral_links_new(locked_at, created_at)
WHERE locked_at IS NULL AND sponsor_id IS NOT NULL;

-- Create helper function to find users missing referral tree
CREATE OR REPLACE FUNCTION find_users_missing_referral_tree()
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  sponsor_id uuid,
  locked_at timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.user_id,
    p.email,
    p.username,
    rl.sponsor_id,
    rl.locked_at,
    rl.created_at
  FROM referral_links_new rl
  INNER JOIN profiles p ON p.user_id = rl.user_id
  LEFT JOIN referral_tree rt ON rt.user_id = rl.user_id
  WHERE rl.sponsor_id IS NOT NULL
    AND rl.locked_at IS NOT NULL
    AND rt.user_id IS NULL
    AND rl.created_at > NOW() - INTERVAL '30 days'
  ORDER BY rl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_users_missing_referral_tree() TO service_role;
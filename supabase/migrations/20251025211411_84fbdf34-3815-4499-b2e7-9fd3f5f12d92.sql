-- Add direct_sponsor_id column to referral_tree
ALTER TABLE referral_tree 
ADD COLUMN IF NOT EXISTS direct_sponsor_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referral_tree_direct_sponsor 
ON referral_tree(direct_sponsor_id);

-- Populate direct_sponsor_id from referral_links_new for existing data
UPDATE referral_tree rt
SET direct_sponsor_id = rl.sponsor_id
FROM referral_links_new rl
WHERE rt.user_id = rl.user_id
  AND rt.direct_sponsor_id IS NULL
  AND rl.sponsor_id IS NOT NULL;
-- Add data integrity constraints and indexes for referral system

-- 1. Add foreign key constraints to ensure data consistency
-- Note: We'll add these as non-enforced first to avoid blocking existing bad data
-- Then clean up and enforce

-- Add foreign key from referral_links_new.user_id to profiles.user_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_links_new_user_id_fkey'
  ) THEN
    ALTER TABLE referral_links_new
    ADD CONSTRAINT referral_links_new_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key from referral_links_new.sponsor_id to profiles.user_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_links_new_sponsor_id_fkey'
  ) THEN
    ALTER TABLE referral_links_new
    ADD CONSTRAINT referral_links_new_sponsor_id_fkey
    FOREIGN KEY (sponsor_id) REFERENCES profiles(user_id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add unique constraint: each user can have at most one locked sponsor
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_links_new_user_locked 
ON referral_links_new(user_id) 
WHERE locked_at IS NOT NULL;

-- 3. Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_referral_links_new_sponsor_locked 
ON referral_links_new(sponsor_id, locked_at) 
WHERE locked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_tree_ancestor_level 
ON referral_tree(ancestor_id, level);

CREATE INDEX IF NOT EXISTS idx_referral_tree_user_level 
ON referral_tree(user_id, level);

CREATE INDEX IF NOT EXISTS idx_referral_tree_direct_sponsor 
ON referral_tree(direct_sponsor_id) 
WHERE level = 1;

-- 4. Add foreign keys for referral_tree
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_tree_user_id_fkey'
  ) THEN
    ALTER TABLE referral_tree
    ADD CONSTRAINT referral_tree_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_tree_ancestor_id_fkey'
  ) THEN
    ALTER TABLE referral_tree
    ADD CONSTRAINT referral_tree_ancestor_id_fkey
    FOREIGN KEY (ancestor_id) REFERENCES profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referral_tree_direct_sponsor_id_fkey'
  ) THEN
    ALTER TABLE referral_tree
    ADD CONSTRAINT referral_tree_direct_sponsor_id_fkey
    FOREIGN KEY (direct_sponsor_id) REFERENCES profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END $$;
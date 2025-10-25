-- Phase 1: Fix Referral Tree Structure

-- 1.1: Remove duplicate tree entries (keep only the earliest/correct one per user-level)
DELETE FROM referral_tree a
USING referral_tree b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.level = b.level;

-- 1.2: Create function to auto-build referral tree when sponsor is locked
CREATE OR REPLACE FUNCTION auto_build_referral_tree()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_sponsor_id UUID;
  v_current_user_id UUID;
  v_level INT := 1;
  v_ancestors UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Only trigger when locked_at is set for the first time
  IF NEW.locked_at IS NOT NULL AND OLD.locked_at IS NULL AND NEW.sponsor_id IS NOT NULL THEN
    
    v_current_user_id := NEW.user_id;
    v_current_sponsor_id := NEW.sponsor_id;
    
    -- Delete any existing tree entries for this user (cleanup)
    DELETE FROM referral_tree WHERE user_id = v_current_user_id;
    
    -- Walk up the sponsor chain up to 50 levels
    WHILE v_current_sponsor_id IS NOT NULL AND v_level <= 50 LOOP
      
      -- Add this ancestor to the array
      v_ancestors := v_ancestors || v_current_sponsor_id;
      
      -- Insert tree entry for this level
      INSERT INTO referral_tree (user_id, ancestor_id, level, path)
      VALUES (v_current_user_id, v_current_sponsor_id, v_level, v_ancestors);
      
      -- Get the next sponsor up the chain
      SELECT sponsor_id INTO v_current_sponsor_id
      FROM referral_links_new
      WHERE user_id = v_current_sponsor_id
      LIMIT 1;
      
      v_level := v_level + 1;
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on referral_links_new
DROP TRIGGER IF EXISTS trigger_auto_build_referral_tree ON referral_links_new;
CREATE TRIGGER trigger_auto_build_referral_tree
AFTER UPDATE ON referral_links_new
FOR EACH ROW
EXECUTE FUNCTION auto_build_referral_tree();

-- 1.3: Rebuild missing tree entries for existing users
DO $$
DECLARE
  v_user RECORD;
  v_current_sponsor_id UUID;
  v_level INT;
  v_ancestors UUID[];
BEGIN
  -- Find all users with sponsors but missing or incomplete tree entries
  FOR v_user IN 
    SELECT DISTINCT rln.user_id, rln.sponsor_id
    FROM referral_links_new rln
    WHERE rln.sponsor_id IS NOT NULL
      AND rln.locked_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM referral_tree rt
        WHERE rt.user_id = rln.user_id
        AND rt.level = 1
        AND rt.ancestor_id = rln.sponsor_id
      )
  LOOP
    
    -- Delete any partial tree entries
    DELETE FROM referral_tree WHERE user_id = v_user.user_id;
    
    v_current_sponsor_id := v_user.sponsor_id;
    v_level := 1;
    v_ancestors := ARRAY[]::UUID[];
    
    -- Build the complete tree path
    WHILE v_current_sponsor_id IS NOT NULL AND v_level <= 50 LOOP
      
      v_ancestors := v_ancestors || v_current_sponsor_id;
      
      INSERT INTO referral_tree (user_id, ancestor_id, level, path)
      VALUES (v_user.user_id, v_current_sponsor_id, v_level, v_ancestors);
      
      -- Get next sponsor
      SELECT sponsor_id INTO v_current_sponsor_id
      FROM referral_links_new
      WHERE user_id = v_current_sponsor_id
      LIMIT 1;
      
      v_level := v_level + 1;
    END LOOP;
    
  END LOOP;
END;
$$;

-- Add index to improve referral tree queries
CREATE INDEX IF NOT EXISTS idx_referral_tree_path ON referral_tree USING GIN(path);
CREATE INDEX IF NOT EXISTS idx_referral_tree_user_level ON referral_tree(user_id, level);
CREATE INDEX IF NOT EXISTS idx_referral_links_new_sponsor ON referral_links_new(sponsor_id) WHERE sponsor_id IS NOT NULL;
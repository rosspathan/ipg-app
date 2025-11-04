-- Fix referral_tree RLS policies for user visibility
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view own referral tree" ON public.referral_tree;

-- Create new policy that allows users to see their entire downline tree
CREATE POLICY "Users can view their downline tree" ON public.referral_tree
  FOR SELECT 
  USING (
    -- User can see rows where they are the ancestor (their downline)
    auth.uid() = ancestor_id
    OR
    -- User can see their own row
    auth.uid() = user_id
    OR
    -- Admins can see everything
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create function to build/rebuild referral tree for a user
CREATE OR REPLACE FUNCTION public.build_user_referral_tree(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
  v_current_level INTEGER := 1;
  v_found_count INTEGER;
BEGIN
  -- Clear existing tree for this user
  DELETE FROM referral_tree WHERE ancestor_id = p_user_id;
  
  -- Level 1: Direct referrals
  WITH level_1 AS (
    INSERT INTO referral_tree (user_id, ancestor_id, level, path, direct_sponsor_id)
    SELECT 
      rl.user_id,
      p_user_id,
      1,
      ARRAY[p_user_id, rl.user_id],
      p_user_id -- The ancestor is the direct sponsor for level 1
    FROM referral_links_new rl
    WHERE rl.sponsor_id = p_user_id
      AND rl.locked_at IS NOT NULL -- Only locked (confirmed) referrals
    ON CONFLICT (user_id, ancestor_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_found_count FROM level_1;
  
  v_inserted_count := v_inserted_count + v_found_count;
  
  -- Loop through levels 2-50
  WHILE v_found_count > 0 AND v_current_level < 50 LOOP
    v_current_level := v_current_level + 1;
    
    WITH next_level AS (
      INSERT INTO referral_tree (user_id, ancestor_id, level, path, direct_sponsor_id)
      SELECT DISTINCT
        rl.user_id,
        p_user_id,
        v_current_level,
        rt.path || rl.user_id,
        rl.sponsor_id -- Direct sponsor is preserved
      FROM referral_tree rt
      JOIN referral_links_new rl ON rl.sponsor_id = rt.user_id
      WHERE rt.ancestor_id = p_user_id
        AND rt.level = v_current_level - 1
        AND rl.locked_at IS NOT NULL
        AND NOT (rl.user_id = ANY(rt.path)) -- Prevent cycles
      ON CONFLICT (user_id, ancestor_id) DO NOTHING
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_found_count FROM next_level;
    
    v_inserted_count := v_inserted_count + v_found_count;
  END LOOP;
  
  RETURN v_inserted_count;
END;
$$;

-- Create function to auto-build tree when new referral is created
CREATE OR REPLACE FUNCTION public.auto_build_referral_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a referral is locked (confirmed), rebuild trees
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') 
     AND NEW.sponsor_id IS NOT NULL 
     AND NEW.locked_at IS NOT NULL 
     AND (OLD IS NULL OR OLD.locked_at IS NULL) THEN
    
    -- Build tree for the sponsor (adds this new referee to their downline)
    PERFORM build_user_referral_tree(NEW.sponsor_id);
    
    -- Also rebuild trees for all ancestors of the sponsor
    PERFORM build_user_referral_tree(ancestor_id)
    FROM referral_tree
    WHERE user_id = NEW.sponsor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on the actual base table (referral_links_new)
DROP TRIGGER IF EXISTS trigger_auto_build_referral_tree ON referral_links_new;
CREATE TRIGGER trigger_auto_build_referral_tree
  AFTER INSERT OR UPDATE OF locked_at ON referral_links_new
  FOR EACH ROW
  EXECUTE FUNCTION auto_build_referral_tree();

-- Build initial trees for all users who have referrals
DO $$
DECLARE
  v_sponsor RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Building referral trees for all sponsors...';
  
  FOR v_sponsor IN 
    SELECT DISTINCT sponsor_id 
    FROM referral_links_new 
    WHERE sponsor_id IS NOT NULL 
      AND locked_at IS NOT NULL
  LOOP
    SELECT build_user_referral_tree(v_sponsor.sponsor_id) INTO v_count;
    RAISE NOTICE 'Built tree for sponsor %: % entries', v_sponsor.sponsor_id, v_count;
  END LOOP;
  
  RAISE NOTICE 'Referral tree rebuild complete!';
END $$;
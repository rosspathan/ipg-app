-- Function to check if viewer can see profile
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_user_id uuid, viewer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User can see own profile
    SELECT 1 WHERE profile_user_id = viewer_id
    
    UNION
    
    -- User can see their downline members
    SELECT 1 FROM referral_tree 
    WHERE user_id = profile_user_id 
    AND ancestor_id = viewer_id
    
    UNION
    
    -- Admin can see all
    SELECT 1 WHERE has_role(viewer_id, 'admin'::app_role)
  );
$$;

-- Add new policy to allow users to view downline member profiles
DROP POLICY IF EXISTS "Users can view downline member profiles" ON profiles;
CREATE POLICY "Users can view downline member profiles"
ON profiles FOR SELECT
TO authenticated
USING (can_view_profile(user_id, auth.uid()));

-- Add performance indexes for faster downline lookups
CREATE INDEX IF NOT EXISTS idx_referral_tree_ancestor_user 
ON referral_tree(ancestor_id, user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);
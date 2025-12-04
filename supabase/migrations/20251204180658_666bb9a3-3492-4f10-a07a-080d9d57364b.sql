-- Add RLS policy allowing sponsors to view their team members' join dates in referral_links_new
-- This fixes the issue where sponsors can't see join dates of their downline members

-- First, drop the existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Sponsors can view team member join dates" ON referral_links_new;

-- Create policy that allows:
-- 1. Users to see their own referral link (existing behavior)
-- 2. Direct sponsors to see their direct referrals' join dates
-- 3. Ancestor sponsors (via referral_tree) to see their downline's join dates
CREATE POLICY "Sponsors can view team member join dates"
ON referral_links_new FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()  -- Own record
  OR sponsor_id = auth.uid()  -- Direct sponsor
  OR EXISTS (
    SELECT 1 FROM referral_tree 
    WHERE referral_tree.user_id = referral_links_new.user_id 
    AND referral_tree.ancestor_id = auth.uid()
  )
);
-- Drop and recreate the referral_relationships view with SECURITY INVOKER
-- This ensures the view runs with the permissions of the querying user, not the view creator

DROP VIEW IF EXISTS public.referral_relationships;

CREATE VIEW public.referral_relationships
WITH (security_invoker = true)
AS
SELECT 
  p1.user_id AS referee_id,
  p1.username AS referee_username,
  p1.referral_code AS referee_code,
  rl.sponsor_id,
  p2.username AS sponsor_username,
  p2.referral_code AS sponsor_code,
  rl.sponsor_code_used,
  rl.locked_at,
  rl.first_touch_at,
  rl.source
FROM referral_links_new rl
JOIN profiles p1 ON rl.user_id = p1.user_id
LEFT JOIN profiles p2 ON rl.sponsor_id = p2.user_id;

-- Add comment to document the security model
COMMENT ON VIEW public.referral_relationships IS 
'View of referral relationships with SECURITY INVOKER - executes with permissions of the calling user, respecting RLS policies on underlying tables';

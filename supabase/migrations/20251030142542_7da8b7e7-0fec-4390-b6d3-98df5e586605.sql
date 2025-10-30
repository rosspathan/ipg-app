-- Create secure function to fetch badges for user's downline
-- This bypasses RLS by using SECURITY DEFINER while still being safe
-- because it's scoped to only return the caller's descendants
CREATE OR REPLACE FUNCTION public.get_downline_badges()
RETURNS TABLE (
  user_id uuid,
  current_badge text,
  purchased_at timestamptz,
  price_bsk numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH downline AS (
    SELECT user_id
    FROM referral_tree
    WHERE ancestor_id = auth.uid()
  ),
  latest AS (
    SELECT DISTINCT ON (ubh.user_id)
      ubh.user_id,
      ubh.current_badge,
      ubh.purchased_at,
      ubh.price_bsk
    FROM user_badge_holdings ubh
    JOIN downline d ON d.user_id = ubh.user_id
    ORDER BY ubh.user_id, ubh.purchased_at DESC
  )
  SELECT * FROM latest;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_downline_badges() TO authenticated;
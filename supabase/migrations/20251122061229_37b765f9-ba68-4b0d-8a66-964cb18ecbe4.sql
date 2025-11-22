-- Create helper function to get missing referrals for admin
CREATE OR REPLACE FUNCTION get_missing_referrals()
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.email,
    p.phone,
    p.created_at,
    'MISSING_LINK'::TEXT as status
  FROM profiles p
  LEFT JOIN referral_links_new rln ON rln.user_id = p.id
  WHERE rln.user_id IS NULL
    AND p.created_at > '2025-11-01'::timestamptz
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (admin will be checked in RLS)
GRANT EXECUTE ON FUNCTION get_missing_referrals() TO authenticated;
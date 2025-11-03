-- Drop existing function first
DROP FUNCTION IF EXISTS public.lookup_user_by_referral_code(TEXT);

-- Recreate function with correct fields to return username and display_name
CREATE OR REPLACE FUNCTION public.lookup_user_by_referral_code(p_referral_code TEXT)
RETURNS TABLE(user_id UUID, referral_code TEXT, username TEXT, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if it's a UUID (direct user_id reference - new system)
  IF p_referral_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT 
      p.user_id,
      p.referral_code,
      p.username,
      p.display_name
    FROM profiles p
    WHERE p.user_id = p_referral_code::UUID
    LIMIT 1;
  ELSE
    -- Legacy short code lookup
    RETURN QUERY
    SELECT 
      p.user_id,
      p.referral_code,
      p.username,
      p.display_name
    FROM profiles p
    WHERE p.referral_code = UPPER(p_referral_code)
    LIMIT 1;
  END IF;
END;
$$;

-- Grant execute to anonymous users (for signup) and authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_user_by_referral_code(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.lookup_user_by_referral_code(TEXT) IS 'Safely lookup user by referral code for signup validation. Returns username and display_name for sponsor confirmation.';
-- Helper function to get user display information
CREATE OR REPLACE FUNCTION get_user_display_info(p_user_id uuid)
RETURNS TABLE (
  display_name text,
  username text,
  email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.display_name, p.full_name, p.username, p.email) as display_name,
    p.username,
    p.email
  FROM profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1;
END;
$$;
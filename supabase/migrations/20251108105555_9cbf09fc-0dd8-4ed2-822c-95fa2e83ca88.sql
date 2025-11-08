-- Re-create admin account profile and role for rosspathan@gmail.com
-- Note: The user must sign up again first, then run this migration with their new user_id

-- This is a template - you'll need to update the user_id after signing up
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user_id for rosspathan@gmail.com from auth.users
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'rosspathan@gmail.com';
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'User rosspathan@gmail.com not found. Please sign up first at /auth';
  ELSE
    -- Create profile if missing
    INSERT INTO profiles (user_id, email, created_at)
    VALUES (admin_user_id, 'rosspathan@gmail.com', now())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Grant admin role
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin account restored for rosspathan@gmail.com';
  END IF;
END $$;
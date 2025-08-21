-- Create admin user and assign admin role
-- First, we need to create the user in auth.users (this will be done via signup)
-- Then assign admin role to the user with email rosspathan@gmail.com

-- Function to assign admin role to a specific email after signup
CREATE OR REPLACE FUNCTION assign_admin_role_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the new user's email is the admin email
  IF NEW.email = 'rosspathan@gmail.com' THEN
    -- Insert admin role for this user
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'admin'::app_role, NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign admin role when rosspathan@gmail.com signs up
DROP TRIGGER IF EXISTS auto_assign_admin_role ON auth.users;
CREATE TRIGGER auto_assign_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_admin_role_to_email();
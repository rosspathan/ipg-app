-- Fix search path for the assign_admin_role_to_email function
CREATE OR REPLACE FUNCTION assign_admin_role_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
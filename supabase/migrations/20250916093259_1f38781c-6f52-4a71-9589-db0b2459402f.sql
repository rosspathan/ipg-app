-- Create default admin user via function call
SELECT * FROM public.create_default_admin() LIMIT 1;

-- Function to create default admin (if doesn't exist)
CREATE OR REPLACE FUNCTION public.create_default_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
  result jsonb;
BEGIN
  -- Check if default admin already exists
  SELECT user_id INTO admin_user_id 
  FROM user_roles 
  WHERE role = 'admin'::app_role 
  AND user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@ipg-app.com'
  );

  IF admin_user_id IS NOT NULL THEN
    result = jsonb_build_object(
      'success', true,
      'message', 'Default admin already exists',
      'admin_email', 'admin@ipg-app.com',
      'existing', true
    );
  ELSE
    -- Create placeholder entry - actual user creation happens in edge function
    result = jsonb_build_object(
      'success', true,
      'message', 'Default admin setup initiated',
      'admin_email', 'admin@ipg-app.com',
      'admin_password', 'admin123',
      'existing', false,
      'instructions', 'Run the admin-create-default edge function to create the actual user account'
    );
  END IF;

  RETURN result;
END;
$$;

-- Update system settings with better SMTP configuration
UPDATE system_settings 
SET value = 'IPG i-SMART Admin <admin@ipg-app.com>'
WHERE key = 'smtp_from_email';

INSERT INTO system_settings (key, value, description) VALUES
('app_name', 'IPG i-SMART', 'Application name for emails'),
('app_url', 'https://app.ipg-smart.com', 'Application base URL'),
('support_email', 'support@ipg-app.com', 'Support contact email')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
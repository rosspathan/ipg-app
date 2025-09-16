-- Create default admin credentials and update existing admin setup
-- 1. Ensure we have a default admin user
DO $$
BEGIN
  -- Insert or update admin user with default credentials
  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'admin@ipg-app.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"IPG Admin"}',
    false,
    '',
    ''
  ) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('admin123', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now();

  -- Ensure admin role exists for this user
  INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
  VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin'::app_role,
    '00000000-0000-0000-0000-000000000001'::uuid,
    now()
  ) ON CONFLICT (user_id, role) DO NOTHING;

  -- Also ensure rosspathan@gmail.com has admin role if it exists
  INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
  SELECT u.id, 'admin'::app_role, u.id, now()
  FROM auth.users u
  WHERE u.email = 'rosspathan@gmail.com'
  ON CONFLICT (user_id, role) DO NOTHING;
  
END $$;

-- Update email verification settings
-- Enable email confirmation in auth settings
UPDATE auth.config SET 
  enable_signup = true,
  enable_email_confirmations = true
WHERE true;

-- Create SMTP configuration placeholder (admin will need to update these)
INSERT INTO public.system_settings (key, value, description, updated_at) VALUES
  ('smtp_host', 'smtp.gmail.com', 'SMTP server hostname', now()),
  ('smtp_port', '587', 'SMTP server port', now()),
  ('smtp_user', 'admin@ipg-app.com', 'SMTP username/email', now()),
  ('smtp_password', 'your-app-password-here', 'SMTP password (update this!)', now()),
  ('smtp_from_email', 'admin@ipg-app.com', 'From email address', now()),
  ('smtp_from_name', 'IPG i-SMART', 'From name', now())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system settings
CREATE POLICY "admin_manage_settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create email verification tracking
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own verifications
CREATE POLICY "users_own_verifications" ON public.email_verifications
  FOR ALL USING (auth.uid() = user_id);

-- Create INR funding routes table for admin management  
CREATE TABLE IF NOT EXISTS public.inr_funding_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_type text NOT NULL CHECK (route_type IN ('bank', 'upi')),
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  priority integer DEFAULT 1,
  
  -- Bank details
  bank_name text,
  account_name text,
  account_number text,
  ifsc_code text,
  
  -- UPI details  
  upi_id text,
  upi_name text,
  
  -- Common fields
  notes text,
  min_amount numeric DEFAULT 100,
  max_amount numeric DEFAULT 1000000,
  fee_percent numeric DEFAULT 0,
  fee_fixed numeric DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inr_funding_routes ENABLE ROW LEVEL SECURITY;

-- Admin can manage all routes
CREATE POLICY "admin_manage_inr_routes" ON public.inr_funding_routes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view active routes
CREATE POLICY "users_view_active_routes" ON public.inr_funding_routes
  FOR SELECT USING (is_active = true);

-- Insert default INR funding routes
INSERT INTO public.inr_funding_routes (
  route_type, is_active, is_default, priority,
  bank_name, account_name, account_number, ifsc_code,
  notes, min_amount, max_amount
) VALUES (
  'bank', true, true, 1,
  'State Bank of India', 'IPG i-SMART Deposits', '1234567890123456', 'SBIN0001234',
  'Default bank account for INR deposits', 100, 500000
) ON CONFLICT DO NOTHING;

INSERT INTO public.inr_funding_routes (
  route_type, is_active, is_default, priority,
  upi_id, upi_name,
  notes, min_amount, max_amount
) VALUES (
  'upi', true, false, 2,
  'ipg-deposits@paytm', 'IPG Deposits',
  'UPI payments for quick deposits', 50, 100000
) ON CONFLICT DO NOTHING;
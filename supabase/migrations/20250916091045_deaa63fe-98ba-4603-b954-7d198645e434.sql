-- Create system configuration and admin management tables
-- 1. Create system_settings table for SMTP and other configs
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
DROP POLICY IF EXISTS "admin_manage_settings" ON public.system_settings;
CREATE POLICY "admin_manage_settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert SMTP configuration placeholders
INSERT INTO public.system_settings (key, value, description, updated_at) VALUES
  ('smtp_host', 'smtp.gmail.com', 'SMTP server hostname', now()),
  ('smtp_port', '587', 'SMTP server port', now()),
  ('smtp_user', 'admin@ipg-app.com', 'SMTP username/email', now()),
  ('smtp_password', 'your-app-password-here', 'SMTP password (update this!)', now()),
  ('smtp_from_email', 'admin@ipg-app.com', 'From email address', now()),
  ('smtp_from_name', 'IPG i-SMART', 'From name', now()),
  ('app_name', 'IPG i-SMART', 'Application name', now()),
  ('email_verification_enabled', 'true', 'Enable email verification for new users', now())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- 2. Create INR funding routes table for admin management  
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
DROP POLICY IF EXISTS "admin_manage_inr_routes" ON public.inr_funding_routes;
CREATE POLICY "admin_manage_inr_routes" ON public.inr_funding_routes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view active routes
DROP POLICY IF EXISTS "users_view_active_routes" ON public.inr_funding_routes;
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
  'Default bank account for INR deposits - DEMO ACCOUNT', 100, 500000
) ON CONFLICT DO NOTHING;

INSERT INTO public.inr_funding_routes (
  route_type, is_active, is_default, priority,
  upi_id, upi_name,
  notes, min_amount, max_amount
) VALUES (
  'upi', true, false, 2,
  'ipg-deposits@paytm', 'IPG Deposits',
  'UPI payments for quick deposits - DEMO ACCOUNT', 50, 100000
) ON CONFLICT DO NOTHING;

-- 3. Create support tickets and messages if not exist
CREATE TABLE IF NOT EXISTS public.support_ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.support_ticket_categories (name, description) VALUES
  ('Technical Support', 'Issues with app functionality, bugs, errors'),
  ('Account Issues', 'Login problems, account access, verification'),
  ('Deposits & Withdrawals', 'Questions about funding and withdrawals'),
  ('Trading Support', 'Help with trading, orders, markets'),
  ('General Inquiries', 'General questions and information'),
  ('Complaints', 'Complaints and feedback about service')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.support_ticket_categories ENABLE ROW LEVEL SECURITY;

-- Users can view active categories
DROP POLICY IF EXISTS "users_view_categories" ON public.support_ticket_categories;
CREATE POLICY "users_view_categories" ON public.support_ticket_categories
  FOR SELECT USING (is_active = true);

-- Admin can manage categories
DROP POLICY IF EXISTS "admin_manage_categories" ON public.support_ticket_categories;
CREATE POLICY "admin_manage_categories" ON public.support_ticket_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inr_funding_routes_updated_at ON public.inr_funding_routes;
CREATE TRIGGER update_inr_funding_routes_updated_at
    BEFORE UPDATE ON public.inr_funding_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
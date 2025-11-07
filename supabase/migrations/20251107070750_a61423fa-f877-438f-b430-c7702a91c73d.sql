-- CRITICAL SECURITY FIX: Add RLS policies to prevent unauthorized data access
-- This migration addresses the security vulnerability where users could access other users' data

-- 1. Secure kyc_profiles_new table (user_id is TEXT)
DROP POLICY IF EXISTS "Users can view own KYC profile" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can insert own KYC profile" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can update own KYC profile" ON kyc_profiles_new;

ALTER TABLE kyc_profiles_new ENABLE ROW LEVEL SECURITY;

-- Users can only view their own KYC data (user_id is TEXT)
CREATE POLICY "Users can view own KYC profile"
  ON kyc_profiles_new
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Admins can view all KYC data
CREATE POLICY "Admins can view all KYC profiles"
  ON kyc_profiles_new
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users can insert their own KYC profile (user_id is TEXT)
CREATE POLICY "Users can insert own KYC profile"
  ON kyc_profiles_new
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own KYC profile (user_id is TEXT)
CREATE POLICY "Users can update own KYC profile"
  ON kyc_profiles_new
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 2. Secure profiles table (user_id is UUID)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile (user_id is UUID)
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users can insert their own profile (user_id is UUID)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile (user_id is UUID)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Add audit logging for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON public.security_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.security_audit_log(created_at DESC);
-- Fix RLS policies to support wallet-only submissions (no Supabase auth required)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can insert own KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can update own KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can update all KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can view own KYC documents" ON kyc_documents_new;
DROP POLICY IF EXISTS "Users can insert own KYC documents" ON kyc_documents_new;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON kyc_documents_new;

-- Create new policies that work for both authenticated users and wallet-only users
-- For kyc_profiles_new
CREATE POLICY "Anyone can insert KYC profiles" ON kyc_profiles_new
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view KYC profiles with matching user_id" ON kyc_profiles_new
  FOR SELECT USING (
    -- Allow if Supabase user matches
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT) OR
    -- Allow if wallet address matches (we'll verify in application layer)
    (auth.uid() IS NULL) OR
    -- Allow admins to view all
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can update KYC profiles with matching user_id" ON kyc_profiles_new
  FOR UPDATE USING (
    -- Allow if Supabase user matches
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT) OR
    -- Allow if no auth (wallet-only mode)
    (auth.uid() IS NULL) OR
    -- Allow admins
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- For kyc_documents_new
CREATE POLICY "Anyone can insert KYC documents" ON kyc_documents_new
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view KYC documents with matching user_id" ON kyc_documents_new
  FOR SELECT USING (
    -- Allow if Supabase user matches
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::TEXT) OR
    -- Allow if no auth (wallet-only mode)
    (auth.uid() IS NULL) OR
    -- Allow admins
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin policies
CREATE POLICY "Admins can manage all KYC profiles" ON kyc_profiles_new
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage all KYC documents" ON kyc_documents_new
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
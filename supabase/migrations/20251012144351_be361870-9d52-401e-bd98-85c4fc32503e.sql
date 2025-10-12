-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can insert own KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can update own KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can update all KYC profiles" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can view own KYC documents" ON kyc_documents_new;
DROP POLICY IF EXISTS "Users can insert own KYC documents" ON kyc_documents_new;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON kyc_documents_new;

-- Step 2: Drop foreign key constraints
ALTER TABLE kyc_profiles_new DROP CONSTRAINT IF EXISTS kyc_profiles_new_user_id_fkey;
ALTER TABLE kyc_documents_new DROP CONSTRAINT IF EXISTS kyc_documents_new_user_id_fkey;

-- Step 3: Change column type to TEXT
ALTER TABLE kyc_profiles_new ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE kyc_documents_new ALTER COLUMN user_id TYPE TEXT;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_kyc_profiles_user_id;
DROP INDEX IF EXISTS idx_kyc_documents_user_id;
CREATE INDEX idx_kyc_profiles_user_id ON kyc_profiles_new(user_id);
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents_new(user_id);

-- Step 5: Recreate RLS policies for both UUID and wallet addresses
CREATE POLICY "Users can view own KYC profiles" ON kyc_profiles_new
  FOR SELECT USING (
    user_id = auth.uid()::TEXT OR 
    user_id IN (SELECT wallet_address FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own KYC profiles" ON kyc_profiles_new
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::TEXT OR 
    user_id IN (SELECT wallet_address FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own KYC profiles" ON kyc_profiles_new
  FOR UPDATE USING (
    user_id = auth.uid()::TEXT OR 
    user_id IN (SELECT wallet_address FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own KYC documents" ON kyc_documents_new
  FOR SELECT USING (
    user_id = auth.uid()::TEXT OR 
    user_id IN (SELECT wallet_address FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own KYC documents" ON kyc_documents_new
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::TEXT OR 
    user_id IN (SELECT wallet_address FROM profiles WHERE user_id = auth.uid())
  );

-- Admin policies
CREATE POLICY "Admins can view all KYC profiles" ON kyc_profiles_new
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all KYC profiles" ON kyc_profiles_new
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view all KYC documents" ON kyc_documents_new
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
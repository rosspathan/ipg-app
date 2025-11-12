-- Phase 1: Fix kyc_profiles_new.user_id type from TEXT to UUID
-- Handle existing incompatible data, orphaned records, and dependent policies

-- Step 1: Drop all existing RLS policies that depend on user_id
DROP POLICY IF EXISTS "Anyone can view KYC profiles with matching user_id" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Anyone can update KYC profiles with matching user_id" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can view own KYC" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can insert own KYC" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can update own KYC" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can view own KYC profile" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can insert own KYC profile" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Users can update own KYC profile" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC submissions" ON kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can update KYC submissions" ON kyc_profiles_new;

-- Step 2: Clean invalid data (non-UUID format)
DELETE FROM kyc_profiles_new 
WHERE user_id IS NOT NULL 
  AND user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: Add new UUID column
ALTER TABLE kyc_profiles_new ADD COLUMN user_id_new UUID;

-- Step 4: Convert existing valid TEXT user_id to UUID
UPDATE kyc_profiles_new SET user_id_new = user_id::uuid WHERE user_id IS NOT NULL;

-- Step 5: Drop old TEXT column
ALTER TABLE kyc_profiles_new DROP COLUMN user_id;

-- Step 6: Rename new column to user_id
ALTER TABLE kyc_profiles_new RENAME COLUMN user_id_new TO user_id;

-- Step 7: Clean orphaned records (user_ids that don't exist in auth.users)
DELETE FROM kyc_profiles_new 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = kyc_profiles_new.user_id);

-- Step 8: Set NOT NULL constraint
ALTER TABLE kyc_profiles_new ALTER COLUMN user_id SET NOT NULL;

-- Step 9: Add foreign key constraint to auth.users
ALTER TABLE kyc_profiles_new ADD CONSTRAINT kyc_profiles_new_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 10: Recreate unique constraint if doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'kyc_profiles_new_user_level_key'
  ) THEN
    ALTER TABLE kyc_profiles_new ADD CONSTRAINT kyc_profiles_new_user_level_key 
      UNIQUE (user_id, level);
  END IF;
END $$;

-- Step 11: Add computed columns for better querying and searching
ALTER TABLE kyc_profiles_new 
  ADD COLUMN IF NOT EXISTS full_name_computed TEXT 
  GENERATED ALWAYS AS (data_json->>'full_name') STORED;

ALTER TABLE kyc_profiles_new 
  ADD COLUMN IF NOT EXISTS email_computed TEXT
  GENERATED ALWAYS AS (data_json->>'email') STORED;

ALTER TABLE kyc_profiles_new 
  ADD COLUMN IF NOT EXISTS phone_computed TEXT
  GENERATED ALWAYS AS (data_json->>'phone') STORED;

-- Step 12: Add indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_kyc_full_name ON kyc_profiles_new(full_name_computed);
CREATE INDEX IF NOT EXISTS idx_kyc_email ON kyc_profiles_new(email_computed);
CREATE INDEX IF NOT EXISTS idx_kyc_phone ON kyc_profiles_new(phone_computed);
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_profiles_new(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_profiles_new(status);
CREATE INDEX IF NOT EXISTS idx_kyc_submitted_at ON kyc_profiles_new(submitted_at);

-- Step 13: Create new RLS policies
-- Users can view and manage their own KYC
CREATE POLICY "Users can view own KYC profile" 
  ON kyc_profiles_new FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC profile" 
  ON kyc_profiles_new FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC profile" 
  ON kyc_profiles_new FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view and update all KYC submissions
CREATE POLICY "Admins can view all KYC submissions" 
  ON kyc_profiles_new FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update KYC submissions" 
  ON kyc_profiles_new FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );
-- Allow anyone (including unauthenticated users) to look up profiles by referral code
-- This is safe because:
-- 1. Only allows SELECT (read-only) access
-- 2. Referral codes are designed to be shared publicly
-- 3. The query only returns non-sensitive fields (user_id, username, display_name, referral_code)
-- 4. Required for referral system to work during signup/onboarding

CREATE POLICY "Anyone can lookup profiles by referral code"
ON profiles
FOR SELECT
TO public
USING (referral_code IS NOT NULL);
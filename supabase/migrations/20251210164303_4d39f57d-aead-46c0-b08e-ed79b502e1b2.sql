-- Drop all existing policies on kyc_profiles_new to clean up duplicates
DROP POLICY IF EXISTS "Admin can manage all KYC profiles" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can manage all KYC profiles" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can update KYC submissions" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC profiles" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC submissions" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Anyone can insert KYC profiles" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Users can insert own KYC profile" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Users can update own KYC profile" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Users can view own KYC profile" ON public.kyc_profiles_new;

-- Create clean, simple policies
-- User policies
CREATE POLICY "Users can view own KYC"
ON public.kyc_profiles_new
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC"
ON public.kyc_profiles_new
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC"
ON public.kyc_profiles_new
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admin policies - using direct subquery for reliability
CREATE POLICY "Admins full access to KYC"
ON public.kyc_profiles_new
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.kyc_profiles_new ENABLE ROW LEVEL SECURITY;
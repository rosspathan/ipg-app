-- CRITICAL SECURITY FIX: Complete the banking information security lockdown

-- First, ensure we drop any existing policies
DROP POLICY IF EXISTS "Admin only access to banking settings" ON public.fiat_settings_inr;
DROP POLICY IF EXISTS "Users can view fiat_settings_inr" ON public.fiat_settings_inr;

-- Create the secure admin-only policy
CREATE POLICY "Admin only access to banking settings"
ON public.fiat_settings_inr
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure RLS is properly enabled
ALTER TABLE public.fiat_settings_inr ENABLE ROW LEVEL SECURITY;

-- Verify security by checking current access
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  roles, 
  qual
FROM pg_policies 
WHERE tablename = 'fiat_settings_inr';
-- CRITICAL SECURITY FIX: Tighten profiles table RLS policies
-- Remove existing permissive policies that are allowing anonymous access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can manage profiles" ON public.profiles;

-- Create restrictive policies that explicitly require authentication
CREATE POLICY "Authenticated users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure RLS is enabled (should already be enabled but being explicit)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add policy for system to insert profiles during user creation
CREATE POLICY "System can insert profiles during signup" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
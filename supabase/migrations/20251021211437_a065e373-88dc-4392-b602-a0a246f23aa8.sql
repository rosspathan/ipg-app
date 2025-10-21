-- Fix profiles table security: Remove public access to user PII

-- Drop the overly permissive policy that exposes all user data including emails, phones, etc.
DROP POLICY IF EXISTS "Anyone can view referral codes for validation" ON public.profiles;

-- Drop existing function and recreate with secure implementation
DROP FUNCTION IF EXISTS public.validate_referral_code(text);

-- Create a secure function to validate referral codes without exposing user data
-- This function only returns true/false if a code exists, no PII is exposed
CREATE OR REPLACE FUNCTION public.validate_referral_code(code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE referral_code = code
  );
$$;

COMMENT ON FUNCTION public.validate_referral_code(text) IS 
'Securely validates if a referral code exists without exposing any user PII. Returns only true/false.';

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Document the security model
COMMENT ON TABLE public.profiles IS 
'User profiles with PII (emails, phones, wallet addresses). RLS enabled: users can only view their own data, admins can view all. Referral code validation uses secure function validate_referral_code() that does not expose PII.';
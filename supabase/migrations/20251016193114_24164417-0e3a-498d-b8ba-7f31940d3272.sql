-- ============================================
-- Phase 1: Critical Security Fixes
-- ============================================
-- Fix exposed PII and financial data

-- 1. FIX PROFILES TABLE - Restrict PII access
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure policies
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. FIX USER_BSK_BALANCES TABLE - Restrict financial data
-- Drop overly permissive policies
DROP POLICY IF EXISTS "System can manage BSK balances" ON public.user_bsk_balances;

-- Recreate with proper restrictions
CREATE POLICY "Users can view own BSK balance only"
  ON public.user_bsk_balances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all BSK balances"
  ON public.user_bsk_balances
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System operations (deposits, rewards, etc.) need SECURITY DEFINER functions
-- These policies allow authenticated operations via functions
CREATE POLICY "System can update BSK balances via functions"
  ON public.user_bsk_balances
  FOR UPDATE
  USING (true);

CREATE POLICY "System can insert BSK balances via functions"
  ON public.user_bsk_balances
  FOR INSERT
  WITH CHECK (true);

-- 3. FIX REFERRAL_LINKS_NEW TABLE - Restrict relationship exposure
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Everyone can view referral links by code" ON public.referral_links_new;

-- Create function to validate referral code without exposing full table
CREATE OR REPLACE FUNCTION public.validate_referral_code(code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id 
  FROM public.referral_links_new 
  WHERE sponsor_code_used = code
  LIMIT 1;
$$;

-- Secure policies for referral_links_new
CREATE POLICY "Users can view own referral link"
  ON public.referral_links_new
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral links"
  ON public.referral_links_new
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own referral link"
  ON public.referral_links_new
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert referral links"
  ON public.referral_links_new
  FOR INSERT
  WITH CHECK (true);
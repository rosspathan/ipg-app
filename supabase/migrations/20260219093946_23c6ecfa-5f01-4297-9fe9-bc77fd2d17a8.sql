
-- =============================================
-- FIX 1: kyc_documents_new - Remove unauthenticated access
-- =============================================

-- Drop the dangerously permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view KYC documents with matching user_id" ON public.kyc_documents_new;

-- Create a proper SELECT policy: users see own docs, admins see all
CREATE POLICY "Users can view own KYC documents"
  ON public.kyc_documents_new FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert KYC documents" ON public.kyc_documents_new;

-- Create a proper INSERT policy: only authenticated users can insert their own docs
CREATE POLICY "Users can insert own KYC documents"
  ON public.kyc_documents_new FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()::text
  );

-- =============================================
-- FIX 2: referral_tree - Remove public access
-- =============================================

-- Drop the completely open "System can manage trees" policy
DROP POLICY IF EXISTS "System can manage trees" ON public.referral_tree;

-- Re-create as a system policy scoped to service_role only (not anon/authenticated)
-- Edge functions using service_role bypass RLS entirely, so this policy is not needed for them.
-- Keep the existing user/admin SELECT policies which are properly scoped.

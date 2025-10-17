
-- ============================================
-- PHASE 4: KYC & Badge System Fixes (Modified)
-- ============================================

-- 4.1 Fix KYC Submission RLS Policy
-- Users need to be able to update status from 'draft' to 'submitted'
DROP POLICY IF EXISTS "Users can update own draft KYC" ON public.kyc_submissions;

CREATE POLICY "Users can update own KYC submission"
ON public.kyc_submissions
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'submitted'));

-- 4.2 Fix user_badge_holdings policies
-- Allow edge functions to insert/update badge holdings
CREATE POLICY "Service role can manage badge holdings"
ON public.user_badge_holdings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow users to insert their initial badge holding
CREATE POLICY "Users can insert own badge holdings"
ON public.user_badge_holdings
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Fix: Replace overly permissive SELECT policy on referral_links_new
-- Policy "Users can view own referral link" already exists, drop and recreate all

DROP POLICY IF EXISTS "Everyone can view referral links by code" ON public.referral_links_new;
DROP POLICY IF EXISTS "Users can view own referral link" ON public.referral_links_new;
DROP POLICY IF EXISTS "Sponsors can view their referrals" ON public.referral_links_new;
DROP POLICY IF EXISTS "Admins can view all referral links" ON public.referral_links_new;

-- Users can view their own referral link
CREATE POLICY "Users can view own referral link"
  ON public.referral_links_new
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view referral links where they are the sponsor (direct referrals)
CREATE POLICY "Sponsors can view their referrals"
  ON public.referral_links_new
  FOR SELECT
  USING (auth.uid() = sponsor_id);

-- Admins can view all referral links
CREATE POLICY "Admins can view all referral links"
  ON public.referral_links_new
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
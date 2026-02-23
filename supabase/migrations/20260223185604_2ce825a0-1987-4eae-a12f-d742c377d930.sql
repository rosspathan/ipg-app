
-- =============================================
-- FIX 1: profiles_public view - restrict to authenticated only
-- =============================================
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;
GRANT SELECT ON public.profiles_public TO authenticated;

-- =============================================
-- FIX 2: Overly permissive SELECT on sensitive tables
-- Restrict ledger/ad/bonus tables to owner only
-- =============================================

-- bsk_holding_ledger: restrict SELECT to owner
DROP POLICY IF EXISTS "Users can view own holding ledger" ON public.bsk_holding_ledger;
CREATE POLICY "Users can view own holding ledger"
  ON public.bsk_holding_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Drop any overly permissive SELECT policies on bsk_holding_ledger
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'bsk_holding_ledger' AND schemaname = 'public' AND cmd = 'SELECT'
    AND policyname != 'Users can view own holding ledger'
    AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bsk_holding_ledger', pol.policyname);
  END LOOP;
END $$;

-- bsk_withdrawable_ledger (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bsk_withdrawable_ledger') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own withdrawable ledger" ON public.bsk_withdrawable_ledger';
    EXECUTE 'CREATE POLICY "Users can view own withdrawable ledger" ON public.bsk_withdrawable_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ad_clicks: restrict SELECT to owner
DROP POLICY IF EXISTS "Users can view own ad clicks" ON public.ad_clicks;
CREATE POLICY "Users can view own ad clicks"
  ON public.ad_clicks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ad_impressions: restrict SELECT to owner
DROP POLICY IF EXISTS "Users can view own ad impressions" ON public.ad_impressions;
CREATE POLICY "Users can view own ad impressions"
  ON public.ad_impressions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- bonus_ledger: restrict SELECT to owner
DROP POLICY IF EXISTS "Users can view own bonus ledger" ON public.bonus_ledger;
CREATE POLICY "Users can view own bonus ledger"
  ON public.bonus_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Drop permissive SELECT policies that use USING(true) on these tables
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['ad_clicks', 'ad_impressions', 'bonus_ledger'] LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies 
      WHERE tablename = tbl AND schemaname = 'public' AND cmd = 'SELECT'
      AND policyname NOT LIKE 'Users can view own%'
      AND policyname NOT LIKE 'Admin%'
      AND qual = 'true'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- login_history: add admin audit logging note (already has owner+admin RLS)
-- Just ensure anon can't access
REVOKE ALL ON public.login_history FROM anon;
GRANT SELECT ON public.login_history TO authenticated;

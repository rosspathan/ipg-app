-- ismart_user_limits: drop the broad ALL policy and replace SELECT-only for owner; writes via service_role
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='ismart_user_limits'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ismart_user_limits', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users can view own ismart limits"
  ON public.ismart_user_limits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages ismart limits"
  ON public.ismart_user_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view all ismart limits"
  ON public.ismart_user_limits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- spin_user_limits: remove user UPDATE; keep SELECT for owner; writes via service_role
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='spin_user_limits' AND cmd IN ('UPDATE','INSERT','DELETE','ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.spin_user_limits', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "Service role manages spin_user_limits"
  ON public.spin_user_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Restrict INSERT to service_role on the listed tables
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'crypto_staking_ledger','insurance_bsk_ledger','ismart_spins',
    'user_vip_milestone_claims','trading_audit_log','login_audit_new',
    'user_role_audit','promotion_events_log'
  ]) LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='INSERT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "Service role can insert %1$s" ON public.%1$I FOR INSERT TO service_role WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
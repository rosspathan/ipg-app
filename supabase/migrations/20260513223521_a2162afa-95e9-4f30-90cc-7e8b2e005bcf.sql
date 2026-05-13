-- Re-run with idempotent guards for storage policies
DROP POLICY IF EXISTS "System can update bonus_balances" ON public.wallet_bonus_balances;
DROP POLICY IF EXISTS "Service role can insert bonus_balances" ON public.wallet_bonus_balances;
CREATE POLICY "Service role can insert bonus_balances"
  ON public.wallet_bonus_balances FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Service role can create referrals" ON public.referrals;
CREATE POLICY "Service role can create referrals"
  ON public.referrals FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System creates deposits" ON public.deposits;
DROP POLICY IF EXISTS "Service role can create deposits" ON public.deposits;
CREATE POLICY "Service role can create deposits"
  ON public.deposits FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert referral links" ON public.referral_links_new;
DROP POLICY IF EXISTS "Service role can insert referral links" ON public.referral_links_new;
CREATE POLICY "Service role can insert referral links"
  ON public.referral_links_new FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert ledger entries" ON public.trading_balance_ledger;
CREATE POLICY "Service role can insert ledger entries"
  ON public.trading_balance_ledger FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can create purchase_bonus_events" ON public.purchase_bonus_events;
DROP POLICY IF EXISTS "Service role can create purchase_bonus_events" ON public.purchase_bonus_events;
CREATE POLICY "Service role can create purchase_bonus_events"
  ON public.purchase_bonus_events FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can create conversions" ON public.conversions;
DROP POLICY IF EXISTS "Service role can create conversions" ON public.conversions;
CREATE POLICY "Service role can create conversions"
  ON public.conversions FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "System can create badge events" ON public.badge_qualification_events;
DROP POLICY IF EXISTS "Service role can create badge events" ON public.badge_qualification_events;
CREATE POLICY "Service role can create badge events"
  ON public.badge_qualification_events FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service can create grants" ON public.spin_grants;
DROP POLICY IF EXISTS "Service role can create spin grants" ON public.spin_grants;
CREATE POLICY "Service role can create spin grants"
  ON public.spin_grants FOR INSERT TO service_role WITH CHECK (true);

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'bsk_loan_late_fee_log','bsk_loan_auto_debit_log','bsk_loan_prepayments',
    'bsk_loan_notification_log','bsk_vesting_referral_rewards','retroactive_commission_audit',
    'program_audit','system_errors','referral_waitlist','badge_qualification_audit'
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='fiat_settings_inr'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.fiat_settings_inr';
  END IF;
END $$;

-- Storage: restrict ad-images writes to admins only
DROP POLICY IF EXISTS "Authenticated users can upload ad images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload ad images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update ad images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete ad images" ON storage.objects;

CREATE POLICY "Admins can upload ad images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ad images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ad-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ad images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ad-images' AND public.has_role(auth.uid(), 'admin'));
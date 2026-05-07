
-- custodial_withdrawals
DROP POLICY IF EXISTS "Service role can update custodial withdrawals" ON public.custodial_withdrawals;
CREATE POLICY "Service role can update custodial withdrawals"
ON public.custodial_withdrawals FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- wallet_bonus_balances
DROP POLICY IF EXISTS "System can update bonus_balances_update" ON public.wallet_bonus_balances;
CREATE POLICY "System can update bonus_balances_update"
ON public.wallet_bonus_balances FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- spin_runs
DROP POLICY IF EXISTS "Service can update runs" ON public.spin_runs;
CREATE POLICY "Service can update runs"
ON public.spin_runs FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- password_reset_codes
DROP POLICY IF EXISTS "Service role can insert reset codes" ON public.password_reset_codes;
CREATE POLICY "Service role can insert reset codes"
ON public.password_reset_codes FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update reset codes" ON public.password_reset_codes;
CREATE POLICY "Service role can update reset codes"
ON public.password_reset_codes FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- deposits
DROP POLICY IF EXISTS "System updates deposits" ON public.deposits;
CREATE POLICY "System updates deposits"
ON public.deposits FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- withdrawal_rate_limits
DROP POLICY IF EXISTS "Service role access withdrawal rate limits" ON public.withdrawal_rate_limits;
CREATE POLICY "Service role access withdrawal rate limits"
ON public.withdrawal_rate_limits FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- bsk_holding_ledger
DROP POLICY IF EXISTS "sys_ins_h" ON public.bsk_holding_ledger;
CREATE POLICY "sys_ins_h"
ON public.bsk_holding_ledger FOR INSERT TO service_role
WITH CHECK (true);

-- bsk_withdrawable_ledger
DROP POLICY IF EXISTS "sys_ins_w" ON public.bsk_withdrawable_ledger;
CREATE POLICY "sys_ins_w"
ON public.bsk_withdrawable_ledger FOR INSERT TO service_role
WITH CHECK (true);

-- bonus_ledger
DROP POLICY IF EXISTS "System can create bonus entries" ON public.bonus_ledger;
CREATE POLICY "System can create bonus entries"
ON public.bonus_ledger FOR INSERT TO service_role
WITH CHECK (true);

-- referral_ledger - find and replace any unrestricted insert
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='referral_ledger' AND cmd='INSERT' AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.referral_ledger', p.policyname);
    EXECUTE format('CREATE POLICY %I ON public.referral_ledger FOR INSERT TO service_role WITH CHECK (true)', p.policyname);
  END LOOP;
END$$;

-- bsk_loan_ledger
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='bsk_loan_ledger' AND cmd='INSERT' AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bsk_loan_ledger', p.policyname);
    EXECUTE format('CREATE POLICY %I ON public.bsk_loan_ledger FOR INSERT TO service_role WITH CHECK (true)', p.policyname);
  END LOOP;
END$$;

-- onchain_transactions
DROP POLICY IF EXISTS "Service can insert onchain transactions" ON public.onchain_transactions;
CREATE POLICY "Service can insert onchain transactions"
ON public.onchain_transactions FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update onchain transactions" ON public.onchain_transactions;
CREATE POLICY "Service can update onchain transactions"
ON public.onchain_transactions FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- KYC ENFORCEMENT HARDENING — Defense-in-depth at DB layer
-- Closes ALL bypass paths by attaching enforce_kyc_for_sensitive_action
-- as BEFORE INSERT trigger to every table that represents a value-moving
-- user action. Even if an edge function forgets to gate, the DB rejects.
-- Admins are exempted inside the trigger function (already handled).
-- ============================================================

-- 1. ORDERS (trading: buy / sell)
DROP TRIGGER IF EXISTS kyc_gate_orders ON public.orders;
CREATE TRIGGER kyc_gate_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();

-- 2. WITHDRAWALS (legacy)
DROP TRIGGER IF EXISTS kyc_gate_withdrawals ON public.withdrawals;
CREATE TRIGGER kyc_gate_withdrawals
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();

-- 3. CUSTODIAL WITHDRAWALS (current production withdrawal path)
DROP TRIGGER IF EXISTS kyc_gate_custodial_withdrawals ON public.custodial_withdrawals;
CREATE TRIGGER kyc_gate_custodial_withdrawals
  BEFORE INSERT ON public.custodial_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();

-- 4. INTERNAL BALANCE TRANSFERS (wallet ↔ trading)
DROP TRIGGER IF EXISTS kyc_gate_internal_balance_transfers ON public.internal_balance_transfers;
CREATE TRIGGER kyc_gate_internal_balance_transfers
  BEFORE INSERT ON public.internal_balance_transfers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();

-- 5. BSK ON-CHAIN MIGRATIONS
DROP TRIGGER IF EXISTS kyc_gate_bsk_migrations ON public.bsk_onchain_migrations;
CREATE TRIGGER kyc_gate_bsk_migrations
  BEFORE INSERT ON public.bsk_onchain_migrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();

-- 6. BSK LOAN APPLICATIONS
DROP TRIGGER IF EXISTS kyc_gate_bsk_loans ON public.bsk_loan_applications;
CREATE TRIGGER kyc_gate_bsk_loans
  BEFORE INSERT ON public.bsk_loan_applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();

-- 7. STAKING ACCOUNTS (stake creation = value movement)
DROP TRIGGER IF EXISTS kyc_gate_staking_accounts ON public.user_staking_accounts;
CREATE TRIGGER kyc_gate_staking_accounts
  BEFORE INSERT ON public.user_staking_accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_kyc_for_sensitive_action();

COMMENT ON FUNCTION public.enforce_kyc_for_sensitive_action() IS
  'KYC gate. Attached as BEFORE INSERT trigger to all sensitive value-moving tables. Raises P0001 KYC_REQUIRED if user is not fully approved across all 3 pillars (documents+face+mobile+final). Admins bypass.';

-- ============================================================
-- BSK transfers (peer-to-peer): no dedicated table, runs through
-- record_bsk_transaction RPC. Add KYC gate inside that RPC's wrapper
-- via a new helper that callers should use. Existing sensitive RPCs
-- can call public.assert_kyc_approved(uid) at start.
-- ============================================================
CREATE OR REPLACE FUNCTION public.assert_kyc_approved(_user_id uuid, _action text DEFAULT 'this action')
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admin bypass
  IF public.has_role(_user_id, 'admin'::public.app_role) THEN
    RETURN;
  END IF;
  IF NOT public.is_kyc_approved(_user_id) THEN
    RAISE EXCEPTION 'KYC_REQUIRED: KYC approval is required for %. Complete document, face, and admin mobile verification.', _action
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_kyc_approved(uuid, text) IS
  'Reusable KYC gate for edge functions and RPCs. Throws P0001 KYC_REQUIRED if user is not fully approved.';
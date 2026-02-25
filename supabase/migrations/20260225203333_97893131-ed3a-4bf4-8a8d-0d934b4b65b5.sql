-- Add admin SELECT policies for reconciliation-critical tables
-- These tables were missing admin read access, causing the reconciliation dashboard
-- to show 0 entries for ledger, deposits, and internal transfers.

-- 1. trading_balance_ledger: Admin needs to read ALL ledger entries for reconciliation
CREATE POLICY "Admins can view all ledger entries"
ON public.trading_balance_ledger
FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. custodial_deposits: Admin needs to see all deposits for audit
CREATE POLICY "Admins can view all custodial deposits"
ON public.custodial_deposits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. internal_balance_transfers: Admin needs full transfer history
CREATE POLICY "Admins can view all internal transfers"
ON public.internal_balance_transfers
FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

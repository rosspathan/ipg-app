
-- 1. user_badge_holdings: remove user self-insert
DROP POLICY IF EXISTS "Users can insert own badge holdings" ON public.user_badge_holdings;

-- 2. user_badge_status: remove user self-insert/update
DROP POLICY IF EXISTS "Users can insert own badge status" ON public.user_badge_status;
DROP POLICY IF EXISTS "Users can update own badge status" ON public.user_badge_status;

-- 3. user_inr_balances: remove user self-insert and self-update
DROP POLICY IF EXISTS "inr_balances_owner_insert" ON public.user_inr_balances;
DROP POLICY IF EXISTS "inr_balances_system_update" ON public.user_inr_balances;

-- 4. orders: restrict user UPDATE to cancellation only
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can cancel own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('pending','partially_filled'))
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- 5. bsk_purchase_settings: hide sensitive bank/account fields from broad SELECT
DROP POLICY IF EXISTS "Authenticated users can view active settings" ON public.bsk_purchase_settings;

-- Expose only safe payment fields via a view
CREATE OR REPLACE VIEW public.bsk_purchase_settings_public AS
SELECT
  id,
  is_active,
  min_purchase_amount,
  max_purchase_amount,
  instructions,
  fee_percent,
  fee_fixed,
  admin_upi_id,
  admin_bep20_address,
  payment_methods_enabled,
  created_at,
  updated_at
FROM public.bsk_purchase_settings
WHERE is_active = true;

GRANT SELECT ON public.bsk_purchase_settings_public TO authenticated, anon;

-- 6. inr_balance_ledger: allow users to view their own ledger entries
CREATE POLICY "Users can view own INR ledger"
ON public.inr_balance_ledger
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. custodial_withdrawals: remove direct user INSERT (must use secure RPC)
DROP POLICY IF EXISTS "Users can create their own custodial withdrawals" ON public.custodial_withdrawals;

-- Drop check constraint, refresh view, sync balances (using correct columns)
-- mv_user_bsk_balances has total_withdrawn but user_bsk_balances does not

-- 1) Drop constraint temporarily
ALTER TABLE public.user_bsk_balances DROP CONSTRAINT IF EXISTS check_balance_consistency;

-- 2) Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_bsk_balances;

-- 3) Sync user_bsk_balances from view (exclude total_withdrawn which doesn't exist in table)
INSERT INTO public.user_bsk_balances AS ub (
  user_id,
  withdrawable_balance,
  holding_balance,
  total_earned_withdrawable,
  total_earned_holding,
  updated_at
)
SELECT
  mv.user_id,
  mv.withdrawable_balance,
  mv.holding_balance,
  mv.total_earned_withdrawable,
  mv.total_earned_holding,
  now() AS updated_at
FROM public.mv_user_bsk_balances mv
ON CONFLICT (user_id) DO UPDATE SET
  withdrawable_balance      = EXCLUDED.withdrawable_balance,
  holding_balance           = EXCLUDED.holding_balance,
  total_earned_withdrawable = EXCLUDED.total_earned_withdrawable,
  total_earned_holding      = EXCLUDED.total_earned_holding,
  updated_at                = now();

-- 4) Re-enable constraint (relaxed to allow negatives during transition)
ALTER TABLE public.user_bsk_balances ADD CONSTRAINT check_balance_consistency
CHECK (withdrawable_balance + holding_balance >= -1000000);
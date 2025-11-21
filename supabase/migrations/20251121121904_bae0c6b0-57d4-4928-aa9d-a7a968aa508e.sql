-- ============================================================================
-- FIX: Auto-sync materialized view to user_bsk_balances table
-- Issue: Balances were being computed in mv_user_bsk_balances but not synced
-- to user_bsk_balances table, causing UI to show stale data
-- ============================================================================

-- Update the trigger function to also sync balances to the table
CREATE OR REPLACE FUNCTION public.trigger_refresh_bsk_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh the materialized view
  PERFORM refresh_bsk_balances_view();
  
  -- Sync from materialized view to user_bsk_balances table
  INSERT INTO public.user_bsk_balances (
    user_id, withdrawable_balance, holding_balance,
    total_earned_withdrawable, total_earned_holding, updated_at
  )
  SELECT 
    user_id, withdrawable_balance, holding_balance,
    total_earned_withdrawable, total_earned_holding, now()
  FROM public.mv_user_bsk_balances
  ON CONFLICT (user_id) DO UPDATE SET
    withdrawable_balance = EXCLUDED.withdrawable_balance,
    holding_balance = EXCLUDED.holding_balance,
    total_earned_withdrawable = EXCLUDED.total_earned_withdrawable,
    total_earned_holding = EXCLUDED.total_earned_holding,
    updated_at = now();
    
  RETURN NEW;
END;
$$;

-- Immediately sync current balances to fix any existing drift
INSERT INTO public.user_bsk_balances (
  user_id, withdrawable_balance, holding_balance,
  total_earned_withdrawable, total_earned_holding, updated_at
)
SELECT 
  user_id, withdrawable_balance, holding_balance,
  total_earned_withdrawable, total_earned_holding, now()
FROM public.mv_user_bsk_balances
ON CONFLICT (user_id) DO UPDATE SET
  withdrawable_balance = EXCLUDED.withdrawable_balance,
  holding_balance = EXCLUDED.holding_balance,
  total_earned_withdrawable = EXCLUDED.total_earned_withdrawable,
  total_earned_holding = EXCLUDED.total_earned_holding,
  updated_at = now();
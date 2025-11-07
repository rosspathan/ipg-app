-- Create admin-safe balance getter function
CREATE OR REPLACE FUNCTION public.get_user_bsk_balance(target_user_id UUID)
RETURNS TABLE(
  withdrawable_balance NUMERIC,
  holding_balance NUMERIC,
  total_earned_withdrawable NUMERIC,
  total_earned_holding NUMERIC,
  today_earned NUMERIC,
  week_earned NUMERIC,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  total_transactions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mb.withdrawable_balance,
    mb.holding_balance,
    mb.total_earned_withdrawable,
    mb.total_earned_holding,
    mb.today_earned,
    mb.week_earned,
    mb.last_transaction_at,
    mb.total_transactions
  FROM public.mv_user_bsk_balances mb
  WHERE mb.user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 
      0::NUMERIC, 0::NUMERIC, NULL::TIMESTAMP WITH TIME ZONE, 0::BIGINT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_bsk_balance(UUID) TO service_role;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS after_bsk_transaction_refresh ON public.unified_bsk_ledger;

-- Create automatic refresh trigger function
CREATE OR REPLACE FUNCTION public.trigger_refresh_bsk_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM refresh_bsk_balances_view();
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER after_bsk_transaction_refresh
AFTER INSERT OR UPDATE OR DELETE ON public.unified_bsk_ledger
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_bsk_balances();

-- Immediately refresh the view to fix current balances
SELECT refresh_bsk_balances_view();
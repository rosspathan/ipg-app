-- Fix security warning: Restrict materialized view API access
-- Users should query through functions, not direct API access

-- Revoke direct API access to materialized view
REVOKE ALL ON public.mv_user_bsk_balances FROM anon;
REVOKE ALL ON public.mv_user_bsk_balances FROM authenticated;

-- Grant SELECT only to service_role (for internal operations)
GRANT SELECT ON public.mv_user_bsk_balances TO service_role;

-- Create secure function for users to get their own balance
CREATE OR REPLACE FUNCTION public.get_my_bsk_balance()
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
  WHERE mb.user_id = auth.uid();
  
  -- If no data found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 
      0::NUMERIC, 0::NUMERIC, NULL::TIMESTAMP WITH TIME ZONE, 0::BIGINT;
  END IF;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_bsk_balance() TO authenticated;

COMMENT ON FUNCTION public.get_my_bsk_balance() IS 
'Securely returns the current users BSK balance from the materialized view. Users can only see their own balance.';
-- Fix security warnings for Currency Control Center functions
-- Add search_path to all security definer functions

-- Update get_current_bsk_rate function
CREATE OR REPLACE FUNCTION public.get_current_bsk_rate()
RETURNS NUMERIC AS $$
DECLARE
  current_rate NUMERIC;
BEGIN
  SELECT rate_inr_per_bsk INTO current_rate
  FROM public.bsk_rate_history
  WHERE status = 'active'
    AND effective_from <= NOW()
    AND (effective_until IS NULL OR effective_until > NOW())
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- Fallback to team_referral_settings if no rate in history
  IF current_rate IS NULL THEN
    SELECT bsk_inr_rate INTO current_rate
    FROM public.team_referral_settings
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(current_rate, 1.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Update get_total_bsk_circulation function
CREATE OR REPLACE FUNCTION public.get_total_bsk_circulation()
RETURNS TABLE(
  total_withdrawable NUMERIC,
  total_holding NUMERIC,
  total_supply NUMERIC,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(withdrawable_balance), 0) as total_withdrawable,
    COALESCE(SUM(holding_balance), 0) as total_holding,
    COALESCE(SUM(withdrawable_balance + holding_balance), 0) as total_supply,
    COUNT(DISTINCT user_id) as user_count
  FROM public.user_bsk_balances
  WHERE withdrawable_balance > 0 OR holding_balance > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Update get_inr_stats function
CREATE OR REPLACE FUNCTION public.get_inr_stats()
RETURNS TABLE(
  total_balance NUMERIC,
  total_locked NUMERIC,
  total_deposited NUMERIC,
  total_withdrawn NUMERIC,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(balance), 0) as total_balance,
    COALESCE(SUM(locked), 0) as total_locked,
    COALESCE(SUM(total_deposited), 0) as total_deposited,
    COALESCE(SUM(total_withdrawn), 0) as total_withdrawn,
    COUNT(DISTINCT user_id) as user_count
  FROM public.user_inr_balances
  WHERE balance > 0 OR locked > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
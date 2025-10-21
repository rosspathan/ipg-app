-- Fix user_bonus_balances security: Remove public access to financial data

-- Drop the dangerous policy that allows anyone to access financial data
DROP POLICY IF EXISTS "Service can manage user_bonus_balances" ON public.user_bonus_balances;

-- The existing safe policies remain:
-- 1. "Users can view own bonus balances" - users see only their balance
-- 2. "Admins can view all bonus balances" - admins see all balances
-- 3. System operations should use SECURITY DEFINER functions, not direct table access

-- Create system-level function for balance operations (used by edge functions)
CREATE OR REPLACE FUNCTION public.system_update_bonus_balance(
  p_user_id text,
  p_asset_id uuid,
  p_balance_delta numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function should only be called by trusted server-side code
  -- Insert or update balance
  INSERT INTO public.user_bonus_balances (user_id, asset_id, balance)
  VALUES (p_user_id, p_asset_id, p_balance_delta)
  ON CONFLICT (user_id, asset_id) 
  DO UPDATE SET 
    balance = user_bonus_balances.balance + p_balance_delta,
    updated_at = now();
    
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.system_update_bonus_balance IS 
'System function for updating bonus balances. Should only be called by trusted edge functions with proper validation.';

-- Ensure RLS is enabled
ALTER TABLE public.user_bonus_balances ENABLE ROW LEVEL SECURITY;

-- Document security model
COMMENT ON TABLE public.user_bonus_balances IS 
'User bonus balances table with RLS. Users can only view their own balances. Admins can view all. System updates use system_update_bonus_balance() function from edge functions.';
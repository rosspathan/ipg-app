-- Create function to deduct withdrawn amount from user balance after successful on-chain withdrawal
CREATE OR REPLACE FUNCTION public.complete_withdrawal_balance_deduction(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Deduct from both locked and total when withdrawal completes successfully
  UPDATE public.wallet_balances
  SET 
    locked = locked - p_amount,
    total = total - p_amount,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND asset_id = p_asset_id
    AND locked >= p_amount
    AND total >= p_amount;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Insufficient locked balance for user % asset %', p_user_id, p_asset_id;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION complete_withdrawal_balance_deduction IS 'Deducts withdrawn amount from locked and total balance after successful on-chain withdrawal. Critical for preventing inflated balance displays.';
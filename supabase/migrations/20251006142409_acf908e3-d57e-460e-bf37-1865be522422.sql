-- Fix placeholder balances in calculate_user_balance functions to return 0 instead of 1000

-- Update main calculate_user_balance function
CREATE OR REPLACE FUNCTION public.calculate_user_balance(p_user_id uuid, p_metric balance_metric DEFAULT 'TOTAL'::balance_metric, p_base_currency text DEFAULT 'USDT'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric := 0;
  v_bsk_balance numeric := 0;
  v_bsk_price numeric := 1;
BEGIN
  -- SECURITY CHECK: Only allow users to access their own balance, or admins to access any balance
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: You can only access your own balance';
  END IF;

  -- For now, we'll use a simplified calculation
  -- In a real implementation, this would calculate portfolio value based on current prices
  
  IF p_metric = 'MAIN' THEN
    -- Get main wallet balance (simplified - just USDT for now)
    SELECT COALESCE(SUM(balance), 0) INTO v_balance
    FROM wallet_balances wb
    JOIN assets a ON wb.asset_id = a.id
    WHERE wb.user_id = p_user_id AND a.symbol = p_base_currency;
    
  ELSIF p_metric = 'TOTAL' THEN
    -- Calculate total portfolio value (simplified calculation)
    -- This would need to be enhanced with real-time price data
    SELECT COALESCE(0, 0) INTO v_balance; -- Start with 0 for new users
    
  ELSIF p_metric = 'BONUS_INCLUDED' THEN
    -- Include BSK bonus balance
    SELECT COALESCE(0, 0) INTO v_balance; -- Portfolio value placeholder
    
    -- Get BSK bonus balance
    SELECT COALESCE(SUM(wbb.balance), 0) INTO v_bsk_balance
    FROM wallet_bonus_balances wbb
    JOIN bonus_assets ba ON wbb.asset_id = ba.id
    WHERE wbb.user_id = p_user_id AND ba.symbol = 'BSK';
    
    -- Get latest BSK price (fallback to 1 if not found)
    SELECT COALESCE(bp.price, 1) INTO v_bsk_price
    FROM bonus_prices bp
    JOIN bonus_assets ba ON bp.asset_id = ba.id
    WHERE ba.symbol = 'BSK'
    ORDER BY bp.recorded_at DESC
    LIMIT 1;
    
    v_balance := v_balance + (v_bsk_balance * v_bsk_price);
  END IF;
  
  RETURN v_balance;
END;
$function$;

-- Update internal calculate_user_balance function
CREATE OR REPLACE FUNCTION public.calculate_user_balance_internal(p_user_id uuid, p_metric balance_metric DEFAULT 'TOTAL'::balance_metric, p_base_currency text DEFAULT 'USDT'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric := 0;
  v_bsk_balance numeric := 0;
  v_bsk_price numeric := 1;
BEGIN
  -- This is an internal function for use by other SECURITY DEFINER functions
  -- It does not perform authorization checks as it's meant for system use only
  
  IF p_metric = 'MAIN' THEN
    -- Get main wallet balance (simplified - just USDT for now)
    SELECT COALESCE(SUM(balance), 0) INTO v_balance
    FROM wallet_balances wb
    JOIN assets a ON wb.asset_id = a.id
    WHERE wb.user_id = p_user_id AND a.symbol = p_base_currency;
    
  ELSIF p_metric = 'TOTAL' THEN
    -- Calculate total portfolio value (simplified calculation)
    SELECT COALESCE(0, 0) INTO v_balance; -- Start with 0 for new users
    
  ELSIF p_metric = 'BONUS_INCLUDED' THEN
    -- Include BSK bonus balance
    SELECT COALESCE(0, 0) INTO v_balance; -- Portfolio value placeholder
    
    -- Get BSK bonus balance
    SELECT COALESCE(SUM(wbb.balance), 0) INTO v_bsk_balance
    FROM wallet_bonus_balances wbb
    JOIN bonus_assets ba ON wbb.asset_id = ba.id
    WHERE wbb.user_id = p_user_id AND ba.symbol = 'BSK';
    
    -- Get latest BSK price (fallback to 1 if not found)
    SELECT COALESCE(bp.price, 1) INTO v_bsk_price
    FROM bonus_prices bp
    JOIN bonus_assets ba ON bp.asset_id = ba.id
    WHERE ba.symbol = 'BSK'
    ORDER BY bp.recorded_at DESC
    LIMIT 1;
    
    v_balance := v_balance + (v_bsk_balance * v_bsk_price);
  END IF;
  
  RETURN v_balance;
END;
$function$;
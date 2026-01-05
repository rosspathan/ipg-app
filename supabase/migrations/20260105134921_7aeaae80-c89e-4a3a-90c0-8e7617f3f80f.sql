-- Update lock_balance_for_order to quantize amounts to 8 decimal places
CREATE OR REPLACE FUNCTION public.lock_balance_for_order(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  -- Quantize to 8 decimal places to avoid floating point precision issues
  v_amount := round(p_amount, 8);
  
  -- Check if user has sufficient available balance
  IF NOT EXISTS (
    SELECT 1 FROM wallet_balances 
    WHERE user_id = p_user_id 
      AND asset_id = p_asset_id 
      AND round(available, 8) >= v_amount
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Move funds from available to locked
  UPDATE wallet_balances
  SET 
    available = round(available - v_amount, 8),
    locked = round(locked + v_amount, 8),
    updated_at = now()
  WHERE user_id = p_user_id AND asset_id = p_asset_id;
  
  RETURN TRUE;
END;
$$;

-- Update unlock_balance_for_order to quantize amounts to 8 decimal places
CREATE OR REPLACE FUNCTION public.unlock_balance_for_order(
  p_user_id UUID,
  p_asset_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  -- Quantize to 8 decimal places
  v_amount := round(p_amount, 8);
  
  -- Check if user has sufficient locked balance (with tolerance for rounding)
  IF NOT EXISTS (
    SELECT 1 FROM wallet_balances 
    WHERE user_id = p_user_id 
      AND asset_id = p_asset_id 
      AND round(locked, 8) >= v_amount
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Move funds from locked to available
  UPDATE wallet_balances
  SET 
    locked = greatest(round(locked - v_amount, 8), 0),
    available = round(available + v_amount, 8),
    updated_at = now()
  WHERE user_id = p_user_id AND asset_id = p_asset_id;
  
  RETURN TRUE;
END;
$$;

-- Update settle_trade to be precision-safe
CREATE OR REPLACE FUNCTION public.settle_trade(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_base_asset_id UUID,
  p_quote_asset_id UUID,
  p_base_amount NUMERIC,
  p_quote_amount NUMERIC,
  p_buyer_fee NUMERIC,
  p_seller_fee NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_amount NUMERIC;
  v_quote_amount NUMERIC;
  v_buyer_fee NUMERIC;
  v_seller_fee NUMERIC;
  v_required_buyer_unlock NUMERIC;
  v_required_seller_unlock NUMERIC;
  v_buyer_locked NUMERIC;
  v_seller_locked NUMERIC;
BEGIN
  -- Quantize all amounts to 8 decimal places
  v_base_amount := round(p_base_amount, 8);
  v_quote_amount := round(p_quote_amount, 8);
  v_buyer_fee := round(p_buyer_fee, 8);
  v_seller_fee := round(p_seller_fee, 8);
  
  v_required_buyer_unlock := round(v_quote_amount + v_buyer_fee, 8);
  v_required_seller_unlock := v_base_amount;
  
  -- Get current locked balances (quantized)
  SELECT round(locked, 8) INTO v_buyer_locked
  FROM wallet_balances
  WHERE user_id = p_buyer_id AND asset_id = p_quote_asset_id;
  
  SELECT round(locked, 8) INTO v_seller_locked
  FROM wallet_balances
  WHERE user_id = p_seller_id AND asset_id = p_base_asset_id;
  
  -- Validate buyer has enough locked quote asset
  IF v_buyer_locked IS NULL OR v_buyer_locked < v_required_buyer_unlock THEN
    RAISE NOTICE 'settle_trade: buyer insufficient locked. Required: %, Has: %', v_required_buyer_unlock, COALESCE(v_buyer_locked, 0);
    RETURN FALSE;
  END IF;
  
  -- Validate seller has enough locked base asset
  IF v_seller_locked IS NULL OR v_seller_locked < v_required_seller_unlock THEN
    RAISE NOTICE 'settle_trade: seller insufficient locked. Required: %, Has: %', v_required_seller_unlock, COALESCE(v_seller_locked, 0);
    RETURN FALSE;
  END IF;
  
  -- Buyer: unlock quote asset and deduct (quote_amount + buyer_fee)
  UPDATE wallet_balances
  SET 
    locked = greatest(round(locked - v_required_buyer_unlock, 8), 0),
    updated_at = now()
  WHERE user_id = p_buyer_id AND asset_id = p_quote_asset_id;
  
  -- Buyer: receive base asset
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_buyer_id, p_base_asset_id, v_base_amount, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET 
    available = round(wallet_balances.available + v_base_amount, 8),
    updated_at = now();
  
  -- Seller: unlock base asset
  UPDATE wallet_balances
  SET 
    locked = greatest(round(locked - v_required_seller_unlock, 8), 0),
    updated_at = now()
  WHERE user_id = p_seller_id AND asset_id = p_base_asset_id;
  
  -- Seller: receive quote asset minus fee
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_seller_id, p_quote_asset_id, round(v_quote_amount - v_seller_fee, 8), 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET 
    available = round(wallet_balances.available + (v_quote_amount - v_seller_fee), 8),
    updated_at = now();
  
  RETURN TRUE;
END;
$$;
-- Fix settle_trade to validate balances before updating (prevents constraint violations)
CREATE OR REPLACE FUNCTION public.settle_trade(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_base_asset TEXT,
  p_quote_asset TEXT,
  p_base_amount NUMERIC,
  p_quote_amount NUMERIC,
  p_buyer_fee NUMERIC DEFAULT 0,
  p_seller_fee NUMERIC DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_asset_id UUID;
  v_quote_asset_id UUID;
  v_buyer_locked NUMERIC;
  v_seller_locked NUMERIC;
  v_required_buyer_unlock NUMERIC;
  v_required_seller_unlock NUMERIC;
BEGIN
  -- Get asset IDs
  SELECT id INTO v_base_asset_id FROM assets WHERE symbol = p_base_asset;
  SELECT id INTO v_quote_asset_id FROM assets WHERE symbol = p_quote_asset;
  
  IF v_base_asset_id IS NULL THEN
    RAISE WARNING 'settle_trade: Base asset not found: %', p_base_asset;
    RETURN FALSE;
  END IF;
  
  IF v_quote_asset_id IS NULL THEN
    RAISE WARNING 'settle_trade: Quote asset not found: %', p_quote_asset;
    RETURN FALSE;
  END IF;
  
  -- Calculate required unlock amounts
  v_required_buyer_unlock := p_quote_amount + p_buyer_fee;
  v_required_seller_unlock := p_base_amount;
  
  -- Check buyer has sufficient locked quote balance
  SELECT COALESCE(locked, 0) INTO v_buyer_locked 
  FROM wallet_balances 
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;
  
  IF v_buyer_locked IS NULL OR v_buyer_locked < v_required_buyer_unlock THEN
    RAISE WARNING 'settle_trade: Buyer % has insufficient locked % balance. Has: %, Needs: %', 
      p_buyer_id, p_quote_asset, COALESCE(v_buyer_locked, 0), v_required_buyer_unlock;
    RETURN FALSE;
  END IF;
  
  -- Check seller has sufficient locked base balance
  SELECT COALESCE(locked, 0) INTO v_seller_locked 
  FROM wallet_balances 
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id;
  
  IF v_seller_locked IS NULL OR v_seller_locked < v_required_seller_unlock THEN
    RAISE WARNING 'settle_trade: Seller % has insufficient locked % balance. Has: %, Needs: %', 
      p_seller_id, p_base_asset, COALESCE(v_seller_locked, 0), v_required_seller_unlock;
    RETURN FALSE;
  END IF;
  
  -- All validations passed, execute the trade
  
  -- Buyer: unlock quote asset (was locked for the order), deduct amount + fee
  UPDATE wallet_balances
  SET 
    locked = locked - v_required_buyer_unlock,
    updated_at = now()
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;
  
  -- Buyer: credit base asset
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_buyer_id, v_base_asset_id, p_base_amount, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + p_base_amount,
    updated_at = now();
  
  -- Seller: unlock base asset (was locked for the order), deduct amount
  UPDATE wallet_balances
  SET 
    locked = locked - v_required_seller_unlock,
    updated_at = now()
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id;
  
  -- Seller: credit quote asset (minus fee)
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_seller_id, v_quote_asset_id, p_quote_amount - p_seller_fee, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + (p_quote_amount - p_seller_fee),
    updated_at = now();
  
  RETURN TRUE;
END;
$$;
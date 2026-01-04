-- Drop existing settle_trade function first
DROP FUNCTION IF EXISTS public.settle_trade(uuid, uuid, text, text, numeric, numeric, numeric, numeric);

-- Recreate settle_trade with correct column names
CREATE OR REPLACE FUNCTION public.settle_trade(
  p_buyer_id uuid,
  p_seller_id uuid,
  p_base_asset text,
  p_quote_asset text,
  p_base_amount numeric,
  p_quote_amount numeric,
  p_buyer_fee numeric DEFAULT 0,
  p_seller_fee numeric DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_asset_id UUID;
  v_quote_asset_id UUID;
BEGIN
  -- Get asset IDs
  SELECT id INTO v_base_asset_id FROM assets WHERE symbol = p_base_asset;
  SELECT id INTO v_quote_asset_id FROM assets WHERE symbol = p_quote_asset;
  
  IF v_base_asset_id IS NULL THEN
    RAISE EXCEPTION 'Base asset not found: %', p_base_asset;
  END IF;
  
  IF v_quote_asset_id IS NULL THEN
    RAISE EXCEPTION 'Quote asset not found: %', p_quote_asset;
  END IF;
  
  -- Buyer: unlock quote asset (was locked for the order), deduct amount + fee
  UPDATE wallet_balances
  SET 
    locked = locked - p_quote_amount - p_buyer_fee,
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
    locked = locked - p_base_amount,
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
$function$;
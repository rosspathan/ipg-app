-- Fix execute_trade: Use correct column names for trades table
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_buy_order_id uuid, 
  p_sell_order_id uuid, 
  p_buyer_id uuid, 
  p_seller_id uuid, 
  p_symbol text, 
  p_base_asset text, 
  p_quote_asset text, 
  p_base_amount numeric, 
  p_quote_amount numeric, 
  p_buyer_fee numeric, 
  p_seller_fee numeric, 
  p_trading_type text DEFAULT 'spot'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_asset_id UUID;
  v_quote_asset_id UUID;
  v_trade_id UUID;
  v_buy_order RECORD;
  v_sell_order RECORD;
  v_fill_quantity NUMERIC;
  v_quote_required NUMERIC;
  v_total_fees NUMERIC;
  v_platform_account_id UUID := '00000000-0000-0000-0000-000000000001';
  v_buyer_refund NUMERIC;
  v_seller_consume NUMERIC;
  v_fill_ratio NUMERIC;
  v_buyer_lock_consume NUMERIC;
  v_new_buy_filled NUMERIC;
  v_new_sell_filled NUMERIC;
BEGIN
  -- Quantize all amounts to 8 decimals
  p_base_amount := ROUND(p_base_amount, 8);
  p_quote_amount := ROUND(p_quote_amount, 8);
  p_buyer_fee := ROUND(p_buyer_fee, 8);
  p_seller_fee := ROUND(p_seller_fee, 8);
  v_total_fees := p_buyer_fee + p_seller_fee;
  
  -- Get asset IDs
  SELECT id INTO v_base_asset_id FROM assets WHERE symbol = p_base_asset;
  SELECT id INTO v_quote_asset_id FROM assets WHERE symbol = p_quote_asset;
  
  IF v_base_asset_id IS NULL OR v_quote_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: base=%, quote=%', p_base_asset, p_quote_asset;
  END IF;
  
  -- Lock both orders for atomic update
  SELECT * INTO v_buy_order FROM orders WHERE id = p_buy_order_id FOR UPDATE;
  SELECT * INTO v_sell_order FROM orders WHERE id = p_sell_order_id FOR UPDATE;
  
  IF v_buy_order IS NULL OR v_sell_order IS NULL THEN
    RAISE EXCEPTION 'Order not found: buy=%, sell=%', p_buy_order_id, p_sell_order_id;
  END IF;
  
  -- Validate orders are still fillable
  IF v_buy_order.status NOT IN ('pending', 'partially_filled') THEN
    RAISE EXCEPTION 'Buy order not fillable: status=%', v_buy_order.status;
  END IF;
  
  IF v_sell_order.status NOT IN ('pending', 'partially_filled') THEN
    RAISE EXCEPTION 'Sell order not fillable: status=%', v_sell_order.status;
  END IF;
  
  -- Calculate what we're actually filling
  v_fill_quantity := p_base_amount;
  v_quote_required := p_quote_amount + p_buyer_fee;
  
  -- Calculate new filled amounts
  v_new_buy_filled := COALESCE(v_buy_order.filled_amount, 0) + v_fill_quantity;
  v_new_sell_filled := COALESCE(v_sell_order.filled_amount, 0) + v_fill_quantity;
  
  -- Calculate proportional lock consumption for buyer
  IF (v_buy_order.amount - COALESCE(v_buy_order.filled_amount, 0)) > 0 THEN
    v_fill_ratio := LEAST(v_fill_quantity / (v_buy_order.amount - COALESCE(v_buy_order.filled_amount, 0)), 1);
  ELSE
    v_fill_ratio := 1;
  END IF;
  v_buyer_lock_consume := ROUND(COALESCE(v_buy_order.locked_amount, 0) * v_fill_ratio, 8);
  
  -- Calculate refund: consumed lock - actual used
  v_buyer_refund := GREATEST(v_buyer_lock_consume - v_quote_required, 0);
  
  -- For seller, consume proportional to fill
  v_seller_consume := v_fill_quantity;
  
  -- ===== ATOMIC BALANCE TRANSFERS =====
  
  -- 1) BUYER: Consume from locked, refund excess to available
  UPDATE wallet_balances
  SET 
    locked = GREATEST(locked - v_buyer_lock_consume, 0),
    available = available + v_buyer_refund,
    updated_at = NOW()
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;
  
  -- 2) BUYER: Receive base asset
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_buyer_id, v_base_asset_id, v_fill_quantity, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + v_fill_quantity,
    updated_at = NOW();
  
  -- 3) SELLER: Release base from locked
  UPDATE wallet_balances
  SET 
    locked = GREATEST(locked - v_seller_consume, 0),
    updated_at = NOW()
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id;
  
  -- 4) SELLER: Receive quote minus fee
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_seller_id, v_quote_asset_id, p_quote_amount - p_seller_fee, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + (p_quote_amount - p_seller_fee),
    updated_at = NOW();
  
  -- 5) PLATFORM: Credit fees
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (v_platform_account_id, v_quote_asset_id, v_total_fees, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + v_total_fees,
    updated_at = NOW();
  
  -- ===== UPDATE ORDERS =====
  
  UPDATE orders
  SET 
    filled_amount = v_new_buy_filled,
    locked_amount = GREATEST(COALESCE(locked_amount, 0) - v_buyer_lock_consume, 0),
    status = CASE 
      WHEN v_new_buy_filled >= amount THEN 'filled'
      ELSE 'partially_filled'
    END,
    updated_at = NOW()
  WHERE id = p_buy_order_id;
  
  UPDATE orders
  SET 
    filled_amount = v_new_sell_filled,
    locked_amount = GREATEST(COALESCE(locked_amount, 0) - v_seller_consume, 0),
    status = CASE 
      WHEN v_new_sell_filled >= amount THEN 'filled'
      ELSE 'partially_filled'
    END,
    updated_at = NOW()
  WHERE id = p_sell_order_id;
  
  -- ===== CREATE TRADE RECORD (correct column names) =====
  
  v_trade_id := gen_random_uuid();
  
  INSERT INTO trades (
    id,
    symbol,
    buy_order_id,
    sell_order_id,
    buyer_id,
    seller_id,
    price,
    quantity,
    total_value,
    buyer_fee,
    seller_fee,
    fee_asset,
    trading_type,
    trade_time,
    created_at
  ) VALUES (
    v_trade_id,
    p_symbol,
    p_buy_order_id,
    p_sell_order_id,
    p_buyer_id,
    p_seller_id,
    p_quote_amount / NULLIF(p_base_amount, 0),
    p_base_amount,
    p_quote_amount,
    p_buyer_fee,
    p_seller_fee,
    p_quote_asset,
    p_trading_type,
    NOW(),
    NOW()
  );
  
  RETURN v_trade_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;
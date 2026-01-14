-- ================================================================
-- TRADING ENGINE COMPLETE FIX
-- Phase 1: Market Order Best Ask Price + Slippage
-- Phase 2: Simplified execute_trade (trust locked amounts)
-- Phase 4: Clean State Machine 
-- ================================================================

-- Phase 1: Fix place_order_atomic to use BEST ASK PRICE for market orders
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_user_id uuid, 
  p_symbol text, 
  p_side text, 
  p_order_type text, 
  p_amount numeric, 
  p_price numeric DEFAULT NULL::numeric, 
  p_trading_type text DEFAULT 'spot'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_asset TEXT;
  v_quote_asset TEXT;
  v_lock_asset TEXT;
  v_lock_amount NUMERIC;
  v_fee_rate NUMERIC := 0.005; -- 0.5% fee
  v_slippage_rate NUMERIC := 0.10; -- 10% slippage buffer for market orders
  v_order_id UUID;
  v_current_balance NUMERIC;
  v_asset_id UUID;
  v_effective_price NUMERIC;
  v_best_ask NUMERIC;
  v_best_bid NUMERIC;
BEGIN
  -- Parse the trading pair
  v_base_asset := split_part(p_symbol, '/', 1);
  v_quote_asset := split_part(p_symbol, '/', 2);
  
  -- Determine which asset to lock and how much
  IF p_side = 'buy' THEN
    v_lock_asset := v_quote_asset;
    
    IF p_order_type = 'market' THEN
      -- PHASE 1 FIX: Use BEST ASK PRICE from order book, NOT initial_price
      SELECT MIN(price) INTO v_best_ask
      FROM orders
      WHERE symbol = p_symbol
        AND side = 'sell'
        AND status IN ('pending', 'partially_filled')
        AND price > 0;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
        -- Fallback to market_prices if no sell orders exist
        SELECT current_price INTO v_best_ask
        FROM market_prices
        WHERE symbol = p_symbol;
      END IF;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
        -- Final fallback to asset initial_price
        SELECT initial_price INTO v_best_ask
        FROM assets
        WHERE symbol = v_base_asset;
      END IF;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No price available for market order. Please use a limit order.');
      END IF;
      
      -- Apply slippage buffer for market orders (10%)
      v_effective_price := v_best_ask * (1 + v_slippage_rate);
    ELSE
      -- Limit orders use the specified price
      v_effective_price := COALESCE(p_price, 0);
    END IF;
    
    IF v_effective_price <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid price. Please enter a valid price greater than 0.');
    END IF;
    
    -- Lock: amount * price * (1 + fee)
    v_lock_amount := p_amount * v_effective_price * (1 + v_fee_rate);
    
  ELSE -- SELL side
    v_lock_asset := v_base_asset;
    
    IF p_order_type = 'market' THEN
      -- For market sell orders, get best bid for price display
      SELECT MAX(price) INTO v_best_bid
      FROM orders
      WHERE symbol = p_symbol
        AND side = 'buy'
        AND status IN ('pending', 'partially_filled')
        AND price > 0;
      
      v_effective_price := COALESCE(v_best_bid, 0);
    ELSE
      v_effective_price := COALESCE(p_price, 0);
    END IF;
    
    -- For sell orders, lock base asset (amount * (1 + fee))
    v_lock_amount := p_amount * (1 + v_fee_rate);
  END IF;
  
  -- Round to 8 decimal places
  v_lock_amount := ROUND(v_lock_amount, 8);
  
  -- Get the asset ID for the lock asset
  SELECT id INTO v_asset_id
  FROM assets
  WHERE symbol = v_lock_asset
  LIMIT 1;
  
  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset ' || v_lock_asset || ' not found');
  END IF;
  
  -- Check current available balance with row lock
  SELECT available INTO v_current_balance
  FROM wallet_balances
  WHERE user_id = p_user_id AND asset_id = v_asset_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;
  
  IF v_current_balance < v_lock_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient ' || v_lock_asset || ' balance. You need ' || ROUND(v_lock_amount, 4) || ' but only have ' || ROUND(v_current_balance, 4) || ' available.'
    );
  END IF;
  
  -- Lock the balance atomically
  UPDATE wallet_balances
  SET 
    available = available - v_lock_amount,
    locked = locked + v_lock_amount,
    updated_at = now()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;
  
  -- Generate order ID
  v_order_id := gen_random_uuid();
  
  -- Create the order with locked amount tracking
  INSERT INTO orders (
    id,
    user_id,
    symbol,
    side,
    order_type,
    amount,
    price,
    filled_amount,
    remaining_amount,
    status,
    trading_type,
    locked_asset_symbol,
    locked_amount,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    p_user_id,
    p_symbol,
    p_side,
    p_order_type,
    p_amount,
    CASE WHEN p_order_type = 'limit' THEN p_price ELSE v_effective_price END,
    0,
    p_amount,
    'pending',
    p_trading_type,
    v_lock_asset,
    v_lock_amount,
    now(),
    now()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'locked_asset', v_lock_asset,
    'locked_amount', v_lock_amount,
    'effective_price', v_effective_price
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Phase 2 & 4: Simplified execute_trade - Trust locked amounts, atomic execution
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
  
  -- Calculate proportional lock consumption for buyer
  IF v_buy_order.remaining_amount > 0 THEN
    v_fill_ratio := LEAST(v_fill_quantity / v_buy_order.remaining_amount, 1);
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
  
  -- Update buy order
  UPDATE orders
  SET 
    filled_amount = filled_amount + v_fill_quantity,
    remaining_amount = GREATEST(remaining_amount - v_fill_quantity, 0),
    locked_amount = GREATEST(COALESCE(locked_amount, 0) - v_buyer_lock_consume, 0),
    status = CASE 
      WHEN remaining_amount - v_fill_quantity <= 0 THEN 'filled'
      ELSE 'partially_filled'
    END,
    updated_at = NOW()
  WHERE id = p_buy_order_id;
  
  -- Update sell order
  UPDATE orders
  SET 
    filled_amount = filled_amount + v_fill_quantity,
    remaining_amount = GREATEST(remaining_amount - v_fill_quantity, 0),
    locked_amount = GREATEST(COALESCE(locked_amount, 0) - v_seller_consume, 0),
    status = CASE 
      WHEN remaining_amount - v_fill_quantity <= 0 THEN 'filled'
      ELSE 'partially_filled'
    END,
    updated_at = NOW()
  WHERE id = p_sell_order_id;
  
  -- ===== CREATE TRADE RECORD =====
  
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
    total,
    buyer_fee,
    seller_fee,
    trading_type,
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
    p_trading_type,
    NOW()
  );
  
  RETURN v_trade_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;

-- Phase 5: Fix any broken pending orders (recalculate locked amounts if needed)
-- This ensures all pending orders have correct locked_amount tracking
UPDATE orders o
SET 
  locked_amount = CASE 
    WHEN o.side = 'buy' THEN ROUND(o.remaining_amount * o.price * 1.005, 8)
    ELSE ROUND(o.remaining_amount * 1.005, 8)
  END
WHERE o.status IN ('pending', 'partially_filled')
  AND (o.locked_amount IS NULL OR o.locked_amount = 0)
  AND o.price > 0;
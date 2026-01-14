-- PHASE 0: Immediate orphan lock repair
-- Fix all users with locked > 0 but no open orders

DO $$
DECLARE
  r RECORD;
  v_result JSONB;
  v_fixed_count INTEGER := 0;
BEGIN
  FOR r IN 
    SELECT DISTINCT wb.user_id, a.symbol
    FROM wallet_balances wb
    JOIN assets a ON a.id = wb.asset_id
    WHERE wb.locked > 0.00000001
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.user_id = wb.user_id
          AND o.status IN ('pending', 'partially_filled')
          AND (
            (o.side = 'sell' AND split_part(o.symbol, '/', 1) = a.symbol)
            OR (o.side = 'buy' AND split_part(o.symbol, '/', 2) = a.symbol)
          )
      )
  LOOP
    SELECT reconcile_locked_balance(r.user_id, r.symbol) INTO v_result;
    IF (v_result->>'reconciled')::boolean = true THEN
      v_fixed_count := v_fixed_count + 1;
      RAISE NOTICE 'Fixed orphan lock: user=%, asset=%, amount=%', 
        r.user_id, r.symbol, v_result->>'discrepancy';
    END IF;
  END LOOP;
  RAISE NOTICE 'Total orphan locks fixed: %', v_fixed_count;
END $$;

-- PHASE 1: Add explicit lock tracking on orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS locked_asset_symbol TEXT,
ADD COLUMN IF NOT EXISTS locked_amount NUMERIC(20,8) DEFAULT 0;

-- Backfill existing open orders with their locked amounts
UPDATE public.orders o
SET 
  locked_asset_symbol = CASE 
    WHEN o.side = 'buy' THEN split_part(o.symbol, '/', 2)
    ELSE split_part(o.symbol, '/', 1)
  END,
  locked_amount = CASE 
    WHEN o.side = 'buy' THEN ROUND(o.remaining_amount * COALESCE(o.price, 0) * 1.005, 8)
    ELSE o.remaining_amount
  END
WHERE o.status IN ('pending', 'partially_filled')
  AND o.locked_asset_symbol IS NULL;

-- PHASE 1: Create atomic order placement function
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_user_id UUID,
  p_symbol TEXT,
  p_side TEXT,
  p_order_type TEXT,
  p_amount NUMERIC,
  p_price NUMERIC DEFAULT NULL,
  p_trading_type TEXT DEFAULT 'spot'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_asset TEXT;
  v_quote_asset TEXT;
  v_locked_asset TEXT;
  v_locked_amount NUMERIC(20,8);
  v_asset_id UUID;
  v_current_available NUMERIC(20,8);
  v_order_id UUID;
  v_fee_rate NUMERIC := 0.005; -- 0.5% fee buffer for buys
  v_market_price NUMERIC;
BEGIN
  -- Validate user is the authenticated user
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  -- Validate inputs
  IF p_symbol IS NULL OR p_symbol = '' OR position('/' IN p_symbol) = 0 THEN
    RAISE EXCEPTION 'Invalid symbol format. Expected BASE/QUOTE';
  END IF;
  
  IF p_side NOT IN ('buy', 'sell') THEN
    RAISE EXCEPTION 'Invalid side. Must be buy or sell';
  END IF;
  
  IF p_order_type NOT IN ('market', 'limit') THEN
    RAISE EXCEPTION 'Invalid order type. Must be market or limit';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  IF p_order_type = 'limit' AND (p_price IS NULL OR p_price <= 0) THEN
    RAISE EXCEPTION 'Limit orders require a positive price';
  END IF;

  -- Parse symbol
  v_base_asset := split_part(p_symbol, '/', 1);
  v_quote_asset := split_part(p_symbol, '/', 2);

  -- Determine what to lock
  IF p_side = 'buy' THEN
    v_locked_asset := v_quote_asset;
    -- For market orders, get current price
    IF p_order_type = 'market' THEN
      SELECT price INTO v_market_price 
      FROM market_prices 
      WHERE symbol = p_symbol 
      ORDER BY updated_at DESC 
      LIMIT 1;
      
      IF v_market_price IS NULL THEN
        RAISE EXCEPTION 'No market price available for %', p_symbol;
      END IF;
      v_locked_amount := ROUND(p_amount * v_market_price * (1 + v_fee_rate), 8);
    ELSE
      v_locked_amount := ROUND(p_amount * p_price * (1 + v_fee_rate), 8);
    END IF;
  ELSE
    v_locked_asset := v_base_asset;
    v_locked_amount := ROUND(p_amount, 8);
  END IF;

  -- Get asset ID
  SELECT id INTO v_asset_id
  FROM assets
  WHERE symbol = v_locked_asset AND is_active = true;
  
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset % not found or inactive', v_locked_asset;
  END IF;

  -- Lock the wallet row and check balance atomically
  SELECT available INTO v_current_available
  FROM wallet_balances
  WHERE user_id = p_user_id AND asset_id = v_asset_id
  FOR UPDATE;

  IF v_current_available IS NULL THEN
    RAISE EXCEPTION 'No balance found for asset %', v_locked_asset;
  END IF;

  IF v_current_available < v_locked_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_current_available, v_locked_amount;
  END IF;

  -- Update wallet balance (lock funds)
  UPDATE wallet_balances
  SET 
    available = available - v_locked_amount,
    locked = locked + v_locked_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;

  -- Create the order with explicit lock tracking
  INSERT INTO orders (
    user_id,
    symbol,
    side,
    order_type,
    amount,
    price,
    status,
    filled_amount,
    remaining_amount,
    trading_type,
    locked_asset_symbol,
    locked_amount,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_symbol,
    p_side,
    p_order_type,
    p_amount,
    CASE WHEN p_order_type = 'market' THEN v_market_price ELSE p_price END,
    'pending',
    0,
    p_amount,
    COALESCE(p_trading_type, 'spot'),
    v_locked_asset,
    v_locked_amount,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- Log the atomic placement
  INSERT INTO trading_audit_log (
    event_type,
    user_id,
    order_id,
    details,
    created_at
  ) VALUES (
    'ORDER_PLACED_ATOMIC',
    p_user_id,
    v_order_id,
    jsonb_build_object(
      'symbol', p_symbol,
      'side', p_side,
      'order_type', p_order_type,
      'amount', p_amount,
      'price', CASE WHEN p_order_type = 'market' THEN v_market_price ELSE p_price END,
      'locked_asset', v_locked_asset,
      'locked_amount', v_locked_amount
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'locked_asset', v_locked_asset,
    'locked_amount', v_locked_amount,
    'status', 'pending'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update execute_order_cancel to use explicit locked_amount from order
CREATE OR REPLACE FUNCTION public.execute_order_cancel(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_asset_id UUID;
  v_unlock_amount NUMERIC(20,8);
BEGIN
  -- Lock and fetch the order
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or unauthorized');
  END IF;

  IF v_order.status NOT IN ('pending', 'partially_filled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be cancelled: status is ' || v_order.status);
  END IF;

  -- Use explicit locked_amount if available, otherwise calculate
  IF v_order.locked_amount IS NOT NULL AND v_order.locked_amount > 0 THEN
    v_unlock_amount := v_order.locked_amount;
  ELSE
    -- Fallback calculation for orders without explicit tracking
    IF v_order.side = 'buy' THEN
      v_unlock_amount := ROUND(v_order.remaining_amount * COALESCE(v_order.price, 0) * 1.005, 8);
    ELSE
      v_unlock_amount := v_order.remaining_amount;
    END IF;
  END IF;

  -- Get the asset ID for unlocking
  SELECT id INTO v_asset_id
  FROM assets
  WHERE symbol = COALESCE(v_order.locked_asset_symbol, 
    CASE WHEN v_order.side = 'buy' THEN split_part(v_order.symbol, '/', 2)
         ELSE split_part(v_order.symbol, '/', 1) END)
    AND is_active = true;

  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found');
  END IF;

  -- Update order status
  UPDATE orders
  SET 
    status = 'cancelled',
    locked_amount = 0,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Unlock balance atomically
  UPDATE wallet_balances
  SET 
    available = available + v_unlock_amount,
    locked = GREATEST(0, locked - v_unlock_amount),
    updated_at = NOW()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;

  -- Audit log
  INSERT INTO trading_audit_log (
    event_type,
    user_id,
    order_id,
    details,
    created_at
  ) VALUES (
    'ORDER_CANCELLED_ATOMIC',
    p_user_id,
    p_order_id,
    jsonb_build_object(
      'symbol', v_order.symbol,
      'side', v_order.side,
      'unlocked_amount', v_unlock_amount,
      'unlocked_asset', COALESCE(v_order.locked_asset_symbol, 
        CASE WHEN v_order.side = 'buy' THEN split_part(v_order.symbol, '/', 2)
             ELSE split_part(v_order.symbol, '/', 1) END),
      'remaining_amount', v_order.remaining_amount
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'unlocked_amount', v_unlock_amount,
    'status', 'cancelled'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.place_order_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_order_cancel TO authenticated;
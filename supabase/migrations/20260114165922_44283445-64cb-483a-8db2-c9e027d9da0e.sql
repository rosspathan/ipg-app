-- Fix place_order_atomic to NOT insert into generated column remaining_amount
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
  v_lock_asset TEXT;
  v_lock_amount NUMERIC;
  v_fee_rate NUMERIC := 0.001; -- 0.1% fee
  v_order_id UUID;
  v_current_balance NUMERIC;
  v_asset_id UUID;
  v_effective_price NUMERIC;
BEGIN
  -- Parse the trading pair
  v_base_asset := split_part(p_symbol, '/', 1);
  v_quote_asset := split_part(p_symbol, '/', 2);
  
  -- Determine which asset to lock and how much
  IF p_side = 'buy' THEN
    v_lock_asset := v_quote_asset;
    -- For buy orders, lock quote asset (price * amount * (1 + fee))
    v_effective_price := COALESCE(p_price, 0);
    IF p_order_type = 'market' THEN
      -- For market orders, get the current market price
      SELECT initial_price INTO v_effective_price
      FROM assets
      WHERE symbol = v_base_asset
      LIMIT 1;
      
      IF v_effective_price IS NULL OR v_effective_price <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No market price available for ' || v_base_asset || '. Please use a limit order.');
      END IF;
    END IF;
    
    IF v_effective_price <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid price. Please enter a valid price greater than 0.');
    END IF;
    
    v_lock_amount := p_amount * v_effective_price * (1 + v_fee_rate);
  ELSE
    v_lock_asset := v_base_asset;
    -- For sell orders, lock base asset (amount * (1 + fee))
    v_lock_amount := p_amount * (1 + v_fee_rate);
    v_effective_price := COALESCE(p_price, 0);
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
  
  -- Check current available balance
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
  -- NOTE: Do NOT insert remaining_amount as it's a GENERATED column
  INSERT INTO orders (
    id,
    user_id,
    symbol,
    side,
    order_type,
    amount,
    price,
    filled_amount,
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
$$;
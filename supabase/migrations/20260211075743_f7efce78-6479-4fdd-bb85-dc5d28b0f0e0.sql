
-- Fix #1: Read fee rate dynamically from trading_engine_settings instead of hardcoding
-- Fix #2: Sell orders should lock exactly p_amount of base asset (fees come from quote proceeds)

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
  v_fee_rate NUMERIC;
  v_slippage_rate NUMERIC := 0.10; -- 10% slippage buffer for market orders
  v_order_id UUID;
  v_current_balance NUMERIC;
  v_asset_id UUID;
  v_effective_price NUMERIC;
  v_best_ask NUMERIC;
  v_best_bid NUMERIC;
  v_taker_fee_pct NUMERIC;
  v_maker_fee_pct NUMERIC;
BEGIN
  -- Parse the trading pair
  v_base_asset := split_part(p_symbol, '/', 1);
  v_quote_asset := split_part(p_symbol, '/', 2);
  
  -- FIX #1: Read fee rates dynamically from trading_engine_settings
  SELECT 
    COALESCE(taker_fee_percent, 0.5) / 100,
    COALESCE(maker_fee_percent, 0.5) / 100
  INTO v_taker_fee_pct, v_maker_fee_pct
  FROM trading_engine_settings
  LIMIT 1;
  
  -- Use the HIGHER of maker/taker fee as buffer to ensure sufficient lock
  v_fee_rate := GREATEST(COALESCE(v_taker_fee_pct, 0.005), COALESCE(v_maker_fee_pct, 0.005));
  
  -- Determine which asset to lock and how much
  IF p_side = 'buy' THEN
    v_lock_asset := v_quote_asset;
    
    IF p_order_type = 'market' THEN
      -- Use BEST ASK PRICE from order book
      SELECT MIN(price) INTO v_best_ask
      FROM orders
      WHERE symbol = p_symbol
        AND side = 'sell'
        AND status IN ('pending', 'partially_filled')
        AND price > 0;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
        SELECT current_price INTO v_best_ask
        FROM market_prices
        WHERE symbol = p_symbol;
      END IF;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
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
      v_effective_price := COALESCE(p_price, 0);
    END IF;
    
    IF v_effective_price <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid price. Please enter a valid price greater than 0.');
    END IF;
    
    -- Buy: lock quote = amount * price * (1 + fee_rate)
    v_lock_amount := p_amount * v_effective_price * (1 + v_fee_rate);
    
  ELSE -- SELL side
    v_lock_asset := v_base_asset;
    
    IF p_order_type = 'market' THEN
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
    
    -- FIX #2: Sell orders lock EXACTLY the base amount.
    -- Fees are deducted from quote proceeds in execute_trade, not from the base asset.
    v_lock_amount := p_amount;
  END IF;
  
  v_lock_amount := ROUND(v_lock_amount, 8);
  
  SELECT id INTO v_asset_id
  FROM assets
  WHERE symbol = v_lock_asset
  LIMIT 1;
  
  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset ' || v_lock_asset || ' not found');
  END IF;
  
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
  
  UPDATE wallet_balances
  SET 
    available = available - v_lock_amount,
    locked = locked + v_lock_amount,
    updated_at = now()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;
  
  v_order_id := gen_random_uuid();
  
  -- Note: remaining_amount is a generated column, don't insert it
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
    COALESCE(p_price, v_effective_price),
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
END;
$function$;

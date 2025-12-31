-- ===============================================
-- TRADING FIX: Add IPG/USDT trading pair and admin seeding functions
-- ===============================================

-- 1. Insert IPG/USDT trading pair if not exists
INSERT INTO trading_pairs (
  id,
  base_asset_id,
  quote_asset_id,
  symbol,
  tick_size,
  lot_size,
  min_price,
  max_price,
  maker_fee,
  taker_fee,
  active
)
SELECT 
  gen_random_uuid(),
  base.id,
  quote.id,
  'IPG/USDT',
  0.01,       -- tick_size
  0.001,      -- lot_size
  0.00000001, -- min_price
  999999999,  -- max_price
  0.0010,     -- maker_fee (0.1%)
  0.0010,     -- taker_fee (0.1%)
  true        -- active
FROM 
  assets base,
  assets quote
WHERE 
  base.symbol = 'IPG' 
  AND quote.symbol = 'USDT'
  AND NOT EXISTS (
    SELECT 1 FROM trading_pairs WHERE symbol = 'IPG/USDT'
  );

-- 2. Create admin function to seed market liquidity
CREATE OR REPLACE FUNCTION admin_seed_market_order(
  p_admin_id UUID,
  p_symbol TEXT,
  p_side TEXT,
  p_amount NUMERIC,
  p_price NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_base_symbol TEXT;
  v_quote_symbol TEXT;
  v_asset_id UUID;
  v_required_amount NUMERIC;
BEGIN
  -- Validate admin role
  IF NOT has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can seed market orders';
  END IF;
  
  -- Parse symbol
  v_base_symbol := split_part(p_symbol, '/', 1);
  v_quote_symbol := split_part(p_symbol, '/', 2);
  
  -- Calculate required amount and determine which asset to lock
  IF p_side = 'buy' THEN
    v_required_amount := p_amount * p_price;
    SELECT id INTO v_asset_id FROM assets WHERE symbol = v_quote_symbol;
  ELSE
    v_required_amount := p_amount;
    SELECT id INTO v_asset_id FROM assets WHERE symbol = v_base_symbol;
  END IF;
  
  -- Check admin has sufficient balance
  IF NOT EXISTS (
    SELECT 1 FROM wallet_balances 
    WHERE user_id = p_admin_id 
      AND asset_id = v_asset_id 
      AND available >= v_required_amount
  ) THEN
    RAISE EXCEPTION 'Insufficient balance for market maker order. Required: % %', 
      v_required_amount, 
      CASE WHEN p_side = 'buy' THEN v_quote_symbol ELSE v_base_symbol END;
  END IF;
  
  -- Lock the balance
  UPDATE wallet_balances
  SET 
    available = available - v_required_amount,
    locked = locked + v_required_amount,
    updated_at = now()
  WHERE user_id = p_admin_id AND asset_id = v_asset_id;
  
  -- Create the order
  INSERT INTO orders (
    user_id,
    symbol,
    side,
    order_type,
    amount,
    price,
    status,
    trading_type,
    metadata
  ) VALUES (
    p_admin_id,
    p_symbol,
    p_side,
    'limit',
    p_amount,
    p_price,
    'pending',
    'spot',
    jsonb_build_object('source', 'market_maker', 'seeded_at', now())
  )
  RETURNING id INTO v_order_id;
  
  -- Log the operation
  INSERT INTO admin_actions_log (
    admin_user_id,
    action_type,
    target_table,
    target_id,
    details
  ) VALUES (
    p_admin_id,
    'seed_market_order',
    'orders',
    v_order_id,
    jsonb_build_object(
      'symbol', p_symbol,
      'side', p_side,
      'amount', p_amount,
      'price', p_price
    )
  );
  
  RETURN v_order_id;
END;
$$;

-- 3. Create function to trigger matching for a symbol
CREATE OR REPLACE FUNCTION admin_trigger_matching(p_symbol TEXT DEFAULT NULL)
RETURNS TABLE(matched_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buy_order RECORD;
  v_sell_order RECORD;
  v_matched INTEGER := 0;
  v_execution_price NUMERIC;
  v_matched_qty NUMERIC;
  v_base_symbol TEXT;
  v_quote_symbol TEXT;
  v_total_value NUMERIC;
  v_buyer_fee NUMERIC;
  v_seller_fee NUMERIC;
  v_fee_percent NUMERIC := 0.005; -- 0.5%
BEGIN
  -- Get matchable orders
  FOR v_buy_order IN 
    SELECT * FROM orders 
    WHERE status = 'pending' 
      AND side = 'buy'
      AND (p_symbol IS NULL OR symbol = p_symbol)
    ORDER BY price DESC, created_at ASC
  LOOP
    FOR v_sell_order IN 
      SELECT * FROM orders 
      WHERE status = 'pending' 
        AND side = 'sell'
        AND symbol = v_buy_order.symbol
        AND user_id != v_buy_order.user_id
        AND (v_buy_order.price >= price OR v_buy_order.order_type = 'market' OR order_type = 'market')
      ORDER BY price ASC, created_at ASC
    LOOP
      -- Determine execution price (maker's price)
      IF v_buy_order.order_type = 'market' THEN
        v_execution_price := v_sell_order.price;
      ELSIF v_sell_order.order_type = 'market' THEN
        v_execution_price := v_buy_order.price;
      ELSE
        v_execution_price := v_sell_order.price;
      END IF;
      
      -- Calculate matched quantity
      v_matched_qty := LEAST(v_buy_order.remaining_amount, v_sell_order.remaining_amount);
      
      IF v_matched_qty > 0 AND v_execution_price > 0 THEN
        -- Parse symbol
        v_base_symbol := split_part(v_buy_order.symbol, '/', 1);
        v_quote_symbol := split_part(v_buy_order.symbol, '/', 2);
        
        -- Calculate fees
        v_total_value := v_matched_qty * v_execution_price;
        v_buyer_fee := v_total_value * v_fee_percent;
        v_seller_fee := v_total_value * v_fee_percent;
        
        -- Settle the trade
        BEGIN
          PERFORM settle_trade(
            v_buy_order.user_id,
            v_sell_order.user_id,
            v_base_symbol,
            v_quote_symbol,
            v_matched_qty,
            v_execution_price,
            v_buyer_fee,
            v_seller_fee
          );
          
          -- Create trade record
          INSERT INTO trades (
            symbol,
            buy_order_id,
            sell_order_id,
            buyer_id,
            seller_id,
            quantity,
            price,
            total_value,
            buyer_fee,
            seller_fee,
            fee_asset,
            trading_type
          ) VALUES (
            v_buy_order.symbol,
            v_buy_order.id,
            v_sell_order.id,
            v_buy_order.user_id,
            v_sell_order.user_id,
            v_matched_qty,
            v_execution_price,
            v_total_value,
            v_buyer_fee,
            v_seller_fee,
            v_quote_symbol,
            'spot'
          );
          
          -- Update buy order
          UPDATE orders SET
            filled_amount = filled_amount + v_matched_qty,
            remaining_amount = remaining_amount - v_matched_qty,
            status = CASE 
              WHEN remaining_amount - v_matched_qty <= 0 THEN 'filled'
              ELSE 'partially_filled'
            END,
            filled_at = CASE 
              WHEN remaining_amount - v_matched_qty <= 0 THEN now()
              ELSE filled_at
            END
          WHERE id = v_buy_order.id;
          
          -- Update sell order
          UPDATE orders SET
            filled_amount = filled_amount + v_matched_qty,
            remaining_amount = remaining_amount - v_matched_qty,
            status = CASE 
              WHEN remaining_amount - v_matched_qty <= 0 THEN 'filled'
              ELSE 'partially_filled'
            END,
            filled_at = CASE 
              WHEN remaining_amount - v_matched_qty <= 0 THEN now()
              ELSE filled_at
            END
          WHERE id = v_sell_order.id;
          
          v_matched := v_matched + 1;
          
          -- Update local remaining amounts
          v_buy_order.remaining_amount := v_buy_order.remaining_amount - v_matched_qty;
          v_sell_order.remaining_amount := v_sell_order.remaining_amount - v_matched_qty;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Trade settlement failed: %', SQLERRM;
        END;
      END IF;
      
      -- Exit sell loop if buy order fully filled
      EXIT WHEN v_buy_order.remaining_amount <= 0;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT v_matched, format('Matched %s orders', v_matched);
END;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_seed_market_order TO authenticated;
GRANT EXECUTE ON FUNCTION admin_trigger_matching TO authenticated;
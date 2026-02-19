
-- Fix execute_trade to update 24h stats (percentage change, high, low, volume) after each trade
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_buy_order_id UUID,
  p_sell_order_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_symbol TEXT,
  p_base_asset TEXT,
  p_quote_asset TEXT,
  p_base_amount NUMERIC,
  p_quote_amount NUMERIC,
  p_buyer_fee NUMERIC,
  p_seller_fee NUMERIC,
  p_trading_type TEXT DEFAULT 'spot'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_asset_id UUID;
  v_quote_asset_id UUID;
  v_trade_id UUID;
  v_buy_order RECORD;
  v_sell_order RECORD;
  v_fill_quantity NUMERIC;
  v_actual_remaining_buy NUMERIC;
  v_actual_remaining_sell NUMERIC;
  v_quote_required NUMERIC;
  v_total_fees NUMERIC;
  v_platform_account_id UUID := '00000000-0000-0000-0000-000000000001';
  v_buyer_refund NUMERIC;
  v_seller_consume NUMERIC;
  v_fill_ratio NUMERIC;
  v_buyer_lock_consume NUMERIC;
  v_seller_lock_consume NUMERIC;
  v_new_buy_filled NUMERIC;
  v_new_sell_filled NUMERIC;
  v_buy_new_status TEXT;
  v_sell_new_status TEXT;
  v_buy_remaining_lock NUMERIC;
  v_sell_remaining_lock NUMERIC;
  v_buyer_balance RECORD;
  v_seller_balance RECORD;
  v_exec_price NUMERIC;
  -- New variables for 24h stats
  v_trade_price NUMERIC;
  v_open_price_24h NUMERIC;
  v_high_24h NUMERIC;
  v_low_24h NUMERIC;
  v_volume_24h NUMERIC;
  v_price_change NUMERIC;
  v_price_change_pct NUMERIC;
BEGIN
  -- Quantize all amounts to 8 decimals
  p_base_amount := ROUND(p_base_amount, 8);
  p_quote_amount := ROUND(p_quote_amount, 8);
  p_buyer_fee := ROUND(p_buyer_fee, 8);
  p_seller_fee := ROUND(p_seller_fee, 8);
  
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
  
  -- Cap fill quantity to actual remaining
  v_actual_remaining_buy := GREATEST(v_buy_order.amount - COALESCE(v_buy_order.filled_amount, 0), 0);
  v_actual_remaining_sell := GREATEST(v_sell_order.amount - COALESCE(v_sell_order.filled_amount, 0), 0);
  
  v_fill_quantity := LEAST(p_base_amount, v_actual_remaining_buy, v_actual_remaining_sell);
  v_fill_quantity := ROUND(v_fill_quantity, 8);
  
  IF v_fill_quantity <= 0 THEN
    RAISE EXCEPTION 'No remaining quantity to fill: buy_remaining=%, sell_remaining=%', v_actual_remaining_buy, v_actual_remaining_sell;
  END IF;
  
  -- Recalculate quote amount and fees proportionally if fill was capped
  IF v_fill_quantity < p_base_amount AND p_base_amount > 0 THEN
    v_exec_price := p_quote_amount / p_base_amount;
    p_quote_amount := ROUND(v_fill_quantity * v_exec_price, 8);
    p_buyer_fee := ROUND(p_buyer_fee * (v_fill_quantity / p_base_amount), 8);
    p_seller_fee := ROUND(p_seller_fee * (v_fill_quantity / p_base_amount), 8);
    p_base_amount := v_fill_quantity;
  END IF;
  
  v_total_fees := p_buyer_fee + p_seller_fee;
  v_quote_required := p_quote_amount + p_buyer_fee;
  
  v_new_buy_filled := COALESCE(v_buy_order.filled_amount, 0) + v_fill_quantity;
  v_new_sell_filled := COALESCE(v_sell_order.filled_amount, 0) + v_fill_quantity;
  
  -- Determine new statuses
  IF v_new_buy_filled >= v_buy_order.amount THEN
    v_buy_new_status := 'filled';
    v_buy_remaining_lock := 0;
    v_buyer_lock_consume := COALESCE(v_buy_order.locked_amount, 0);
  ELSE
    v_buy_new_status := 'partially_filled';
    v_fill_ratio := LEAST(v_fill_quantity / v_actual_remaining_buy, 1);
    v_buyer_lock_consume := ROUND(COALESCE(v_buy_order.locked_amount, 0) * v_fill_ratio, 8);
    v_buy_remaining_lock := GREATEST(COALESCE(v_buy_order.locked_amount, 0) - v_buyer_lock_consume, 0);
  END IF;
  
  IF v_new_sell_filled >= v_sell_order.amount THEN
    v_sell_new_status := 'filled';
    v_sell_remaining_lock := 0;
    v_seller_lock_consume := COALESCE(v_sell_order.locked_amount, 0);
  ELSE
    v_sell_new_status := 'partially_filled';
    v_fill_ratio := LEAST(v_fill_quantity / v_actual_remaining_sell, 1);
    v_seller_lock_consume := ROUND(COALESCE(v_sell_order.locked_amount, 0) * v_fill_ratio, 8);
    v_sell_remaining_lock := GREATEST(COALESCE(v_sell_order.locked_amount, 0) - v_seller_lock_consume, 0);
  END IF;
  
  v_buyer_refund := GREATEST(v_buyer_lock_consume - v_quote_required, 0);
  
  -- ===== ATOMIC BALANCE TRANSFERS =====
  
  -- 1) BUYER: Consume from locked, refund excess to available
  UPDATE wallet_balances
  SET 
    locked = GREATEST(locked - v_buyer_lock_consume, 0),
    available = available + v_buyer_refund,
    updated_at = NOW()
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id
  RETURNING available, locked INTO v_buyer_balance;
  
  -- Ledger entry for buyer debit
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, 
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_buyer_id, p_quote_asset, v_buyer_refund, -v_buyer_lock_consume,
    COALESCE(v_buyer_balance.available, 0), COALESCE(v_buyer_balance.locked, 0),
    'FILL_DEBIT', 'trade', NULL);
  
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
    locked = GREATEST(locked - v_seller_lock_consume, 0),
    updated_at = NOW()
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id
  RETURNING available, locked INTO v_seller_balance;
  
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
    filled_amount = LEAST(v_new_buy_filled, v_buy_order.amount),
    status = v_buy_new_status,
    locked_amount = v_buy_remaining_lock,
    average_price = CASE 
      WHEN v_new_buy_filled > 0 THEN 
        (COALESCE(average_price, 0) * COALESCE(v_buy_order.filled_amount, 0) + (p_quote_amount / v_fill_quantity) * v_fill_quantity) / LEAST(v_new_buy_filled, v_buy_order.amount)
      ELSE p_quote_amount / v_fill_quantity
    END,
    filled_at = CASE WHEN v_buy_new_status = 'filled' THEN NOW() ELSE filled_at END,
    updated_at = NOW()
  WHERE id = p_buy_order_id;
  
  UPDATE orders
  SET 
    filled_amount = LEAST(v_new_sell_filled, v_sell_order.amount),
    status = v_sell_new_status,
    locked_amount = v_sell_remaining_lock,
    average_price = CASE 
      WHEN v_new_sell_filled > 0 THEN 
        (COALESCE(average_price, 0) * COALESCE(v_sell_order.filled_amount, 0) + (p_quote_amount / v_fill_quantity) * v_fill_quantity) / LEAST(v_new_sell_filled, v_sell_order.amount)
      ELSE p_quote_amount / v_fill_quantity
    END,
    filled_at = CASE WHEN v_sell_new_status = 'filled' THEN NOW() ELSE filled_at END,
    updated_at = NOW()
  WHERE id = p_sell_order_id;
  
  -- Create trade record
  v_trade_id := gen_random_uuid();
  INSERT INTO trades (
    id, symbol, buy_order_id, sell_order_id, buyer_id, seller_id,
    price, quantity, buyer_fee, seller_fee, total_value, trade_time, trading_type
  ) VALUES (
    v_trade_id, p_symbol, p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
    p_quote_amount / v_fill_quantity, v_fill_quantity, p_buyer_fee, p_seller_fee,
    p_quote_amount, NOW(), p_trading_type
  );
  
  -- ===== UPDATE MARKET PRICE WITH 24H STATS =====
  v_trade_price := p_quote_amount / v_fill_quantity;
  
  -- Calculate 24h stats from trades table
  SELECT 
    MIN(t.price),
    MAX(t.price),
    COALESCE(SUM(t.quantity), 0),
    -- Get the earliest trade price in the 24h window as the "open" price
    (SELECT t2.price FROM trades t2 
     WHERE t2.symbol = p_symbol AND t2.trade_time >= NOW() - INTERVAL '24 hours'
     ORDER BY t2.trade_time ASC LIMIT 1)
  INTO v_low_24h, v_high_24h, v_volume_24h, v_open_price_24h
  FROM trades t
  WHERE t.symbol = p_symbol AND t.trade_time >= NOW() - INTERVAL '24 hours';
  
  -- Include current trade in high/low
  v_high_24h := GREATEST(COALESCE(v_high_24h, v_trade_price), v_trade_price);
  v_low_24h := LEAST(COALESCE(v_low_24h, v_trade_price), v_trade_price);
  
  -- Calculate price change
  IF v_open_price_24h IS NOT NULL AND v_open_price_24h > 0 THEN
    v_price_change := v_trade_price - v_open_price_24h;
    v_price_change_pct := ROUND(((v_trade_price - v_open_price_24h) / v_open_price_24h * 100)::numeric, 4);
  ELSE
    v_price_change := 0;
    v_price_change_pct := 0;
  END IF;
  
  -- Update market price with full 24h stats
  UPDATE market_prices
  SET 
    current_price = v_trade_price,
    high_24h = v_high_24h,
    low_24h = v_low_24h,
    volume_24h = v_volume_24h,
    price_change_24h = v_price_change,
    price_change_percentage_24h = v_price_change_pct,
    last_updated = NOW(),
    updated_at = NOW()
  WHERE symbol = p_symbol;
  
  -- If no row was updated (new pair), insert with a generated market_id
  IF NOT FOUND THEN
    INSERT INTO market_prices (symbol, current_price, market_id, last_updated, high_24h, low_24h, volume_24h, price_change_24h, price_change_percentage_24h)
    SELECT p_symbol, v_trade_price, m.id, NOW(), v_high_24h, v_low_24h, v_volume_24h, v_price_change, v_price_change_pct
    FROM markets m WHERE m.symbol = p_symbol
    LIMIT 1;
  END IF;
  
  RETURN v_trade_id;
END;
$$;

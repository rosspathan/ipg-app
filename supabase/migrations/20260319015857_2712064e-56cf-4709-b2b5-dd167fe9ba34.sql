
-- ============================================================
-- UPGRADE execute_trade: Add atomic fee recording + full ledger
-- ============================================================

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
  v_seller_quote_balance RECORD;
  v_buyer_base_balance RECORD;
  v_exec_price NUMERIC;
  v_trade_price NUMERIC;
  v_open_price_24h NUMERIC;
  v_high_24h NUMERIC;
  v_low_24h NUMERIC;
  v_volume_24h NUMERIC;
  v_price_change NUMERIC;
  v_price_change_pct NUMERIC;
  v_db_maker_fee_pct NUMERIC;
  v_db_taker_fee_pct NUMERIC;
  v_buyer_is_taker BOOLEAN;
BEGIN
  p_base_amount := ROUND(p_base_amount, 8);
  p_quote_amount := ROUND(p_quote_amount, 8);
  p_buyer_fee := ROUND(p_buyer_fee, 8);
  p_seller_fee := ROUND(p_seller_fee, 8);
  
  -- ===== DB-LEVEL FEE ENFORCEMENT =====
  SELECT 
    COALESCE(maker_fee_percent, 0.5) / 100,
    COALESCE(taker_fee_percent, 0.5) / 100
  INTO v_db_maker_fee_pct, v_db_taker_fee_pct
  FROM trading_engine_settings LIMIT 1;
  
  -- Enforce minimum fee from DB settings (prevents fee bypass)
  p_buyer_fee := GREATEST(p_buyer_fee, ROUND(p_quote_amount * LEAST(v_db_maker_fee_pct, v_db_taker_fee_pct), 8));
  p_seller_fee := GREATEST(p_seller_fee, ROUND(p_quote_amount * LEAST(v_db_maker_fee_pct, v_db_taker_fee_pct), 8));
  
  SELECT id INTO v_base_asset_id FROM assets WHERE symbol = p_base_asset;
  SELECT id INTO v_quote_asset_id FROM assets WHERE symbol = p_quote_asset;
  
  IF v_base_asset_id IS NULL OR v_quote_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: base=%, quote=%', p_base_asset, p_quote_asset;
  END IF;
  
  SELECT * INTO v_buy_order FROM orders WHERE id = p_buy_order_id FOR UPDATE;
  SELECT * INTO v_sell_order FROM orders WHERE id = p_sell_order_id FOR UPDATE;
  
  IF v_buy_order IS NULL OR v_sell_order IS NULL THEN
    RAISE EXCEPTION 'Order not found: buy=%, sell=%', p_buy_order_id, p_sell_order_id;
  END IF;
  
  IF v_buy_order.status NOT IN ('pending', 'partially_filled') THEN
    RAISE EXCEPTION 'Buy order not fillable: status=%', v_buy_order.status;
  END IF;
  IF v_sell_order.status NOT IN ('pending', 'partially_filled') THEN
    RAISE EXCEPTION 'Sell order not fillable: status=%', v_sell_order.status;
  END IF;
  
  v_actual_remaining_buy := GREATEST(v_buy_order.amount - COALESCE(v_buy_order.filled_amount, 0), 0);
  v_actual_remaining_sell := GREATEST(v_sell_order.amount - COALESCE(v_sell_order.filled_amount, 0), 0);
  v_fill_quantity := ROUND(LEAST(p_base_amount, v_actual_remaining_buy, v_actual_remaining_sell), 8);
  
  IF v_fill_quantity <= 0 THEN
    RAISE EXCEPTION 'No remaining quantity to fill';
  END IF;
  
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
  
  UPDATE wallet_balances
  SET locked = GREATEST(locked - v_buyer_lock_consume, 0),
      available = available + v_buyer_refund, updated_at = NOW()
  WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id
  RETURNING available, locked INTO v_buyer_balance;
  
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, 
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_buyer_id, p_quote_asset, v_buyer_refund, -v_buyer_lock_consume,
    COALESCE(v_buyer_balance.available, 0), COALESCE(v_buyer_balance.locked, 0),
    'FILL_DEBIT', 'trade', NULL);
  
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_buyer_id, v_base_asset_id, v_fill_quantity, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET available = wallet_balances.available + v_fill_quantity, updated_at = NOW();

  SELECT available, locked INTO v_buyer_base_balance 
  FROM wallet_balances WHERE user_id = p_buyer_id AND asset_id = v_base_asset_id;
  
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_buyer_id, p_base_asset, v_fill_quantity, 0,
    COALESCE(v_buyer_base_balance.available, 0), COALESCE(v_buyer_base_balance.locked, 0),
    'FILL_CREDIT', 'trade', NULL);
  
  UPDATE wallet_balances
  SET locked = GREATEST(locked - v_seller_lock_consume, 0), updated_at = NOW()
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id
  RETURNING available, locked INTO v_seller_balance;
  
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_seller_id, p_base_asset, 0, -v_seller_lock_consume,
    COALESCE(v_seller_balance.available, 0), COALESCE(v_seller_balance.locked, 0),
    'FILL_DEBIT', 'trade', NULL);
  
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_seller_id, v_quote_asset_id, p_quote_amount - p_seller_fee, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET available = wallet_balances.available + (p_quote_amount - p_seller_fee), updated_at = NOW();

  SELECT available, locked INTO v_seller_quote_balance
  FROM wallet_balances WHERE user_id = p_seller_id AND asset_id = v_quote_asset_id;
  
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_seller_id, p_quote_asset, p_quote_amount - p_seller_fee, 0,
    COALESCE(v_seller_quote_balance.available, 0), COALESCE(v_seller_quote_balance.locked, 0),
    'FILL_CREDIT', 'trade', NULL);
  
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (v_platform_account_id, v_quote_asset_id, v_total_fees, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET available = wallet_balances.available + v_total_fees, updated_at = NOW();
  
  -- ===== UPDATE ORDERS =====
  UPDATE orders
  SET filled_amount = LEAST(v_new_buy_filled, v_buy_order.amount),
      status = v_buy_new_status, locked_amount = v_buy_remaining_lock,
      average_price = CASE 
        WHEN v_new_buy_filled > 0 THEN 
          (COALESCE(average_price, 0) * COALESCE(v_buy_order.filled_amount, 0) + (p_quote_amount / v_fill_quantity) * v_fill_quantity) / LEAST(v_new_buy_filled, v_buy_order.amount)
        ELSE p_quote_amount / v_fill_quantity END,
      filled_at = CASE WHEN v_buy_new_status = 'filled' THEN NOW() ELSE filled_at END,
      updated_at = NOW()
  WHERE id = p_buy_order_id;
  
  UPDATE orders
  SET filled_amount = LEAST(v_new_sell_filled, v_sell_order.amount),
      status = v_sell_new_status, locked_amount = v_sell_remaining_lock,
      average_price = CASE 
        WHEN v_new_sell_filled > 0 THEN 
          (COALESCE(average_price, 0) * COALESCE(v_sell_order.filled_amount, 0) + (p_quote_amount / v_fill_quantity) * v_fill_quantity) / LEAST(v_new_sell_filled, v_sell_order.amount)
        ELSE p_quote_amount / v_fill_quantity END,
      filled_at = CASE WHEN v_sell_new_status = 'filled' THEN NOW() ELSE filled_at END,
      updated_at = NOW()
  WHERE id = p_sell_order_id;
  
  -- ===== TRADE RECORD =====
  v_trade_id := gen_random_uuid();
  v_trade_price := p_quote_amount / v_fill_quantity;
  
  INSERT INTO trades (
    id, symbol, buy_order_id, sell_order_id, buyer_id, seller_id,
    price, quantity, buyer_fee, seller_fee, total_value, trade_time, trading_type
  ) VALUES (
    v_trade_id, p_symbol, p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
    v_trade_price, v_fill_quantity, p_buyer_fee, p_seller_fee,
    p_quote_amount, NOW(), p_trading_type
  );
  
  -- ===== ATOMIC FEE RECORDING (previously in edge function) =====
  v_buyer_is_taker := v_buy_order.created_at > v_sell_order.created_at;
  
  INSERT INTO trading_fees_collected (
    trade_id, symbol, fee_asset, fee_amount, fee_percent,
    user_id, side, admin_wallet, status
  ) VALUES
  (v_trade_id, p_symbol, p_quote_asset, p_buyer_fee,
   CASE WHEN v_buyer_is_taker THEN v_db_taker_fee_pct * 100 ELSE v_db_maker_fee_pct * 100 END,
   p_buyer_id, 'buy', 'platform_account', 'collected'),
  (v_trade_id, p_symbol, p_quote_asset, p_seller_fee,
   CASE WHEN v_buyer_is_taker THEN v_db_maker_fee_pct * 100 ELSE v_db_taker_fee_pct * 100 END,
   p_seller_id, 'sell', 'platform_account', 'collected');
  
  -- ===== MARKET PRICE WITH 24H STATS =====
  SELECT MIN(t.price), MAX(t.price), COALESCE(SUM(t.quantity), 0),
    (SELECT t2.price FROM trades t2 
     WHERE t2.symbol = p_symbol AND t2.trade_time >= NOW() - INTERVAL '24 hours'
     ORDER BY t2.trade_time ASC LIMIT 1)
  INTO v_low_24h, v_high_24h, v_volume_24h, v_open_price_24h
  FROM trades t WHERE t.symbol = p_symbol AND t.trade_time >= NOW() - INTERVAL '24 hours';
  
  v_high_24h := GREATEST(COALESCE(v_high_24h, v_trade_price), v_trade_price);
  v_low_24h := LEAST(COALESCE(v_low_24h, v_trade_price), v_trade_price);
  
  IF v_open_price_24h IS NOT NULL AND v_open_price_24h > 0 THEN
    v_price_change := v_trade_price - v_open_price_24h;
    v_price_change_pct := ROUND(((v_trade_price - v_open_price_24h) / v_open_price_24h * 100)::numeric, 4);
  ELSE
    v_price_change := 0; v_price_change_pct := 0;
  END IF;
  
  UPDATE market_prices
  SET current_price = v_trade_price, high_24h = v_high_24h, low_24h = v_low_24h,
      volume_24h = v_volume_24h, price_change_24h = v_price_change,
      price_change_percentage_24h = v_price_change_pct,
      last_updated = NOW(), updated_at = NOW()
  WHERE symbol = p_symbol;
  
  IF NOT FOUND THEN
    INSERT INTO market_prices (symbol, current_price, market_id, last_updated, high_24h, low_24h, volume_24h, price_change_24h, price_change_percentage_24h)
    SELECT p_symbol, v_trade_price, m.id, NOW(), v_high_24h, v_low_24h, v_volume_24h, v_price_change, v_price_change_pct
    FROM markets m WHERE m.symbol = p_symbol LIMIT 1;
  END IF;
  
  RETURN v_trade_id;
END;
$$;

-- ============================================================
-- 1. ORDER BOOK RPC: exclude dust price levels (display as 0.00000)
--    Dust threshold = 0.00001 base units (numeric comparison, no strings)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_order_book(p_symbol text, p_depth integer DEFAULT 50)
 RETURNS TABLE(side text, price numeric, quantity numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  (
    SELECT 'buy'::text AS side, price, SUM(remaining_amount) AS quantity
    FROM public.orders
    WHERE symbol = p_symbol
      AND side = 'buy'
      AND order_type = 'limit'
      AND status IN ('pending','partially_filled')
      AND price IS NOT NULL
      AND remaining_amount > 0
    GROUP BY price
    HAVING SUM(remaining_amount) >= 0.00001
    ORDER BY price DESC
    LIMIT p_depth
  )
  UNION ALL
  (
    SELECT 'sell'::text AS side, price, SUM(remaining_amount) AS quantity
    FROM public.orders
    WHERE symbol = p_symbol
      AND side = 'sell'
      AND order_type = 'limit'
      AND status IN ('pending','partially_filled')
      AND price IS NOT NULL
      AND remaining_amount > 0
    GROUP BY price
    HAVING SUM(remaining_amount) >= 0.00001
    ORDER BY price ASC
    LIMIT p_depth
  );
$function$;

-- ============================================================
-- 2. SETTLEMENT: auto-close dust remainders so they never rest in the book
--    Only the two status/lock decision blocks change vs the previous version:
--    "fully filled" now also triggers when remaining <= dust (0.00001).
-- ============================================================
CREATE OR REPLACE FUNCTION public.execute_trade(p_buy_order_id uuid, p_sell_order_id uuid, p_buyer_id uuid, p_seller_id uuid, p_symbol text, p_base_asset text, p_quote_asset text, p_base_amount numeric, p_quote_amount numeric, p_buyer_fee numeric, p_seller_fee numeric, p_trading_type text DEFAULT 'spot'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_asset_id UUID; v_quote_asset_id UUID; v_trade_id UUID;
  v_buy_order RECORD; v_sell_order RECORD;
  v_fill_quantity NUMERIC; v_actual_remaining_buy NUMERIC; v_actual_remaining_sell NUMERIC;
  v_quote_required NUMERIC; v_buyer_refund NUMERIC; v_fill_ratio NUMERIC;
  v_buyer_lock_consume NUMERIC; v_seller_lock_consume NUMERIC;
  v_new_buy_filled NUMERIC; v_new_sell_filled NUMERIC;
  v_buy_new_status TEXT; v_sell_new_status TEXT;
  v_buy_remaining_lock NUMERIC; v_sell_remaining_lock NUMERIC;
  v_buyer_balance RECORD; v_seller_balance RECORD;
  v_seller_quote_balance NUMERIC; v_buyer_base_balance NUMERIC;
  v_exec_price NUMERIC; v_trade_price NUMERIC;
  v_db_maker_fee_pct NUMERIC; v_db_taker_fee_pct NUMERIC;
  v_buyer_is_taker BOOLEAN;
  v_dust CONSTANT NUMERIC := 0.00001;  -- remainders at/below this are treated as fully filled
BEGIN
  p_base_amount := ROUND(p_base_amount, 8);
  p_quote_amount := ROUND(p_quote_amount, 8);
  p_buyer_fee := ROUND(p_buyer_fee, 8);
  p_seller_fee := ROUND(p_seller_fee, 8);

  SELECT COALESCE(maker_fee_percent,0.5)/100, COALESCE(taker_fee_percent,0.5)/100
  INTO v_db_maker_fee_pct, v_db_taker_fee_pct FROM trading_engine_settings LIMIT 1;

  p_buyer_fee  := GREATEST(p_buyer_fee,  ROUND(p_quote_amount * LEAST(v_db_maker_fee_pct, v_db_taker_fee_pct), 8));
  p_seller_fee := GREATEST(p_seller_fee, ROUND(p_quote_amount * LEAST(v_db_maker_fee_pct, v_db_taker_fee_pct), 8));

  SELECT id INTO v_base_asset_id FROM assets WHERE symbol = p_base_asset;
  SELECT id INTO v_quote_asset_id FROM assets WHERE symbol = p_quote_asset;
  IF v_base_asset_id IS NULL OR v_quote_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: base=%, quote=%', p_base_asset, p_quote_asset;
  END IF;

  SELECT * INTO v_buy_order  FROM orders WHERE id = p_buy_order_id  FOR UPDATE;
  SELECT * INTO v_sell_order FROM orders WHERE id = p_sell_order_id FOR UPDATE;
  IF v_buy_order IS NULL OR v_sell_order IS NULL THEN
    RAISE EXCEPTION 'Order not found: buy=%, sell=%', p_buy_order_id, p_sell_order_id;
  END IF;
  IF v_buy_order.status  NOT IN ('pending','partially_filled') THEN RAISE EXCEPTION 'Buy not fillable: %',  v_buy_order.status;  END IF;
  IF v_sell_order.status NOT IN ('pending','partially_filled') THEN RAISE EXCEPTION 'Sell not fillable: %', v_sell_order.status; END IF;

  -- PHANTOM LIQUIDITY GUARD: maker (older order) must be limit with positive price
  v_buyer_is_taker := v_buy_order.created_at >= v_sell_order.created_at;
  IF v_buyer_is_taker THEN
    IF v_sell_order.order_type = 'market' THEN
      RAISE EXCEPTION 'PHANTOM_MAKER_REJECTED: sell order % is market type, cannot rest', v_sell_order.id;
    END IF;
    IF COALESCE(v_sell_order.price,0) <= 0 THEN
      RAISE EXCEPTION 'PHANTOM_MAKER_REJECTED: sell order % has price=%', v_sell_order.id, v_sell_order.price;
    END IF;
  ELSE
    IF v_buy_order.order_type = 'market' THEN
      RAISE EXCEPTION 'PHANTOM_MAKER_REJECTED: buy order % is market type, cannot rest', v_buy_order.id;
    END IF;
    IF COALESCE(v_buy_order.price,0) <= 0 THEN
      RAISE EXCEPTION 'PHANTOM_MAKER_REJECTED: buy order % has price=%', v_buy_order.id, v_buy_order.price;
    END IF;
  END IF;
  IF v_buy_order.order_type='limit' AND v_sell_order.order_type='limit' THEN
    IF v_buy_order.price < v_sell_order.price THEN
      RAISE EXCEPTION 'NO_CROSS: buy limit % below sell limit %', v_buy_order.price, v_sell_order.price;
    END IF;
  END IF;

  v_actual_remaining_buy  := GREATEST(v_buy_order.amount  - COALESCE(v_buy_order.filled_amount,0), 0);
  v_actual_remaining_sell := GREATEST(v_sell_order.amount - COALESCE(v_sell_order.filled_amount,0), 0);
  v_fill_quantity := ROUND(LEAST(p_base_amount, v_actual_remaining_buy, v_actual_remaining_sell), 8);
  IF v_fill_quantity <= 0 THEN RAISE EXCEPTION 'No remaining quantity to fill'; END IF;

  IF v_fill_quantity < p_base_amount AND p_base_amount > 0 THEN
    v_exec_price := p_quote_amount / p_base_amount;
    p_quote_amount := ROUND(v_fill_quantity * v_exec_price, 8);
    p_buyer_fee  := ROUND(p_buyer_fee  * (v_fill_quantity / p_base_amount), 8);
    p_seller_fee := ROUND(p_seller_fee * (v_fill_quantity / p_base_amount), 8);
    p_base_amount := v_fill_quantity;
  END IF;

  v_quote_required  := p_quote_amount + p_buyer_fee;
  v_new_buy_filled  := COALESCE(v_buy_order.filled_amount,0)  + v_fill_quantity;
  v_new_sell_filled := COALESCE(v_sell_order.filled_amount,0) + v_fill_quantity;

  -- DUST AUTO-CLOSE: remainder at/below v_dust => treat as fully filled and release all lock
  IF (v_buy_order.amount - v_new_buy_filled) <= v_dust THEN
    v_buy_new_status:='filled'; v_buy_remaining_lock:=0;
    v_buyer_lock_consume := COALESCE(v_buy_order.locked_amount,0);
  ELSE
    v_buy_new_status:='partially_filled';
    v_fill_ratio := LEAST(v_fill_quantity / v_actual_remaining_buy, 1);
    v_buyer_lock_consume := ROUND(COALESCE(v_buy_order.locked_amount,0) * v_fill_ratio, 8);
    v_buy_remaining_lock := GREATEST(COALESCE(v_buy_order.locked_amount,0) - v_buyer_lock_consume, 0);
  END IF;
  IF (v_sell_order.amount - v_new_sell_filled) <= v_dust THEN
    v_sell_new_status:='filled'; v_sell_remaining_lock:=0;
    v_seller_lock_consume := COALESCE(v_sell_order.locked_amount,0);
  ELSE
    v_sell_new_status:='partially_filled';
    v_fill_ratio := LEAST(v_fill_quantity / v_actual_remaining_sell, 1);
    v_seller_lock_consume := ROUND(COALESCE(v_sell_order.locked_amount,0) * v_fill_ratio, 8);
    v_sell_remaining_lock := GREATEST(COALESCE(v_sell_order.locked_amount,0) - v_seller_lock_consume, 0);
  END IF;

  v_buyer_refund := GREATEST(v_buyer_lock_consume - v_quote_required, 0);
  v_buyer_lock_consume := LEAST(v_buyer_lock_consume, COALESCE(v_buy_order.locked_amount,0));

  UPDATE wallet_balances wb
  SET locked = GREATEST(wb.locked - v_buyer_lock_consume, 0),
      available = wb.available + v_buyer_refund, updated_at = now()
  FROM assets a WHERE wb.user_id=p_buyer_id AND wb.asset_id=a.id AND a.symbol=p_quote_asset
  RETURNING wb.available, wb.locked INTO v_buyer_balance;

  UPDATE wallet_balances wb
  SET locked = GREATEST(wb.locked - v_seller_lock_consume, 0), updated_at = now()
  FROM assets a WHERE wb.user_id=p_seller_id AND wb.asset_id=a.id AND a.symbol=p_base_asset
  RETURNING wb.available, wb.locked INTO v_seller_balance;

  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_buyer_id, v_base_asset_id, p_base_amount, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET available = wallet_balances.available + EXCLUDED.available, updated_at = now()
  RETURNING available INTO v_buyer_base_balance;

  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_seller_id, v_quote_asset_id, p_quote_amount - p_seller_fee, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET available = wallet_balances.available + EXCLUDED.available, updated_at = now()
  RETURNING available INTO v_seller_quote_balance;

  UPDATE orders SET filled_amount=v_new_buy_filled, status=v_buy_new_status,
    locked_amount=v_buy_remaining_lock,
    filled_at = CASE WHEN v_buy_new_status='filled' THEN now() ELSE filled_at END,
    updated_at=now() WHERE id=p_buy_order_id;
  UPDATE orders SET filled_amount=v_new_sell_filled, status=v_sell_new_status,
    locked_amount=v_sell_remaining_lock,
    filled_at = CASE WHEN v_sell_new_status='filled' THEN now() ELSE filled_at END,
    updated_at=now() WHERE id=p_sell_order_id;

  v_trade_price := ROUND(p_quote_amount / NULLIF(p_base_amount,0), 8);
  INSERT INTO trades (buy_order_id, sell_order_id, buyer_id, seller_id, symbol, trading_type,
    quantity, price, total_value, buyer_fee, seller_fee, fee_asset, trade_time)
  VALUES (p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id, p_symbol, p_trading_type,
    p_base_amount, v_trade_price, p_quote_amount, p_buyer_fee, p_seller_fee, p_quote_asset, now())
  RETURNING id INTO v_trade_id;

  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id, notes)
  VALUES
    (p_buyer_id,  p_quote_asset, v_buyer_refund, -v_buyer_lock_consume,
      COALESCE(v_buyer_balance.available,0), COALESCE(v_buyer_balance.locked,0),
      'TRADE_FILL','trade',v_trade_id,'buy fill: consumed '||v_buyer_lock_consume||' locked, refund '||v_buyer_refund),
    (p_buyer_id,  p_base_asset, p_base_amount, 0,
      COALESCE(v_buyer_base_balance,0), 0,'TRADE_FILL','trade',v_trade_id,'buy fill: received '||p_base_amount),
    (p_seller_id, p_base_asset, 0, -v_seller_lock_consume,
      COALESCE(v_seller_balance.available,0), COALESCE(v_seller_balance.locked,0),
      'TRADE_FILL','trade',v_trade_id,'sell fill: consumed '||v_seller_lock_consume||' locked'),
    (p_seller_id, p_quote_asset, p_quote_amount - p_seller_fee, 0,
      COALESCE(v_seller_quote_balance,0), 0,'TRADE_FILL','trade',v_trade_id,'sell fill: received '||(p_quote_amount-p_seller_fee));

  UPDATE market_prices SET current_price=v_trade_price, last_updated=now() WHERE symbol=p_symbol;
  IF NOT FOUND THEN
    INSERT INTO market_prices (symbol, current_price, last_updated) VALUES (p_symbol, v_trade_price, now())
    ON CONFLICT (symbol) DO UPDATE SET current_price=EXCLUDED.current_price, last_updated=now();
  END IF;

  RETURN v_trade_id;
END;
$function$;

-- ============================================================
-- 3. ONE-TIME CLEANUP of existing SSS/USDT dust sell order
--    (remaining 0.00000200). Close it and release the leftover lock.
-- ============================================================
DO $cleanup$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id = 'c392ef8b-d154-4960-aa79-02506b4b6958'
    AND status = 'partially_filled'
    AND remaining_amount <= 0.00001;

  IF FOUND THEN
    -- release the dust lock back to available for the SSS base asset
    UPDATE public.wallet_balances wb
    SET locked = GREATEST(wb.locked - COALESCE(v_order.locked_amount,0), 0),
        available = wb.available + COALESCE(v_order.locked_amount,0),
        updated_at = now()
    FROM public.assets a
    WHERE wb.asset_id = a.id
      AND a.symbol = 'SSS'
      AND wb.user_id = v_order.user_id;

    -- close the order so it leaves the book
    UPDATE public.orders
    SET status = 'filled',
        locked_amount = 0,
        filled_at = COALESCE(filled_at, now()),
        updated_at = now()
    WHERE id = v_order.id;
  END IF;
END
$cleanup$;
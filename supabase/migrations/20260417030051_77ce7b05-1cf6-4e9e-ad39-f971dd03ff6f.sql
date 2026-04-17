-- PART 1: Cancel phantom orders + refund seller
DO $$
DECLARE
  v_phantom_ids UUID[] := ARRAY[
    'c07b12c3-5e9a-4df8-b2fd-0a3e9248fe05'::uuid,
    '6b83a5c4-e8ee-486e-affb-bd72875e8b2c'::uuid
  ];
  v_order RECORD;
  v_asset_id UUID;
  v_balance_after RECORD;
BEGIN
  FOR v_order IN
    SELECT * FROM orders
    WHERE id = ANY(v_phantom_ids) AND status IN ('pending','open','partially_filled')
    FOR UPDATE
  LOOP
    SELECT id INTO v_asset_id FROM assets WHERE symbol = v_order.locked_asset_symbol LIMIT 1;
    IF v_asset_id IS NULL THEN RAISE EXCEPTION 'Asset not found: %', v_order.locked_asset_symbol; END IF;

    UPDATE wallet_balances
    SET available = available + COALESCE(v_order.locked_amount,0),
        locked    = GREATEST(locked - COALESCE(v_order.locked_amount,0), 0),
        updated_at = now()
    WHERE user_id = v_order.user_id AND asset_id = v_asset_id
    RETURNING available, locked INTO v_balance_after;

    INSERT INTO trading_balance_ledger (
      user_id, asset_symbol, delta_available, delta_locked,
      balance_available_after, balance_locked_after,
      entry_type, reference_type, reference_id, notes
    ) VALUES (
      v_order.user_id, v_order.locked_asset_symbol,
      COALESCE(v_order.locked_amount,0), -COALESCE(v_order.locked_amount,0),
      COALESCE(v_balance_after.available,0), COALESCE(v_balance_after.locked,0),
      'ORDER_CANCEL', 'order', v_order.id,
      'PHANTOM CLEANUP: cancelled stale resting market sell. Refunded ' || COALESCE(v_order.locked_amount,0) || ' ' || v_order.locked_asset_symbol
    );

    UPDATE orders
    SET status='cancelled', cancelled_at=now(), updated_at=now(), locked_amount=0,
        metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('phantom_cleanup',true,'cleanup_at',now())
    WHERE id = v_order.id;

    INSERT INTO admin_actions_log (admin_user_id, action_type, target_table, target_id, details)
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      'PHANTOM_ORDER_CANCEL', 'orders', v_order.id,
      jsonb_build_object(
        'order_id', v_order.id, 'user_id', v_order.user_id, 'symbol', v_order.symbol,
        'side', v_order.side, 'order_type', v_order.order_type, 'price', v_order.price,
        'amount', v_order.amount, 'filled_amount', v_order.filled_amount,
        'locked_refunded', v_order.locked_amount, 'locked_asset', v_order.locked_asset_symbol,
        'reason', 'phantom_market_resting_at_zero_price'
      )
    );
  END LOOP;
END $$;

-- PART 2: Forensic flag affected trades
INSERT INTO admin_actions_log (admin_user_id, action_type, target_table, target_id, details)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  'PHANTOM_TRADE_FORENSIC_FLAG', 'trades', t.id,
  jsonb_build_object(
    'trade_id', t.id, 'symbol', t.symbol, 'exec_price', t.price, 'quantity', t.quantity,
    'total_value', t.total_value, 'buyer_id', t.buyer_id, 'seller_id', t.seller_id,
    'buy_order_id', t.buy_order_id, 'sell_order_id', t.sell_order_id,
    'buyer_limit', bo.price, 'seller_order_type', so.order_type, 'seller_listed_price', so.price,
    'flag_reason', 'matched against phantom market sell order — buyer limit became execution price',
    'expected_market_price_at_match', 0.027,
    'displacement_per_unit', 0.027 - t.price,
    'estimated_displacement_value_usdt', (0.027 - t.price) * t.quantity,
    'flagged_at', now()
  )
FROM trades t
JOIN orders bo ON bo.id = t.buy_order_id
JOIN orders so ON so.id = t.sell_order_id
WHERE t.sell_order_id IN ('c07b12c3-5e9a-4df8-b2fd-0a3e9248fe05'::uuid, '6b83a5c4-e8ee-486e-affb-bd72875e8b2c'::uuid)
   OR t.buy_order_id IN ('c07b12c3-5e9a-4df8-b2fd-0a3e9248fe05'::uuid, '6b83a5c4-e8ee-486e-affb-bd72875e8b2c'::uuid);

-- PART 3: Harden execute_trade
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_buy_order_id uuid, p_sell_order_id uuid, p_buyer_id uuid, p_seller_id uuid,
  p_symbol text, p_base_asset text, p_quote_asset text,
  p_base_amount numeric, p_quote_amount numeric,
  p_buyer_fee numeric, p_seller_fee numeric,
  p_trading_type text DEFAULT 'spot'::text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

  IF v_new_buy_filled >= v_buy_order.amount THEN
    v_buy_new_status:='filled'; v_buy_remaining_lock:=0;
    v_buyer_lock_consume := COALESCE(v_buy_order.locked_amount,0);
  ELSE
    v_buy_new_status:='partially_filled';
    v_fill_ratio := LEAST(v_fill_quantity / v_actual_remaining_buy, 1);
    v_buyer_lock_consume := ROUND(COALESCE(v_buy_order.locked_amount,0) * v_fill_ratio, 8);
    v_buy_remaining_lock := GREATEST(COALESCE(v_buy_order.locked_amount,0) - v_buyer_lock_consume, 0);
  END IF;
  IF v_new_sell_filled >= v_sell_order.amount THEN
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

-- PART 4: Harden place_order_atomic (IOC market)
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_user_id uuid, p_symbol text, p_side text, p_order_type text,
  p_amount numeric, p_price numeric DEFAULT NULL::numeric, p_trading_type text DEFAULT 'spot'::text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_base_asset TEXT; v_quote_asset TEXT; v_lock_asset TEXT;
  v_lock_amount NUMERIC; v_fee_rate NUMERIC; v_slippage_rate NUMERIC := 0.10;
  v_order_id UUID; v_current_balance NUMERIC; v_asset_id UUID;
  v_effective_price NUMERIC; v_best_ask NUMERIC; v_best_bid NUMERIC;
  v_taker_fee_pct NUMERIC; v_maker_fee_pct NUMERIC; v_balance_after RECORD;
BEGIN
  v_base_asset := split_part(p_symbol,'/',1);
  v_quote_asset := split_part(p_symbol,'/',2);

  IF p_order_type = 'market' THEN
    IF p_side = 'buy' THEN
      SELECT MIN(price) INTO v_best_ask FROM orders
      WHERE symbol=p_symbol AND side='sell' AND status IN ('pending','partially_filled')
        AND order_type='limit' AND price > 0;
      IF v_best_ask IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','No sell liquidity available. Market order rejected (IOC).');
      END IF;
    ELSE
      SELECT MAX(price) INTO v_best_bid FROM orders
      WHERE symbol=p_symbol AND side='buy' AND status IN ('pending','partially_filled')
        AND order_type='limit' AND price > 0;
      IF v_best_bid IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','No buy liquidity available. Market order rejected (IOC).');
      END IF;
    END IF;
  END IF;

  SELECT COALESCE(taker_fee_percent,0.5)/100, COALESCE(maker_fee_percent,0.5)/100
  INTO v_taker_fee_pct, v_maker_fee_pct FROM trading_engine_settings LIMIT 1;
  v_fee_rate := GREATEST(COALESCE(v_taker_fee_pct,0.005), COALESCE(v_maker_fee_pct,0.005));

  IF p_side='buy' THEN
    v_lock_asset := v_quote_asset;
    IF p_order_type='market' THEN v_effective_price := v_best_ask*(1+v_slippage_rate);
    ELSE v_effective_price := COALESCE(p_price,0); END IF;
    IF v_effective_price <= 0 THEN RETURN jsonb_build_object('success',false,'error','Invalid price.'); END IF;
    v_lock_amount := p_amount * v_effective_price * (1+v_fee_rate);
  ELSE
    v_lock_asset := v_base_asset;
    IF p_order_type='market' THEN v_effective_price := v_best_bid;
    ELSE
      v_effective_price := COALESCE(p_price,0);
      IF v_effective_price <= 0 THEN RETURN jsonb_build_object('success',false,'error','Invalid price.'); END IF;
    END IF;
    v_lock_amount := p_amount;
  END IF;

  v_lock_amount := ROUND(v_lock_amount, 8);
  SELECT id INTO v_asset_id FROM assets WHERE symbol=v_lock_asset LIMIT 1;
  IF v_asset_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Asset '||v_lock_asset||' not found'); END IF;

  SELECT available INTO v_current_balance FROM wallet_balances
  WHERE user_id=p_user_id AND asset_id=v_asset_id FOR UPDATE;
  IF v_current_balance IS NULL THEN v_current_balance := 0; END IF;
  IF v_current_balance < v_lock_amount THEN
    RETURN jsonb_build_object('success',false,
      'error','Insufficient '||v_lock_asset||' balance. You need '||ROUND(v_lock_amount,4)||' but only have '||ROUND(v_current_balance,4)||' available.');
  END IF;

  UPDATE wallet_balances SET available=available-v_lock_amount, locked=locked+v_lock_amount, updated_at=now()
  WHERE user_id=p_user_id AND asset_id=v_asset_id RETURNING available, locked INTO v_balance_after;

  v_order_id := gen_random_uuid();

  INSERT INTO orders (id, user_id, symbol, side, order_type, amount, price, filled_amount, status,
    trading_type, locked_asset_symbol, locked_amount, created_at, updated_at, metadata)
  VALUES (v_order_id, p_user_id, p_symbol, p_side, p_order_type, p_amount,
    COALESCE(p_price, v_effective_price), 0, 'pending', p_trading_type,
    v_lock_asset, v_lock_amount, now(), now(),
    CASE WHEN p_order_type='market'
      THEN jsonb_build_object('time_in_force','IOC','submitted_at',now()) ELSE '{}'::jsonb END);

  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id, notes)
  VALUES (p_user_id, v_lock_asset, -v_lock_amount, v_lock_amount,
    COALESCE(v_balance_after.available,0), COALESCE(v_balance_after.locked,0),
    'ORDER_LOCK','order',v_order_id,p_side||' '||p_order_type||' order: locked '||v_lock_amount||' '||v_lock_asset);

  RETURN jsonb_build_object('success',true,'order_id',v_order_id,
    'locked_asset',v_lock_asset,'locked_amount',v_lock_amount,
    'effective_price',v_effective_price,
    'time_in_force', CASE WHEN p_order_type='market' THEN 'IOC' ELSE 'GTC' END);
END;
$function$;

-- PART 5: IOC sweeper
CREATE OR REPLACE FUNCTION public.cancel_residual_market_orders()
RETURNS TABLE(cancelled_order_id uuid, refunded_amount numeric, refunded_asset text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD; v_asset_id UUID; v_balance_after RECORD; v_grace_seconds INT := 10;
BEGIN
  FOR v_order IN
    SELECT * FROM orders
    WHERE order_type='market' AND status IN ('pending','open','partially_filled')
      AND created_at < now() - (v_grace_seconds||' seconds')::interval
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT id INTO v_asset_id FROM assets WHERE symbol=v_order.locked_asset_symbol LIMIT 1;
    IF v_asset_id IS NULL THEN CONTINUE; END IF;

    UPDATE wallet_balances
    SET available=available+COALESCE(v_order.locked_amount,0),
        locked=GREATEST(locked-COALESCE(v_order.locked_amount,0),0), updated_at=now()
    WHERE user_id=v_order.user_id AND asset_id=v_asset_id
    RETURNING available, locked INTO v_balance_after;

    INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked,
      balance_available_after, balance_locked_after, entry_type, reference_type, reference_id, notes)
    VALUES (v_order.user_id, v_order.locked_asset_symbol,
      COALESCE(v_order.locked_amount,0), -COALESCE(v_order.locked_amount,0),
      COALESCE(v_balance_after.available,0), COALESCE(v_balance_after.locked,0),
      'ORDER_CANCEL','order',v_order.id,'IOC sweeper: market order residual auto-cancelled');

    UPDATE orders SET status='cancelled', cancelled_at=now(), updated_at=now(), locked_amount=0,
      metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('ioc_swept',true,'swept_at',now())
    WHERE id=v_order.id;

    cancelled_order_id := v_order.id;
    refunded_amount := COALESCE(v_order.locked_amount,0);
    refunded_asset := v_order.locked_asset_symbol;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- PART 6: Admin diagnostic view
CREATE OR REPLACE VIEW public.v_phantom_liquidity_diagnostic AS
SELECT
  o.id AS order_id, o.user_id, o.symbol, o.side, o.order_type, o.price, o.amount,
  o.filled_amount, GREATEST(o.amount - COALESCE(o.filled_amount,0), 0) AS remaining,
  o.status, o.locked_amount, o.locked_asset_symbol, o.created_at, o.updated_at,
  CASE
    WHEN o.order_type='market' AND o.status IN ('pending','open','partially_filled') THEN 'RESTING_MARKET_ORDER'
    WHEN COALESCE(o.price,0)<=0 AND o.status IN ('pending','open','partially_filled') THEN 'ZERO_OR_NEGATIVE_PRICE'
    WHEN GREATEST(o.amount-COALESCE(o.filled_amount,0),0)<=0 AND o.status IN ('pending','open','partially_filled') THEN 'ZERO_REMAINING_BUT_OPEN'
    ELSE 'OTHER'
  END AS issue_type,
  EXTRACT(EPOCH FROM (now()-o.created_at))/60 AS age_minutes
FROM orders o
WHERE o.status IN ('pending','open','partially_filled')
  AND (o.order_type='market' OR COALESCE(o.price,0)<=0 OR GREATEST(o.amount-COALESCE(o.filled_amount,0),0)<=0);

GRANT SELECT ON public.v_phantom_liquidity_diagnostic TO authenticated;
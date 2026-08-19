-- 1. Floor settings table (singleton)
CREATE TABLE IF NOT EXISTS public.ipg_price_floor_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  floor_price numeric NOT NULL DEFAULT 500 CHECK (floor_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ipg_price_floor_settings TO anon;
GRANT SELECT ON public.ipg_price_floor_settings TO authenticated;
GRANT ALL ON public.ipg_price_floor_settings TO service_role;

ALTER TABLE public.ipg_price_floor_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read IPG floor" ON public.ipg_price_floor_settings;
CREATE POLICY "Anyone can read IPG floor"
ON public.ipg_price_floor_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage IPG floor" ON public.ipg_price_floor_settings;
CREATE POLICY "Admins manage IPG floor"
ON public.ipg_price_floor_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ipg_price_floor_settings (singleton, floor_price, is_active)
VALUES (true, 500, true)
ON CONFLICT (singleton) DO NOTHING;

-- 2. Helpers
CREATE OR REPLACE FUNCTION public.is_ipg_floor_symbol(p_symbol text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT upper(split_part(COALESCE(p_symbol,''), '/', 1)) = 'IPG';
$$;

CREATE OR REPLACE FUNCTION public.get_ipg_floor_price()
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT CASE WHEN is_active THEN floor_price ELSE 0 END
                   FROM public.ipg_price_floor_settings LIMIT 1), 0);
$$;

REVOKE ALL ON FUNCTION public.get_ipg_floor_price() FROM public;
GRANT EXECUTE ON FUNCTION public.get_ipg_floor_price() TO anon, authenticated, service_role;

-- 3. Order book must hide IPG orders below the floor
CREATE OR REPLACE FUNCTION public.get_public_order_book(p_symbol text, p_depth integer DEFAULT 50)
RETURNS TABLE(side text, price numeric, quantity numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH cfg AS (
    SELECT CASE WHEN public.is_ipg_floor_symbol(p_symbol)
                THEN public.get_ipg_floor_price() ELSE 0 END AS floor_price
  )
  (
    SELECT 'buy'::text AS side, o.price, SUM(o.remaining_amount) AS quantity
    FROM public.orders o, cfg
    WHERE o.symbol = p_symbol
      AND o.side = 'buy'
      AND o.order_type = 'limit'
      AND o.status IN ('pending','partially_filled')
      AND o.price IS NOT NULL
      AND o.price >= cfg.floor_price
      AND o.remaining_amount > 0
    GROUP BY o.price
    HAVING SUM(o.remaining_amount) >= 0.00001
    ORDER BY o.price DESC
    LIMIT p_depth
  )
  UNION ALL
  (
    SELECT 'sell'::text AS side, o.price, SUM(o.remaining_amount) AS quantity
    FROM public.orders o, cfg
    WHERE o.symbol = p_symbol
      AND o.side = 'sell'
      AND o.order_type = 'limit'
      AND o.status IN ('pending','partially_filled')
      AND o.price IS NOT NULL
      AND o.price >= cfg.floor_price
      AND o.remaining_amount > 0
    GROUP BY o.price
    HAVING SUM(o.remaining_amount) >= 0.00001
    ORDER BY o.price ASC
    LIMIT p_depth
  );
$function$;

-- 4. Hard DB guard on order inserts
CREATE OR REPLACE FUNCTION public.enforce_ipg_price_floor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_floor numeric;
BEGIN
  IF NOT public.is_ipg_floor_symbol(NEW.symbol) THEN RETURN NEW; END IF;
  v_floor := public.get_ipg_floor_price();
  IF v_floor > 0 AND NEW.price IS NOT NULL AND NEW.price > 0 AND NEW.price < v_floor
     AND NEW.status IN ('pending','open','partially_filled') THEN
    RAISE EXCEPTION 'Trading below the admin-set minimum price (% USDT) is not allowed.', v_floor
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ipg_price_floor ON public.orders;
CREATE TRIGGER trg_enforce_ipg_price_floor
BEFORE INSERT OR UPDATE OF price ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_ipg_price_floor();

-- 5. place_order_atomic: reject sub-floor IPG orders (buy + sell, limit + market)
CREATE OR REPLACE FUNCTION public.place_order_atomic(p_user_id uuid, p_symbol text, p_side text, p_order_type text, p_amount numeric, p_price numeric DEFAULT NULL::numeric, p_trading_type text DEFAULT 'spot'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_asset TEXT; v_quote_asset TEXT; v_lock_asset TEXT;
  v_lock_amount NUMERIC; v_fee_rate NUMERIC; v_slippage_rate NUMERIC := 0.10;
  v_order_id UUID; v_current_balance NUMERIC; v_asset_id UUID;
  v_effective_price NUMERIC; v_best_ask NUMERIC; v_best_bid NUMERIC;
  v_taker_fee_pct NUMERIC; v_maker_fee_pct NUMERIC; v_balance_after RECORD;
  v_floor NUMERIC := 0;
BEGIN
  v_base_asset := split_part(p_symbol,'/',1);
  v_quote_asset := split_part(p_symbol,'/',2);

  IF public.is_ipg_floor_symbol(p_symbol) THEN
    v_floor := public.get_ipg_floor_price();
  END IF;

  -- IPG PRICE FLOOR: no order (buy or sell) may be priced below the admin floor
  IF v_floor > 0 AND p_order_type = 'limit' AND COALESCE(p_price,0) < v_floor THEN
    RETURN jsonb_build_object('success',false,
      'error','Trading below the admin-set minimum price ('||trim(to_char(v_floor,'FM999999990.########'))||' USDT) is not allowed.');
  END IF;

  IF p_order_type = 'market' THEN
    IF p_side = 'buy' THEN
      SELECT MIN(price) INTO v_best_ask FROM orders
      WHERE symbol=p_symbol AND side='sell' AND status IN ('pending','partially_filled')
        AND order_type='limit' AND price > 0 AND price >= v_floor;
      IF v_best_ask IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','No sell liquidity available. Market order rejected (IOC).');
      END IF;
    ELSE
      SELECT MAX(price) INTO v_best_bid FROM orders
      WHERE symbol=p_symbol AND side='buy' AND status IN ('pending','partially_filled')
        AND order_type='limit' AND price > 0 AND price >= v_floor;
      IF v_best_bid IS NULL THEN
        RETURN jsonb_build_object('success',false,'error','No buy liquidity available. Market order rejected (IOC).');
      END IF;
      IF v_floor > 0 AND v_best_bid < v_floor THEN
        RETURN jsonb_build_object('success',false,
          'error','Trading below the admin-set minimum price ('||trim(to_char(v_floor,'FM999999990.########'))||' USDT) is not allowed.');
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

-- 6. Admin: cancel all open IPG sell orders (refund + purge)
CREATE OR REPLACE FUNCTION public.admin_cancel_ipg_sell_orders(p_only_below_floor boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD; v_asset_id uuid; v_balance_after RECORD;
  v_floor numeric; v_cancelled int := 0; v_deleted int := 0; v_refunded numeric := 0;
  v_has_trades boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  v_floor := public.get_ipg_floor_price();

  FOR v_order IN
    SELECT * FROM orders
    WHERE side = 'sell'
      AND status IN ('pending','open','partially_filled')
      AND public.is_ipg_floor_symbol(symbol)
      AND (NOT p_only_below_floor OR COALESCE(price, 0) < v_floor)
    FOR UPDATE SKIP LOCKED
  LOOP
    IF COALESCE(v_order.locked_amount,0) > 0 AND v_order.locked_asset_symbol IS NOT NULL THEN
      SELECT id INTO v_asset_id FROM assets WHERE symbol = v_order.locked_asset_symbol LIMIT 1;
      IF v_asset_id IS NOT NULL THEN
        UPDATE wallet_balances
        SET available = available + v_order.locked_amount,
            locked = GREATEST(locked - v_order.locked_amount, 0),
            updated_at = now()
        WHERE user_id = v_order.user_id AND asset_id = v_asset_id
        RETURNING available, locked INTO v_balance_after;

        INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked,
          balance_available_after, balance_locked_after, entry_type, reference_type, reference_id, notes)
        VALUES (v_order.user_id, v_order.locked_asset_symbol,
          v_order.locked_amount, -v_order.locked_amount,
          COALESCE(v_balance_after.available,0), COALESCE(v_balance_after.locked,0),
          'ORDER_CANCEL','order',v_order.id,
          'IPG price floor enforcement: sell order cancelled by admin, locked balance refunded');

        v_refunded := v_refunded + v_order.locked_amount;
      END IF;
    END IF;

    SELECT EXISTS (SELECT 1 FROM trades WHERE sell_order_id = v_order.id OR buy_order_id = v_order.id)
      INTO v_has_trades;

    IF v_has_trades THEN
      UPDATE orders SET status='cancelled', cancelled_at=now(), updated_at=now(), locked_amount=0,
        metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('ipg_floor_cancelled', true, 'cancelled_at', now())
      WHERE id = v_order.id;
    ELSE
      DELETE FROM orders WHERE id = v_order.id;
      v_deleted := v_deleted + 1;
    END IF;

    v_cancelled := v_cancelled + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'cancelled_count', v_cancelled,
    'deleted_count', v_deleted, 'refunded_ipg', v_refunded, 'floor_price', v_floor);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cancel_ipg_sell_orders(boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_cancel_ipg_sell_orders(boolean) TO authenticated, service_role;
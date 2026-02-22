
-- ============================================================
-- PHASE 1: COMPLETE LEDGER BACKFILL + RPC FIXES
-- ============================================================

-- 1. DROP the unique constraint that blocks multi-leg trade entries
-- (It prevents recording multiple legs for same trade reference_id)
DROP INDEX IF EXISTS uniq_trading_balance_ledger_ref;

-- Create a composite index instead (allows multiple entry_types per reference)
CREATE UNIQUE INDEX uniq_trading_balance_ledger_ref_v2 
ON trading_balance_ledger (reference_type, reference_id, entry_type, user_id) 
WHERE reference_id IS NOT NULL;

-- 2. BACKFILL missing DEPOSIT entries from custodial_deposits
INSERT INTO trading_balance_ledger (
  user_id, asset_symbol, delta_available, delta_locked,
  balance_available_after, balance_locked_after,
  entry_type, reference_type, reference_id, notes, created_at
)
SELECT 
  cd.user_id,
  a.symbol,
  cd.amount,
  0,
  0, -- Will be approximate (historical snapshot not available)
  0,
  'DEPOSIT',
  'custodial_deposit',
  cd.id,
  'Backfilled: on-chain deposit ' || COALESCE(cd.tx_hash, 'unknown'),
  COALESCE(cd.credited_at, cd.created_at)
FROM custodial_deposits cd
JOIN assets a ON a.id = cd.asset_id
WHERE cd.status = 'credited'
AND NOT EXISTS (
  SELECT 1 FROM trading_balance_ledger tbl 
  WHERE tbl.reference_type = 'custodial_deposit' 
  AND tbl.reference_id = cd.id
  AND tbl.entry_type = 'DEPOSIT'
)
ON CONFLICT DO NOTHING;

-- 3. BACKFILL missing WITHDRAWAL entries from withdrawals
INSERT INTO trading_balance_ledger (
  user_id, asset_symbol, delta_available, delta_locked,
  balance_available_after, balance_locked_after,
  entry_type, reference_type, reference_id, notes, created_at
)
SELECT 
  w.user_id,
  a.symbol,
  -w.amount,
  0,
  0,
  0,
  'WITHDRAWAL',
  'withdrawal',
  w.id,
  'Backfilled: withdrawal to ' || COALESCE(w.to_address, 'unknown'),
  COALESCE(w.approved_at, w.created_at)
FROM withdrawals w
JOIN assets a ON a.id = w.asset_id
WHERE w.status IN ('completed', 'processing')
AND NOT EXISTS (
  SELECT 1 FROM trading_balance_ledger tbl 
  WHERE tbl.reference_type = 'withdrawal' 
  AND tbl.reference_id = w.id
  AND tbl.entry_type = 'WITHDRAWAL'
)
ON CONFLICT DO NOTHING;

-- 4. BACKFILL trade FILL entries (all 4 legs per trade)
-- 4a. Buyer receives base asset (FILL_CREDIT)
INSERT INTO trading_balance_ledger (
  user_id, asset_symbol, delta_available, delta_locked,
  balance_available_after, balance_locked_after,
  entry_type, reference_type, reference_id, notes, created_at
)
SELECT 
  t.buyer_id,
  split_part(t.symbol, '/', 1), -- base asset
  t.quantity,
  0,
  0, 0,
  'FILL_CREDIT',
  'trade',
  t.id,
  'Backfilled: bought ' || t.quantity || ' ' || split_part(t.symbol, '/', 1),
  t.trade_time
FROM trades t
WHERE NOT EXISTS (
  SELECT 1 FROM trading_balance_ledger tbl
  WHERE tbl.reference_type = 'trade'
  AND tbl.reference_id = t.id
  AND tbl.entry_type = 'FILL_CREDIT'
  AND tbl.user_id = t.buyer_id
)
ON CONFLICT DO NOTHING;

-- 4b. Seller's base deducted from locked (FILL_DEBIT for seller)
INSERT INTO trading_balance_ledger (
  user_id, asset_symbol, delta_available, delta_locked,
  balance_available_after, balance_locked_after,
  entry_type, reference_type, reference_id, notes, created_at
)
SELECT 
  t.seller_id,
  split_part(t.symbol, '/', 1), -- base asset
  0,
  -t.quantity,
  0, 0,
  'FILL_DEBIT',
  'trade',
  t.id,
  'Backfilled: sold ' || t.quantity || ' ' || split_part(t.symbol, '/', 1),
  t.trade_time
FROM trades t
WHERE NOT EXISTS (
  SELECT 1 FROM trading_balance_ledger tbl
  WHERE tbl.reference_type = 'trade'
  AND tbl.reference_id = t.id
  AND tbl.entry_type = 'FILL_DEBIT'
  AND tbl.user_id = t.seller_id
)
ON CONFLICT DO NOTHING;

-- 4c. Seller receives quote currency (FILL_CREDIT for seller)
INSERT INTO trading_balance_ledger (
  user_id, asset_symbol, delta_available, delta_locked,
  balance_available_after, balance_locked_after,
  entry_type, reference_type, reference_id, notes, created_at
)
SELECT 
  t.seller_id,
  split_part(t.symbol, '/', 2), -- quote asset
  t.total_value - COALESCE(t.seller_fee, 0),
  0,
  0, 0,
  'FILL_CREDIT',
  'trade',
  t.id,
  'Backfilled: received ' || (t.total_value - COALESCE(t.seller_fee, 0)) || ' ' || split_part(t.symbol, '/', 2),
  t.trade_time
FROM trades t
WHERE NOT EXISTS (
  SELECT 1 FROM trading_balance_ledger tbl
  WHERE tbl.reference_type = 'trade'
  AND tbl.reference_id = t.id
  AND tbl.entry_type = 'FILL_CREDIT'
  AND tbl.user_id = t.seller_id
)
ON CONFLICT DO NOTHING;

-- 4d. Fee entries (platform revenue tracking)
INSERT INTO trading_balance_ledger (
  user_id, asset_symbol, delta_available, delta_locked,
  balance_available_after, balance_locked_after,
  entry_type, reference_type, reference_id, notes, created_at
)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  split_part(t.symbol, '/', 2),
  COALESCE(t.buyer_fee, 0) + COALESCE(t.seller_fee, 0),
  0,
  0, 0,
  'FEE_CREDIT',
  'trade',
  t.id,
  'Backfilled: fees from trade ' || t.id::text,
  t.trade_time
FROM trades t
WHERE (COALESCE(t.buyer_fee, 0) + COALESCE(t.seller_fee, 0)) > 0
AND NOT EXISTS (
  SELECT 1 FROM trading_balance_ledger tbl
  WHERE tbl.reference_type = 'trade'
  AND tbl.reference_id = t.id
  AND tbl.entry_type = 'FEE_CREDIT'
)
ON CONFLICT DO NOTHING;

-- 5. CLEAN UP stale cancelled orders with locked_amount > 0
UPDATE orders 
SET locked_amount = 0, updated_at = NOW()
WHERE status = 'cancelled' AND locked_amount > 0;

-- ============================================================
-- 6. UPDATE execute_trade TO RECORD ALL 4 LEGS + FEES
-- ============================================================
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_buy_order_id UUID,
  p_sell_order_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_base_amount NUMERIC,
  p_quote_amount NUMERIC,
  p_buyer_fee NUMERIC,
  p_seller_fee NUMERIC,
  p_symbol TEXT,
  p_base_asset TEXT,
  p_quote_asset TEXT,
  p_trading_type TEXT DEFAULT 'spot'
)
RETURNS UUID
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
  v_buyer_base_balance RECORD;
  v_seller_quote_balance RECORD;
  v_exec_price NUMERIC;
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
    RAISE EXCEPTION 'No remaining quantity to fill';
  END IF;
  
  -- Recalculate if fill was capped
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
  
  -- LEDGER: Buyer quote debit (locked consumed, excess refunded)
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
    updated_at = NOW()
  RETURNING available, locked INTO v_buyer_base_balance;
  
  -- LEDGER: Buyer base credit (received base asset)
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, 
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_buyer_id, p_base_asset, v_fill_quantity, 0,
    COALESCE(v_buyer_base_balance.available, 0), COALESCE(v_buyer_base_balance.locked, 0),
    'FILL_CREDIT', 'trade', NULL);
  
  -- 3) SELLER: Release base from locked
  UPDATE wallet_balances
  SET 
    locked = GREATEST(locked - v_seller_lock_consume, 0),
    updated_at = NOW()
  WHERE user_id = p_seller_id AND asset_id = v_base_asset_id
  RETURNING available, locked INTO v_seller_balance;
  
  -- LEDGER: Seller base debit (base consumed from locked)
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, 
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_seller_id, p_base_asset, 0, -v_seller_lock_consume,
    COALESCE(v_seller_balance.available, 0), COALESCE(v_seller_balance.locked, 0),
    'FILL_DEBIT', 'trade', NULL);
  
  -- 4) SELLER: Receive quote minus fee
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (p_seller_id, v_quote_asset_id, p_quote_amount - p_seller_fee, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + (p_quote_amount - p_seller_fee),
    updated_at = NOW()
  RETURNING available, locked INTO v_seller_quote_balance;
  
  -- LEDGER: Seller quote credit (received quote currency minus fee)
  INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, 
    balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
  VALUES (p_seller_id, p_quote_asset, p_quote_amount - p_seller_fee, 0,
    COALESCE(v_seller_quote_balance.available, 0), COALESCE(v_seller_quote_balance.locked, 0),
    'FILL_CREDIT', 'trade', NULL);
  
  -- 5) PLATFORM: Credit fees
  INSERT INTO wallet_balances (user_id, asset_id, available, locked)
  VALUES (v_platform_account_id, v_quote_asset_id, v_total_fees, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + v_total_fees,
    updated_at = NOW();
  
  -- LEDGER: Fee credit entry
  IF v_total_fees > 0 THEN
    INSERT INTO trading_balance_ledger (user_id, asset_symbol, delta_available, delta_locked, 
      balance_available_after, balance_locked_after, entry_type, reference_type, reference_id)
    VALUES (v_platform_account_id, p_quote_asset, v_total_fees, 0, 0, 0,
      'FEE_CREDIT', 'trade', NULL);
  END IF;
  
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
  
  SELECT 
    MIN(t.price), MAX(t.price), COALESCE(SUM(t.quantity), 0),
    (SELECT t2.price FROM trades t2 
     WHERE t2.symbol = p_symbol AND t2.trade_time >= NOW() - INTERVAL '24 hours'
     ORDER BY t2.trade_time ASC LIMIT 1)
  INTO v_low_24h, v_high_24h, v_volume_24h, v_open_price_24h
  FROM trades t
  WHERE t.symbol = p_symbol AND t.trade_time >= NOW() - INTERVAL '24 hours';
  
  v_high_24h := GREATEST(COALESCE(v_high_24h, v_trade_price), v_trade_price);
  v_low_24h := LEAST(COALESCE(v_low_24h, v_trade_price), v_trade_price);
  
  IF v_open_price_24h IS NOT NULL AND v_open_price_24h > 0 THEN
    v_price_change := v_trade_price - v_open_price_24h;
    v_price_change_pct := ROUND(((v_trade_price - v_open_price_24h) / v_open_price_24h * 100)::numeric, 4);
  ELSE
    v_price_change := 0;
    v_price_change_pct := 0;
  END IF;
  
  UPDATE market_prices
  SET 
    current_price = v_trade_price,
    high_24h = v_high_24h, low_24h = v_low_24h,
    volume_24h = v_volume_24h,
    price_change_24h = v_price_change,
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

-- ============================================================
-- 7. UPDATE execute_order_cancel TO RECORD ORDER_CANCEL LEDGER ENTRY
-- ============================================================
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
  v_unlock_asset TEXT;
  v_balance_after RECORD;
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

  -- Determine which asset to unlock
  v_unlock_asset := COALESCE(v_order.locked_asset_symbol, 
    CASE WHEN v_order.side = 'buy' THEN split_part(v_order.symbol, '/', 2)
         ELSE split_part(v_order.symbol, '/', 1) END);

  IF v_order.locked_amount IS NOT NULL AND v_order.locked_amount > 0 THEN
    v_unlock_amount := v_order.locked_amount;
  ELSE
    IF v_order.side = 'buy' THEN
      v_unlock_amount := ROUND(v_order.remaining_amount * COALESCE(v_order.price, 0) * 1.005, 8);
    ELSE
      v_unlock_amount := v_order.remaining_amount;
    END IF;
  END IF;

  SELECT id INTO v_asset_id
  FROM assets
  WHERE symbol = v_unlock_asset AND is_active = true;

  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found: ' || v_unlock_asset);
  END IF;

  -- Update order status
  UPDATE orders
  SET status = 'cancelled', locked_amount = 0, updated_at = NOW()
  WHERE id = p_order_id;

  -- Unlock balance atomically
  UPDATE wallet_balances
  SET 
    available = available + v_unlock_amount,
    locked = GREATEST(0, locked - v_unlock_amount),
    updated_at = NOW()
  WHERE user_id = p_user_id AND asset_id = v_asset_id
  RETURNING available, locked INTO v_balance_after;

  -- LEDGER: Record ORDER_CANCEL entry
  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes
  ) VALUES (
    p_user_id, v_unlock_asset, v_unlock_amount, -v_unlock_amount,
    COALESCE(v_balance_after.available, 0), COALESCE(v_balance_after.locked, 0),
    'ORDER_CANCEL', 'order', p_order_id,
    'Cancelled ' || v_order.side || ' order: unlocked ' || v_unlock_amount || ' ' || v_unlock_asset
  );

  -- Audit log
  INSERT INTO trading_audit_log (event_type, user_id, order_id, payload, created_at)
  VALUES ('ORDER_CANCELLED_ATOMIC', p_user_id, p_order_id,
    jsonb_build_object(
      'symbol', v_order.symbol, 'side', v_order.side,
      'unlocked_amount', v_unlock_amount, 'unlocked_asset', v_unlock_asset,
      'remaining_amount', v_order.remaining_amount
    ), NOW());

  RETURN jsonb_build_object(
    'success', true, 'order_id', p_order_id,
    'unlocked_amount', v_unlock_amount, 'unlocked_asset', v_unlock_asset,
    'status', 'cancelled'
  );
END;
$$;

-- ============================================================
-- 8. UPDATE place_order_atomic TO RECORD ORDER_LOCK LEDGER ENTRY
-- ============================================================
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
  v_fee_rate NUMERIC;
  v_slippage_rate NUMERIC := 0.10;
  v_order_id UUID;
  v_current_balance NUMERIC;
  v_asset_id UUID;
  v_effective_price NUMERIC;
  v_best_ask NUMERIC;
  v_best_bid NUMERIC;
  v_taker_fee_pct NUMERIC;
  v_maker_fee_pct NUMERIC;
  v_balance_after RECORD;
BEGIN
  v_base_asset := split_part(p_symbol, '/', 1);
  v_quote_asset := split_part(p_symbol, '/', 2);
  
  SELECT 
    COALESCE(taker_fee_percent, 0.5) / 100,
    COALESCE(maker_fee_percent, 0.5) / 100
  INTO v_taker_fee_pct, v_maker_fee_pct
  FROM trading_engine_settings LIMIT 1;
  
  v_fee_rate := GREATEST(COALESCE(v_taker_fee_pct, 0.005), COALESCE(v_maker_fee_pct, 0.005));
  
  IF p_side = 'buy' THEN
    v_lock_asset := v_quote_asset;
    
    IF p_order_type = 'market' THEN
      SELECT MIN(price) INTO v_best_ask
      FROM orders
      WHERE symbol = p_symbol AND side = 'sell'
        AND status IN ('pending', 'partially_filled') AND price > 0;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
        SELECT current_price INTO v_best_ask FROM market_prices WHERE symbol = p_symbol;
      END IF;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
        SELECT initial_price INTO v_best_ask FROM assets WHERE symbol = v_base_asset;
      END IF;
      
      IF v_best_ask IS NULL OR v_best_ask <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No price available for market order. Please use a limit order.');
      END IF;
      
      v_effective_price := v_best_ask * (1 + v_slippage_rate);
    ELSE
      v_effective_price := COALESCE(p_price, 0);
    END IF;
    
    IF v_effective_price <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid price.');
    END IF;
    
    v_lock_amount := p_amount * v_effective_price * (1 + v_fee_rate);
  ELSE
    v_lock_asset := v_base_asset;
    
    IF p_order_type = 'market' THEN
      SELECT MAX(price) INTO v_best_bid
      FROM orders
      WHERE symbol = p_symbol AND side = 'buy'
        AND status IN ('pending', 'partially_filled') AND price > 0;
      v_effective_price := COALESCE(v_best_bid, 0);
    ELSE
      v_effective_price := COALESCE(p_price, 0);
    END IF;
    
    v_lock_amount := p_amount;
  END IF;
  
  v_lock_amount := ROUND(v_lock_amount, 8);
  
  SELECT id INTO v_asset_id FROM assets WHERE symbol = v_lock_asset LIMIT 1;
  
  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset ' || v_lock_asset || ' not found');
  END IF;
  
  SELECT available INTO v_current_balance
  FROM wallet_balances
  WHERE user_id = p_user_id AND asset_id = v_asset_id
  FOR UPDATE;
  
  IF v_current_balance IS NULL THEN v_current_balance := 0; END IF;
  
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
  WHERE user_id = p_user_id AND asset_id = v_asset_id
  RETURNING available, locked INTO v_balance_after;
  
  v_order_id := gen_random_uuid();
  
  INSERT INTO orders (
    id, user_id, symbol, side, order_type, amount, price,
    filled_amount, status, trading_type,
    locked_asset_symbol, locked_amount, created_at, updated_at
  ) VALUES (
    v_order_id, p_user_id, p_symbol, p_side, p_order_type, p_amount,
    COALESCE(p_price, v_effective_price), 0, 'pending', p_trading_type,
    v_lock_asset, v_lock_amount, now(), now()
  );
  
  -- LEDGER: Record ORDER_LOCK entry
  INSERT INTO trading_balance_ledger (
    user_id, asset_symbol, delta_available, delta_locked,
    balance_available_after, balance_locked_after,
    entry_type, reference_type, reference_id, notes
  ) VALUES (
    p_user_id, v_lock_asset, -v_lock_amount, v_lock_amount,
    COALESCE(v_balance_after.available, 0), COALESCE(v_balance_after.locked, 0),
    'ORDER_LOCK', 'order', v_order_id,
    p_side || ' ' || p_order_type || ' order: locked ' || v_lock_amount || ' ' || v_lock_asset
  );
  
  RETURN jsonb_build_object(
    'success', true, 'order_id', v_order_id,
    'locked_asset', v_lock_asset, 'locked_amount', v_lock_amount,
    'effective_price', v_effective_price
  );
END;
$$;

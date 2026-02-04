
-- ================================================================
-- TRADING ENGINE V2: Industry-Standard Balance Accounting
-- Fixes: Ghost locks, missing locked_amount clearing, reconciliation
-- ================================================================

-- PART 1: Create trading_balance_ledger for immutable audit trail
CREATE TABLE IF NOT EXISTS public.trading_balance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_symbol TEXT NOT NULL,
  delta_available NUMERIC(20,8) NOT NULL DEFAULT 0,
  delta_locked NUMERIC(20,8) NOT NULL DEFAULT 0,
  balance_available_after NUMERIC(20,8) NOT NULL,
  balance_locked_after NUMERIC(20,8) NOT NULL,
  entry_type TEXT NOT NULL, -- 'RESERVE', 'RELEASE', 'FILL_DEBIT', 'FILL_CREDIT', 'FEE', 'RECONCILIATION'
  reference_type TEXT, -- 'order', 'trade', 'cancel', 'admin'
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_trading_balance_ledger_user ON trading_balance_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_balance_ledger_ref ON trading_balance_ledger(reference_type, reference_id);

-- PART 2: Fix execute_trade to properly clear locked_amount on full fill
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_buy_order_id uuid, 
  p_sell_order_id uuid, 
  p_buyer_id uuid, 
  p_seller_id uuid, 
  p_symbol text, 
  p_base_asset text, 
  p_quote_asset text, 
  p_base_amount numeric, 
  p_quote_amount numeric, 
  p_buyer_fee numeric, 
  p_seller_fee numeric, 
  p_trading_type text DEFAULT 'spot'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_asset_id UUID;
  v_quote_asset_id UUID;
  v_trade_id UUID;
  v_buy_order RECORD;
  v_sell_order RECORD;
  v_fill_quantity NUMERIC;
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
BEGIN
  -- Quantize all amounts to 8 decimals
  p_base_amount := ROUND(p_base_amount, 8);
  p_quote_amount := ROUND(p_quote_amount, 8);
  p_buyer_fee := ROUND(p_buyer_fee, 8);
  p_seller_fee := ROUND(p_seller_fee, 8);
  v_total_fees := p_buyer_fee + p_seller_fee;
  
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
  
  -- Calculate what we're actually filling
  v_fill_quantity := p_base_amount;
  v_quote_required := p_quote_amount + p_buyer_fee;
  
  -- Calculate new filled amounts
  v_new_buy_filled := COALESCE(v_buy_order.filled_amount, 0) + v_fill_quantity;
  v_new_sell_filled := COALESCE(v_sell_order.filled_amount, 0) + v_fill_quantity;
  
  -- Determine new statuses
  IF v_new_buy_filled >= v_buy_order.amount THEN
    v_buy_new_status := 'filled';
    v_buy_remaining_lock := 0; -- CRITICAL: Clear ALL locked on full fill
  ELSE
    v_buy_new_status := 'partially_filled';
    -- Calculate proportional remaining lock
    v_fill_ratio := LEAST(v_fill_quantity / (v_buy_order.amount - COALESCE(v_buy_order.filled_amount, 0)), 1);
    v_buyer_lock_consume := ROUND(COALESCE(v_buy_order.locked_amount, 0) * v_fill_ratio, 8);
    v_buy_remaining_lock := GREATEST(COALESCE(v_buy_order.locked_amount, 0) - v_buyer_lock_consume, 0);
  END IF;
  
  IF v_new_sell_filled >= v_sell_order.amount THEN
    v_sell_new_status := 'filled';
    v_sell_remaining_lock := 0; -- CRITICAL: Clear ALL locked on full fill
  ELSE
    v_sell_new_status := 'partially_filled';
    v_fill_ratio := LEAST(v_fill_quantity / (v_sell_order.amount - COALESCE(v_sell_order.filled_amount, 0)), 1);
    v_seller_lock_consume := ROUND(COALESCE(v_sell_order.locked_amount, 0) * v_fill_ratio, 8);
    v_sell_remaining_lock := GREATEST(COALESCE(v_sell_order.locked_amount, 0) - v_seller_lock_consume, 0);
  END IF;
  
  -- For full fills, consume the entire lock
  IF v_buy_new_status = 'filled' THEN
    v_buyer_lock_consume := COALESCE(v_buy_order.locked_amount, 0);
  END IF;
  IF v_sell_new_status = 'filled' THEN
    v_seller_lock_consume := COALESCE(v_sell_order.locked_amount, 0);
  END IF;
  
  -- Calculate refunds
  v_buyer_refund := GREATEST(v_buyer_lock_consume - v_quote_required, 0);
  v_seller_consume := v_fill_quantity;
  
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
  
  -- ===== UPDATE ORDERS WITH CORRECT LOCKED AMOUNTS =====
  UPDATE orders
  SET 
    filled_amount = v_new_buy_filled,
    status = v_buy_new_status,
    locked_amount = v_buy_remaining_lock, -- CRITICAL: Set to remaining or 0
    average_price = CASE 
      WHEN v_new_buy_filled > 0 THEN 
        (COALESCE(average_price, 0) * COALESCE(v_buy_order.filled_amount, 0) + (p_quote_amount / v_fill_quantity) * v_fill_quantity) / v_new_buy_filled
      ELSE p_quote_amount / v_fill_quantity
    END,
    filled_at = CASE WHEN v_buy_new_status = 'filled' THEN NOW() ELSE filled_at END,
    updated_at = NOW()
  WHERE id = p_buy_order_id;
  
  UPDATE orders
  SET 
    filled_amount = v_new_sell_filled,
    status = v_sell_new_status,
    locked_amount = v_sell_remaining_lock, -- CRITICAL: Set to remaining or 0
    average_price = CASE 
      WHEN v_new_sell_filled > 0 THEN 
        (COALESCE(average_price, 0) * COALESCE(v_sell_order.filled_amount, 0) + (p_quote_amount / v_fill_quantity) * v_fill_quantity) / v_new_sell_filled
      ELSE p_quote_amount / v_fill_quantity
    END,
    filled_at = CASE WHEN v_sell_new_status = 'filled' THEN NOW() ELSE filled_at END,
    updated_at = NOW()
  WHERE id = p_sell_order_id;
  
  -- Create trade record
  v_trade_id := gen_random_uuid();
  INSERT INTO trades (
    id, symbol, buyer_order_id, seller_order_id, buyer_id, seller_id,
    price, amount, buyer_fee, seller_fee, total_value, trade_time, trading_type
  ) VALUES (
    v_trade_id, p_symbol, p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
    p_quote_amount / v_fill_quantity, v_fill_quantity, p_buyer_fee, p_seller_fee,
    p_quote_amount, NOW(), p_trading_type
  );
  
  -- Update market price (last traded price)
  INSERT INTO market_prices (symbol, current_price, last_updated)
  VALUES (p_symbol, p_quote_amount / v_fill_quantity, NOW())
  ON CONFLICT (symbol)
  DO UPDATE SET
    current_price = EXCLUDED.current_price,
    last_updated = NOW();
  
  RETURN v_trade_id;
END;
$function$;

-- PART 3: Reconciliation function to fix existing ghost locks
CREATE OR REPLACE FUNCTION public.reconcile_trading_balances(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  asset_symbol TEXT,
  actual_locked NUMERIC,
  expected_locked NUMERIC,
  discrepancy NUMERIC,
  fixed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH order_locks AS (
    SELECT 
      o.user_id,
      o.locked_asset_symbol as asset_symbol,
      SUM(COALESCE(o.locked_amount, 0)) as expected_locked
    FROM orders o
    WHERE o.status IN ('pending', 'open', 'partially_filled')
      AND (p_user_id IS NULL OR o.user_id = p_user_id)
    GROUP BY o.user_id, o.locked_asset_symbol
  ),
  balance_locks AS (
    SELECT 
      wb.user_id,
      a.symbol as asset_symbol,
      wb.locked as actual_locked
    FROM wallet_balances wb
    JOIN assets a ON a.id = wb.asset_id
    WHERE wb.locked > 0.00000001
      AND (p_user_id IS NULL OR wb.user_id = p_user_id)
  ),
  discrepancies AS (
    SELECT 
      COALESCE(bl.user_id, ol.user_id) as user_id,
      COALESCE(bl.asset_symbol, ol.asset_symbol) as asset_symbol,
      COALESCE(bl.actual_locked, 0) as actual_locked,
      COALESCE(ol.expected_locked, 0) as expected_locked,
      COALESCE(bl.actual_locked, 0) - COALESCE(ol.expected_locked, 0) as discrepancy
    FROM balance_locks bl
    FULL OUTER JOIN order_locks ol 
      ON bl.user_id = ol.user_id AND bl.asset_symbol = ol.asset_symbol
    WHERE ABS(COALESCE(bl.actual_locked, 0) - COALESCE(ol.expected_locked, 0)) > 0.00000001
  )
  SELECT 
    d.user_id,
    d.asset_symbol,
    d.actual_locked,
    d.expected_locked,
    d.discrepancy,
    TRUE as fixed
  FROM discrepancies d;
END;
$function$;

-- PART 4: Fix existing ghost locks (run once)
CREATE OR REPLACE FUNCTION public.fix_ghost_locks()
RETURNS TABLE(
  user_id UUID,
  asset_symbol TEXT,
  amount_fixed NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_asset_id UUID;
BEGIN
  -- First fix orders that are filled/cancelled but still have locked_amount > 0
  UPDATE orders
  SET locked_amount = 0, updated_at = NOW()
  WHERE status IN ('filled', 'cancelled', 'canceled', 'rejected', 'expired')
    AND locked_amount > 0;
  
  -- Then reconcile balances
  FOR v_rec IN (
    SELECT * FROM reconcile_trading_balances()
    WHERE discrepancy > 0.00000001 -- Only fix positive discrepancies (over-locked)
  ) LOOP
    -- Get asset ID
    SELECT id INTO v_asset_id FROM assets WHERE symbol = v_rec.asset_symbol;
    
    IF v_asset_id IS NOT NULL THEN
      -- Move excess from locked to available
      UPDATE wallet_balances
      SET 
        locked = GREATEST(locked - v_rec.discrepancy, 0),
        available = available + v_rec.discrepancy,
        updated_at = NOW()
      WHERE wallet_balances.user_id = v_rec.user_id 
        AND asset_id = v_asset_id;
      
      -- Log the fix
      INSERT INTO trading_balance_ledger (
        user_id, asset_symbol, delta_available, delta_locked,
        balance_available_after, balance_locked_after,
        entry_type, reference_type, notes
      )
      SELECT 
        v_rec.user_id, 
        v_rec.asset_symbol, 
        v_rec.discrepancy, 
        -v_rec.discrepancy,
        wb.available,
        wb.locked,
        'RECONCILIATION',
        'admin',
        'Auto-fix ghost lock: released ' || v_rec.discrepancy || ' ' || v_rec.asset_symbol
      FROM wallet_balances wb
      JOIN assets a ON a.id = wb.asset_id
      WHERE wb.user_id = v_rec.user_id AND a.symbol = v_rec.asset_symbol;
      
      user_id := v_rec.user_id;
      asset_symbol := v_rec.asset_symbol;
      amount_fixed := v_rec.discrepancy;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reconcile_trading_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_ghost_locks TO authenticated;

-- Enable RLS on trading_balance_ledger
ALTER TABLE public.trading_balance_ledger ENABLE ROW LEVEL SECURITY;

-- Users can view their own ledger entries
CREATE POLICY "Users can view own ledger entries"
ON public.trading_balance_ledger
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert
CREATE POLICY "Service role can insert ledger entries"
ON public.trading_balance_ledger
FOR INSERT
WITH CHECK (true);

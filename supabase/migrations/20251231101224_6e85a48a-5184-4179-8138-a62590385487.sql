-- ===============================================
-- FIX: Lock balances for existing pending orders and improve matching
-- ===============================================

-- 1. Create a function to fix unlocked pending orders
CREATE OR REPLACE FUNCTION fix_unlocked_pending_orders()
RETURNS TABLE(order_id UUID, fixed BOOLEAN, error_msg TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_base_symbol TEXT;
  v_quote_symbol TEXT;
  v_asset_id UUID;
  v_required_amount NUMERIC;
  v_success BOOLEAN;
BEGIN
  FOR v_order IN
    SELECT o.* FROM orders o
    WHERE o.status = 'pending'
    AND o.order_type = 'limit'
  LOOP
    -- Parse symbol
    v_base_symbol := split_part(v_order.symbol, '/', 1);
    v_quote_symbol := split_part(v_order.symbol, '/', 2);
    
    -- Determine which asset to lock
    IF v_order.side = 'buy' THEN
      v_required_amount := v_order.remaining_amount * v_order.price;
      SELECT id INTO v_asset_id FROM assets WHERE symbol = v_quote_symbol;
    ELSE
      v_required_amount := v_order.remaining_amount;
      SELECT id INTO v_asset_id FROM assets WHERE symbol = v_base_symbol;
    END IF;
    
    -- Try to lock balance if not already locked
    BEGIN
      UPDATE wallet_balances
      SET 
        available = available - v_required_amount,
        locked = locked + v_required_amount,
        updated_at = now()
      WHERE user_id = v_order.user_id 
        AND asset_id = v_asset_id
        AND available >= v_required_amount;
      
      IF FOUND THEN
        v_success := TRUE;
        RETURN QUERY SELECT v_order.id, TRUE, NULL::TEXT;
      ELSE
        -- Cancel order if can't lock balance
        UPDATE orders 
        SET status = 'cancelled', 
            cancelled_at = now(),
            metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{cancel_reason}', '"insufficient_balance_on_fix"')
        WHERE id = v_order.id;
        
        RETURN QUERY SELECT v_order.id, FALSE, 'Insufficient balance - order cancelled'::TEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT v_order.id, FALSE, SQLERRM::TEXT;
    END;
  END LOOP;
END;
$$;

-- 2. Update admin_trigger_matching to be more verbose
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
  v_skipped_same_user INTEGER := 0;
  v_skipped_no_cross INTEGER := 0;
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
        AND remaining_amount > 0
      ORDER BY price ASC, created_at ASC
    LOOP
      -- Skip self-trading
      IF v_buy_order.user_id = v_sell_order.user_id THEN
        v_skipped_same_user := v_skipped_same_user + 1;
        CONTINUE;
      END IF;
      
      -- Check if prices cross
      IF NOT (v_buy_order.price >= v_sell_order.price OR v_buy_order.order_type = 'market' OR v_sell_order.order_type = 'market') THEN
        v_skipped_no_cross := v_skipped_no_cross + 1;
        CONTINUE;
      END IF;
      
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
  
  RETURN QUERY SELECT v_matched, format('Matched %s orders (skipped: %s same-user, %s no-cross)', 
    v_matched, v_skipped_same_user, v_skipped_no_cross);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION fix_unlocked_pending_orders TO authenticated;
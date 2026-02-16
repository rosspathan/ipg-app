
-- #5: Order Expiration - RPC to expire stale pending orders and release locked funds
CREATE OR REPLACE FUNCTION public.expire_stale_orders(p_ttl_hours INT DEFAULT 72)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INT := 0;
  v_order RECORD;
  v_asset_id UUID;
  v_remaining NUMERIC;
BEGIN
  FOR v_order IN
    SELECT o.id, o.user_id, o.symbol, o.side, o.order_type, o.price, o.amount, o.filled_amount,
           o.remaining_amount, o.locked_amount, o.locked_asset_symbol
    FROM orders o
    WHERE o.status IN ('pending', 'partially_filled')
      AND o.order_type = 'limit'
      AND o.created_at < (NOW() - (p_ttl_hours || ' hours')::INTERVAL)
    FOR UPDATE OF o
  LOOP
    -- Cancel the order
    UPDATE orders
    SET status = 'cancelled',
        locked_amount = 0,
        locked_asset_symbol = NULL,
        updated_at = NOW()
    WHERE id = v_order.id;

    -- Release locked funds back to available
    IF v_order.locked_amount > 0 AND v_order.locked_asset_symbol IS NOT NULL THEN
      SELECT a.id INTO v_asset_id
      FROM assets a WHERE a.symbol = v_order.locked_asset_symbol;

      IF v_asset_id IS NOT NULL THEN
        UPDATE wallet_balances
        SET available = available + v_order.locked_amount,
            locked = GREATEST(0, locked - v_order.locked_amount),
            updated_at = NOW()
        WHERE user_id = v_order.user_id AND asset_id = v_asset_id;

        -- Ledger entry
        INSERT INTO trading_balance_ledger (
          user_id, asset_symbol, delta_available, delta_locked,
          reference_type, reference_id, description
        ) VALUES (
          v_order.user_id, v_order.locked_asset_symbol,
          v_order.locked_amount, -v_order.locked_amount,
          'order_expired', v_order.id,
          'Order expired after ' || p_ttl_hours || 'h TTL'
        );
      END IF;
    END IF;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN v_expired_count;
END;
$$;

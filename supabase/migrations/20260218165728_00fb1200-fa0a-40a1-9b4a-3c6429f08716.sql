
-- Cancel all both-side orders for users who have buy AND sell on the same pair
-- Step 1: Release locked funds back to available balance
DO $$
DECLARE
  r RECORD;
  v_asset_id UUID;
BEGIN
  FOR r IN 
    SELECT o.id, o.user_id, o.symbol, o.side, o.remaining_amount, o.price,
           COALESCE(o.locked_amount, 0) as locked_amount,
           COALESCE(o.locked_asset_symbol, 
             CASE WHEN o.side = 'buy' THEN split_part(o.symbol, '/', 2)
                  ELSE split_part(o.symbol, '/', 1) END) as unlock_asset
    FROM orders o
    WHERE o.status IN ('pending', 'partially_filled')
    AND o.user_id IN (
      SELECT user_id FROM orders 
      WHERE status IN ('pending', 'partially_filled') 
      GROUP BY user_id, symbol 
      HAVING COUNT(DISTINCT side) = 2
    )
  LOOP
    -- Get asset ID
    SELECT id INTO v_asset_id FROM assets WHERE symbol = r.unlock_asset AND is_active = true;
    
    IF v_asset_id IS NOT NULL AND r.locked_amount > 0 THEN
      -- Release locked funds
      UPDATE wallet_balances
      SET available = available + r.locked_amount,
          locked = GREATEST(0, locked - r.locked_amount),
          updated_at = NOW()
      WHERE user_id = r.user_id AND asset_id = v_asset_id;
    END IF;
    
    -- Cancel the order
    UPDATE orders
    SET status = 'cancelled', locked_amount = 0, updated_at = NOW()
    WHERE id = r.id;
    
    -- Audit log
    INSERT INTO trading_audit_log (event_type, user_id, order_id, payload, created_at)
    VALUES ('ORDER_CANCELLED_ADMIN_SELF_TRADE', r.user_id, r.id, 
      jsonb_build_object('symbol', r.symbol, 'side', r.side, 'unlocked_amount', r.locked_amount, 'unlocked_asset', r.unlock_asset, 'reason', 'Self-trade prevention cleanup'),
      NOW());
  END LOOP;
END $$;

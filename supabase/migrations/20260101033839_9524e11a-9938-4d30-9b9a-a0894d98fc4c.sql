-- Cancel pending orders without locked balances
UPDATE public.orders
SET status = 'cancelled', 
    cancelled_at = now()
WHERE status = 'pending' 
  AND id NOT IN (
    SELECT DISTINCT o.id 
    FROM public.orders o
    JOIN public.assets a ON (
      CASE 
        WHEN o.side = 'buy' THEN a.symbol = SPLIT_PART(o.symbol, '/', 2)
        ELSE a.symbol = SPLIT_PART(o.symbol, '/', 1)
      END
    )
    JOIN public.wallet_balances wb ON wb.user_id = o.user_id AND wb.asset_id = a.id
    WHERE o.status = 'pending' 
      AND wb.locked > 0
  );

-- Drop existing function and recreate with correct fee buffer
DROP FUNCTION IF EXISTS public.fix_unlocked_pending_orders();

CREATE FUNCTION public.fix_unlocked_pending_orders()
RETURNS TABLE(order_id UUID, status TEXT, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rec RECORD;
  v_asset_id UUID;
  v_required_amount NUMERIC;
  v_available NUMERIC;
  v_fee_percent NUMERIC := 0.005;
BEGIN
  FOR rec IN
    SELECT o.id, o.user_id, o.symbol, o.side, o.order_type, o.remaining_amount, o.price
    FROM orders o
    WHERE o.status = 'pending' AND o.order_type = 'limit'
  LOOP
    IF rec.side = 'buy' THEN
      SELECT id INTO v_asset_id 
      FROM assets WHERE symbol = SPLIT_PART(rec.symbol, '/', 2);
      v_required_amount := rec.remaining_amount * rec.price * (1 + v_fee_percent);
    ELSE
      SELECT id INTO v_asset_id 
      FROM assets WHERE symbol = SPLIT_PART(rec.symbol, '/', 1);
      v_required_amount := rec.remaining_amount;
    END IF;
    
    IF v_asset_id IS NULL THEN
      order_id := rec.id;
      status := 'error';
      message := 'Asset not found';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    SELECT available INTO v_available
    FROM wallet_balances
    WHERE user_id = rec.user_id AND asset_id = v_asset_id;
    
    IF v_available IS NULL OR v_available < v_required_amount THEN
      UPDATE orders SET status = 'cancelled', cancelled_at = now() WHERE id = rec.id;
      order_id := rec.id;
      status := 'cancelled';
      message := format('Insufficient balance: need %.6f, have %.6f', v_required_amount, COALESCE(v_available, 0));
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    UPDATE wallet_balances
    SET available = available - v_required_amount,
        locked = locked + v_required_amount,
        updated_at = now()
    WHERE user_id = rec.user_id AND asset_id = v_asset_id;
    
    order_id := rec.id;
    status := 'fixed';
    message := format('Locked %.6f', v_required_amount);
    RETURN NEXT;
  END LOOP;
END;
$$;
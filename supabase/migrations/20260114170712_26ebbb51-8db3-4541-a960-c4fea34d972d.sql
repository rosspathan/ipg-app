-- Fix execute_order_cancel to use 'payload' column instead of non-existent 'details'
CREATE OR REPLACE FUNCTION public.execute_order_cancel(p_user_id uuid, p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_asset_id UUID;
  v_unlock_amount NUMERIC(20,8);
  v_unlock_asset TEXT;
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

  -- Use explicit locked_amount if available, otherwise calculate
  IF v_order.locked_amount IS NOT NULL AND v_order.locked_amount > 0 THEN
    v_unlock_amount := v_order.locked_amount;
  ELSE
    -- Fallback calculation for orders without explicit tracking
    IF v_order.side = 'buy' THEN
      v_unlock_amount := ROUND(v_order.remaining_amount * COALESCE(v_order.price, 0) * 1.005, 8);
    ELSE
      v_unlock_amount := v_order.remaining_amount;
    END IF;
  END IF;

  -- Get the asset ID for unlocking
  SELECT id INTO v_asset_id
  FROM assets
  WHERE symbol = v_unlock_asset
    AND is_active = true;

  IF v_asset_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Asset not found: ' || v_unlock_asset);
  END IF;

  -- Update order status
  UPDATE orders
  SET 
    status = 'cancelled',
    locked_amount = 0,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Unlock balance atomically
  UPDATE wallet_balances
  SET 
    available = available + v_unlock_amount,
    locked = GREATEST(0, locked - v_unlock_amount),
    updated_at = NOW()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;

  -- Audit log - use 'payload' column (correct column name)
  INSERT INTO trading_audit_log (
    event_type,
    user_id,
    order_id,
    payload,
    created_at
  ) VALUES (
    'ORDER_CANCELLED_ATOMIC',
    p_user_id,
    p_order_id,
    jsonb_build_object(
      'symbol', v_order.symbol,
      'side', v_order.side,
      'unlocked_amount', v_unlock_amount,
      'unlocked_asset', v_unlock_asset,
      'remaining_amount', v_order.remaining_amount
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'unlocked_amount', v_unlock_amount,
    'unlocked_asset', v_unlock_asset,
    'status', 'cancelled'
  );
END;
$function$;
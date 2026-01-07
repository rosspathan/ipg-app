-- Function to reconcile locked balance for a user/asset based on actual pending orders
CREATE OR REPLACE FUNCTION reconcile_locked_balance(p_user_id UUID, p_asset_symbol TEXT)
RETURNS void AS $$
DECLARE
  v_asset_id UUID;
  v_correct_locked NUMERIC;
  v_total NUMERIC;
BEGIN
  -- Get asset ID
  SELECT id INTO v_asset_id FROM assets WHERE symbol = p_asset_symbol;
  
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset % not found', p_asset_symbol;
  END IF;
  
  -- Calculate correct locked amount from pending orders
  -- For sell orders: lock the base asset (amount being sold)
  -- For buy orders: lock the quote asset (amount being spent + fees)
  SELECT COALESCE(SUM(
    CASE 
      WHEN side = 'sell' AND split_part(symbol, '/', 1) = p_asset_symbol THEN remaining_amount
      WHEN side = 'buy' AND split_part(symbol, '/', 2) = p_asset_symbol THEN remaining_amount * price * 1.005
      ELSE 0
    END
  ), 0) INTO v_correct_locked
  FROM orders
  WHERE user_id = p_user_id 
    AND status = 'pending';
  
  -- Get current total
  SELECT total INTO v_total FROM wallet_balances 
  WHERE user_id = p_user_id AND asset_id = v_asset_id;
  
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'No wallet balance found for user % and asset %', p_user_id, p_asset_symbol;
  END IF;
  
  -- Update wallet_balances
  UPDATE wallet_balances
  SET locked = v_correct_locked,
      available = v_total - v_correct_locked,
      updated_at = NOW()
  WHERE user_id = p_user_id AND asset_id = v_asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Immediate fix: Reconcile the affected user's IPG balance
-- User has 0 pending orders but locked = 0.944888
UPDATE wallet_balances
SET locked = 0,
    available = total,
    updated_at = NOW()
WHERE user_id = '74852950-2a85-4079-8d28-877e561c255a'
  AND asset_id = 'e4ce7e45-5215-4a84-8189-3139f55c8983';
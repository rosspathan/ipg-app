-- Phase E: Update status constraints for crypto auto-processing
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_status_check 
  CHECK (status IN ('processing', 'completed', 'failed', 'cancelled'));

ALTER TABLE deposits DROP CONSTRAINT IF EXISTS deposits_status_check;
ALTER TABLE deposits ADD CONSTRAINT deposits_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'failed'));

-- Phase B: Create function to credit deposit balance
CREATE OR REPLACE FUNCTION credit_deposit_balance(
  p_user_id UUID,
  p_asset_symbol TEXT,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_asset_id UUID;
BEGIN
  -- Get asset ID
  SELECT id INTO v_asset_id FROM assets WHERE symbol = p_asset_symbol;
  
  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'Asset not found: %', p_asset_symbol;
  END IF;
  
  -- Credit balance
  INSERT INTO wallet_balances (user_id, asset_id, available, balance, total, locked)
  VALUES (p_user_id, v_asset_id, p_amount, p_amount, p_amount, 0)
  ON CONFLICT (user_id, asset_id)
  DO UPDATE SET
    available = wallet_balances.available + p_amount,
    balance = wallet_balances.balance + p_amount,
    total = wallet_balances.total + p_amount,
    updated_at = now();
    
  RETURN TRUE;
END;
$$;
-- Auto-credit user wallet balances when deposits are completed
-- This ensures that when deposit status changes to 'completed', the user's balance is automatically updated

-- Function to credit deposit to user's wallet balance
CREATE OR REPLACE FUNCTION credit_completed_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance RECORD;
BEGIN
  -- Only process when status changes to 'completed' and it wasn't completed before
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if user has existing balance for this asset
    SELECT * INTO v_current_balance
    FROM wallet_balances
    WHERE user_id = NEW.user_id AND asset_id = NEW.asset_id;
    
    IF FOUND THEN
      -- Update existing balance
      UPDATE wallet_balances
      SET 
        available = available + NEW.amount,
        total = total + NEW.amount,
        updated_at = NOW()
      WHERE user_id = NEW.user_id AND asset_id = NEW.asset_id;
    ELSE
      -- Create new balance record
      INSERT INTO wallet_balances (user_id, asset_id, available, locked, total)
      VALUES (NEW.user_id, NEW.asset_id, NEW.amount, 0, NEW.amount);
    END IF;
    
    -- Mark deposit as credited
    NEW.credited_at = NOW();
    
    -- Log the credit action
    RAISE NOTICE 'Credited deposit % to user % for asset %: amount %', 
      NEW.id, NEW.user_id, NEW.asset_id, NEW.amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-credit deposits when completed
DROP TRIGGER IF EXISTS trigger_credit_completed_deposit ON deposits;
CREATE TRIGGER trigger_credit_completed_deposit
  BEFORE UPDATE OF status ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION credit_completed_deposit();

-- Create an index on deposits for faster lookups
CREATE INDEX IF NOT EXISTS idx_deposits_user_asset ON deposits(user_id, asset_id);

-- Add comment for documentation
COMMENT ON FUNCTION credit_completed_deposit() IS 
'Automatically credits user wallet balance when a deposit status changes to completed. 
Updates existing balance or creates new record if needed.';
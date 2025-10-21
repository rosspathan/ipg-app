-- Add banking immutability columns and constraints
ALTER TABLE banking_inr 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Create trigger function to prevent updates to verified/locked banking details
CREATE OR REPLACE FUNCTION prevent_banking_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent updates if verified or locked
  IF OLD.verified = TRUE OR OLD.is_locked = TRUE THEN
    -- Only allow unlocking via admin RPC function
    IF NEW.is_locked = FALSE AND current_setting('role', true) != 'service_role' THEN
      RAISE EXCEPTION 'Banking details are locked and cannot be modified. Contact support for changes.';
    END IF;
    
    -- If locked, prevent all field updates except is_locked
    IF OLD.is_locked = TRUE THEN
      IF NEW.account_number IS DISTINCT FROM OLD.account_number OR
         NEW.ifsc IS DISTINCT FROM OLD.ifsc OR
         NEW.upi_id IS DISTINCT FROM OLD.upi_id OR
         NEW.account_name IS DISTINCT FROM OLD.account_name OR
         NEW.bank_name IS DISTINCT FROM OLD.bank_name THEN
        RAISE EXCEPTION 'Verified banking details cannot be modified. Contact support for changes.';
      END IF;
    END IF;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS banking_immutability_trigger ON banking_inr;
CREATE TRIGGER banking_immutability_trigger
BEFORE UPDATE ON banking_inr
FOR EACH ROW
EXECUTE FUNCTION prevent_banking_updates();

-- RPC function for admin to unlock banking details
CREATE OR REPLACE FUNCTION unlock_banking_details(p_user_id UUID, p_reason TEXT)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  -- Log the unlock request
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (
    p_user_id, 
    'unlock_banking', 
    'banking_inr', 
    p_user_id::TEXT,
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('is_locked', false)
  );
  
  -- Unlock the banking details
  UPDATE banking_inr
  SET is_locked = FALSE
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
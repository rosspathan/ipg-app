-- Create function to automatically reward BSK on KYC approval
CREATE OR REPLACE FUNCTION reward_kyc_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_balance_exists BOOLEAN;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Check if user already has a balance record
    SELECT EXISTS(
      SELECT 1 FROM user_bsk_balances WHERE user_id = NEW.user_id
    ) INTO v_balance_exists;
    
    IF v_balance_exists THEN
      -- Update existing balance
      UPDATE user_bsk_balances
      SET 
        holding_balance = holding_balance + 5,
        total_earned_holding = total_earned_holding + 5,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSE
      -- Create new balance record
      INSERT INTO user_bsk_balances (
        user_id,
        withdrawable_balance,
        holding_balance,
        total_earned_withdrawable,
        total_earned_holding
      ) VALUES (
        NEW.user_id,
        0,
        5,
        0,
        5
      );
    END IF;
    
    -- Log admin operation
    INSERT INTO bsk_admin_operations (
      admin_id,
      operation_type,
      amount,
      recipient_id,
      notes
    ) VALUES (
      COALESCE(NEW.reviewed_by, NEW.user_id),
      'kyc_reward',
      5,
      NEW.user_id,
      'Automatic 5 BSK holding balance reward for KYC approval'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_reward_kyc_approval ON kyc_profiles_new;
CREATE TRIGGER trigger_reward_kyc_approval
  AFTER UPDATE ON kyc_profiles_new
  FOR EACH ROW
  EXECUTE FUNCTION reward_kyc_approval();
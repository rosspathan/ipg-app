-- Phase 1: Ensure referral rewards are properly credited when email is verified
-- This creates a database function to process referral rewards automatically

-- Create function to process referral commission after email verification
CREATE OR REPLACE FUNCTION process_email_verification_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
  settings_record RECORD;
  commission_amount NUMERIC;
BEGIN
  -- Only process when email_confirmed_at is first set
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Get referral link for this user
    SELECT * INTO referral_record
    FROM referral_links_new
    WHERE user_id = NEW.id
    AND sponsor_id IS NOT NULL
    AND locked_at IS NOT NULL;
    
    -- If no referral exists, exit
    IF referral_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get referral settings
    SELECT * INTO settings_record
    FROM team_referral_settings
    WHERE enabled = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no settings exist, exit
    IF settings_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate commission (using a fixed amount for email verification reward)
    -- Admin can configure this in team_referral_settings table
    commission_amount := COALESCE(settings_record.direct_commission_percent, 10.0);
    
    -- Credit sponsor's BSK balance
    INSERT INTO user_bsk_balances (user_id, withdrawable_balance, total_earned_withdrawable)
    VALUES (referral_record.sponsor_id, commission_amount, commission_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET
      withdrawable_balance = user_bsk_balances.withdrawable_balance + commission_amount,
      total_earned_withdrawable = user_bsk_balances.total_earned_withdrawable + commission_amount,
      updated_at = now();
    
    -- Create ledger entry
    INSERT INTO bonus_ledger (user_id, type, amount_bsk, meta_json)
    VALUES (referral_record.sponsor_id, 'referral_signup', commission_amount, jsonb_build_object(
      'referee_id', NEW.id,
      'referee_email', NEW.email,
      'event', 'email_verification'
    ));
    
    -- Update referral link stats
    UPDATE referral_links_new
    SET 
      total_referrals = total_referrals + 1,
      total_commissions = total_commissions + commission_amount,
      updated_at = now()
    WHERE sponsor_id = referral_record.sponsor_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for email verification
DROP TRIGGER IF EXISTS on_email_verified_referral ON auth.users;
CREATE TRIGGER on_email_verified_referral
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION process_email_verification_referral();
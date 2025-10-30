-- Fix search_path security warning for auto_complete_onboarding function
CREATE OR REPLACE FUNCTION auto_complete_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- If referral just got locked and onboarding not complete, mark it complete
  IF NEW.locked_at IS NOT NULL AND (OLD.locked_at IS NULL OR OLD.locked_at IS DISTINCT FROM NEW.locked_at) THEN
    UPDATE profiles
    SET onboarding_completed_at = NOW(),
        setup_complete = true
    WHERE user_id = NEW.user_id 
      AND onboarding_completed_at IS NULL
      AND email IS NOT NULL
      AND wallet_address IS NOT NULL;
    
    RAISE NOTICE 'Auto-completed onboarding for user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;
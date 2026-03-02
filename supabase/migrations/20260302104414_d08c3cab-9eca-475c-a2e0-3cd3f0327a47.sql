CREATE OR REPLACE FUNCTION guard_wallet_balance_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow decreases (withdrawals, locks) - only block increases
  IF TG_OP = 'UPDATE' THEN
    IF NEW.available <= OLD.available AND NEW.locked <= OLD.locked THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Allow service_role, superuser, and postgres (SECURITY DEFINER context)
  IF current_setting('role', true) = 'service_role' 
     OR current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('is_superuser', true) = 'on'
     OR session_user = 'postgres'
     OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- Block authenticated users from direct balance increases
  IF current_setting('role', true) = 'authenticated' 
     OR current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Direct wallet_balances INSERT not allowed. Use authorized deposit functions.';
    END IF;
    
    IF TG_OP = 'UPDATE' AND (NEW.available > OLD.available OR NEW.locked > OLD.locked) THEN
      RAISE EXCEPTION 'Direct wallet_balances balance increase not allowed. Use authorized deposit functions.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;